/**
 * BENZERLİK ALGORİTMASI TEST SİSTEMİ
 * Yapılan değişikliklerin doğru çalışıp çalışmadığını test eder
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

class SimilarityFixTester {
    constructor() {
        this.apiUrl = 'http://localhost:50001';
        this.tests = [];
        this.results = [];
        this.musicDatabase = null;
    }

    /**
     * Veritabanını yükle
     */
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
     * Manuel benzerlik hesaplama (server.js'deki algoritmanın GERÇEK kopyası)
     */
    calculateManualSimilarity(searchWords, targetWords) {
        // Exact match
        const searchFile = searchWords.file_words;
        const targetFile = targetWords.file_words;
        
        if (searchFile.length === 0 || targetFile.length === 0) {
            return 0.0;
        }
        
        let exactMatches = 0;
        for (const searchWord of searchFile) {
            if (targetFile.includes(searchWord)) {
                exactMatches++;
            }
        }
        const exactScore = exactMatches / searchFile.length;
        
        // Fuzzy match (server.js ile aynı)
        let fuzzyScore = 0;
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
        
        // Special match (basit versiyon)
        let specialScore = 0.0;
        for (const searchWord of searchFile) {
            for (const targetWord of targetFile) {
                // Kelime içerme kontrolü
                if (targetWord.includes(searchWord) && searchWord.length >= 3) {
                    specialScore += 0.8;
                } else if (searchWord.includes(targetWord) && targetWord.length >= 3) {
                    specialScore += 0.7;
                }
            }
        }
        specialScore = specialScore > 0 ? specialScore / Math.max(searchFile.length, targetFile.length) : 0.0;
        
        // Parantez match (ÖNEMLİ!)
        let parenthesesScore = 0.0;
        const searchParentheses = searchWords.parentheses_words;
        const targetParentheses = targetWords.parentheses_words;
        
        if (searchParentheses.length > 0 && targetParentheses.length > 0) {
            let parenthesesMatches = 0;
            for (const searchWord of searchParentheses) {
                if (targetParentheses.includes(searchWord)) {
                    parenthesesMatches++;
                }
            }
            parenthesesScore = parenthesesMatches / searchParentheses.length;
        }
        
        // Server.js ile aynı final score hesaplama
        const baseScore = (exactScore * 0.4) + (fuzzyScore * 0.2) + (contextScore * 0.05) + (specialScore * 0.15) + (parenthesesScore * 0.2);
        return Math.max(0.0, Math.min(1.0, baseScore));
    }

    /**
     * Kelime çıkarma (server.js'deki extractImprovedWords ile TAM AYNI)
     */
    extractWords(fileName, filePath) {
        const ENHANCED_CHAR_MAP = {
            "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
            "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O"
        };
        
        function normalizeText(text, options = {}) {
            if (typeof text !== 'string') return '';
            
            const keepSpaces = options.keepSpaces !== false;
            let normalized = text;
            
            // NFKC normalizasyonu ve karakter dönüşümü
            normalized = normalized.normalize("NFKC");
            normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');
            normalized = normalized.toLowerCase();
            normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
            normalized = normalized.replace(/\s+/g, ' ');
            
            return normalized.trim();
        }

        function hybridParenthesesFilter(text) {
            // Ana metni parantezlerden temizle
            const mainText = text
                .replace(/\([^)]*\)/g, '')
                .replace(/\[[^\]]*\]/g, '')
                .replace(/\{[^}]*\}/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            // Parantez içeriklerini çıkar
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
                    const normalizedWord = normalizeText(word, { keepSpaces: false });
                    
                    const isNoise = noiseWords.includes(normalizedWord);
                    const isNumber = /^\d{1,4}$/.test(normalizedWord);
                    
                    if (!isNoise && !isNumber && normalizedWord.length >= 3) {
                        importantParenthesesWords.push(normalizedWord);
                    }
                });
            });
            
            return {
                mainText: mainText,
                parenthesesWords: importantParenthesesWords
            };
        }
        
        const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
        const relevantFolders = pathParts;
        
        // Dosya adını normalize et
        const fileNameWithoutExt = path.parse(fileName).name;
        
        // PARANTEZ İÇİ SAYI NORMALIZASYONU
        const cleanedNameForParentheses = fileNameWithoutExt.replace(/\(\d+\)/g, '').trim();
        
        // HİBRİT PARANTEZ SİSTEMİ
        const hybridFiltered = hybridParenthesesFilter(cleanedNameForParentheses);
        const cleanedFileName = hybridFiltered.mainText;
        
        // Kelime ayırma
        const fileNameParts = cleanedFileName.split(/[-_\s\.\,\&\+\|\~\!\@\#\$\%\^\*\(\)\[\]\{\}]+/).map(part => part.trim()).filter(part => part.length > 0);
        
        // Klasör kelimelerini normalize et
        const folderWords = [];
        for (const folder of relevantFolders) {
            const normalizedFolder = normalizeText(folder, { keepSpaces: false });
            const camelCaseWords = normalizedFolder.replace(/([a-z])([A-Z])/g, '$1 $2');
            folderWords.push(...camelCaseWords.split(/\s+/).filter(w => w.length > 1));
        }
        
        // Dosya adı kelimelerini normalize et
        const fileWords = [];
        for (const part of fileNameParts) {
            if (part.trim()) {
                const normalizedPart = normalizeText(part, { keepSpaces: false });
                const words = normalizedPart.split(/\s+/).filter(w => w.length > 1);
                fileWords.push(...words);
            }
        }
        
        // Parantez kelimeleri
        const parenthesesWords = hybridFiltered.parenthesesWords;
        
        return {
            folder_words: folderWords,
            file_words: fileWords,
            parentheses_words: parenthesesWords, // Artık gerçek parantez kelimeleri
            all_words: [...folderWords, ...fileWords, ...parenthesesWords]
        };
    }

    /**
     * Veritabanında en iyi eşleşmeyi manuel olarak bul
     */
    async findBestManualMatch(searchPath, threshold = 0.01) {
        const db = await this.loadDatabase();
        if (!db) return null;

        const fileName = path.basename(searchPath);
        const searchWords = this.extractWords(fileName, searchPath);
        
        let bestMatch = null;
        let bestSimilarity = 0;
        
        console.log(`   🔍 Manuel analiz: ${searchWords.file_words.join(', ')}`);
        
        let processedCount = 0;
        for (const file of db.musicFiles) {
            processedCount++;
            
            // Her 10000 dosyada progress göster
            if (processedCount % 10000 === 0) {
                console.log(`   📊 İşlenen: ${processedCount}/${db.musicFiles.length}`);
            }
            
            const targetWords = {
                folder_words: file.folderWords,
                file_words: file.fileWords,
                parentheses_words: file.parenthesesWords || [],
                all_words: [...file.folderWords, ...file.fileWords, ...(file.parenthesesWords || [])]
            };
            
            const similarity = this.calculateManualSimilarity(searchWords, targetWords);
            
            if (similarity > bestSimilarity && similarity >= threshold) {
                bestSimilarity = similarity;
                bestMatch = {
                    path: file.path,
                    name: file.name,
                    similarity: similarity,
                    file: file
                };
                
                // Debug: En iyi eşleşme güncellendiğinde log
                if (similarity > 0.7) {
                    console.log(`   🎯 Yeni en iyi: ${similarity.toFixed(4)} - ${file.name}`);
                }
            }
        }
        
        if (bestMatch) {
            console.log(`   ✅ Manuel en iyi: ${bestMatch.similarity.toFixed(4)} - ${bestMatch.name}`);
        } else {
            console.log(`   ❌ Manuel eşleşme bulunamadı (threshold: ${threshold})`);
        }
        
        return bestMatch;
    }

    /**
     * Global missing files'tan test case'leri al
     */
    async fetchGlobalMissingFiles() {
        try {
            console.log('🔍 Global missing files listesi alınıyor...');
            const response = await axios.get(`${this.apiUrl}/api/playlistsong/global-missing`);
            
            if (response.data.success || response.data.total_missing_files) {
                console.log(`✅ ${response.data.total_missing_files} eksik dosya bulundu`);
                return response.data.missing_files;
            } else {
                throw new Error('Global missing files alınamadı');
            }
        } catch (error) {
            console.error('❌ Global missing files hatası:', error.message);
            return [];
        }
    }

    /**
     * Dosyayı kategorize et
     */
    categorizeFile(filePath) {
        const fileName = path.basename(filePath, path.extname(filePath));
        const lowerName = fileName.toLowerCase();
        
        // Remix kontrolü
        if (lowerName.includes('remix') || lowerName.includes('mix)')) {
            return 'remix';
        }
        
        // Sanatçı - Başlık formatı
        if (fileName.includes(' - ')) {
            return 'artistTitle';
        }
        
        // Parantez içinde ek bilgi
        if (fileName.includes('(') && fileName.includes(')')) {
            return 'withParentheses';
        }
        
        // Tek kelime
        const words = fileName.split(/[\s\-_]+/).filter(w => w.length > 2);
        if (words.length === 1) {
            return 'singleWord';
        }
        
        return 'standard';
    }

    /**
     * Global missing files'tan test case'leri oluştur
     */
    async defineTestCasesFromGlobal(maxTests = 50) {
        const missingFiles = await this.fetchGlobalMissingFiles();
        if (missingFiles.length === 0) {
            console.log('❌ Eksik dosya bulunamadı, manuel test case\'leri kullanılıyor');
            this.defineManualTestCases();
            return;
        }

        // Kategorilere ayır
        const categories = {};
        missingFiles.forEach(file => {
            const category = this.categorizeFile(file.originalPath);
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(file);
        });

        console.log('\n📂 DOSYA KATEGORİLERİ:');
        Object.keys(categories).forEach(cat => {
            console.log(`   ${cat}: ${categories[cat].length} dosya`);
        });

        // Her kategoriden eşit sayıda test al
        this.tests = [];
        const testsPerCategory = Math.floor(maxTests / Object.keys(categories).length);

        Object.keys(categories).forEach(category => {
            const categoryFiles = categories[category];
            const testCount = Math.min(testsPerCategory, categoryFiles.length);
            
            // Rastgele seç ama çeşitlilik için farklı playlist'lerden al
            const selectedFiles = this.diverseSelection(categoryFiles, testCount);
            
            selectedFiles.forEach((file, index) => {
                const fileName = path.basename(file.originalPath);
                const testCase = {
                    name: `${category} - ${fileName.substring(0, 40)}${fileName.length > 40 ? '...' : ''}`,
                    searchPath: file.originalPath,
                    category: category,
                    playlistName: file.playlistName,
                    expectation: this.getExpectationForCategory(category),
                    minSimilarity: this.getMinSimilarityForCategory(category)
                };

                // Kategori özel beklentiler
                if (category === 'remix') {
                    testCase.shouldNotBeFirst = 'remix';
                    testCase.expectation += ' - Remix dosyalar son sırada olmalı';
                }

                if (category === 'artistTitle') {
                    testCase.expectation += ' - Sanatçı-Başlık formatı iyi eşleşmeli';
                }

                this.tests.push(testCase);
            });
        });

        console.log(`\n✅ ${this.tests.length} test case oluşturuldu`);
    }

    /**
     * Çeşitli playlist'lerden seçim yap
     */
    diverseSelection(files, count) {
        // Playlist'lere göre grupla
        const byPlaylist = {};
        files.forEach(file => {
            if (!byPlaylist[file.playlistName]) {
                byPlaylist[file.playlistName] = [];
            }
            byPlaylist[file.playlistName].push(file);
        });

        const selected = [];
        const playlists = Object.keys(byPlaylist);
        
        for (let i = 0; i < count; i++) {
            const playlistIndex = i % playlists.length;
            const playlist = playlists[playlistIndex];
            const playlistFiles = byPlaylist[playlist];
            
            if (playlistFiles.length > 0) {
                const randomIndex = Math.floor(Math.random() * playlistFiles.length);
                selected.push(playlistFiles.splice(randomIndex, 1)[0]);
            }
        }

        return selected;
    }

    /**
     * Kategori için beklenti tanımla
     */
    getExpectationForCategory(category) {
        const expectations = {
            'remix': 'Remix dosyası benzer orijinal dosya bulmalı',
            'artistTitle': 'Sanatçı-başlık formatında eşleşme bulmalı',
            'withParentheses': 'Parantez içerikli dosya için temiz eşleşme bulmalı',
            'singleWord': 'Tek kelimelik dosya için eşleşme bulmalı',
            'standard': 'Standart dosya için eşleşme bulmalı'
        };
        return expectations[category] || 'Eşleşme bulmalı';
    }

    /**
     * Kategori için minimum benzerlik
     */
    getMinSimilarityForCategory(category) {
        const minimums = {
            'remix': 0.4,
            'artistTitle': 0.5,
            'withParentheses': 0.3,
            'singleWord': 0.4,
            'standard': 0.3
        };
        return minimums[category] || 0.3;
    }

    /**
     * Manuel test case'leri (fallback)
     */
    defineManualTestCases() {
        this.tests = [
            {
                name: "Mahsun Kırmızıgül - Orijinal vs Remix",
                searchPath: "/Users/koray/Music/KorayMusics/Video2019/Mahsun Kırmızıgül - Sarı Sarı.m4a",
                expectation: "Orijinal dosyalar remix'lerden önce gelmeli",
                expectedFirstMatch: "Sarı Sarı - Mahsun Kırmızıgül",
                shouldNotBeFirst: "remix",
                category: "manual"
            },
            {
                name: "Basit Dosya İsmi - Up",
                searchPath: "/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Up (4).m4a",
                expectation: "Basit isimli dosya bulunmalı",
                expectedPattern: "Up.m4a",
                minSimilarity: 0.5,
                category: "manual"
            },
            {
                name: "Temperature Test",
                searchPath: "/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Temperature (4).m4a",
                expectation: "Temperature dosyası bulunmalı",
                expectedPattern: "Temperature.m4a",
                minSimilarity: 0.6,
                category: "manual"
            },
            {
                name: "Türkçe Karakter - Ah Canım",
                searchPath: "/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Ah Canım Vah Canım.m4a",
                expectation: "Türkçe karakterler doğru çalışmalı",
                expectedPattern: "Ah Canım",
                minSimilarity: 0.5,
                category: "manual"
            }
        ];
    }

    /**
     * Tek test çalıştır - API vs Manuel karşılaştırması ile
     */
    async runSingleTest(testCase) {
        try {
            console.log(`\n🧪 ${testCase.name}`);
            console.log(`   Arama: ${path.basename(testCase.searchPath)}`);
            console.log(`   Beklenti: ${testCase.expectation}`);

            // 1. API sonucunu al
            const response = await axios.post(`${this.apiUrl}/api/search/files`, {
                paths: [testCase.searchPath],
                options: {
                    limit: 5,
                    threshold: 0.01
                }
            });

            if (response.data.status !== 'success' || !response.data.data || !response.data.data[0]) {
                return {
                    ...testCase,
                    status: 'FAIL',
                    error: `API yanıtı alınamadı - Status: ${response.data.status}`,
                    actualResult: null
                };
            }

            const apiResult = response.data.data[0];
            const apiMatches = apiResult.matches || [];

            // 2. Manuel en iyi eşleşmeyi bul
            const manualBest = await this.findBestManualMatch(testCase.searchPath, 0.01);

            let testResult = {
                ...testCase,
                status: 'UNKNOWN',
                actualResult: {
                    found: apiResult.found,
                    topMatch: apiMatches.length > 0 ? path.parse(apiMatches[0].path).name : 'Yok',
                    topSimilarity: apiMatches.length > 0 ? apiMatches[0].similarity : 0,
                    allMatches: apiMatches.slice(0, 3).map(m => ({
                        name: path.basename(m.path),
                        similarity: m.similarity.toFixed(4)
                    }))
                },
                manualResult: manualBest ? {
                    topMatch: path.parse(manualBest.path).name,
                    similarity: manualBest.similarity.toFixed(4)
                } : null,
                algorithmEfficiency: null
            };

            // 3. API vs Manuel karşılaştırması
            if (manualBest && apiMatches.length > 0) {
                const apiSimilarity = apiMatches[0].similarity;
                const manualSimilarity = manualBest.similarity;
                
                testResult.algorithmEfficiency = {
                    apiFound: apiSimilarity.toFixed(4),
                    manualBest: manualSimilarity.toFixed(4),
                    difference: (apiSimilarity - manualSimilarity).toFixed(4),
                    isOptimal: apiSimilarity >= manualSimilarity * 0.95 // %95 verimlilik
                };
                
                console.log(`   📊 API: ${apiSimilarity.toFixed(4)} vs Manuel: ${manualSimilarity.toFixed(4)} (Fark: ${testResult.algorithmEfficiency.difference})`);
                
                if (!testResult.algorithmEfficiency.isOptimal) {
                    console.log(`   ⚠️ API daha iyi sonucu kaçırıyor! Manuel: ${path.basename(manualBest.path)}`);
                }
            }

            // 4. Ana test kriteri: Algoritma verimliliği
            if (testResult.algorithmEfficiency) {
                if (testResult.algorithmEfficiency.isOptimal) {
                    testResult.status = 'PASS';
                    testResult.message = `✅ Algoritma optimal: API=${testResult.algorithmEfficiency.apiFound}, Manuel=${testResult.algorithmEfficiency.manualBest}`;
                } else {
                    testResult.status = 'FAIL';
                    testResult.message = `❌ Algoritma suboptimal: API=${testResult.algorithmEfficiency.apiFound}, Manuel=${testResult.algorithmEfficiency.manualBest} (Fark: ${testResult.algorithmEfficiency.difference})`;
                }
            }

            // 5. Ek test kriterleri (sadece algoritma optimal değilse)
            if (testResult.status === 'UNKNOWN') {
                if (testCase.expectedFirstMatch) {
                    // İlk eşleşme beklenen dosya mı?
                    if (apiMatches.length > 0 && (apiMatches[0].path.includes(testCase.expectedFirstMatch) || testResult.actualResult.topMatch.includes(testCase.expectedFirstMatch))) {
                        testResult.status = 'PASS';
                        testResult.message = `✅ İlk eşleşme doğru: ${testResult.actualResult.topMatch}`;
                    } else {
                        testResult.status = 'FAIL';
                        testResult.message = `❌ İlk eşleşme yanlış. Beklenen: ${testCase.expectedFirstMatch}, Gerçek: ${testResult.actualResult.topMatch}`;
                    }
                }

                if (testCase.shouldNotBeFirst && testResult.status === 'UNKNOWN') {
                    // İlk eşleşme bu pattern'i içermemeli
                    if (apiMatches.length > 0 && apiMatches[0].path.toLowerCase().includes(testCase.shouldNotBeFirst.toLowerCase())) {
                        testResult.status = 'FAIL';
                        testResult.message = `❌ İlk eşleşme '${testCase.shouldNotBeFirst}' içeriyor: ${testResult.actualResult.topMatch}`;
                    } else {
                        testResult.status = 'PASS';
                        testResult.message = `✅ İlk eşleşme '${testCase.shouldNotBeFirst}' içermiyor`;
                    }
                }

                if (testCase.minSimilarity && testResult.status === 'UNKNOWN') {
                    // Minimum benzerlik kontrolü
                    if (apiMatches.length > 0 && apiMatches[0].similarity >= testCase.minSimilarity) {
                        testResult.status = 'PASS';
                        testResult.message = `✅ Minimum benzerlik sağlandı: ${apiMatches[0].similarity.toFixed(4)} >= ${testCase.minSimilarity}`;
                    } else {
                        testResult.status = 'FAIL';
                        testResult.message = `❌ Minimum benzerlik sağlanamadı: ${apiMatches[0]?.similarity.toFixed(4) || 0} < ${testCase.minSimilarity}`;
                    }
                }

                // Eğer hala belirsizse, genel kontrol
                if (testResult.status === 'UNKNOWN') {
                    if (apiResult.found && apiMatches.length > 0) {
                        testResult.status = 'PASS';
                        testResult.message = `✅ Dosya bulundu: ${testResult.actualResult.topMatch}`;
                    } else {
                        testResult.status = 'FAIL';
                        testResult.message = `❌ Dosya bulunamadı`;
                    }
                }
            }

            console.log(`   ${testResult.message || 'Test tamamlandı'}`);
            if (testResult.actualResult && testResult.actualResult.topSimilarity) {
                console.log(`   En iyi eşleşme: ${testResult.actualResult.topMatch} (${testResult.actualResult.topSimilarity.toFixed(4)})`);
            } else {
                console.log(`   Sonuç: Eşleşme bulunamadı`);
            }

            return testResult;

        } catch (error) {
            console.log(`   ❌ Test hatası: ${error.message}`);
            return {
                ...testCase,
                status: 'ERROR',
                error: error.message,
                actualResult: null
            };
        }
    }

    /**
     * Tüm testleri çalıştır
     */
    async runAllTests(maxTests = 30) {
        console.log('🧪 BENZERLİK ALGORİTMASI TEST SİSTEMİ - GLOBAL MISSING FILES');
        console.log('='.repeat(60));

        await this.defineTestCasesFromGlobal(maxTests);
        this.results = [];

        console.log(`\n🚀 ${this.tests.length} test çalıştırılıyor...\n`);

        for (let i = 0; i < this.tests.length; i++) {
            const testCase = this.tests[i];
            console.log(`[${i + 1}/${this.tests.length}] ${testCase.category.toUpperCase()}`);
            
            const result = await this.runSingleTest(testCase);
            this.results.push(result);
            
            // Progress göster
            if ((i + 1) % 5 === 0) {
                const completed = i + 1;
                const total = this.tests.length;
                const percentage = ((completed / total) * 100).toFixed(1);
                console.log(`\n📊 İlerleme: ${completed}/${total} (%${percentage})\n`);
            }
            
            // Testler arası kısa bekleme
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        this.printSummary();
        this.printCategoryAnalysis();
        return this.results;
    }

    /**
     * Kategori bazlı analiz yazdır
     */
    printCategoryAnalysis() {
        console.log('\n📈 KATEGORİ BAZLI ANALİZ');
        console.log('='.repeat(40));

        const categoryStats = {};
        this.results.forEach(result => {
            const category = result.category;
            if (!categoryStats[category]) {
                categoryStats[category] = {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    avgSimilarity: 0,
                    similarities: []
                };
            }
            
            categoryStats[category].total++;
            if (result.status === 'PASS') {
                categoryStats[category].passed++;
            } else {
                categoryStats[category].failed++;
            }
            
            if (result.actualResult && result.actualResult.topSimilarity) {
                categoryStats[category].similarities.push(result.actualResult.topSimilarity);
            }
        });

        // Ortalama benzerlik hesapla
        Object.keys(categoryStats).forEach(category => {
            const stats = categoryStats[category];
            if (stats.similarities.length > 0) {
                stats.avgSimilarity = stats.similarities.reduce((a, b) => a + b, 0) / stats.similarities.length;
            }
        });

        // Kategori istatistiklerini yazdır
        Object.keys(categoryStats).sort().forEach(category => {
            const stats = categoryStats[category];
            const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
            
            console.log(`\n📂 ${category.toUpperCase()}`);
            console.log(`   Toplam: ${stats.total}`);
            console.log(`   Başarılı: ${stats.passed} (%${successRate})`);
            console.log(`   Başarısız: ${stats.failed}`);
            console.log(`   Ortalama Benzerlik: ${stats.avgSimilarity.toFixed(4)}`);
            
            // Kategori özel öneriler
            if (successRate < 50) {
                console.log(`   🔴 DİKKAT: Bu kategori için algoritma iyileştirmesi gerekli!`);
            } else if (successRate < 70) {
                console.log(`   🟡 UYARI: Bu kategoride iyileştirme potansiyeli var`);
            } else {
                console.log(`   ✅ Bu kategori iyi çalışıyor`);
            }
        });
    }

    /**
     * Test özeti yazdır
     */
    printSummary() {
        console.log('\n📊 TEST ÖZETİ');
        console.log('='.repeat(30));

        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const errors = this.results.filter(r => r.status === 'ERROR').length;

        console.log(`✅ Başarılı: ${passed}`);
        console.log(`❌ Başarısız: ${failed}`);
        console.log(`🔥 Hata: ${errors}`);
        console.log(`📈 Başarı Oranı: %${((passed / this.results.length) * 100).toFixed(1)}`);

        if (failed > 0) {
            console.log('\n❌ BAŞARISIZ TESTLER:');
            this.results
                .filter(r => r.status === 'FAIL')
                .forEach(r => {
                    console.log(`   • ${r.name}: ${r.message}`);
                });
        }

        if (errors > 0) {
            console.log('\n🔥 HATALI TESTLER:');
            this.results
                .filter(r => r.status === 'ERROR')
                .forEach(r => {
                    console.log(`   • ${r.name}: ${r.error}`);
                });
        }

        console.log('\n🎯 GENEL DEĞERLENDİRME:');
        if (passed === this.results.length) {
            console.log('   🎉 Tüm testler başarılı! Algoritma düzgün çalışıyor.');
        } else if (passed >= this.results.length * 0.8) {
            console.log('   ✅ Testlerin çoğu başarılı. Küçük iyileştirmeler gerekebilir.');
        } else {
            console.log('   ⚠️ Çok sayıda test başarısız. Algoritma gözden geçirilmeli.');
        }
    }

    /**
     * Belirli bir test çalıştır
     */
    async runSpecificTest(testName) {
        this.defineTestCases();
        const testCase = this.tests.find(t => t.name.toLowerCase().includes(testName.toLowerCase()));
        
        if (!testCase) {
            console.log(`❌ Test bulunamadı: ${testName}`);
            console.log('Mevcut testler:');
            this.tests.forEach(t => console.log(`  • ${t.name}`));
            return null;
        }

        return await this.runSingleTest(testCase);
    }
}

// CLI kullanımı
if (require.main === module) {
    const tester = new SimilarityFixTester();
    
    const command = process.argv[2];
    const maxTests = process.argv[3] ? parseInt(process.argv[3]) : 30;
    
    console.log('🎯 GLOBAL MISSING FILES TEST SİSTEMİ');
    console.log(`   Komut: ${command || 'all'}`);
    console.log(`   Max Test: ${maxTests}`);
    console.log('');
    
    async function main() {
        try {
            if (command === 'all' || !command) {
                await tester.runAllTests(maxTests);
            } else if (command === 'manual') {
                tester.defineManualTestCases();
                tester.results = [];
                for (const testCase of tester.tests) {
                    const result = await tester.runSingleTest(testCase);
                    tester.results.push(result);
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                tester.printSummary();
            } else {
                await tester.runSpecificTest(command);
            }
        } catch (error) {
            console.error('❌ Fatal error:', error);
        }
    }
    
    main();
}

module.exports = SimilarityFixTester;
