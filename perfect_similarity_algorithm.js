/**
 * MÜKEMMEL BENZERLİK ALGORİTMASI
 * 
 * Global-missing ve musicfiles.db.json analizi sonucu geliştirildi
 * Test sonuçları: %61.3 başarısızlık → %95+ başarı hedefi
 */

const path = require('path');
const fs = require('fs');

class PerfectSimilarityAlgorithm {
    constructor() {
        this.musicDatabase = null;
        this.performanceStats = {
            totalSearches: 0,
            exactMatches: 0,
            fuzzyMatches: 0,
            contextMatches: 0,
            parenthesesMatches: 0,
            remixPenalties: 0
        };
    }

    async loadDatabase() {
        if (this.musicDatabase) return this.musicDatabase;
        
        try {
            const dbPath = '/Users/koray/projects/PlaylistOrganizer-py/musicfiles.db.json';
            const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            this.musicDatabase = dbData;
            console.log(`📊 Veritabanı yüklendi: ${dbData.musicFiles.length} dosya`);
            return dbData;
        } catch (error) {
            console.error('❌ Veritabanı yükleme hatası:', error.message);
            return null;
        }
    }

    /**
     * GELİŞMİŞ KARAKTER NORMALİZASYONU
     * Türkçe karakterler + uluslararası karakterler
     */
    normalizeText(text, options = {}) {
        const ENHANCED_CHAR_MAP = {
            // Türkçe karakterler
            "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
            "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
            
            // Uluslararası karakterler
            "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
            "è": "e", "é": "e", "ê": "e", "ë": "e", "ì": "i", "í": "i", "î": "i", "ï": "i",
            "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u",
            "ý": "y", "þ": "th", "ÿ": "y", "ß": "ss", "ð": "d", "ñ": "n",
            
            // Rusça karakterler
            "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh",
            "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
            "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts",
            "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
            
            // Arapça karakterler
            "ا": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh", "د": "d",
            "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s", "ض": "d", "ط": "t",
            "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m",
            "ن": "n", "ه": "h", "و": "w", "ي": "y"
        };

        if (typeof text !== 'string') return '';

        const keepSpaces = options.keepSpaces !== false;
        const keepSpecialChars = options.keepSpecialChars || false;
        const keepCase = options.keepCase || false;

        let normalized = text;

        // NFKC normalizasyonu ve karakter dönüşümü
        normalized = normalized.normalize("NFKC");
        normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');

        if (!keepCase) {
            normalized = normalized.toLowerCase();
        }

        if (!keepSpecialChars) {
            // Sadece alfanumerik ve boşluk karakterlerini koru
            normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
        }

        // Çoklu boşlukları tek boşluğa çevir
        normalized = normalized.replace(/\s+/g, ' ');
        return normalized.trim();
    }

    /**
     * GELİŞMİŞ PARANTEZ FİLTRELEME
     * Test sonuçlarına göre parantez kelimeleri çok kritik
     */
    advancedParenthesesFilter(text) {
        // Ana metni parantezlerden temizle
        const mainText = text
            .replace(/\([^)]*\)/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/\{[^}]*\}/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Tüm parantez türlerini yakala
        const parenthesesMatches = text.match(/\([^)]*\)/g) || [];
        const bracketMatches = text.match(/\[[^\]]*\]/g) || [];
        const braceMatches = text.match(/\{[^}]*\}/g) || [];
        
        const allMatches = [...parenthesesMatches, ...bracketMatches, ...braceMatches];
        
        const importantParenthesesWords = [];
        const noiseWords = [
            // Genel gürültü kelimeleri
            'official', 'audio', 'video', 'music', 'hd', 'stereo', 'mono',
            'remaster', 'remastered', 'enhanced', 'deluxe', 'high', 'quality',
            'feat', 'featuring', 'ft', 'with', 'vs', 'and', 've', 'ile',
            'youtube', 'spotify', 'apple', 'lyric', 'lyrics', 'karaoke',
            'resmi', 'muzik', 'sarki', 'klip', 'canli', 'performans',
            
            // Türkçe gürültü kelimeleri
            'klip', 'muzik', 'sarki', 'resmi', 'video', 'audio', 'hd',
            'stereo', 'mono', 'remaster', 'remastered', 'enhanced',
            
            // Sadece genel remix kelimeleri - özel remix kelimeleri korunacak
            'version', 'edit', 'mix', 'bootleg', 'mashup',
            'extended', 'radio', 'club', 'dub', 'instrumental'
            // 'remix' kaldırıldı - artık özel remix kelimeleri korunacak
        ];
        
        allMatches.forEach(match => {
            const content = match.replace(/[\(\)\[\]\{\}]/g, '');
            const words = content.split(/[\s\-_,&]+/).filter(w => w.length > 1);
            
            words.forEach(word => {
                const normalizedWord = this.normalizeText(word, { keepSpaces: false });
                
                const isNoise = noiseWords.includes(normalizedWord);
                const isNumber = /^\d{1,4}$/.test(normalizedWord);
                const isShort = normalizedWord.length < 3;
                
                // Sayıları da parantez kelimesi olarak kabul et (2012, 4 gibi)
                if (!isNoise && !isShort) {
                    importantParenthesesWords.push(normalizedWord);
                }
            });
        });
        
        return {
            mainText: mainText,
            parenthesesWords: importantParenthesesWords,
            hybridText: mainText + (importantParenthesesWords.length > 0 ? ' ' + importantParenthesesWords.join(' ') : '')
        };
    }

    /**
     * MÜKEMMEL KELİME ÇIKARMA
     * Test sonuçlarına göre optimize edildi
     */
    extractPerfectWords(fileName, filePath = "") {
        const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
        const relevantFolders = pathParts;
        
        const fileNameWithoutExt = path.parse(fileName).name;
        
        // PARANTEZ İÇİ SAYI NORMALIZASYONU - kaldırıldı, sayılar da parantez kelimesi olacak
        const cleanedNameForParentheses = fileNameWithoutExt;
        
        // GELİŞMİŞ PARANTEZ SİSTEMİ
        const advancedFiltered = this.advancedParenthesesFilter(cleanedNameForParentheses);
        const cleanedFileName = advancedFiltered.mainText;
        
        // Kelime ayırma - daha agresif
        const fileNameParts = cleanedFileName.split(/[-_\s\.\,\&\+\|\~\!\@\#\$\%\^\*\(\)\[\]\{\}]+/)
            .map(part => part.trim())
            .filter(part => part.length > 0);
        
        // Klasör kelimelerini normalize et
        const folderWords = [];
        for (const folder of relevantFolders) {
            const normalizedFolder = this.normalizeText(folder, { keepSpaces: false });
            const camelCaseWords = normalizedFolder.replace(/([a-z])([A-Z])/g, '$1 $2');
            folderWords.push(...camelCaseWords.split(/\s+/).filter(w => w.length > 1));
        }
        
        // Dosya adı kelimelerini normalize et
        const fileWords = [];
        for (const part of fileNameParts) {
            if (part.trim()) {
                const normalizedPart = this.normalizeText(part, { keepSpaces: false });
                const words = normalizedPart.split(/\s+/).filter(w => w.length > 1);
                fileWords.push(...words);
            }
        }
        
        // Parantez kelimeleri - çok kritik!
        const parenthesesWords = advancedFiltered.parenthesesWords;
        
        return {
            'folder_words': folderWords,
            'file_words': fileWords,
            'parentheses_words': parenthesesWords,
            'all_words': [...folderWords, ...fileWords, ...parenthesesWords]
        };
    }

    /**
     * EXACT MATCH HESAPLAMA - Geliştirilmiş
     * Test sonuçlarına göre en kritik faktör
     */
    calculateExactMatch(searchWords, targetWords) {
        const searchFile = searchWords['file_words'];
        const targetFile = targetWords['file_words'];
        
        if (searchFile.length === 0 || targetFile.length === 0) {
            return 0.0;
        }
        
        let exactMatches = 0;
        let sequenceBonus = 0;
        let positionBonus = 0;
        
        // 1. Tam kelime eşleşmeleri - TEKRARLANAN KELİMELER İÇİN ÖZEL BONUS
        const searchWordCounts = {};
        const targetWordCounts = {};
        
        // Arama kelimelerini say
        for (const word of searchFile) {
            searchWordCounts[word] = (searchWordCounts[word] || 0) + 1;
        }
        
        // Hedef kelimelerini say
        for (const word of targetFile) {
            targetWordCounts[word] = (targetWordCounts[word] || 0) + 1;
        }
        
        // Eşleşmeleri hesapla - tekrarlanan kelimeler için özel bonus
        for (const [word, searchCount] of Object.entries(searchWordCounts)) {
            if (targetWordCounts[word]) {
                const targetCount = targetWordCounts[word];
                const matchedCount = Math.min(searchCount, targetCount);
                exactMatches += matchedCount;
                
                // Tekrarlanan kelime bonusu - "sari sari" gibi
                if (matchedCount > 1) {
                    exactMatches += (matchedCount - 1) * 0.5; // %50 bonus
                }
            }
        }
        
        // 2. Kelime sırası bonusu - ardışık eşleşmeler
        for (let i = 0; i < searchFile.length - 1; i++) {
            const currentWord = searchFile[i];
            const nextWord = searchFile[i + 1];
            
            const currentIndex = targetFile.indexOf(currentWord);
            const nextIndex = targetFile.indexOf(nextWord);
            
            if (currentIndex !== -1 && nextIndex !== -1 && nextIndex === currentIndex + 1) {
                sequenceBonus += 0.3; // Artırıldı
            }
        }
        
        // 3. Tam sıra eşleşmesi bonusu
        let fullSequenceBonus = 0;
        if (searchFile.length >= 2 && targetFile.length >= searchFile.length) {
            let isFullSequence = true;
            let lastIndex = -1;
            
            for (const searchWord of searchFile) {
                const index = targetFile.indexOf(searchWord);
                if (index === -1 || index <= lastIndex) {
                    isFullSequence = false;
                    break;
                }
                lastIndex = index;
            }
            
            if (isFullSequence) {
                fullSequenceBonus = 0.4; // Artırıldı
            }
        }
        
        // 4. Pozisyon bonusu - başta eşleşme daha değerli
        for (let i = 0; i < Math.min(searchFile.length, 3); i++) {
            const searchWord = searchFile[i];
            const targetIndex = targetFile.indexOf(searchWord);
            if (targetIndex === i) {
                positionBonus += 0.2;
            }
        }
        
        const baseScore = exactMatches / searchFile.length;
        const totalScore = baseScore + sequenceBonus + fullSequenceBonus + positionBonus;
        
        // 1.0'ı geçen skorlar özel bonus - "Sarı Sarı" gibi tam eşleşmeler için
        if (totalScore > 1.0) {
            return totalScore; // 1.0'ı geçen skorları koru
        }
        
        return Math.min(1.0, totalScore);
    }

    /**
     * FUZZY MATCH HESAPLAMA - Geliştirilmiş
     */
    calculateFuzzyMatch(searchWords, targetWords) {
        const searchFile = searchWords['file_words'];
        const targetFile = targetWords['file_words'];
        
        if (searchFile.length === 0 || targetFile.length === 0) {
            return 0.0;
        }
        
        let totalSimilarity = 0;
        let comparisons = 0;
        
        for (const searchWord of searchFile) {
            let bestSimilarity = 0;
            
            for (const targetWord of targetFile) {
                // Substring kontrolü - geliştirilmiş
                if (targetWord.includes(searchWord) && searchWord.length >= 3) {
                    const ratio = searchWord.length / targetWord.length;
                    bestSimilarity = Math.max(bestSimilarity, 0.7 + (ratio * 0.2));
                }
                
                if (searchWord.includes(targetWord) && targetWord.length >= 3) {
                    const ratio = targetWord.length / searchWord.length;
                    bestSimilarity = Math.max(bestSimilarity, 0.6 + (ratio * 0.2));
                }
                
                // Levenshtein benzerliği - basit versiyon
                if (searchWord.length >= 3 && targetWord.length >= 3) {
                    const distance = this.levenshteinDistance(searchWord, targetWord);
                    const maxLen = Math.max(searchWord.length, targetWord.length);
                    const similarity = 1 - (distance / maxLen);
                    
                    if (similarity > 0.6) {
                        bestSimilarity = Math.max(bestSimilarity, similarity);
                    }
                }
            }
            
            if (bestSimilarity > 0) {
                totalSimilarity += bestSimilarity;
                comparisons++;
            }
        }
        
        return comparisons > 0 ? totalSimilarity / comparisons : 0.0;
    }

    /**
     * CONTEXT MATCH HESAPLAMA - Geliştirilmiş
     */
    calculateContextMatch(searchWords, targetWords) {
        const searchFolder = searchWords['folder_words'];
        const targetFolder = targetWords['folder_words'];
        
        if (searchFolder.length === 0 || targetFolder.length === 0) {
            return 0.0;
        }
        
        let exactMatches = 0;
        let fuzzyMatches = 0;
        
        for (const searchWord of searchFolder) {
            if (targetFolder.includes(searchWord)) {
                exactMatches++;
            } else {
                // Fuzzy context match
                for (const targetWord of targetFolder) {
                    if (targetWord.includes(searchWord) || searchWord.includes(targetWord)) {
                        fuzzyMatches += 0.5;
                        break;
                    }
                }
            }
        }
        
        const totalMatches = exactMatches + fuzzyMatches;
        return totalMatches / Math.max(searchFolder.length, targetFolder.length);
    }

    /**
     * PARANTEZ MATCH HESAPLAMA - Çok kritik!
     * Test sonuçlarına göre en önemli faktörlerden biri
     */
    calculateParenthesesMatch(searchWords, targetWords) {
        const searchParentheses = searchWords['parentheses_words'];
        const targetParentheses = targetWords['parentheses_words'];
        
        if (searchParentheses.length === 0 || targetParentheses.length === 0) {
            return 0.0;
        }
        
        let exactMatches = 0;
        let fuzzyMatches = 0;
        
        for (const searchWord of searchParentheses) {
            if (targetParentheses.includes(searchWord)) {
                exactMatches++;
            } else {
                // Fuzzy parantez match
                for (const targetWord of targetParentheses) {
                    if (targetWord.includes(searchWord) || searchWord.includes(targetWord)) {
                        fuzzyMatches += 0.7;
                        break;
                    }
                }
            }
        }
        
        const totalMatches = exactMatches + fuzzyMatches;
        return totalMatches / searchParentheses.length;
    }

    /**
     * REMIX PENALTY HESAPLAMA
     * Test sonuçlarına göre remix kategorisi %12 başarı
     */
    calculateRemixPenalty(searchWords, targetWords) {
        const searchFile = searchWords['file_words'];
        const targetFile = targetWords['file_words'];
        const searchParentheses = searchWords['parentheses_words'];
        const targetParentheses = targetWords['parentheses_words'];
        
        // Remix kelimeleri
        const remixWords = ['remix', 'version', 'edit', 'mix', 'bootleg', 'mashup', 'extended'];
        
        const searchHasRemix = searchFile.some(word => remixWords.includes(word)) ||
                              searchParentheses.some(word => remixWords.includes(word));
        
        const targetHasRemix = targetFile.some(word => remixWords.includes(word)) ||
                              targetParentheses.some(word => remixWords.includes(word));
        
        // Parantez kontrolü
        const searchHasParentheses = searchParentheses.length > 0;
        const targetHasParentheses = targetParentheses.length > 0;
        
        // Remix penalty hesaplama
        let penalty = 0;
        
        if (!searchHasRemix && targetHasRemix) {
            penalty += 0.3; // Remix olmayan aramada remix dosya penalty
        }
        
        if (!searchHasParentheses && targetHasParentheses) {
            penalty += 0.2; // Parantez olmayan aramada parantezli dosya penalty
        }
        
        return penalty;
    }

    /**
     * LEVENSHTEIN DISTANCE - Basit versiyon
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * MÜKEMMEL BENZERLİK HESAPLAMA
     * Test sonuçlarına göre optimize edilmiş ağırlıklar
     */
    calculatePerfectSimilarity(searchWords, targetWords) {
        if (!searchWords || !targetWords || 
            !searchWords['file_words'] || !targetWords['file_words'] ||
            searchWords['file_words'].length === 0 || targetWords['file_words'].length === 0) {
            return 0.0;
        }
        
        // 1. Exact match - en kritik (test sonuçlarına göre)
        const exactScore = this.calculateExactMatch(searchWords, targetWords);
        
        // 2. Fuzzy match - ikinci kritik
        const fuzzyScore = this.calculateFuzzyMatch(searchWords, targetWords);
        
        // 3. Context match - klasör uyumu
        const contextScore = this.calculateContextMatch(searchWords, targetWords);
        
        // 4. Parantez match - çok kritik! (test sonuçlarına göre)
        const parenthesesScore = this.calculateParenthesesMatch(searchWords, targetWords);
        
        // 5. Remix penalty - remix kategorisi %12 başarı
        const remixPenalty = this.calculateRemixPenalty(searchWords, targetWords);
        
        // 6. Dosya adı uzunluğu penaltısı
        let lengthPenalty = 0.0;
        const targetFileWords = targetWords['file_words'];
        const searchFileWords = searchWords['file_words'];
        
        const targetHasNumbers = targetFileWords.some(word => /^\d+$/.test(word));
        if (targetHasNumbers) {
            lengthPenalty += 0.1; // Azaltıldı
        }
        
        if (targetFileWords.length > searchFileWords.length * 2) {
            const lengthRatio = targetFileWords.length / searchFileWords.length;
            lengthPenalty += Math.min(0.2, (lengthRatio - 2) * 0.05);
        }
        
        // 7. TAM EŞLEŞME BONUSU - "Sarı Sarı" gibi tam eşleşmeler için (DENGELİ)
        let perfectMatchBonus = 0.0;
        if (exactScore >= 0.9) { // Çok yüksek exact match
            perfectMatchBonus = 0.1; // %10 bonus (azaltıldı)
        } else if (exactScore >= 0.7) { // Yüksek exact match
            perfectMatchBonus = 0.05; // %5 bonus (azaltıldı)
        }
        
        // 8. Final score hesaplama - test sonuçlarına göre optimize edilmiş ağırlıklar
        const baseScore = (exactScore * 0.40) +           // Azaltıldı
                         (fuzzyScore * 0.20) +            // Azaltıldı
                         (contextScore * 0.05) +          // Aynı
                         (parenthesesScore * 0.35) +      // Artırıldı - çok kritik!
                         perfectMatchBonus;               // TAM EŞLEŞME BONUSU!
        
        const finalScore = Math.max(0.0, baseScore - lengthPenalty - remixPenalty);
        
        // 8. Minimum threshold - çok düşük
        if (exactScore < 0.01 && fuzzyScore < 0.05 && parenthesesScore < 0.01) {
            return 0.0;
        }
        
        return Math.max(0.0, Math.min(1.0, finalScore));
    }

    /**
     * MÜKEMMEL ARAMA FONKSİYONU
     */
    async searchPerfectMatch(searchPath, options = {}) {
        const db = await this.loadDatabase();
        if (!db) return { found: false, matches: [] };

        const fileName = path.basename(searchPath);
        const searchWords = this.extractPerfectWords(fileName, searchPath);
        
        const threshold = options.threshold || 0.01;
        const limit = options.limit || 10;
        
        let candidates = [];
        let processedCount = 0;
        
        console.log(`🔍 Mükemmel algoritma ile arama: [${searchWords.file_words.join(', ')}]`);
        if (searchWords.parentheses_words.length > 0) {
            console.log(`📦 Parantez kelimeleri: [${searchWords.parentheses_words.join(', ')}]`);
        }
        
        const startTime = Date.now();
        
        for (const file of db.musicFiles) {
            processedCount++;
            
            const targetWords = {
                'folder_words': file.folderWords,
                'file_words': file.fileWords,
                'parentheses_words': file.parenthesesWords || [],
                'all_words': [...file.folderWords, ...file.fileWords, ...(file.parenthesesWords || [])]
            };
            
            const similarity = this.calculatePerfectSimilarity(searchWords, targetWords);
            
            if (similarity >= threshold) {
                candidates.push({
                    path: file.path,
                    name: file.name,
                    similarity: similarity,
                    file: file,
                    matchDetails: {
                        exactScore: this.calculateExactMatch(searchWords, targetWords),
                        fuzzyScore: this.calculateFuzzyMatch(searchWords, targetWords),
                        contextScore: this.calculateContextMatch(searchWords, targetWords),
                        parenthesesScore: this.calculateParenthesesMatch(searchWords, targetWords),
                        remixPenalty: this.calculateRemixPenalty(searchWords, targetWords)
                    }
                });
            }
        }
        
        // MÜKEMMEL SIRALAMA - test sonuçlarına göre optimize edildi
        candidates.sort((a, b) => {
            // 1. Benzerlik skoruna göre
            if (Math.abs(a.similarity - b.similarity) > 0.001) {
                return b.similarity - a.similarity;
            }
            
            // 2. Exact match sayısına göre
            const aExact = a.matchDetails.exactScore;
            const bExact = b.matchDetails.exactScore;
            if (Math.abs(aExact - bExact) > 0.01) {
                return bExact - aExact;
            }
            
            // 3. Parantez skoruna göre
            const aParentheses = a.matchDetails.parenthesesScore;
            const bParentheses = b.matchDetails.parenthesesScore;
            if (Math.abs(aParentheses - bParentheses) > 0.01) {
                return bParentheses - aParentheses;
            }
            
            // 4. Dosya adı uzunluğuna göre (daha kısa = daha spesifik)
            const aLength = a.file.fileNameOnly.length;
            const bLength = b.file.fileNameOnly.length;
            if (Math.abs(aLength - bLength) > 5) {
                return aLength - bLength;
            }
            
            // 5. Remix penalty'ye göre (daha az penalty = daha iyi)
            const aRemixPenalty = a.matchDetails.remixPenalty;
            const bRemixPenalty = b.matchDetails.remixPenalty;
            return aRemixPenalty - bRemixPenalty;
        });
        
        const totalTime = Date.now() - startTime;
        console.log(`⏱️ Toplam süre: ${totalTime}ms (${(processedCount / totalTime * 1000).toFixed(0)} dosya/sn)`);
        
        const matches = candidates.slice(0, limit).map(candidate => ({
            path: candidate.path,
            name: candidate.name,
            similarity: candidate.similarity,
            matchDetails: candidate.matchDetails
        }));
        
        return {
            found: matches.length > 0,
            matches: matches,
            totalProcessed: processedCount,
            searchTime: totalTime
        };
    }

    /**
     * PERFORMANS İSTATİSTİKLERİ
     */
    getPerformanceStats() {
        return this.performanceStats;
    }

    /**
     * TEST FONKSİYONU
     */
    async testAlgorithm(testFiles) {
        console.log('🧪 MÜKEMMEL ALGORİTMA TEST SİSTEMİ');
        console.log('='.repeat(50));
        
        const results = [];
        
        for (let i = 0; i < testFiles.length; i++) {
            const testFile = testFiles[i];
            console.log(`\n[${i + 1}/${testFiles.length}] ${path.basename(testFile)}`);
            
            const result = await this.searchPerfectMatch(testFile, { threshold: 0.01, limit: 5 });
            
            results.push({
                file: testFile,
                result: result
            });
            
            if (result.found) {
                console.log(`✅ En iyi eşleşme: ${result.matches[0].similarity.toFixed(4)} - ${path.parse(result.matches[0].name).name}`);
                console.log(`📊 Skorlar: E:${result.matches[0].matchDetails.exactScore.toFixed(3)} F:${result.matches[0].matchDetails.fuzzyScore.toFixed(3)} P:${result.matches[0].matchDetails.parenthesesScore.toFixed(3)}`);
            } else {
                console.log(`❌ Eşleşme bulunamadı`);
            }
        }
        
        return results;
    }
}

// CLI kullanımı
if (require.main === module) {
    const algorithm = new PerfectSimilarityAlgorithm();
    
    const command = process.argv[2];
    
    async function main() {
        try {
            if (command === 'test') {
                const testFiles = [
                    '/Users/koray/Music/KorayMusics/Video2019/Mahsun Kırmızıgül - Sarı Sarı.m4a',
                    '/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Loboda - Pulia Dura (Eddie G & Roma YNG Moombahton Remix) (1).mp3',
                    '/Users/koray/Music/KorayMusics/SahitHoca/bachata kizomba hitt/Massimo Scalic - Massimo Scalici (Roxanne Bachata Version).mp3'
                ];
                await algorithm.testAlgorithm(testFiles);
            } else if (command === 'single') {
                const testFile = process.argv[3];
                if (testFile) {
                    const result = await algorithm.searchPerfectMatch(testFile, { threshold: 0.01, limit: 10 });
                    console.log('\n📊 SONUÇLAR:');
                    console.log(JSON.stringify(result, null, 2));
                } else {
                    console.log('Kullanım: node perfect_similarity_algorithm.js single <dosya_yolu>');
                }
            } else {
                console.log('🔧 MÜKEMMEL BENZERLİK ALGORİTMASI');
                console.log('='.repeat(40));
                console.log('Kullanım:');
                console.log('  node perfect_similarity_algorithm.js test        # Test dosyaları');
                console.log('  node perfect_similarity_algorithm.js single <path> # Tek dosya test');
            }
        } catch (error) {
            console.error('❌ Fatal error:', error);
        }
    }
    
    main();
}

module.exports = PerfectSimilarityAlgorithm;
