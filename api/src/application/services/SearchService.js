const FuzzySearchService = require('./FuzzySearchService');

/**
 * Merkezi Arama Servisi
 * Tüm arama işlemleri için tek kaynak
 */
class SearchService {
    constructor(db, wordIndexService) {
        this.db = db;
        this.wordIndexService = wordIndexService;
        this.fuzzySearchService = new FuzzySearchService(db, wordIndexService);
    }

    /**
     * Track'leri ara - Gelişmiş puanlama ile
     * @param {string} query - Arama sorgusu
     * @param {Object} options - Arama seçenekleri
     * @returns {Array} Puanlanmış sonuçlar
     */
    async searchTracks(query, options = {}) {
        const {
            limit = null,
            offset = 0,
            minScore = 0,
            tableType = 'track_words', // 'track_words' veya 'music_words'
            includeScoreDetails = true,
            enableFuzzy = true,
            fuzzyThreshold = 0.7
        } = options;

        const normalizedQuery = this.wordIndexService.normalize(query);
        const words = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
        
        if (words.length === 0) {
            return [];
        }

        // Fuzzy matching aktifse hibrit arama kullan
        if (enableFuzzy) {
            return await this.fuzzySearchService.searchTracks(query, {
                limit,
                offset,
                minScore,
                tableType,
                includeScoreDetails,
                fuzzyThreshold
            });
        }

        // Hangi tablodan arama yapılacak
        const tableName = tableType === 'music_words' ? 'music_words' : 'track_words';
        const pathColumn = tableType === 'music_words' ? 'music_path' : 'track_path';
        const joinTable = tableType === 'music_words' ? 'music_files' : 'tracks';

        // SQL query oluştur - OFFSET desteği ile
        const placeholders = words.map(() => '?').join(', ');
        const stmt = this.db.prepare(`
            SELECT DISTINCT 
                tw.${pathColumn} as path,
                t.fileName,
                t.normalizedFileName,
                COUNT(DISTINCT tw.word) as match_count
            FROM ${tableName} tw
            LEFT JOIN ${joinTable} t ON tw.${pathColumn} = t.path
            WHERE tw.word IN (${placeholders})
            GROUP BY tw.${pathColumn}
            HAVING match_count >= 1
            ORDER BY match_count DESC
            LIMIT ? OFFSET ?
        `);
        
        // PERFORMANS OPTİMİZASYONU: Akıllı buffer sistemi
        let queryLimit;
        if (limit === null) {
            queryLimit = 10000; // Tüm sonuçlar için yüksek limit
        } else if (limit === 1) {
            queryLimit = 1; // En iyi sonuç
        } else if (limit <= 10) {
            queryLimit = limit * 3; // Küçük limitler için 3x buffer
        } else {
            queryLimit = Math.min(limit + 50, 10000); // Büyük limitler için sabit buffer (max 10000)
        }
        const rawResults = stmt.all(...words, queryLimit, offset);
        
        // Puanlama sistemi uygula
        const scoredResults = rawResults.map(result => {
            const score = this.calculateScore(result, words, normalizedQuery);
            
            const baseResult = {
                track_path: result.path,
                fileName: result.fileName,
                normalizedFileName: result.normalizedFileName,
                match_count: result.match_count,
                score: score.total
            };

            if (includeScoreDetails) {
                baseResult.score_details = score;
            }

            return baseResult;
        });
        
        // PERFORMANS OPTİMİZASYONU: Limit=1 ise sadece en yüksek puanlıyı al
        if (limit === 1) {
            const best = scoredResults.reduce((best, current) => 
                current.score > best.score ? current : best, scoredResults[0] || { score: -1 });
            return best.score >= minScore ? [best] : [];
        }
        
        // Puana göre sırala (limit > 1 için)
        scoredResults.sort((a, b) => b.score - a.score);
        
        // Min score filter ve limit
        const filtered = scoredResults.filter(r => r.score >= minScore);
        return limit ? filtered.slice(0, limit) : filtered;
    }

    /**
     * Music file'ları ara - Track araması ile aynı algoritma
     * @param {string} query - Arama sorgusu
     * @param {Object} options - Arama seçenekleri
     * @returns {Array} Puanlanmış sonuçlar
     */
    async searchMusicFiles(query, options = {}) {
        return await this.searchTracks(query, {
            ...options,
            tableType: 'music_words'
        });
    }

    /**
     * Gelişmiş puanlama sistemi
     * Farklı kriterlere göre puan hesaplar
     */
    calculateScore(result, searchWords, normalizedQuery) {
        const normalizedFileName = result.normalizedFileName || '';
        const fileNameWords = normalizedFileName.split(/\s+/).filter(w => w.length > 0);
        
        const score = {
            // 1. Eşleşen kelime sayısı (0-50 puan - azaltıldı)
            match_count: result.match_count * 5,
            
            // 2. Eşleşme oranı (0-100 puan)
            match_ratio: (result.match_count / searchWords.length) * 100,
            
            // 3. Dosya adı uzunluğu penaltısı (kısa dosyalar daha alakalı)
            length_penalty: Math.max(0, 50 - (fileNameWords.length * 2)),
            
            // 4. Exact phrase bonus (çok yüksek bonus - en önemli kriter)
            exact_phrase: normalizedFileName.includes(normalizedQuery) ? 500 : 0,
            
            // 5. Partial phrase bonus (tüm kelimeler varsa ama sıra farklı)
            partial_phrase: this.calculatePartialPhraseBonus(normalizedFileName, searchWords),
            
            // 5. Başlangıç kelimesi bonusu
            starts_with: normalizedFileName.startsWith(searchWords[0]) ? 50 : 0,
            
            // 6. Ardışık kelime bonusu
            consecutive: this.calculateConsecutiveBonus(normalizedFileName, searchWords),
            
            total: 0
        };
        
        score.total = 
            score.match_count + 
            score.match_ratio + 
            score.length_penalty + 
            score.exact_phrase + 
            score.partial_phrase +
            score.starts_with + 
            score.consecutive;
        
        return score;
    }

    /**
     * Partial phrase bonus hesapla
     * Tüm kelimeler varsa ama sıra farklı ise bonus ver
     */
    calculatePartialPhraseBonus(normalizedFileName, searchWords) {
        const fileNameWords = normalizedFileName.split(/\s+/).filter(w => w.length > 0);
        const allWordsFound = searchWords.every(word => fileNameWords.includes(word));
        return allWordsFound ? 300 : 0; // Tüm kelimeler varsa 300 puan bonus
    }

    /**
     * Ardışık kelime bonusu hesapla
     * Örn: "nankör kedi" araması → "nankör kedi remix" daha yüksek puan alır
     */
    calculateConsecutiveBonus(normalizedFileName, searchWords) {
        let bonus = 0;
        const words = normalizedFileName.split(/\s+/);
        
        for (let i = 0; i < words.length - 1; i++) {
            for (let j = 0; j < searchWords.length - 1; j++) {
                if (words[i] === searchWords[j] && words[i + 1] === searchWords[j + 1]) {
                    bonus += 30; // Her ardışık kelime için 30 puan
                }
            }
        }
        
        return bonus;
    }

    /**
     * Fix önerileri için özel arama
     * Eşleşmemiş bir track için en iyi music file'ı bul
     */
    async findBestMatch(trackFileName, options = {}) {
        const {
            limit = 10,
            minScore = 100 // Fix önerileri için minimum puan
        } = options;

        const results = await this.searchMusicFiles(trackFileName, {
            limit,
            minScore,
            includeScoreDetails: true
        });

        return results.map(result => ({
            music_file_path: result.track_path,
            music_file_name: result.fileName,
            music_file_normalized: result.normalizedFileName,
            similarity_score: Math.min(result.score / 400, 1.0), // 0-1 normalize
            match_type: this.getMatchType(result.score),
            matched_words: result.match_count,
            score: result.score,
            score_details: result.score_details
        }));
    }

    /**
     * Score'a göre match type belirle
     */
    getMatchType(score) {
        if (score >= 350) return 'exact';
        if (score >= 250) return 'high';
        if (score >= 150) return 'medium';
        return 'low';
    }

    /**
     * Batch arama - Birden fazla track için toplu arama
     * Fix önerileri için optimize edilmiş
     */
    async batchSearch(tracks, options = {}) {
        const {
            resultsPerTrack = 1,
            minScore = 100
        } = options;

        const results = [];
        
        for (const track of tracks) {
            const searchQuery = track.normalizedFileName || track.fileName;
            const matches = await this.findBestMatch(searchQuery, {
                limit: resultsPerTrack,
                minScore
            });

            if (matches.length > 0) {
                results.push({
                    track,
                    matches
                });
            }
        }

        return results;
    }
}

module.exports = SearchService;

