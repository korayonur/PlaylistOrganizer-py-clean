/**
 * BASİT GLOBAL-MISSING TESTİ
 * Tüm eksik dosyaları basit algoritma ile test et
 */

const fs = require('fs');
const SimpleSearchEngine = require('./simple_search_engine.js');

async function testGlobalMissingWithSimpleAlgorithm() {
    console.log('🔍 BASİT ALGORİTMA İLE GLOBAL-MISSING TESTİ');
    console.log('='.repeat(80));
    
    try {
        // Arama motorunu başlat
        const searchEngine = new SimpleSearchEngine();
        
        // Veritabanını yükle
        if (!searchEngine.loadDatabase('simple_musicfiles.db.json')) {
            console.error('❌ Veritabanı yüklenemedi!');
            return;
        }
        
        // Global-missing dosyasını yükle
        const globalMissingData = JSON.parse(fs.readFileSync('glabal-missing.json', 'utf8'));
        const globalMissing = globalMissingData.missing_files || globalMissingData;
        console.log(`📊 ${globalMissing.length} eksik dosya test edilecek`);
        
        const results = [];
        let successCount = 0;
        let totalScore = 0;
        
        console.log('\n🔍 TEST BAŞLIYOR...');
        console.log('─'.repeat(80));
        
        for (let i = 0; i < globalMissing.length; i++) {
            const missingFile = globalMissing[i];
            const searchQuery = missingFile.originalPath.split('/').pop();
            
            console.log(`\n[${i + 1}/${globalMissing.length}] ${searchQuery}`);
            
            // Arama yap
            const searchResults = searchEngine.searchFiles(searchQuery, { limit: 5, minScore: 0.1 });
            
            if (searchResults.length > 0) {
                const bestMatch = searchResults[0];
                successCount++;
                totalScore += bestMatch.similarity;
                
                console.log(`✅ BULUNDU: ${bestMatch.similarity.toFixed(4)} - ${bestMatch.name}`);
                console.log(`   📁 ${bestMatch.path}`);
                console.log(`   📊 Eşleşen: ${bestMatch.matchDetails.exactMatches}/${bestMatch.matchDetails.totalSearchWords}`);
                
                results.push({
                    searchQuery: searchQuery,
                    found: true,
                    bestMatch: bestMatch,
                    allMatches: searchResults
                });
            } else {
                console.log(`❌ BULUNAMADI`);
                results.push({
                    searchQuery: searchQuery,
                    found: false,
                    bestMatch: null,
                    allMatches: []
                });
            }
        }
        
        // Sonuçları hesapla
        const successRate = (successCount / globalMissing.length) * 100;
        const averageScore = successCount > 0 ? totalScore / successCount : 0;
        
        console.log('\n📊 FINAL SONUÇLAR');
        console.log('='.repeat(80));
        console.log(`📊 Toplam test: ${globalMissing.length}`);
        console.log(`✅ Başarılı: ${successCount}`);
        console.log(`❌ Başarısız: ${globalMissing.length - successCount}`);
        console.log(`📈 Başarı oranı: ${successRate.toFixed(2)}%`);
        console.log(`⭐ Ortalama skor: ${averageScore.toFixed(4)}`);
        
        // Başarısız olanları listele
        const failedSearches = results.filter(r => !r.found);
        if (failedSearches.length > 0) {
            console.log('\n❌ BAŞARISIZ ARAMALAR:');
            console.log('─'.repeat(80));
            failedSearches.forEach((failed, index) => {
                console.log(`${index + 1}. ${failed.searchQuery}`);
            });
        }
        
        // En iyi eşleşmeleri listele
        const successfulSearches = results.filter(r => r.found);
        if (successfulSearches.length > 0) {
            console.log('\n🏆 EN İYİ EŞLEŞMELER:');
            console.log('─'.repeat(80));
            successfulSearches
                .sort((a, b) => b.bestMatch.similarity - a.bestMatch.similarity)
                .slice(0, 10)
                .forEach((success, index) => {
                    console.log(`${index + 1}. ${success.bestMatch.similarity.toFixed(4)} - ${success.searchQuery}`);
                    console.log(`   → ${success.bestMatch.name}`);
                });
        }
        
        // Sonuçları dosyaya kaydet
        const reportData = {
            testDate: new Date().toISOString(),
            algorithm: 'simple-word-matching',
            totalTests: globalMissing.length,
            successfulTests: successCount,
            failedTests: globalMissing.length - successCount,
            successRate: successRate,
            averageScore: averageScore,
            results: results
        };
        
        const reportPath = 'simple_algorithm_test_results.json';
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        console.log(`\n💾 Detaylı rapor kaydedildi: ${reportPath}`);
        
        return reportData;
        
    } catch (error) {
        console.error('❌ Test hatası:', error.message);
        return null;
    }
}

// Test çalıştır
testGlobalMissingWithSimpleAlgorithm();
