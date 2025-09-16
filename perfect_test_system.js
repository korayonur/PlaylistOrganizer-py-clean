/**
 * MÜKEMMEL BENZERLİK TEST SİSTEMİ
 * 
 * Server.js algoritması ile %100 uyumlu test sistemi
 * Gerçek sorunları yakalayacak şekilde tasarlandı
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

class PerfectSimilarityTester {
    constructor() {
        this.apiUrl = 'http://localhost:50001';
        this.musicDatabase = null;
        this.serverAlgorithmCache = new Map(); // Performans için cache
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
     * SERVER.JS İLE TAM AYNI ALGORİTMA - KOPYALA YAPIŞTIR
     */
    
    // 1. Normalizasyon fonksiyonu (server.js'ten kopya)
    normalizeText(text, options = {}) {
        const ENHANCED_CHAR_MAP = {
            "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
            "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
            "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
            "è": "e", "é": "e", "ê": "e", "ë": "e", "ì": "i", "í": "i", "î": "i", "ï": "i",
            "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u",
            "ý": "y", "þ": "th", "ÿ": "y", "ß": "ss", "ð": "d", "ñ": "n"
        };

        if (typeof text !== 'string') {
            throw new TypeError("Input must be a string");
        }

        const keepSpaces = options.keepSpaces !== false;
        const keepSpecialChars = options.keepSpecialChars || false;
        const keepCase = options.keepCase || false;
        const keepDiacritics = options.keepDiacritics || false;

        let normalized = text;

        if (!keepDiacritics) {
            normalized = normalized.normalize("NFKC");
            normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');
        }

        if (!keepCase) {
            normalized = normalized.toLowerCase();
        }

        if (!keepSpecialChars) {
            normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
        }

        normalized = normalized.replace(/\s+/g, ' ');
        return normalized.trim();
    }

    // 2. Hibrit parantez filtreleme (server.js'ten kopya)
    hybridParenthesesFilter(text) {
        const mainText = text
            .replace(/\([^)]*\)/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/\{[^}]*\}/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        const parenthesesMatches = text.match(/\([^)]*\)/g) || [];
        const bracketMatches = text.match(/\[[^\]]*\]/g) || [];
        const braceMatches = text.match(/\{[^}]*\}/g) || [];
        
        const allMatches = [...parenthesesMatches, ...bracketMatches, ...braceMatches];
        
        const importantParenthesesWords = [];
        const noiseWords = [
            'official', 'audio', 'video', 'music', 'hd', 'stereo', 'mono',
            'remaster', 'remastered', 'enhanced', 'deluxe', 'high', 'quality',
            'feat', 'featuring', 'ft', 'with', 'vs', 'and', 've', 'ile',
            'youtube', 'spotify', 'apple', 'lyric', 'lyrics', 'karaoke',
            'resmi', 'muzik', 'sarki', 'klip', 'canli', 'performans'
        ];
        
        allMatches.forEach(match => {
            const content = match.replace(/[\(\)\[\]\{\}]/g, '');
            const words = content.split(/[\s\-_,&]+/).filter(w => w.length > 1);
            
            words.forEach(word => {
                const normalizedWord = this.normalizeText(word, { keepSpaces: false });
                
                const isNoise = noiseWords.includes(normalizedWord);
                const isNumber = /^\d{1,4}$/.test(normalizedWord);
                
                if (!isNoise && !isNumber && normalizedWord.length >= 3) {
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

    // 3. Kelime çıkarma (server.js'ten kopya)
    extractImprovedWords(fileName, filePath = "") {
        const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
        const relevantFolders = pathParts;
        
        const fileNameWithoutExt = path.parse(fileName).name;
        
        // PARANTEZ İÇİ SAYI NORMALIZASYONU
        const cleanedNameForParentheses = fileNameWithoutExt.replace(/\(\d+\)/g, '').trim();
        
        // HİBRİT PARANTEZ SİSTEMİ
        const hybridFiltered = this.hybridParenthesesFilter(cleanedNameForParentheses);
        const cleanedFileName = hybridFiltered.mainText;
        
        // Kelime ayırma
        const fileNameParts = cleanedFileName.split(/[-_\s\.\,\&\+\|\~\!\@\#\$\%\^\*\(\)\[\]\{\}]+/).map(part => part.trim()).filter(part => part.length > 0);
        
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
        
        // Parantez kelimeleri
        const parenthesesWords = hybridFiltered.parenthesesWords;
        
        return {
            'folder_words': folderWords,
            'file_words': fileWords,
            'parentheses_words': parenthesesWords,
            'all_words': [...folderWords, ...fileWords, ...parenthesesWords]
        };
    }

    // 4. Exact match hesaplama (server.js'ten kopya)
    calculateExactMatch(searchWords, targetWords) {
        const searchFile = searchWords['file_words'];
        const targetFile = targetWords['file_words'];
        
        if (searchFile.length === 0 || targetFile.length === 0) {
            return 0.0;
        }
        
        let exactMatches = 0;
        let sequenceBonus = 0;
        
        // 1. Tam kelime eşleşmeleri
        for (const searchWord of searchFile) {
            if (targetFile.includes(searchWord)) {
                exactMatches++;
            }
        }
        
        // 2. Kelime sırası bonusu - ardışık eşleşmeler
        for (let i = 0; i < searchFile.length - 1; i++) {
            const currentWord = searchFile[i];
            const nextWord = searchFile[i + 1];
            
            const currentIndex = targetFile.indexOf(currentWord);
            const nextIndex = targetFile.indexOf(nextWord);
            
            if (currentIndex !== -1 && nextIndex !== -1 && nextIndex === currentIndex + 1) {
                sequenceBonus += 0.2;
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
                fullSequenceBonus = 0.3;
            }
        }
        
        const baseScore = exactMatches / searchFile.length;
        return Math.min(1.0, baseScore + sequenceBonus + fullSequenceBonus);
    }

    // 5. Fuzzy match hesaplama (server.js'ten kopya)
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
                // Substring kontrolü
                if (targetWord.includes(searchWord) && searchWord.length >= 3) {
                    bestSimilarity = Math.max(bestSimilarity, 0.8);
                }
                
                if (searchWord.includes(targetWord) && targetWord.length >= 3) {
                    bestSimilarity = Math.max(bestSimilarity, 0.7);
                }
            }
            
            if (bestSimilarity > 0) {
                totalSimilarity += bestSimilarity;
                comparisons++;
            }
        }
        
        return comparisons > 0 ? totalSimilarity / comparisons : 0.0;
    }

    // 6. Context match hesaplama (server.js'ten kopya)
    calculateContextMatch(searchWords, targetWords) {
        const searchFolder = searchWords['folder_words'];
        const targetFolder = targetWords['folder_words'];
        
        if (searchFolder.length === 0 || targetFolder.length === 0) {
            return 0.0;
        }
        
        let exactMatches = 0;
        
        for (const searchWord of searchFolder) {
            if (targetFolder.includes(searchWord)) {
                exactMatches++;
            }
        }
        
        return exactMatches / Math.max(searchFolder.length, targetFolder.length);
    }

    // 7. Special matches hesaplama (server.js'ten kopya - basitleştirilmiş)
    calculateSpecialMatches(searchWords, targetWords) {
        const searchFile = searchWords['file_words'];
        const targetFile = targetWords['file_words'];
        
        let specialScore = 0;
        let specialCount = 0;
        
        for (const searchWord of searchFile) {
            for (const targetWord of targetFile) {
                // Kelime içerme kontrolü
                if (targetWord.includes(searchWord) && searchWord.length >= 3) {
                    specialScore += 0.8;
                    specialCount++;
                } else if (searchWord.includes(targetWord) && targetWord.length >= 3) {
                    specialScore += 0.7;
                    specialCount++;
                }
            }
        }
        
        return specialCount > 0 ? specialScore / specialCount : 0.0;
    }

    // 8. Ana benzerlik hesaplama (server.js'ten kopya)
    calculateNewSimilarity(searchWords, targetWords) {
        if (!searchWords || !targetWords || 
            !searchWords['file_words'] || !targetWords['file_words'] ||
            searchWords['file_words'].length === 0 || targetWords['file_words'].length === 0) {
            return 0.0;
        }
        
        // 1. Exact match
        const exactScore = this.calculateExactMatch(searchWords, targetWords);
        
        // 2. Fuzzy match
        const fuzzyScore = this.calculateFuzzyMatch(searchWords, targetWords);
        
        // 3. Context match
        const contextScore = this.calculateContextMatch(searchWords, targetWords);
        
        // 4. Special matches
        const specialScore = this.calculateSpecialMatches(searchWords, targetWords);
        
        // 5. Parantez kelimeleri için skor
        let parenthesesScore = 0.0;
        const searchParentheses = searchWords['parentheses_words'];
        const targetParentheses = targetWords['parentheses_words'];
        
        if (searchParentheses.length > 0 && targetParentheses.length > 0) {
            let parenthesesMatches = 0;
            for (const searchWord of searchParentheses) {
                if (targetParentheses.includes(searchWord)) {
                    parenthesesMatches++;
                }
            }
            parenthesesScore = parenthesesMatches / searchParentheses.length;
        }
        
        // 6. Dosya adı uzunluğu penaltısı
        let lengthPenalty = 0.0;
        const targetFileWords = targetWords['file_words'];
        const searchFileWords = searchWords['file_words'];
        
        const targetHasNumbers = targetFileWords.some(word => /^\d+$/.test(word));
        if (targetHasNumbers) {
            lengthPenalty += 0.15;
        }
        
        if (targetFileWords.length > searchFileWords.length * 1.5) {
            const lengthRatio = targetFileWords.length / searchFileWords.length;
            lengthPenalty += Math.min(0.25, (lengthRatio - 1.5) * 0.1);
        }
        
        // 7. Final score hesaplama (server.js ile aynı ağırlıklar)
        const baseScore = (exactScore * 0.4) + (fuzzyScore * 0.2) + (contextScore * 0.05) + (specialScore * 0.15) + (parenthesesScore * 0.2);
        const finalScore = Math.max(0.0, baseScore - lengthPenalty);
        
        // 8. Minimum threshold kontrolü (server.js'te yorum satırı yapıldı)
        // Server.js'te bu kontrol şu anda kapalı
        
        return Math.max(0.0, Math.min(1.0, finalScore));
    }

    /**
     * Veritabanında en iyi eşleşmeyi bul (server.js algoritması ile)
     */
    async findTrueBestMatch(searchPath, threshold = 0.01) {
        const db = await this.loadDatabase();
        if (!db) return null;

        const fileName = path.basename(searchPath);
        const searchWords = this.extractImprovedWords(fileName, searchPath);
        
        let bestMatch = null;
        let bestSimilarity = 0;
        let processedCount = 0;
        
        console.log(`   🔍 Server.js algoritması ile analiz: [${searchWords.file_words.join(', ')}]`);
        if (searchWords.parentheses_words.length > 0) {
            console.log(`   📦 Parantez kelimeleri: [${searchWords.parentheses_words.join(', ')}]`);
        }
        
        const startTime = Date.now();
        
        for (const file of db.musicFiles) {
            processedCount++;
            
            // Progress gösterimi
            if (processedCount % 15000 === 0) {
                const elapsed = Date.now() - startTime;
                const rate = processedCount / elapsed * 1000;
                const eta = (db.musicFiles.length - processedCount) / rate;
                console.log(`   📊 İşlenen: ${processedCount}/${db.musicFiles.length} (${rate.toFixed(0)} dosya/sn, ETA: ${eta.toFixed(0)}s)`);
            }
            
            const targetWords = {
                'folder_words': file.folderWords,
                'file_words': file.fileWords,
                'parentheses_words': file.parenthesesWords || [],
                'all_words': [...file.folderWords, ...file.fileWords, ...(file.parenthesesWords || [])]
            };
            
            const similarity = this.calculateNewSimilarity(searchWords, targetWords);
            
            if (similarity > bestSimilarity && similarity >= threshold) {
                bestSimilarity = similarity;
                bestMatch = {
                    path: file.path,
                    name: file.name,
                    similarity: similarity,
                    file: file,
                    scores: {
                        exact: this.calculateExactMatch(searchWords, targetWords),
                        fuzzy: this.calculateFuzzyMatch(searchWords, targetWords),
                        context: this.calculateContextMatch(searchWords, targetWords),
                        special: this.calculateSpecialMatches(searchWords, targetWords),
                        parentheses: searchWords.parentheses_words.length > 0 && targetWords.parentheses_words.length > 0 ?
                            searchWords.parentheses_words.filter(w => targetWords.parentheses_words.includes(w)).length / searchWords.parentheses_words.length : 0.0
                    }
                };
                
                // Yüksek skorlu eşleşmeleri logla
                if (similarity > 0.7) {
                    console.log(`   🎯 Yeni en iyi: ${similarity.toFixed(4)} - ${file.name}`);
                    console.log(`      Skorlar: E:${bestMatch.scores.exact.toFixed(3)} F:${bestMatch.scores.fuzzy.toFixed(3)} C:${bestMatch.scores.context.toFixed(3)} S:${bestMatch.scores.special.toFixed(3)} P:${bestMatch.scores.parentheses.toFixed(3)}`);
                }
            }
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`   ⏱️ Toplam süre: ${totalTime}ms (${(processedCount / totalTime * 1000).toFixed(0)} dosya/sn)`);
        
        if (bestMatch) {
            console.log(`   ✅ En iyi eşleşme: ${bestMatch.similarity.toFixed(4)} - ${bestMatch.name}`);
            console.log(`   📊 Detay skorlar: E:${bestMatch.scores.exact.toFixed(3)} F:${bestMatch.scores.fuzzy.toFixed(3)} C:${bestMatch.scores.context.toFixed(3)} S:${bestMatch.scores.special.toFixed(3)} P:${bestMatch.scores.parentheses.toFixed(3)}`);
        } else {
            console.log(`   ❌ Eşleşme bulunamadı (threshold: ${threshold})`);
        }
        
        return bestMatch;
    }

    /**
     * API vs Server Algoritması karşılaştırması
     */
    async compareAPIvsServer(searchPath, options = {}) {
        try {
            console.log(`\n🔬 API vs SERVER ALGORİTMASI KARŞILAŞTIRMASI`);
            console.log(`📁 Dosya: ${path.basename(searchPath)}`);
            console.log('='.repeat(60));

            // 1. API sonucunu al
            const response = await axios.post(`${this.apiUrl}/api/search/files`, {
                paths: [searchPath],
                options: {
                    limit: 10,
                    threshold: options.threshold || 0.01
                }
            });

            let apiResult = null;
            if (response.data.status === 'success' && response.data.data && response.data.data[0]) {
                apiResult = response.data.data[0];
            }

            // 2. Server algoritması ile manuel hesaplama
            const serverBest = await this.findTrueBestMatch(searchPath, options.threshold || 0.01);

            // 3. Karşılaştırma
            console.log(`\n📊 KARŞILAŞTIRMA SONUÇLARI:`);
            
            if (apiResult && apiResult.found && apiResult.matches.length > 0) {
                const apiTop = apiResult.matches[0];
                console.log(`   🔵 API En İyi: ${apiTop.similarity.toFixed(4)} - ${path.parse(apiTop.path).name}`);
                
                if (serverBest) {
                    console.log(`   🟢 Server En İyi: ${serverBest.similarity.toFixed(4)} - ${path.parse(serverBest.name).name}`);
                    
                    const difference = apiTop.similarity - serverBest.similarity;
                    console.log(`   📈 Fark: ${difference.toFixed(4)}`);
                    
                    if (Math.abs(difference) < 0.001) {
                        console.log(`   ✅ MÜKEMMEL UYUM: API ile server algoritması aynı sonucu veriyor`);
                        return { status: 'PERFECT', difference: difference };
                    } else if (difference >= 0) {
                        console.log(`   ✅ API DAHA İYİ: API daha yüksek skor buluyor`);
                        return { status: 'API_BETTER', difference: difference };
                    } else {
                        console.log(`   ❌ SERVER DAHA İYİ: API daha iyi sonucu kaçırıyor`);
                        console.log(`   🔍 Kaçırılan dosya: ${serverBest.name}`);
                        return { status: 'API_MISSING', difference: difference, missedFile: serverBest };
                    }
                } else {
                    console.log(`   🟢 Server En İyi: Eşleşme bulunamadı`);
                    console.log(`   ✅ API DAHA İYİ: Server hiç eşleşme bulamazken API buluyor`);
                    return { status: 'API_ONLY' };
                }
            } else {
                console.log(`   🔵 API En İyi: Eşleşme bulunamadı`);
                
                if (serverBest) {
                    console.log(`   🟢 Server En İyi: ${serverBest.similarity.toFixed(4)} - ${path.parse(serverBest.name).name}`);
                    console.log(`   ❌ API EKSIK: Server eşleşme bulurken API bulamıyor`);
                    return { status: 'SERVER_ONLY', missedFile: serverBest };
                } else {
                    console.log(`   🟢 Server En İyi: Eşleşme bulunamadı`);
                    console.log(`   ⚪ UYUM: Her ikisi de eşleşme bulamıyor`);
                    return { status: 'BOTH_EMPTY' };
                }
            }

        } catch (error) {
            console.error('❌ Karşılaştırma hatası:', error.message);
            return { status: 'ERROR', error: error.message };
        }
    }

    /**
     * Birden fazla dosya için batch test
     */
    async runBatchComparison(testFiles, options = {}) {
        console.log('🧪 BATCH API vs SERVER KARŞILAŞTIRMASI');
        console.log('='.repeat(50));
        
        const results = [];
        
        for (let i = 0; i < testFiles.length; i++) {
            const testFile = testFiles[i];
            console.log(`\n[${i + 1}/${testFiles.length}] ${path.basename(testFile)}`);
            
            const result = await this.compareAPIvsServer(testFile, options);
            results.push({
                file: testFile,
                result: result
            });
            
            // Batch'ler arası kısa bekleme
            if (i < testFiles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // Özet istatistikler
        console.log('\n📊 BATCH TEST ÖZETİ');
        console.log('='.repeat(30));
        
        const stats = {
            perfect: results.filter(r => r.result.status === 'PERFECT').length,
            apiBetter: results.filter(r => r.result.status === 'API_BETTER').length,
            apiMissing: results.filter(r => r.result.status === 'API_MISSING').length,
            apiOnly: results.filter(r => r.result.status === 'API_ONLY').length,
            serverOnly: results.filter(r => r.result.status === 'SERVER_ONLY').length,
            bothEmpty: results.filter(r => r.result.status === 'BOTH_EMPTY').length,
            errors: results.filter(r => r.result.status === 'ERROR').length
        };
        
        console.log(`✅ Mükemmel uyum: ${stats.perfect}`);
        console.log(`🔵 API daha iyi: ${stats.apiBetter}`);
        console.log(`❌ API kaçırıyor: ${stats.apiMissing}`);
        console.log(`🔵 Sadece API buluyor: ${stats.apiOnly}`);
        console.log(`🟢 Sadece Server buluyor: ${stats.serverOnly}`);
        console.log(`⚪ İkisi de bulamıyor: ${stats.bothEmpty}`);
        console.log(`🔥 Hata: ${stats.errors}`);
        
        const totalTests = results.length;
        const successfulTests = stats.perfect + stats.apiBetter + stats.apiOnly;
        const successRate = (successfulTests / totalTests) * 100;
        
        console.log(`\n📈 API Başarı Oranı: %${successRate.toFixed(1)}`);
        
        if (stats.apiMissing > 0) {
            console.log(`\n❌ API'NİN KAÇIRDIĞI DOSYALAR:`);
            results
                .filter(r => r.result.status === 'API_MISSING')
                .forEach(r => {
                    console.log(`   • ${path.basename(r.file)} → ${r.result.missedFile.name} (${r.result.missedFile.similarity.toFixed(4)})`);
                });
        }
        
        return results;
    }
}

// CLI kullanımı
if (require.main === module) {
    const tester = new PerfectSimilarityTester();
    
    const command = process.argv[2];
    
    async function main() {
        try {
            if (command === 'loboda') {
                await tester.compareAPIvsServer('/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Loboda - Pulia Dura (Eddie G & Roma YNG Moombahton Remix) (1).mp3');
            } else if (command === 'massimo') {
                await tester.compareAPIvsServer('/Users/koray/Music/KorayMusics/SahitHoca/bachata kizomba hitt/Massimo Scalic - Massimo Scalici (Roxanne Bachata Version).mp3');
            } else if (command === 'batch') {
                const testFiles = [
                    '/Users/koray/Music/KorayMusics/Video2019/Mahsun Kırmızıgül - Sarı Sarı.m4a',
                    '/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Loboda - Pulia Dura (Eddie G & Roma YNG Moombahton Remix) (1).mp3',
                    '/Users/koray/Music/KorayMusics/SahitHoca/bachata kizomba hitt/Massimo Scalic - Massimo Scalici (Roxanne Bachata Version).mp3',
                    '/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Up (4).m4a',
                    '/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Temperature (4).m4a'
                ];
                await tester.runBatchComparison(testFiles);
            } else {
                console.log('🔧 MÜKEMMEL BENZERLİK TEST SİSTEMİ');
                console.log('='.repeat(40));
                console.log('Kullanım:');
                console.log('  node perfect_test_system.js loboda     # Loboda dosyası test');
                console.log('  node perfect_test_system.js massimo    # Massimo dosyası test');
                console.log('  node perfect_test_system.js batch      # Batch test (5 dosya)');
            }
        } catch (error) {
            console.error('❌ Fatal error:', error);
        }
    }
    
    main();
}

module.exports = PerfectSimilarityTester;
