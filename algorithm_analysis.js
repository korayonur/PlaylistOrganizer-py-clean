/**
 * BENZERLİK ALGORİTMASI ANALİZ ARACI
 * 
 * Mevcut algoritmanın davranışını detaylı olarak analiz eder
 */

const axios = require('axios');
const path = require('path');

class AlgorithmAnalyzer {
    constructor() {
        this.apiUrl = 'http://localhost:50001';
    }

    /**
     * Tek dosya için detaylı analiz
     */
    async analyzeFile(filePath, options = {}) {
        try {
            console.log(`\n🔍 ANALİZ EDİLİYOR: ${path.basename(filePath)}`);
            console.log(`📁 Tam yol: ${filePath}`);
            
            const response = await axios.post(`${this.apiUrl}/api/search/files`, {
                paths: [filePath],
                options: {
                    limit: 10,
                    threshold: options.threshold || 0.01,
                    ...options
                }
            });

            if (!response.data.success) {
                console.log('❌ API hatası:', response.data.message);
                return null;
            }

            const result = response.data.data[0];
            
            console.log('\n📊 SONUÇ ÖZETİ:');
            console.log(`   Durum: ${result.found ? '✅ Bulundu' : '❌ Bulunamadı'}`);
            console.log(`   Benzerlik: ${result.similarity?.toFixed(4) || '0.0000'}`);
            console.log(`   İşlem Süresi: ${result.processTime}ms`);
            console.log(`   Eşleşme Tipi: ${result.matchType || 'Yok'}`);
            
            if (result.found) {
                console.log(`   Bulunan: ${path.basename(result.foundPath)}`);
            }

            // Debug bilgilerini analiz et
            if (result.debugInfo && result.debugInfo.searchWords) {
                console.log('\n🔤 ARAMA KELİMELERİ:');
                const searchWords = result.debugInfo.searchWords;
                console.log(`   Klasör: [${searchWords.folder_words.join(', ')}]`);
                console.log(`   Dosya: [${searchWords.file_words.join(', ')}]`);
                console.log(`   Parantez: [${searchWords.parentheses_words.join(', ')}]`);
                console.log(`   Toplam: ${searchWords.all_words.length} kelime`);
            }

            // En iyi eşleşmeleri göster
            if (result.matches && result.matches.length > 0) {
                console.log('\n🎯 EN İYİ EŞLEŞMELER:');
                result.matches.slice(0, 5).forEach((match, index) => {
                    console.log(`   ${index + 1}. ${match.similarity.toFixed(4)} - ${path.basename(match.path)}`);
                    
                    if (match.matchDetails && match.matchDetails.newAlgorithmDebug) {
                        const debug = match.matchDetails.newAlgorithmDebug;
                        console.log(`      Exact: ${debug.exactScore?.toFixed(3)} | Fuzzy: ${debug.fuzzyScore?.toFixed(3)} | Context: ${debug.contextScore?.toFixed(3)} | Special: ${debug.specialScore?.toFixed(3)} | Parentheses: ${debug.parenthesesScore?.toFixed(3)}`);
                    }
                });
            }

            return result;

        } catch (error) {
            console.error('❌ Analiz hatası:', error.message);
            return null;
        }
    }

    /**
     * Karşılaştırmalı analiz - iki dosyayı karşılaştır
     */
    async compareFiles(file1, file2) {
        console.log('\n🔄 KARŞILAŞTIRMALI ANALİZ');
        console.log('='.repeat(50));
        
        const result1 = await this.analyzeFile(file1);
        console.log('\n' + '-'.repeat(50));
        const result2 = await this.analyzeFile(file2);
        
        if (result1 && result2) {
            console.log('\n📈 KARŞILAŞTIRMA:');
            console.log(`   Dosya 1 Benzerlik: ${result1.similarity?.toFixed(4) || '0.0000'}`);
            console.log(`   Dosya 2 Benzerlik: ${result2.similarity?.toFixed(4) || '0.0000'}`);
            console.log(`   Fark: ${Math.abs((result1.similarity || 0) - (result2.similarity || 0)).toFixed(4)}`);
        }
        
        return { result1, result2 };
    }

    /**
     * Threshold testi - farklı threshold değerleriyle test
     */
    async thresholdTest(filePath, thresholds = [0.01, 0.1, 0.2, 0.3, 0.4, 0.5]) {
        console.log(`\n🎚️ THRESHOLD TESTİ: ${path.basename(filePath)}`);
        console.log('='.repeat(60));
        
        const results = [];
        
        for (const threshold of thresholds) {
            console.log(`\n📊 Threshold: ${threshold}`);
            
            try {
                const response = await axios.post(`${this.apiUrl}/api/search/files`, {
                    paths: [filePath],
                    options: {
                        limit: 3,
                        threshold: threshold
                    }
                });

                const result = response.data.success ? response.data.data[0] : null;
                const matchCount = result?.matches?.length || 0;
                const topSimilarity = result?.similarity || 0;
                
                console.log(`   Sonuç: ${result?.found ? '✅' : '❌'} | Eşleşme: ${matchCount} | En yüksek: ${topSimilarity.toFixed(4)}`);
                
                results.push({
                    threshold,
                    found: result?.found || false,
                    matchCount,
                    topSimilarity,
                    result
                });
                
            } catch (error) {
                console.log(`   ❌ Hata: ${error.message}`);
                results.push({
                    threshold,
                    error: error.message
                });
            }
        }
        
        console.log('\n📋 THRESHOLD ÖZETİ:');
        results.forEach(r => {
            if (!r.error) {
                console.log(`   ${r.threshold}: ${r.found ? '✅' : '❌'} (${r.matchCount} eşleşme, max: ${r.topSimilarity.toFixed(4)})`);
            }
        });
        
        return results;
    }

    /**
     * Kelime analizi - nasıl parçalandığını göster
     */
    analyzeWords(fileName) {
        console.log(`\n🔤 KELİME ANALİZİ: ${fileName}`);
        console.log('='.repeat(50));
        
        // Dosya adından uzantıyı kaldır
        const nameWithoutExt = path.parse(fileName).name;
        console.log(`   Orijinal: "${fileName}"`);
        console.log(`   Uzantısız: "${nameWithoutExt}"`);
        
        // Normalizasyon simülasyonu (server.js'deki gibi)
        const CHAR_MAP = {
            "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
            "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
        };
        
        let normalized = nameWithoutExt.normalize("NFKC");
        normalized = normalized.split('').map(c => CHAR_MAP[c] || c).join('');
        normalized = normalized.toLowerCase();
        normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
        normalized = normalized.replace(/\s+/g, ' ').trim();
        
        console.log(`   Normalize: "${normalized}"`);
        
        // Parantez analizi
        const parenthesesMatches = nameWithoutExt.match(/\([^)]*\)/g) || [];
        const bracketMatches = nameWithoutExt.match(/\[[^\]]*\]/g) || [];
        const braceMatches = nameWithoutExt.match(/\{[^}]*\}/g) || [];
        const allMatches = [...parenthesesMatches, ...bracketMatches, ...braceMatches];
        
        console.log(`   Parantez içeriği: [${allMatches.join(', ')}]`);
        
        // Ana metin (parantezler çıkarıldıktan sonra)
        const mainText = nameWithoutExt
            .replace(/\([^)]*\)/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/\{[^}]*\}/g, '')
            .replace(/\s+/g, ' ')
            .trim();
            
        console.log(`   Ana metin: "${mainText}"`);
        
        // Kelime ayırma
        const words = mainText.split(/[-_\s]/).map(part => part.trim()).filter(part => part.length > 0);
        console.log(`   Kelimeler: [${words.join(', ')}]`);
        
        // Normalize edilmiş kelimeler
        const normalizedWords = words.map(word => {
            let norm = word.normalize("NFKC");
            norm = norm.split('').map(c => CHAR_MAP[c] || c).join('');
            norm = norm.toLowerCase();
            norm = norm.replace(/[^a-zA-Z0-9]/g, '');
            return norm;
        }).filter(w => w.length > 1);
        
        console.log(`   Normalize kelimeler: [${normalizedWords.join(', ')}]`);
        
        return {
            original: fileName,
            nameWithoutExt,
            normalized,
            mainText,
            words,
            normalizedWords,
            parenthesesContent: allMatches
        };
    }

    /**
     * Özel test durumları
     */
    async runSpecialTests() {
        console.log('\n🧪 ÖZEL TEST DURUMLARI');
        console.log('='.repeat(60));
        
        // Test 1: Mahsun Kırmızıgül case
        console.log('\n1️⃣ MAHSUN KIRMIZIGÜL TESTİ:');
        await this.analyzeFile('/Users/koray/Music/KorayMusics/Video2019/Mahsun Kırmızıgül - Sarı Sarı.m4a');
        
        // Test 2: Basit isim
        console.log('\n2️⃣ BASİT İSİM TESTİ:');
        await this.analyzeFile('/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Up (4).m4a');
        
        // Test 3: Remix testi
        console.log('\n3️⃣ REMİX TESTİ:');
        await this.analyzeFile('/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Alper Eğri - Pablo Pablo (Remix) #Tiktok (5).m4a');
        
        // Test 4: Türkçe karakterler
        console.log('\n4️⃣ TÜRKÇE KARAKTER TESTİ:');
        await this.analyzeFile('/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Ah Canım Vah Canım.m4a');
    }

    /**
     * Kelime eşleşme testi
     */
    testWordMatching() {
        console.log('\n🔤 KELİME EŞLEŞME TESTİ');
        console.log('='.repeat(50));
        
        const testCases = [
            {
                search: ['mahsun', 'kirmizigul', 'sari'],
                target: ['mahsun', 'kirmizigul', 'sari', 'sari', 'remix'],
                expected: 'high match'
            },
            {
                search: ['ah', 'canim', 'vah', 'canim'],
                target: ['ah', 'canim', 'ahmet', 'ah', 'canim', 'vah', 'canim'],
                expected: 'good match'
            },
            {
                search: ['up'],
                target: ['pump', 'up', 'the', 'jam'],
                expected: 'partial match'
            }
        ];
        
        testCases.forEach((testCase, index) => {
            console.log(`\n${index + 1}. Test:`);
            console.log(`   Arama: [${testCase.search.join(', ')}]`);
            console.log(`   Hedef: [${testCase.target.join(', ')}]`);
            console.log(`   Beklenen: ${testCase.expected}`);
            
            // Exact match hesapla
            let exactMatches = 0;
            for (const searchWord of testCase.search) {
                if (testCase.target.includes(searchWord)) {
                    exactMatches++;
                }
            }
            const exactScore = exactMatches / testCase.search.length;
            console.log(`   Exact Score: ${exactScore.toFixed(3)} (${exactMatches}/${testCase.search.length})`);
            
            // Fuzzy match simülasyonu
            let fuzzyScore = 0;
            let comparisons = 0;
            for (const searchWord of testCase.search) {
                let bestSimilarity = 0;
                for (const targetWord of testCase.target) {
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
            const avgFuzzyScore = comparisons > 0 ? fuzzyScore / comparisons : 0;
            console.log(`   Fuzzy Score: ${avgFuzzyScore.toFixed(3)}`);
            
            // Final score (basit hesaplama)
            const finalScore = (exactScore * 0.4) + (avgFuzzyScore * 0.2);
            console.log(`   Final Score: ${finalScore.toFixed(3)}`);
        });
    }
}

// CLI kullanımı
if (require.main === module) {
    const analyzer = new AlgorithmAnalyzer();
    
    const command = process.argv[2];
    const filePath = process.argv[3];
    
    async function main() {
        try {
            switch (command) {
                case 'analyze':
                    if (!filePath) {
                        console.log('Kullanım: node algorithm_analysis.js analyze <dosya_yolu>');
                        return;
                    }
                    await analyzer.analyzeFile(filePath);
                    break;
                    
                case 'threshold':
                    if (!filePath) {
                        console.log('Kullanım: node algorithm_analysis.js threshold <dosya_yolu>');
                        return;
                    }
                    await analyzer.thresholdTest(filePath);
                    break;
                    
                case 'words':
                    if (!filePath) {
                        console.log('Kullanım: node algorithm_analysis.js words <dosya_adı>');
                        return;
                    }
                    analyzer.analyzeWords(filePath);
                    break;
                    
                case 'special':
                    await analyzer.runSpecialTests();
                    break;
                    
                case 'wordtest':
                    analyzer.testWordMatching();
                    break;
                    
                case 'compare':
                    const file2 = process.argv[4];
                    if (!filePath || !file2) {
                        console.log('Kullanım: node algorithm_analysis.js compare <dosya1> <dosya2>');
                        return;
                    }
                    await analyzer.compareFiles(filePath, file2);
                    break;
                    
                default:
                    console.log('🔧 ALGORİTMA ANALİZ ARACI');
                    console.log('='.repeat(30));
                    console.log('Kullanım:');
                    console.log('  node algorithm_analysis.js analyze <dosya_yolu>    # Tek dosya analizi');
                    console.log('  node algorithm_analysis.js threshold <dosya_yolu>  # Threshold testi');
                    console.log('  node algorithm_analysis.js words <dosya_adı>       # Kelime analizi');
                    console.log('  node algorithm_analysis.js special                 # Özel testler');
                    console.log('  node algorithm_analysis.js wordtest                # Kelime eşleşme testi');
                    console.log('  node algorithm_analysis.js compare <d1> <d2>       # Karşılaştırmalı analiz');
                    break;
            }
        } catch (error) {
            console.error('❌ Fatal error:', error);
        }
    }
    
    main();
}

module.exports = AlgorithmAnalyzer;
