'use strict';

/**
 * Fuzzy Search Service
 * Normalize edilmiş metinler üzerinde fuzzy matching sağlar
 */
class FuzzySearchService {
    constructor(db, wordIndexService) {
        this.db = db;
        this.wordIndexService = wordIndexService;
        this.cache = new Map();
        this.similarityCache = new Map();
    }

    /**
     * Hibrit arama: Exact + Fuzzy
     * @param {string} query - Arama sorgusu
     * @param {Object} options - Arama seçenekleri
     * @returns {Array} Arama sonuçları
     */
    async searchTracks(query, options = {}) {
        const {
            limit = null,
            offset = 0,
            fuzzyThreshold = 0.7,
            enableFuzzy = true,
            includeScoreDetails = true,
            tableType = 'music_words'
        } = options;

        // 1. Normalize query
        const normalizedQuery = this.wordIndexService.normalize(query);
        const words = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

        if (words.length === 0) {
            return [];
        }

        // 2. Exact search (mevcut sistem)
        const exactResults = await this.exactSearch(words, {
            limit,
            offset,
            includeScoreDetails,
            tableType
        });

        // 3. Fuzzy search (sadece gerekirse)
        if (enableFuzzy && exactResults.length < limit) {
            const fuzzyResults = await this.fuzzySearch(words, {
                limit: limit - exactResults.length,
                threshold: fuzzyThreshold,
                includeScoreDetails,
                tableType
            });

            return [...exactResults, ...fuzzyResults];
        }

        return exactResults;
    }

    /**
     * Exact search (mevcut sistem)
     */
    async exactSearch(words, options) {
        const { limit, offset, includeScoreDetails, tableType } = options;
        
        // Tekrar eden kelimeleri filtrele - unique kelimeleri al
        const uniqueWords = [...new Set(words)];
        
        const tableName = tableType === 'music_words' ? 'music_words' : 'track_words';
        const pathColumn = tableType === 'music_words' ? 'music_path' : 'track_path';
        const joinTable = tableType === 'music_words' ? 'music_files' : 'tracks';

        const placeholders = uniqueWords.map(() => '?').join(', ');
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

        // PERFORMANS OPTİMİZASYONU: Akıllı buffer sistemi (SearchService'ten kopyalandı)
        let queryLimit;
        if (limit === null) {
            queryLimit = 10000; // Tüm sonuçlar için yüksek limit
        } else if (limit === 1) {
            queryLimit = 50; // En iyi sonuç için yeterli buffer
        } else if (limit <= 10) {
            queryLimit = limit * 3; // Küçük limitler için 3x buffer
        } else {
            queryLimit = Math.min(limit + 50, 10000); // Büyük limitler için sabit buffer (max 10000)
        }
        const rawResults = stmt.all(...uniqueWords, queryLimit, offset);

        // Puanlama sistemi
        const scoredResults = rawResults.map(result => {
            const score = this.calculateScore(result, uniqueWords, words.join(' '));
            
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

        // Puana göre sırala (yüksekten düşüğe)
        scoredResults.sort((a, b) => b.score - a.score);
        
        return scoredResults;
    }

    /**
     * Fuzzy search
     */
    async fuzzySearch(searchWords, options) {
        const { limit, threshold, includeScoreDetails, tableType } = options;
        
        // 1. Tüm unique kelimeleri al (cache'den veya database'den)
        const allWords = await this.getAllUniqueWords(limit * 20);
        
        // 2. Her kelime için similarity hesapla
        const similarities = [];
        
        for (const searchWord of searchWords) {
            for (const dbWord of allWords) {
                const similarity = this.calculateSimilarity(searchWord, dbWord);
                
                if (similarity >= threshold) {
                    similarities.push({
                        word: dbWord,
                        similarity: similarity,
                        searchWord: searchWord
                    });
                }
            }
        }
        
        // 3. En yüksek similarity'ye göre sırala
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        // 4. Unique kelimeleri al
        const uniqueWords = limit ? [...new Set(similarities.map(s => s.word))].slice(0, limit) : [...new Set(similarities.map(s => s.word))];
        
        if (uniqueWords.length === 0) {
            return [];
        }
        
        // 5. Bu kelimelerle normal arama yap
        return await this.exactSearch(uniqueWords, {
            limit: uniqueWords.length,
            offset: 0,
            includeScoreDetails,
            tableType
        });
    }

    /**
     * Similarity hesaplama (hibrit algoritma)
     */
    calculateSimilarity(str1, str2) {
        const cacheKey = `${str1}_${str2}`;
        if (this.similarityCache.has(cacheKey)) {
            return this.similarityCache.get(cacheKey);
        }

        const editScore = this.calculateEditDistance(str1, str2);
        const ngramScore = this.calculateNgramSimilarity(str1, str2);
        const prefixScore = this.calculatePrefixSimilarity(str1, str2);
        
        // Weighted average
        const hybridScore = (editScore * 0.5) + (ngramScore * 0.3) + (prefixScore * 0.2);
        
        this.similarityCache.set(cacheKey, hybridScore);
        return hybridScore;
    }

    /**
     * Edit Distance (Levenshtein)
     */
    calculateEditDistance(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        
        // Kısa string kontrolü
        if (Math.abs(len1 - len2) > 2) return 0;
        
        // Hamming distance (aynı uzunluk)
        if (len1 === len2) {
            let matches = 0;
            for (let i = 0; i < len1; i++) {
                if (str1[i] === str2[i]) matches++;
            }
            return matches / len1;
        }
        
        // Levenshtein distance (farklı uzunluk)
        const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));
        
        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i-1] === str2[j-1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j-1][i] + 1,      // deletion
                    matrix[j][i-1] + 1,      // insertion
                    matrix[j-1][i-1] + cost  // substitution
                );
            }
        }
        
        const distance = matrix[len2][len1];
        return Math.max(0, 1 - distance / Math.max(len1, len2));
    }

    /**
     * N-gram Similarity
     */
    calculateNgramSimilarity(str1, str2, n = 2) {
        const getNgrams = (str) => {
            const ngrams = new Set();
            for (let i = 0; i <= str.length - n; i++) {
                ngrams.add(str.slice(i, i + n));
            }
            return ngrams;
        };
        
        const ngrams1 = getNgrams(str1);
        const ngrams2 = getNgrams(str2);
        
        if (ngrams1.size === 0 && ngrams2.size === 0) return 1;
        if (ngrams1.size === 0 || ngrams2.size === 0) return 0;
        
        const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
        const union = new Set([...ngrams1, ...ngrams2]);
        
        return intersection.size / union.size;
    }

    /**
     * Prefix/Suffix Similarity
     */
    calculatePrefixSimilarity(str1, str2) {
        const minLen = Math.min(str1.length, str2.length);
        const maxLen = Math.max(str1.length, str2.length);
        
        // Prefix matching
        let prefixMatch = 0;
        for (let i = 0; i < minLen; i++) {
            if (str1[i] === str2[i]) prefixMatch++;
            else break;
        }
        
        // Suffix matching
        let suffixMatch = 0;
        for (let i = 1; i <= minLen; i++) {
            if (str1[str1.length - i] === str2[str2.length - i]) suffixMatch++;
            else break;
        }
        
        const prefixScore = prefixMatch / maxLen;
        const suffixScore = suffixMatch / maxLen;
        const lengthPenalty = 1 - Math.abs(str1.length - str2.length) / maxLen;
        
        return (prefixScore + suffixScore + lengthPenalty) / 3;
    }

    /**
     * Tüm unique kelimeleri al (cache'li)
     */
    async getAllUniqueWords(limit) {
        const cacheKey = `words_${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const words = this.db.prepare(`
            SELECT DISTINCT word 
            FROM music_words 
            ORDER BY word 
            LIMIT ?
        `).all(limit).map(row => row.word);
        
        this.cache.set(cacheKey, words);
        return words;
    }

    /**
     * Puanlama sistemi (mevcut sistemden kopyalandı)
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
            
            // 6. Başlangıç kelimesi bonusu
            starts_with: normalizedFileName.startsWith(searchWords[0]) ? 50 : 0,
            
            // 7. Ardışık kelime bonusu
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
     * Ardışık kelime bonusu
     */
    calculateConsecutiveBonus(normalizedFileName, searchWords) {
        let bonus = 0;
        const words = normalizedFileName.split(/\s+/);
        
        for (let i = 0; i < words.length - 1; i++) {
            for (let j = 0; j < searchWords.length - 1; j++) {
                if (words[i] === searchWords[j] && words[i + 1] === searchWords[j + 1]) {
                    bonus += 30;
                }
            }
        }
        
        return bonus;
    }

    /**
     * Cache temizle
     */
    clearCache() {
        this.cache.clear();
        this.similarityCache.clear();
    }

    /**
     * Cache istatistikleri
     */
    getCacheStats() {
        return {
            wordCache: this.cache.size,
            similarityCache: this.similarityCache.size,
            totalMemory: (this.cache.size + this.similarityCache.size) * 100 // Rough estimate
        };
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
            score_details: result.score_details,
            match_count: result.match_count
        }));
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

module.exports = FuzzySearchService;
