/**
 * TÜM GLOBAL-MISSING DOSYALARINI MÜKEMMEL TEST SİSTEMİ İLE TEST ET
 */

const PerfectSimilarityTester = require('./perfect_test_system.js');
const axios = require('axios');

class GlobalMissingTester {
    constructor() {
        this.tester = new PerfectSimilarityTester();
        this.apiUrl = 'http://localhost:50001';
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

    async testAllGlobalMissing() {
        console.log('🧪 TÜM GLOBAL-MISSING DOSYALARI TEST SİSTEMİ');
        console.log('='.repeat(60));
        
        // 1. Global-missing dosyalarını al
        const missingFiles = await this.getGlobalMissingFiles();
        if (missingFiles.length === 0) {
            console.log('❌ Test edilecek dosya bulunamadı');
            return;
        }

        // 2. Her dosyayı test et
        const results = [];
        const startTime = Date.now();
        
        for (let i = 0; i < missingFiles.length; i++) {
            const file = missingFiles[i];
            console.log(`\n[${i + 1}/${missingFiles.length}] ${file}`);
            
            const result = await this.tester.compareAPIvsServer(file, { threshold: 0.01 });
            results.push({
                file: file,
                result: result
            });
            
            // Progress gösterimi
            if ((i + 1) % 10 === 0) {
                const elapsed = Date.now() - startTime;
                const rate = (i + 1) / elapsed * 1000;
                const eta = (missingFiles.length - i - 1) / rate;
                console.log(`\n📊 İlerleme: ${i + 1}/${missingFiles.length} (${rate.toFixed(1)} dosya/sn, ETA: ${eta.toFixed(0)}s)`);
            }
            
            // Dosyalar arası kısa bekleme
            if (i < missingFiles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`\n⏱️ Toplam süre: ${(totalTime / 1000).toFixed(1)}s`);
        
        // 3. Detaylı analiz
        this.analyzeResults(results);
        
        return results;
    }

    analyzeResults(results) {
        console.log('\n📊 DETAYLI ANALİZ RAPORU');
        console.log('='.repeat(50));
        
        const stats = {
            perfect: results.filter(r => r.result.status === 'PERFECT').length,
            apiBetter: results.filter(r => r.result.status === 'API_BETTER').length,
            apiMissing: results.filter(r => r.result.status === 'API_MISSING').length,
            apiOnly: results.filter(r => r.result.status === 'API_ONLY').length,
            serverOnly: results.filter(r => r.result.status === 'SERVER_ONLY').length,
            bothEmpty: results.filter(r => r.result.status === 'BOTH_EMPTY').length,
            errors: results.filter(r => r.result.status === 'ERROR').length
        };
        
        const totalTests = results.length;
        const successfulTests = stats.perfect + stats.apiBetter + stats.apiOnly;
        const successRate = (successfulTests / totalTests) * 100;
        
        console.log(`📈 GENEL İSTATİSTİKLER:`);
        console.log(`   Toplam test: ${totalTests}`);
        console.log(`   Başarılı: ${successfulTests} (%${successRate.toFixed(1)})`);
        console.log(`   Başarısız: ${totalTests - successfulTests} (%${(100 - successRate).toFixed(1)})`);
        
        console.log(`\n📊 DURUM DAĞILIMI:`);
        console.log(`   ✅ Mükemmel uyum: ${stats.perfect} (%${(stats.perfect/totalTests*100).toFixed(1)})`);
        console.log(`   🔵 API daha iyi: ${stats.apiBetter} (%${(stats.apiBetter/totalTests*100).toFixed(1)})`);
        console.log(`   ❌ API kaçırıyor: ${stats.apiMissing} (%${(stats.apiMissing/totalTests*100).toFixed(1)})`);
        console.log(`   🔵 Sadece API buluyor: ${stats.apiOnly} (%${(stats.apiOnly/totalTests*100).toFixed(1)})`);
        console.log(`   🟢 Sadece Server buluyor: ${stats.serverOnly} (%${(stats.serverOnly/totalTests*100).toFixed(1)})`);
        console.log(`   ⚪ İkisi de bulamıyor: ${stats.bothEmpty} (%${(stats.bothEmpty/totalTests*100).toFixed(1)})`);
        console.log(`   🔥 Hata: ${stats.errors} (%${(stats.errors/totalTests*100).toFixed(1)})`);
        
        // En büyük farkları göster
        if (stats.apiMissing > 0) {
            console.log(`\n❌ API'NİN EN ÇOK KAÇIRDIĞI DOSYALAR:`);
            const missingResults = results
                .filter(r => r.result.status === 'API_MISSING')
                .sort((a, b) => Math.abs(b.result.difference) - Math.abs(a.result.difference))
                .slice(0, 10);
                
            missingResults.forEach((r, index) => {
                const fileName = r.file.split('/').pop();
                const missedFile = r.result.missedFile.name;
                const difference = Math.abs(r.result.difference);
                console.log(`   ${index + 1}. ${fileName}`);
                console.log(`      Kaçırılan: ${missedFile} (${r.result.missedFile.similarity.toFixed(4)})`);
                console.log(`      Fark: ${difference.toFixed(4)}`);
            });
        }
        
        // En büyük API başarılarını göster
        if (stats.apiBetter > 0) {
            console.log(`\n🔵 API'NİN EN İYİ PERFORMANS GÖSTERDİĞİ DOSYALAR:`);
            const betterResults = results
                .filter(r => r.result.status === 'API_BETTER')
                .sort((a, b) => b.result.difference - a.result.difference)
                .slice(0, 5);
                
            betterResults.forEach((r, index) => {
                const fileName = r.file.split('/').pop();
                const difference = r.result.difference;
                console.log(`   ${index + 1}. ${fileName} (+${difference.toFixed(4)})`);
            });
        }
        
        // Kategori analizi
        this.analyzeByCategory(results);
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
            }),
            'with_numbers': results.filter(r => /\d/.test(r.file))
        };
        
        Object.entries(categories).forEach(([category, files]) => {
            if (files.length === 0) return;
            
            const categoryStats = {
                total: files.length,
                perfect: files.filter(f => f.result.status === 'PERFECT').length,
                apiBetter: files.filter(f => f.result.status === 'API_BETTER').length,
                apiMissing: files.filter(f => f.result.status === 'API_MISSING').length,
                success: files.filter(f => ['PERFECT', 'API_BETTER', 'API_ONLY'].includes(f.result.status)).length
            };
            
            const successRate = (categoryStats.success / categoryStats.total) * 100;
            
            console.log(`   ${category.toUpperCase()}: ${categoryStats.total} dosya`);
            console.log(`      Başarı: %${successRate.toFixed(1)} (${categoryStats.success}/${categoryStats.total})`);
            console.log(`      Mükemmel: ${categoryStats.perfect}, API daha iyi: ${categoryStats.apiBetter}, API kaçırıyor: ${categoryStats.apiMissing}`);
        });
    }
}

// CLI kullanımı
if (require.main === module) {
    const tester = new GlobalMissingTester();
    
    async function main() {
        try {
            await tester.testAllGlobalMissing();
        } catch (error) {
            console.error('❌ Fatal error:', error);
        }
    }
    
    main();
}

module.exports = GlobalMissingTester;
