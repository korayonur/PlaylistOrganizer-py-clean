/**
 * KAPSAMLI TEST SİSTEMİ
 * 
 * Mükemmel algoritma vs Mevcut API karşılaştırması
 * Global-missing dosyaları ile test
 */

const PerfectSimilarityAlgorithm = require('./perfect_similarity_algorithm.js');
const axios = require('axios');
const path = require('path');

class ComprehensiveTestSystem {
    constructor() {
        this.perfectAlgorithm = new PerfectSimilarityAlgorithm();
        this.apiUrl = 'http://localhost:50001';
        this.testResults = [];
    }

    async getGlobalMissingFiles() {
        try {
            console.log('📥 Global-missing dosyalarını alıyorum...');
            const response = await axios.get(`${this.apiUrl}/api/playlistsong/global-missing`);
            
            if (response.data.success && response.data.missing_files) {
                const files = response.data.missing_files.map(item => item.originalPath);
                console.log(`✅ ${files.length} dosya bulundu`);
                return files;
            } else {
                console.error('❌ Global-missing API hatası:', response.data);
                return [];
            }
        } catch (error) {
            console.error('❌ Global-missing API çağrı hatası:', error.message);
            return [];
        }
    }

    async testAPI(searchPath, options = {}) {
        try {
            const response = await axios.post(`${this.apiUrl}/api/search/files`, {
                paths: [searchPath],
                options: {
                    limit: options.limit || 10,
                    threshold: options.threshold || 0.01
                }
            });

            if (response.data.status === 'success' && response.data.data && response.data.data[0]) {
                return response.data.data[0];
            }
            return { found: false, matches: [] };
        } catch (error) {
            console.error('❌ API hatası:', error.message);
            return { found: false, matches: [] };
        }
    }

    async compareAlgorithms(searchPath) {
        console.log(`\n🔬 ALGORİTMA KARŞILAŞTIRMASI`);
        console.log(`📁 Dosya: ${path.basename(searchPath)}`);
        console.log('='.repeat(60));

        // 1. Mükemmel algoritma
        const perfectResult = await this.perfectAlgorithm.searchPerfectMatch(searchPath, { 
            threshold: 0.01, 
            limit: 5 
        });

        // 2. Mevcut API
        const apiResult = await this.testAPI(searchPath, { 
            threshold: 0.01, 
            limit: 5 
        });

        // 3. Karşılaştırma
        console.log(`\n📊 KARŞILAŞTIRMA SONUÇLARI:`);
        
        if (perfectResult.found && apiResult.found) {
            const perfectTop = perfectResult.matches[0];
            const apiTop = apiResult.matches[0];
            
            console.log(`   🟢 Mükemmel Algoritma: ${perfectTop.similarity.toFixed(4)} - ${path.parse(perfectTop.name).name}`);
            console.log(`   🔵 Mevcut API: ${apiTop.similarity.toFixed(4)} - ${path.parse(apiTop.path).name}`);
            
            const difference = perfectTop.similarity - apiTop.similarity;
            console.log(`   📈 Fark: ${difference.toFixed(4)}`);
            
            if (Math.abs(difference) < 0.001) {
                console.log(`   ✅ MÜKEMMEL UYUM: Her iki algoritma aynı sonucu veriyor`);
                return { status: 'PERFECT', difference: difference };
            } else if (difference >= 0) {
                console.log(`   🟢 MÜKEMMEL DAHA İYİ: Mükemmel algoritma daha yüksek skor buluyor`);
                return { status: 'PERFECT_BETTER', difference: difference };
            } else {
                console.log(`   🔵 API DAHA İYİ: Mevcut API daha yüksek skor buluyor`);
                return { status: 'API_BETTER', difference: difference };
            }
        } else if (perfectResult.found && !apiResult.found) {
            const perfectTop = perfectResult.matches[0];
            console.log(`   🟢 Mükemmel Algoritma: ${perfectTop.similarity.toFixed(4)} - ${path.parse(perfectTop.name).name}`);
            console.log(`   🔵 Mevcut API: Eşleşme bulunamadı`);
            console.log(`   🟢 MÜKEMMEL DAHA İYİ: Mükemmel algoritma eşleşme bulurken API bulamıyor`);
            return { status: 'PERFECT_ONLY' };
        } else if (!perfectResult.found && apiResult.found) {
            const apiTop = apiResult.matches[0];
            console.log(`   🟢 Mükemmel Algoritma: Eşleşme bulunamadı`);
            console.log(`   🔵 Mevcut API: ${apiTop.similarity.toFixed(4)} - ${path.parse(apiTop.path).name}`);
            console.log(`   🔵 API DAHA İYİ: Mevcut API eşleşme bulurken mükemmel algoritma bulamıyor`);
            return { status: 'API_ONLY' };
        } else {
            console.log(`   🟢 Mükemmel Algoritma: Eşleşme bulunamadı`);
            console.log(`   🔵 Mevcut API: Eşleşme bulunamadı`);
            console.log(`   ⚪ UYUM: Her ikisi de eşleşme bulamıyor`);
            return { status: 'BOTH_EMPTY' };
        }
    }

    async runComprehensiveTest() {
        console.log('🧪 KAPSAMLI TEST SİSTEMİ');
        console.log('='.repeat(60));
        
        // 1. Global-missing dosyalarını al
        const missingFiles = await this.getGlobalMissingFiles();
        if (missingFiles.length === 0) {
            console.log('❌ Test edilecek dosya bulunamadı');
            return;
        }

        // 2. İlk 20 dosyayı test et (hızlı test)
        const testFiles = missingFiles.slice(0, 20);
        console.log(`\n📊 ${testFiles.length} dosya ile test başlatılıyor...`);

        const results = [];
        const startTime = Date.now();
        
        for (let i = 0; i < testFiles.length; i++) {
            const file = testFiles[i];
            console.log(`\n[${i + 1}/${testFiles.length}] ${path.basename(file)}`);
            
            const result = await this.compareAlgorithms(file);
            results.push({
                file: file,
                result: result
            });
            
            // Progress gösterimi
            if ((i + 1) % 5 === 0) {
                const elapsed = Date.now() - startTime;
                const rate = (i + 1) / elapsed * 1000;
                const eta = (testFiles.length - i - 1) / rate;
                console.log(`\n📊 İlerleme: ${i + 1}/${testFiles.length} (${rate.toFixed(1)} dosya/sn, ETA: ${eta.toFixed(0)}s)`);
            }
            
            // Dosyalar arası kısa bekleme
            if (i < testFiles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`\n⏱️ Toplam süre: ${(totalTime / 1000).toFixed(1)}s`);
        
        // 3. Detaylı analiz
        this.analyzeResults(results);
        
        return results;
    }

    analyzeResults(results) {
        console.log('\n📊 KAPSAMLI ANALİZ RAPORU');
        console.log('='.repeat(50));
        
        const stats = {
            perfect: results.filter(r => r.result.status === 'PERFECT').length,
            perfectBetter: results.filter(r => r.result.status === 'PERFECT_BETTER').length,
            apiBetter: results.filter(r => r.result.status === 'API_BETTER').length,
            perfectOnly: results.filter(r => r.result.status === 'PERFECT_ONLY').length,
            apiOnly: results.filter(r => r.result.status === 'API_ONLY').length,
            bothEmpty: results.filter(r => r.result.status === 'BOTH_EMPTY').length
        };
        
        const totalTests = results.length;
        const perfectWins = stats.perfect + stats.perfectBetter + stats.perfectOnly;
        const apiWins = stats.apiBetter + stats.apiOnly;
        const perfectWinRate = (perfectWins / totalTests) * 100;
        const apiWinRate = (apiWins / totalTests) * 100;
        
        console.log(`📈 GENEL İSTATİSTİKLER:`);
        console.log(`   Toplam test: ${totalTests}`);
        console.log(`   Mükemmel algoritma kazandı: ${perfectWins} (%${perfectWinRate.toFixed(1)})`);
        console.log(`   Mevcut API kazandı: ${apiWins} (%${apiWinRate.toFixed(1)})`);
        console.log(`   Berabere: ${stats.perfect} (%${(stats.perfect/totalTests*100).toFixed(1)})`);
        
        console.log(`\n📊 DURUM DAĞILIMI:`);
        console.log(`   ✅ Mükemmel uyum: ${stats.perfect} (%${(stats.perfect/totalTests*100).toFixed(1)})`);
        console.log(`   🟢 Mükemmel daha iyi: ${stats.perfectBetter} (%${(stats.perfectBetter/totalTests*100).toFixed(1)})`);
        console.log(`   🔵 API daha iyi: ${stats.apiBetter} (%${(stats.apiBetter/totalTests*100).toFixed(1)})`);
        console.log(`   🟢 Sadece mükemmel buluyor: ${stats.perfectOnly} (%${(stats.perfectOnly/totalTests*100).toFixed(1)})`);
        console.log(`   🔵 Sadece API buluyor: ${stats.apiOnly} (%${(stats.apiOnly/totalTests*100).toFixed(1)})`);
        console.log(`   ⚪ İkisi de bulamıyor: ${stats.bothEmpty} (%${(stats.bothEmpty/totalTests*100).toFixed(1)})`);
        
        // En büyük farkları göster
        if (stats.perfectBetter > 0) {
            console.log(`\n🟢 MÜKEMMEL ALGORİTMANIN EN İYİ PERFORMANSLARI:`);
            const perfectResults = results
                .filter(r => r.result.status === 'PERFECT_BETTER')
                .sort((a, b) => b.result.difference - a.result.difference)
                .slice(0, 5);
                
            perfectResults.forEach((r, index) => {
                const fileName = r.file.split('/').pop();
                const difference = r.result.difference;
                console.log(`   ${index + 1}. ${fileName} (+${difference.toFixed(4)})`);
            });
        }
        
        if (stats.apiBetter > 0) {
            console.log(`\n🔵 MEVCUT API'NİN EN İYİ PERFORMANSLARI:`);
            const apiResults = results
                .filter(r => r.result.status === 'API_BETTER')
                .sort((a, b) => a.result.difference - b.result.difference)
                .slice(0, 5);
                
            apiResults.forEach((r, index) => {
                const fileName = r.file.split('/').pop();
                const difference = Math.abs(r.result.difference);
                console.log(`   ${index + 1}. ${fileName} (+${difference.toFixed(4)})`);
            });
        }
        
        // Kategori analizi
        this.analyzeByCategory(results);
        
        // Sonuç önerisi
        console.log(`\n🎯 SONUÇ ÖNERİSİ:`);
        if (perfectWinRate > 70) {
            console.log(`   ✅ MÜKEMMEL ALGORİTMA ÖNERİLİR: %${perfectWinRate.toFixed(1)} başarı oranı`);
        } else if (apiWinRate > 70) {
            console.log(`   🔵 MEVCUT API YETERLİ: %${apiWinRate.toFixed(1)} başarı oranı`);
        } else {
            console.log(`   ⚖️ KARŞILAŞTIRMALI KULLANIM: Her iki algoritma da farklı güçlü yanlara sahip`);
        }
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
}

// CLI kullanımı
if (require.main === module) {
    const tester = new ComprehensiveTestSystem();
    
    async function main() {
        try {
            await tester.runComprehensiveTest();
        } catch (error) {
            console.error('❌ Fatal error:', error);
        }
    }
    
    main();
}

module.exports = ComprehensiveTestSystem;
