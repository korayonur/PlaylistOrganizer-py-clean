/**
 * KAÇIRILAN EŞLEŞMELER ANALİZ ARACI
 * 
 * API'nin kaçırdığı ama manuel hesaplamanın bulduğu dosyaları detaylı analiz eder
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class MissedMatchAnalyzer {
    constructor() {
        this.apiUrl = 'http://localhost:50001';
        this.musicDatabase = null;
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
     * Kelime çıkarma - server.js ile aynı
     */
    extractWords(fileName, filePath) {
        const CHAR_MAP = {
            "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
            "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O"
        };
        
        function normalizeText(text) {
            let normalized = text.normalize("NFKC");
            normalized = normalized.split('').map(c => CHAR_MAP[c] || c).join('');
            normalized = normalized.toLowerCase();
            normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
            normalized = normalized.replace(/\s+/g, ' ');
            return normalized.trim();
        }
        
        // Klasör kelimeleri
        const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
        const folderWords = [];
        for (const folder of pathParts) {
            const normalizedFolder = normalizeText(folder);
            folderWords.push(...normalizedFolder.split(/\s+/).filter(w => w.length > 1));
        }
        
        // Dosya kelimeleri (parantez temizleme ile)
        const fileNameWithoutExt = path.parse(fileName).name;
        const cleanedFileName = fileNameWithoutExt
            .replace(/\([^)]*\)/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/\{[^}]*\}/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        const fileNameParts = cleanedFileName.split(/[-_\s]+/).filter(part => part.length > 0);
        const fileWords = [];
        for (const part of fileNameParts) {
            const normalizedPart = normalizeText(part);
            fileWords.push(...normalizedPart.split(/\s+/).filter(w => w.length > 1));
        }
        
        return {
            folder_words: folderWords,
            file_words: fileWords,
            parentheses_words: [], // Basit versiyon
            all_words: [...folderWords, ...fileWords]
        };
    }

    /**
     * Manuel benzerlik hesaplama
     */
    calculateManualSimilarity(searchWords, targetWords) {
        const searchFile = searchWords.file_words;
        const targetFile = targetWords.file_words;
        
        if (searchFile.length === 0 || targetFile.length === 0) {
            return 0.0;
        }
        
        // Exact match
        let exactMatches = 0;
        for (const searchWord of searchFile) {
            if (targetFile.includes(searchWord)) {
                exactMatches++;
            }
        }
        const exactScore = exactMatches / searchFile.length;
        
        // Fuzzy match
        let fuzzyScore = 0;
        let comparisons = 0;
        for (const searchWord of searchFile) {
            let bestSimilarity = 0;
            for (const targetWord of targetFile) {
                if (targetWord.includes(searchWord) && searchWord.length >= 3) {
                    bestSimilarity = Math.max(bestSimilarity, 0.8);
                }
                if (searchWord.includes(targetWord) && targetWord.length >= 3) {
                    bestSimilarity = Math.max(bestSimilarity, 0.7);
                }
            }
            if (bestSimilarity > 0) {
                fuzzyScore += bestSimilarity;
                comparisons++;
            }
        }
        fuzzyScore = comparisons > 0 ? fuzzyScore / comparisons : 0.0;
        
        // Context match
        const searchFolder = searchWords.folder_words;
        const targetFolder = targetWords.folder_words;
        let contextScore = 0.0;
        if (searchFolder.length > 0 && targetFolder.length > 0) {
            let exactFolderMatches = 0;
            for (const searchWord of searchFolder) {
                if (targetFolder.includes(searchWord)) {
                    exactFolderMatches++;
                }
            }
            contextScore = exactFolderMatches / Math.max(searchFolder.length, targetFolder.length);
        }
        
        // Final score
        const baseScore = (exactScore * 0.35) + (fuzzyScore * 0.2) + (contextScore * 0.15) + (0.1 * 0.1) + (0.0 * 0.2);
        return Math.max(0.0, Math.min(1.0, baseScore));
    }

    /**
     * Kaçırılan dosyayı detaylı analiz et
     */
    async analyzeMissedFile(searchPath, manualBestPath) {
        console.log(`\n🔍 DETAYLI ANALİZ: ${path.basename(searchPath)}`);
        console.log('='.repeat(60));

        // 1. Kelime analizi
        const searchFileName = path.basename(searchPath);
        const manualFileName = path.basename(manualBestPath);
        
        const searchWords = this.extractWords(searchFileName, searchPath);
        const manualWords = this.extractWords(manualFileName, manualBestPath);
        
        console.log(`📝 ARAMA DOSYASI: ${searchFileName}`);
        console.log(`   Klasör kelimeleri: [${searchWords.folder_words.join(', ')}]`);
        console.log(`   Dosya kelimeleri: [${searchWords.file_words.join(', ')}]`);
        
        console.log(`\n📝 MANUEL EN İYİ: ${manualFileName}`);
        console.log(`   Klasör kelimeleri: [${manualWords.folder_words.join(', ')}]`);
        console.log(`   Dosya kelimeleri: [${manualWords.file_words.join(', ')}]`);

        // 2. Veritabanından gerçek dosyayı bul
        const db = await this.loadDatabase();
        const manualFile = db.musicFiles.find(f => f.path === manualBestPath);
        
        if (manualFile) {
            console.log(`\n📝 VERİTABANINDAKİ GERÇEK VERİ:`);
            console.log(`   Normalize isim: "${manualFile.normalizedName}"`);
            console.log(`   Klasör kelimeleri: [${manualFile.folderWords.join(', ')}]`);
            console.log(`   Dosya kelimeleri: [${manualFile.fileWords.join(', ')}]`);
            console.log(`   Parantez kelimeleri: [${(manualFile.parenthesesWords || []).join(', ')}]`);
        }

        // 3. API'nin bulduğu sonucu al
        try {
            const response = await axios.post(`${this.apiUrl}/api/search/files`, {
                paths: [searchPath],
                options: { limit: 10, threshold: 0.01 }
            });

            if (response.data.status === 'success' && response.data.data[0]) {
                const apiResult = response.data.data[0];
                const apiMatches = apiResult.matches || [];
                
                console.log(`\n📊 API SONUÇLARI:`);
                apiMatches.slice(0, 5).forEach((match, index) => {
                    const isManualBest = match.path === manualBestPath;
                    const marker = isManualBest ? '🎯' : '  ';
                    console.log(`   ${marker} ${index + 1}. ${match.similarity.toFixed(4)} - ${path.basename(match.path)}`);
                    
                    if (isManualBest) {
                        console.log(`      👆 Bu manuel en iyi eşleşme! Sıralama: ${index + 1}`);
                    }
                });

                // Manuel en iyi dosya API sonuçlarında var mı?
                const manualInAPI = apiMatches.find(m => m.path === manualBestPath);
                if (manualInAPI) {
                    const rank = apiMatches.findIndex(m => m.path === manualBestPath) + 1;
                    console.log(`\n✅ Manuel en iyi dosya API'de ${rank}. sırada (${manualInAPI.similarity.toFixed(4)})`);
                    console.log(`❌ SORUN: SIRALAMA ALGORİTMASI - daha iyi dosya aşağıda kaldı`);
                } else {
                    console.log(`\n❌ Manuel en iyi dosya API sonuçlarında YOK!`);
                    console.log(`❌ SORUN: BENZERLİK ALGORİTMASI - dosya threshold'u geçemiyor`);
                }
            }
        } catch (error) {
            console.error('❌ API analiz hatası:', error.message);
        }

        // 4. Kelime eşleşme analizi
        if (manualFile) {
            console.log(`\n🔤 KELİME EŞLEŞME ANALİZİ:`);
            
            const searchFileWords = searchWords.file_words;
            const targetFileWords = manualFile.fileWords;
            
            console.log(`   Arama kelimeleri: [${searchFileWords.join(', ')}]`);
            console.log(`   Hedef kelimeleri: [${targetFileWords.join(', ')}]`);
            
            // Exact matches
            const exactMatches = searchFileWords.filter(sw => targetFileWords.includes(sw));
            console.log(`   Exact eşleşmeler: [${exactMatches.join(', ')}] (${exactMatches.length}/${searchFileWords.length})`);
            
            // Partial matches
            const partialMatches = [];
            searchFileWords.forEach(sw => {
                targetFileWords.forEach(tw => {
                    if (tw.includes(sw) && sw.length >= 3) {
                        partialMatches.push(`${sw}→${tw}`);
                    }
                    if (sw.includes(tw) && tw.length >= 3) {
                        partialMatches.push(`${sw}⊃${tw}`);
                    }
                });
            });
            console.log(`   Partial eşleşmeler: [${partialMatches.join(', ')}]`);
            
            // Klasör eşleşmeleri
            const folderMatches = searchWords.folder_words.filter(fw => manualFile.folderWords.includes(fw));
            console.log(`   Klasör eşleşmeleri: [${folderMatches.join(', ')}] (${folderMatches.length}/${searchWords.folder_words.length})`);
        }
    }

    /**
     * Tüm kaçırılan dosyaları analiz et
     */
    async analyzeAllMissedFiles() {
        console.log('🔍 KAÇIRILAN DOSYALAR ANALİZİ');
        console.log('='.repeat(50));

        // Test verilerini hazırla
        const missedCases = [
            {
                search: "/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Filatov, Karas, Sharapov - Au Au (Vincent & Diaz Mashup) (2).mp3",
                manualBest: "Filatov, Karas, Sharapov - Au Au (Vincent & Diaz Mashup).mp3"
            },
            {
                search: "/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Peter Piper(Run DMC)It Takes Two(Rod Base) Sample Endii track (6).m4a", 
                manualBest: "Peter Piper(Run DMC)It Takes Two(Rod Base) Sample Endii track.m4a"
            },
            {
                search: "/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/6IX9INE- PUNANI (Official Music Video) (3).m4a",
                manualBest: "6IX9INE- PUNANI (Official Music Video).m4a"
            },
            {
                search: "/Users/koray/Music/KorayMusics/Video/Bodrum Akşamları (Club Remix).mp4",
                manualBest: "Bülent Serttaş - Bodrum Akşamları (Official Audio Music).m4a"
            }
        ];

        // Manuel en iyi dosyaları veritabanında bul
        const db = await this.loadDatabase();
        const realMissedCases = [];

        for (const testCase of missedCases) {
            // Manuel en iyi dosyayı veritabanında ara
            const manualFile = db.musicFiles.find(f => 
                f.path.includes(testCase.manualBest) || 
                path.basename(f.path) === testCase.manualBest
            );
            
            if (manualFile) {
                realMissedCases.push({
                    ...testCase,
                    manualBestPath: manualFile.path
                });
            } else {
                console.log(`⚠️ Manuel en iyi dosya veritabanında bulunamadı: ${testCase.manualBest}`);
            }
        }

        // Her birini detaylı analiz et
        for (const testCase of realMissedCases) {
            await this.analyzeMissedFile(testCase.search, testCase.manualBestPath);
            console.log('\n' + '='.repeat(60));
        }

        // Genel analiz ve öneriler
        this.generateImprovementSuggestions(realMissedCases);
    }

    /**
     * İyileştirme önerileri oluştur
     */
    generateImprovementSuggestions(missedCases) {
        console.log('\n💡 İYİLEŞTİRME ÖNERİLERİ');
        console.log('='.repeat(40));

        console.log('\n🔍 SORUN ANALİZİ:');
        console.log('1. Parantez içerik sorunu: "(2)", "(3)" gibi sayılar farklılık yaratıyor');
        console.log('2. Sıralama algoritması: Daha iyi eşleşmeler aşağıda kalıyor');
        console.log('3. Context matching: Klasör benzerliği yanlış ağırlıklandırılıyor olabilir');

        console.log('\n🔧 ÖNERİLEN ÇÖZÜMLER:');
        
        console.log('\n1️⃣ PARANTEZ İÇİ SAYI NORMALIZASYONU:');
        console.log('```javascript');
        console.log('// Parantez içindeki sayıları ignore et');
        console.log('function cleanParenthesesNumbers(text) {');
        console.log('    return text.replace(/\\(\\d+\\)/g, "").trim();');
        console.log('}');
        console.log('```');

        console.log('\n2️⃣ SKOR HESAPLAMA İYİLEŞTİRMESİ:');
        console.log('```javascript');
        console.log('// Exact match ağırlığını artır');
        console.log('const baseScore = (exactScore * 0.5) + (fuzzyScore * 0.2) + ');
        console.log('                  (contextScore * 0.1) + (specialScore * 0.1) + ');
        console.log('                  (parenthesesScore * 0.1);');
        console.log('```');

        console.log('\n3️⃣ THRESHOLD OPTİMİZASYONU:');
        console.log('```javascript');
        console.log('// Dinamik threshold - kelime sayısına göre');
        console.log('const threshold = searchWords.file_words.length === 1 ? 0.2 : 0.1;');
        console.log('```');

        console.log('\n4️⃣ FUZZY MATCHING İYİLEŞTİRMESİ:');
        console.log('```javascript');
        console.log('// Levenshtein distance threshold\'unu düşür');
        console.log('if (similarity > 0.5) { // 0.6\'dan 0.5\'e');
        console.log('    bestSimilarity = Math.max(bestSimilarity, similarity);');
        console.log('}');
        console.log('```');

        console.log('\n🎯 ÖNCELİK SIRASI:');
        console.log('1. 🔴 YÜKSEK: Parantez içi sayı normalizasyonu');
        console.log('2. 🟡 ORTA: Exact match ağırlığını artır');
        console.log('3. 🟢 DÜŞÜK: Fuzzy matching threshold');
    }

    /**
     * Belirli bir dosya için detaylı analiz
     */
    async analyzeSpecificFile(searchPath) {
        console.log(`🎯 ÖZEL DOSYA ANALİZİ: ${path.basename(searchPath)}`);
        console.log('='.repeat(50));

        // API sonucunu al
        try {
            const response = await axios.post(`${this.apiUrl}/api/search/files`, {
                paths: [searchPath],
                options: { limit: 10, threshold: 0.01 }
            });

            const apiResult = response.data.data[0];
            const apiMatches = apiResult.matches || [];

            console.log(`\n📊 API BULDUĞU İLK 5 SONUÇ:`);
            apiMatches.slice(0, 5).forEach((match, index) => {
                console.log(`   ${index + 1}. ${match.similarity.toFixed(4)} - ${path.basename(match.path)}`);
            });

            // Manuel en iyi 5'i bul
            const db = await this.loadDatabase();
            const searchWords = this.extractWords(path.basename(searchPath), searchPath);
            
            const manualResults = [];
            for (const file of db.musicFiles) {
                const targetWords = {
                    folder_words: file.folderWords,
                    file_words: file.fileWords,
                    parentheses_words: file.parenthesesWords || []
                };
                
                const similarity = this.calculateManualSimilarity(searchWords, targetWords);
                if (similarity > 0.01) {
                    manualResults.push({
                        path: file.path,
                        similarity: similarity,
                        file: file
                    });
                }
            }

            manualResults.sort((a, b) => b.similarity - a.similarity);

            console.log(`\n📊 MANUEL HESAPLAMA İLK 5 SONUÇ:`);
            manualResults.slice(0, 5).forEach((match, index) => {
                const inAPI = apiMatches.find(a => a.path === match.path);
                const apiRank = inAPI ? apiMatches.findIndex(a => a.path === match.path) + 1 : 'YOK';
                console.log(`   ${index + 1}. ${match.similarity.toFixed(4)} - ${path.basename(match.path)} (API: ${apiRank})`);
            });

            // Karşılaştırma
            console.log(`\n🔄 KARŞILAŞTIRMA:`);
            const apiTop = apiMatches[0];
            const manualTop = manualResults[0];
            
            if (apiTop && manualTop) {
                console.log(`   API En İyi: ${apiTop.similarity.toFixed(4)} - ${path.basename(apiTop.path)}`);
                console.log(`   Manuel En İyi: ${manualTop.similarity.toFixed(4)} - ${path.basename(manualTop.path)}`);
                console.log(`   Fark: ${(apiTop.similarity - manualTop.similarity).toFixed(4)}`);
                
                if (apiTop.path === manualTop.path) {
                    console.log(`   ✅ Aynı dosya - algoritma optimal`);
                } else {
                    console.log(`   ❌ Farklı dosyalar - algoritma iyileştirilebilir`);
                }
            }

        } catch (error) {
            console.error('❌ API analiz hatası:', error.message);
        }
    }
}

// CLI kullanımı
if (require.main === module) {
    const analyzer = new MissedMatchAnalyzer();
    
    const command = process.argv[2];
    const filePath = process.argv[3];
    
    async function main() {
        try {
            if (command === 'all') {
                await analyzer.analyzeAllMissedFiles();
            } else if (command === 'file' && filePath) {
                await analyzer.analyzeSpecificFile(filePath);
            } else {
                console.log('🔧 KAÇIRILAN EŞLEŞMELER ANALİZ ARACI');
                console.log('='.repeat(40));
                console.log('Kullanım:');
                console.log('  node analyze_missed_matches.js all                    # Tüm kaçırılan dosyaları analiz et');
                console.log('  node analyze_missed_matches.js file <dosya_yolu>     # Belirli dosyayı analiz et');
                console.log('\nÖrnekler:');
                console.log('  node analyze_missed_matches.js all');
                console.log('  node analyze_missed_matches.js file "/path/to/file.mp3"');
            }
        } catch (error) {
            console.error('❌ Fatal error:', error);
        }
    }
    
    main();
}

module.exports = MissedMatchAnalyzer;
