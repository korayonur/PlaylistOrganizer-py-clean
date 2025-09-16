/**
 * TÜM GLOBAL-MISSING DOSYALARINI TEST ET
 * 225 dosya ile kapsamlı test
 */

const PerfectSimilarityAlgorithm = require('./perfect_similarity_algorithm.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

class FullScaleTestSystem {
    constructor() {
        this.perfectAlgorithm = new PerfectSimilarityAlgorithm();
        this.apiUrl = 'http://localhost:50001';
        this.testResults = [];
        this.stats = {
            total: 0,
            perfectWins: 0,
            apiWins: 0,
            perfectOnly: 0,
            apiOnly: 0,
            bothEmpty: 0,
            perfectBetter: 0,
            apiBetter: 0,
            perfect: 0
        };
    }

    async loadGlobalMissingFiles() {
        try {
            console.log('📥 Global-missing dosyalarını yüklüyorum...');
            const data = JSON.parse(fs.readFileSync('/Users/koray/projects/PlaylistOrganizer-py/glabal-missing.json', 'utf8'));
            
            if (data.success && data.missing_files) {
                const files = data.missing_files.map(item => item.originalPath);
                console.log(`✅ ${files.length} dosya bulundu`);
                return files;
            } else {
                console.error('❌ Global-missing dosya formatı hatalı');
                return [];
            }
        } catch (error) {
            console.error('❌ Global-missing dosya okuma hatası:', error.message);
            return [];
        }
    }

    async testAPI(searchPath, options = {}) {
        try {
            const response = await axios.post(`${this.apiUrl}/api/search/files`, {
                paths: [searchPath],
                options: {
                    limit: options.limit || 5,
                    threshold: options.threshold || 0.01
                }
            });

            if (response.data.status === 'success' && response.data.data && response.data.data[0]) {
                return response.data.data[0];
            }
            return { found: false, matches: [] };
        } catch (error) {
            // API hatası durumunda boş sonuç döndür
            return { found: false, matches: [] };
        }
    }

    async compareAlgorithms(searchPath, index, total) {
        const fileName = path.basename(searchPath);
        
        // Progress gösterimi
        if (index % 10 === 0) {
            console.log(`\n📊 İlerleme: ${index}/${total} (%${(index/total*100).toFixed(1)})`);
        }

        try {
            // 1. Mükemmel algoritma
            const perfectResult = await this.perfectAlgorithm.searchPerfectMatch(searchPath, { 
                threshold: 0.01, 
                limit: 3 
            });

            // 2. Mevcut API
            const apiResult = await this.testAPI(searchPath, { 
                threshold: 0.01, 
                limit: 3 
            });

            // 3. Karşılaştırma
            let result = { status: 'UNKNOWN', difference: 0 };
            
            if (perfectResult.found && apiResult.found) {
                const perfectTop = perfectResult.matches[0];
                const apiTop = apiResult.matches[0];
                const difference = perfectTop.similarity - apiTop.similarity;
                
                if (Math.abs(difference) < 0.001) {
                    result = { status: 'PERFECT', difference: difference };
                } else if (difference >= 0) {
                    result = { status: 'PERFECT_BETTER', difference: difference };
                } else {
                    result = { status: 'API_BETTER', difference: difference };
                }
            } else if (perfectResult.found && !apiResult.found) {
                result = { status: 'PERFECT_ONLY' };
            } else if (!perfectResult.found && apiResult.found) {
                result = { status: 'API_ONLY' };
            } else {
                result = { status: 'BOTH_EMPTY' };
            }

            return {
                file: searchPath,
                fileName: fileName,
                result: result,
                perfectResult: perfectResult,
                apiResult: apiResult
            };
        } catch (error) {
            console.error(`❌ Test hatası [${fileName}]:`, error.message);
            return {
                file: searchPath,
                fileName: fileName,
                result: { status: 'ERROR', difference: 0 },
                perfectResult: { found: false, matches: [] },
                apiResult: { found: false, matches: [] }
            };
        }
    }

    async runFullScaleTest() {
        console.log('🧪 TÜM GLOBAL-MISSING DOSYALARI TEST SİSTEMİ');
        console.log('='.repeat(60));
        
        // 1. Global-missing dosyalarını yükle
        const missingFiles = await this.loadGlobalMissingFiles();
        if (missingFiles.length === 0) {
            console.log('❌ Test edilecek dosya bulunamadı');
            return;
        }

        console.log(`\n📊 ${missingFiles.length} dosya ile test başlatılıyor...`);
        console.log('⏱️ Tahmini süre: ' + Math.round(missingFiles.length * 0.8) + ' saniye');

        const results = [];
        const startTime = Date.now();
        
        // 2. Tüm dosyaları test et
        for (let i = 0; i < missingFiles.length; i++) {
            const file = missingFiles[i];
            const result = await this.compareAlgorithms(file, i + 1, missingFiles.length);
            results.push(result);
            
            // Her 25 dosyada bir progress göster
            if ((i + 1) % 25 === 0) {
                const elapsed = Date.now() - startTime;
                const rate = (i + 1) / elapsed * 1000;
                const eta = (missingFiles.length - i - 1) / rate;
                console.log(`📈 İlerleme: ${i + 1}/${missingFiles.length} (${rate.toFixed(1)} dosya/sn, ETA: ${eta.toFixed(0)}s)`);
            }
            
            // Dosyalar arası kısa bekleme (API'yi yormamak için)
            if (i < missingFiles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`\n⏱️ Toplam süre: ${(totalTime / 1000).toFixed(1)}s`);
        
        // 3. İstatistikleri hesapla
        this.calculateStats(results);
        
        // 4. Detaylı rapor oluştur
        this.generateDetailedReport(results);
        
        return results;
    }

    calculateStats(results) {
        this.stats.total = results.length;
        
        results.forEach(result => {
            const status = result.result.status;
            
            switch (status) {
                case 'PERFECT':
                    this.stats.perfect++;
                    break;
                case 'PERFECT_BETTER':
                    this.stats.perfectBetter++;
                    this.stats.perfectWins++;
                    break;
                case 'API_BETTER':
                    this.stats.apiBetter++;
                    this.stats.apiWins++;
                    break;
                case 'PERFECT_ONLY':
                    this.stats.perfectOnly++;
                    this.stats.perfectWins++;
                    break;
                case 'API_ONLY':
                    this.stats.apiOnly++;
                    this.stats.apiWins++;
                    break;
                case 'BOTH_EMPTY':
                    this.stats.bothEmpty++;
                    break;
            }
        });
    }

    generateDetailedReport(results) {
        console.log('\n📊 TÜM DOSYALAR İÇİN DETAYLI ANALİZ RAPORU');
        console.log('='.repeat(60));
        
        // Genel istatistikler
        const perfectWinRate = (this.stats.perfectWins / this.stats.total) * 100;
        const apiWinRate = (this.stats.apiWins / this.stats.total) * 100;
        const perfectRate = (this.stats.perfect / this.stats.total) * 100;
        
        console.log(`📈 GENEL İSTATİSTİKLER:`);
        console.log(`   Toplam test: ${this.stats.total}`);
        console.log(`   Mükemmel algoritma kazandı: ${this.stats.perfectWins} (%${perfectWinRate.toFixed(1)})`);
        console.log(`   Mevcut API kazandı: ${this.stats.apiWins} (%${apiWinRate.toFixed(1)})`);
        console.log(`   Berabere: ${this.stats.perfect} (%${perfectRate.toFixed(1)})`);
        
        console.log(`\n📊 DURUM DAĞILIMI:`);
        console.log(`   ✅ Mükemmel uyum: ${this.stats.perfect} (%${(this.stats.perfect/this.stats.total*100).toFixed(1)})`);
        console.log(`   🟢 Mükemmel daha iyi: ${this.stats.perfectBetter} (%${(this.stats.perfectBetter/this.stats.total*100).toFixed(1)})`);
        console.log(`   🔵 API daha iyi: ${this.stats.apiBetter} (%${(this.stats.apiBetter/this.stats.total*100).toFixed(1)})`);
        console.log(`   🟢 Sadece mükemmel buluyor: ${this.stats.perfectOnly} (%${(this.stats.perfectOnly/this.stats.total*100).toFixed(1)})`);
        console.log(`   🔵 Sadece API buluyor: ${this.stats.apiOnly} (%${(this.stats.apiOnly/this.stats.total*100).toFixed(1)})`);
        console.log(`   ⚪ İkisi de bulamıyor: ${this.stats.bothEmpty} (%${(this.stats.bothEmpty/this.stats.total*100).toFixed(1)})`);
        
        // En büyük farkları göster
        if (this.stats.perfectBetter > 0) {
            console.log(`\n🟢 MÜKEMMEL ALGORİTMANIN EN İYİ PERFORMANSLARI:`);
            const perfectResults = results
                .filter(r => r.result.status === 'PERFECT_BETTER')
                .sort((a, b) => b.result.difference - a.result.difference)
                .slice(0, 10);
                
            perfectResults.forEach((r, index) => {
                const fileName = r.fileName;
                const difference = r.result.difference;
                console.log(`   ${index + 1}. ${fileName} (+${difference.toFixed(4)})`);
            });
        }
        
        if (this.stats.apiBetter > 0) {
            console.log(`\n🔵 MEVCUT API'NİN EN İYİ PERFORMANSLARI:`);
            const apiResults = results
                .filter(r => r.result.status === 'API_BETTER')
                .sort((a, b) => a.result.difference - b.result.difference)
                .slice(0, 10);
                
            apiResults.forEach((r, index) => {
                const fileName = r.fileName;
                const difference = Math.abs(r.result.difference);
                console.log(`   ${index + 1}. ${fileName} (+${difference.toFixed(4)})`);
            });
        }
        
        // Kategori analizi
        this.analyzeByCategory(results);
        
        // Sonuç önerisi
        console.log(`\n🎯 FINAL SONUÇ ÖNERİSİ:`);
        if (perfectWinRate > 60) {
            console.log(`   ✅ MÜKEMMEL ALGORİTMA ÖNERİLİR: %${perfectWinRate.toFixed(1)} başarı oranı`);
        } else if (apiWinRate > 60) {
            console.log(`   🔵 MEVCUT API YETERLİ: %${apiWinRate.toFixed(1)} başarı oranı`);
        } else {
            console.log(`   ⚖️ KARŞILAŞTIRMALI KULLANIM: Her iki algoritma da farklı güçlü yanlara sahip`);
        }
        
        // Markdown raporu oluştur
        this.generateMarkdownReport(results);
    }

    analyzeByCategory(results) {
        console.log(`\n📂 KATEGORİ ANALİZİ:`);
        
        const categories = {
            'remix': results.filter(r => r.file.toLowerCase().includes('remix')),
            'parentheses': results.filter(r => r.file.includes('(') && r.file.includes(')')),
            'single_word': results.filter(r => {
                const fileName = r.file.split('/').pop();
                const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
                return nameWithoutExt.split(/[\s\-_]+/).length === 1;
            }),
            'artist_title': results.filter(r => {
                const fileName = r.file.split('/').pop();
                const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
                return nameWithoutExt.includes(' - ') && !nameWithoutExt.includes('(');
            })
        };
        
        Object.entries(categories).forEach(([category, files]) => {
            if (files.length === 0) return;
            
            const categoryStats = {
                total: files.length,
                perfectWins: files.filter(f => ['PERFECT', 'PERFECT_BETTER', 'PERFECT_ONLY'].includes(f.result.status)).length,
                apiWins: files.filter(f => ['API_BETTER', 'API_ONLY'].includes(f.result.status)).length
            };
            
            const perfectWinRate = (categoryStats.perfectWins / categoryStats.total) * 100;
            const apiWinRate = (categoryStats.apiWins / categoryStats.total) * 100;
            
            console.log(`   ${category.toUpperCase()}: ${categoryStats.total} dosya`);
            console.log(`      Mükemmel: %${perfectWinRate.toFixed(1)} (${categoryStats.perfectWins}), API: %${apiWinRate.toFixed(1)} (${categoryStats.apiWins})`);
        });
    }

    generateMarkdownReport(results) {
        const reportPath = '/Users/koray/projects/PlaylistOrganizer-py/final_full_scale_test_report.md';
        
        const perfectWinRate = (this.stats.perfectWins / this.stats.total) * 100;
        const apiWinRate = (this.stats.apiWins / this.stats.total) * 100;
        
        const report = `# TÜM GLOBAL-MISSING DOSYALARI TEST RAPORU

## 📊 **FINAL TEST SONUÇLARI**

### **Kapsamlı Test (${this.stats.total} dosya):**
- **Mükemmel Algoritma:** %${perfectWinRate.toFixed(1)} kazandı (${this.stats.perfectWins}/${this.stats.total})
- **Mevcut API:** %${apiWinRate.toFixed(1)} kazandı (${this.stats.apiWins}/${this.stats.total})
- **Berabere:** %${(this.stats.perfect/this.stats.total*100).toFixed(1)} (${this.stats.perfect}/${this.stats.total})

### **Detaylı Dağılım:**
- ✅ Mükemmel uyum: ${this.stats.perfect} (%${(this.stats.perfect/this.stats.total*100).toFixed(1)})
- 🟢 Mükemmel daha iyi: ${this.stats.perfectBetter} (%${(this.stats.perfectBetter/this.stats.total*100).toFixed(1)})
- 🔵 API daha iyi: ${this.stats.apiBetter} (%${(this.stats.apiBetter/this.stats.total*100).toFixed(1)})
- 🟢 Sadece mükemmel buluyor: ${this.stats.perfectOnly} (%${(this.stats.perfectOnly/this.stats.total*100).toFixed(1)})
- 🔵 Sadece API buluyor: ${this.stats.apiOnly} (%${(this.stats.apiOnly/this.stats.total*100).toFixed(1)})
- ⚪ İkisi de bulamıyor: ${this.stats.bothEmpty} (%${(this.stats.bothEmpty/this.stats.total*100).toFixed(1)})

## 🎯 **FINAL SONUÇ**

${perfectWinRate > 60 ? '✅ **MÜKEMMEL ALGORİTMA ÖNERİLİR** - %' + perfectWinRate.toFixed(1) + ' başarı oranı' : 
  apiWinRate > 60 ? '🔵 **MEVCUT API YETERLİ** - %' + apiWinRate.toFixed(1) + ' başarı oranı' : 
  '⚖️ **KARŞILAŞTIRMALI KULLANIM** - Her iki algoritma da farklı güçlü yanlara sahip'}

## 📈 **KATEGORİ ANALİZİ**

${this.getCategoryAnalysis(results)}

---

**Rapor Tarihi:** ${new Date().toISOString().split('T')[0]}  
**Test Edilen Dosya Sayısı:** ${this.stats.total} (tüm global-missing)  
**Test Süresi:** ${Math.round(results.length * 0.8)} saniye (tahmini)
`;

        fs.writeFileSync(reportPath, report);
        console.log(`\n📄 Markdown raporu oluşturuldu: ${reportPath}`);
    }

    getCategoryAnalysis(results) {
        const categories = {
            'remix': results.filter(r => r.file.toLowerCase().includes('remix')),
            'parentheses': results.filter(r => r.file.includes('(') && r.file.includes(')')),
            'single_word': results.filter(r => {
                const fileName = r.file.split('/').pop();
                const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
                return nameWithoutExt.split(/[\s\-_]+/).length === 1;
            }),
            'artist_title': results.filter(r => {
                const fileName = r.file.split('/').pop();
                const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
                return nameWithoutExt.includes(' - ') && !nameWithoutExt.includes('(');
            })
        };
        
        let analysis = '';
        Object.entries(categories).forEach(([category, files]) => {
            if (files.length === 0) return;
            
            const categoryStats = {
                total: files.length,
                perfectWins: files.filter(f => ['PERFECT', 'PERFECT_BETTER', 'PERFECT_ONLY'].includes(f.result.status)).length,
                apiWins: files.filter(f => ['API_BETTER', 'API_ONLY'].includes(f.result.status)).length
            };
            
            const perfectWinRate = (categoryStats.perfectWins / categoryStats.total) * 100;
            const apiWinRate = (categoryStats.apiWins / categoryStats.total) * 100;
            
            analysis += `### **${category.toUpperCase()} Kategorisi:**\n`;
            analysis += `- Toplam dosya: ${categoryStats.total}\n`;
            analysis += `- Mükemmel algoritma: %${perfectWinRate.toFixed(1)} (${categoryStats.perfectWins})\n`;
            analysis += `- Mevcut API: %${apiWinRate.toFixed(1)} (${categoryStats.apiWins})\n\n`;
        });
        
        return analysis;
    }
}

// CLI kullanımı
if (require.main === module) {
    const tester = new FullScaleTestSystem();
    
    async function main() {
        try {
            await tester.runFullScaleTest();
        } catch (error) {
            console.error('❌ Fatal error:', error);
        }
    }
    
    main();
}

module.exports = FullScaleTestSystem;
