/**
 * DETAYLI BASİT ALGORİTMA LOG GÖRÜNTÜLEYİCİ
 * Tüm test sonuçlarını detaylı olarak göster
 */

const fs = require('fs');

function displayDetailedLogs() {
    console.log('📊 DETAYLI BASİT ALGORİTMA LOGLARI');
    console.log('='.repeat(80));
    
    try {
        // JSON dosyasını yükle
        const data = JSON.parse(fs.readFileSync('simple_algorithm_test_results.json', 'utf8'));
        
        console.log(`📅 Test Tarihi: ${data.testDate}`);
        console.log(`🔍 Algoritma: ${data.algorithm}`);
        console.log(`📊 Toplam Test: ${data.totalTests}`);
        console.log(`✅ Başarılı: ${data.successfulTests}`);
        console.log(`❌ Başarısız: ${data.failedTests}`);
        console.log(`📈 Başarı Oranı: ${data.successRate}%`);
        console.log(`⭐ Ortalama Skor: ${data.averageScore.toFixed(4)}`);
        
        console.log('\n🔍 DETAYLI TEST SONUÇLARI:');
        console.log('='.repeat(80));
        
        // Her test sonucunu detaylı göster
        data.results.forEach((result, index) => {
            console.log(`\n[${index + 1}/${data.totalTests}] ${result.searchQuery}`);
            console.log('─'.repeat(80));
            
            if (result.found) {
                console.log(`✅ BULUNDU: ${result.bestMatch.similarity.toFixed(4)}`);
                console.log(`📁 Dosya: ${result.bestMatch.name}`);
                console.log(`📂 Yol: ${result.bestMatch.path}`);
                console.log(`🔍 Dosya Kelimeleri: [${result.bestMatch.fileWords.join(', ')}]`);
                console.log(`📁 Klasör Kelimeleri: [${result.bestMatch.folderWords.join(', ')}]`);
                console.log(`📊 Eşleşen Kelimeler: ${result.bestMatch.matchDetails.exactMatches}/${result.bestMatch.matchDetails.totalSearchWords}`);
                console.log(`🔍 Arama Kelimeleri: [${result.bestMatch.matchDetails.searchWords.join(', ')}]`);
                
                // İlk 3 alternatif sonucu göster
                if (result.allMatches && result.allMatches.length > 1) {
                    console.log(`\n📋 ALTERNATİF SONUÇLAR:`);
                    result.allMatches.slice(1, 4).forEach((match, altIndex) => {
                        console.log(`   ${altIndex + 2}. ${match.similarity.toFixed(4)} - ${match.name}`);
                    });
                }
            } else {
                console.log(`❌ BULUNAMADI`);
            }
        });
        
        // İstatistikler
        console.log('\n📊 DETAYLI İSTATİSTİKLER:');
        console.log('='.repeat(80));
        
        const scores = data.results
            .filter(r => r.found)
            .map(r => r.bestMatch.similarity);
        
        const scoreRanges = {
            '1.0 (Mükemmel)': scores.filter(s => s === 1.0).length,
            '0.9-0.99 (Çok İyi)': scores.filter(s => s >= 0.9 && s < 1.0).length,
            '0.8-0.89 (İyi)': scores.filter(s => s >= 0.8 && s < 0.9).length,
            '0.7-0.79 (Orta)': scores.filter(s => s >= 0.7 && s < 0.8).length,
            '0.6-0.69 (Zayıf)': scores.filter(s => s >= 0.6 && s < 0.7).length,
            '0.5-0.59 (Çok Zayıf)': scores.filter(s => s >= 0.5 && s < 0.6).length,
            '0.5 Altı (Kötü)': scores.filter(s => s < 0.5).length
        };
        
        console.log('📈 SKOR DAĞILIMI:');
        Object.entries(scoreRanges).forEach(([range, count]) => {
            const percentage = ((count / scores.length) * 100).toFixed(1);
            console.log(`   ${range}: ${count} dosya (${percentage}%)`);
        });
        
        // En yüksek ve en düşük skorlar
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        
        console.log(`\n🏆 EN YÜKSEK SKOR: ${maxScore.toFixed(4)}`);
        console.log(`📉 EN DÜŞÜK SKOR: ${minScore.toFixed(4)}`);
        
        // En iyi 10 eşleşme
        console.log('\n🏆 EN İYİ 10 EŞLEŞME:');
        console.log('─'.repeat(80));
        data.results
            .filter(r => r.found)
            .sort((a, b) => b.bestMatch.similarity - a.bestMatch.similarity)
            .slice(0, 10)
            .forEach((result, index) => {
                console.log(`${index + 1}. ${result.bestMatch.similarity.toFixed(4)} - ${result.searchQuery}`);
                console.log(`   → ${result.bestMatch.name}`);
            });
        
        // En düşük 10 eşleşme
        console.log('\n📉 EN DÜŞÜK 10 EŞLEŞME:');
        console.log('─'.repeat(80));
        data.results
            .filter(r => r.found)
            .sort((a, b) => a.bestMatch.similarity - b.bestMatch.similarity)
            .slice(0, 10)
            .forEach((result, index) => {
                console.log(`${index + 1}. ${result.bestMatch.similarity.toFixed(4)} - ${result.searchQuery}`);
                console.log(`   → ${result.bestMatch.name}`);
            });
        
    } catch (error) {
        console.error('❌ Log dosyası okuma hatası:', error.message);
    }
}

// Çalıştır
displayDetailedLogs();
