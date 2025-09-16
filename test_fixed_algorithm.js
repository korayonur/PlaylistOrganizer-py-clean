/**
 * DÜZELTİLMİŞ MÜKEMMEL ALGORİTMA TESTİ
 * "Sarı Sarı" problemi için özel test
 */

const PerfectSimilarityAlgorithm = require('./perfect_similarity_algorithm.js');

async function testFixedAlgorithm() {
    console.log('🔧 DÜZELTİLMİŞ MÜKEMMEL ALGORİTMA TESTİ');
    console.log('='.repeat(60));
    
    const algorithm = new PerfectSimilarityAlgorithm();
    
    // Test case: Mahsun Kırmızıgül - Sarı Sarı
    const testPath = '/Users/koray/Music/KorayMusics/Video2019/Mahsun Kırmızıgül - Sarı Sarı.m4a';
    
    console.log(`\n🎵 Test: ${testPath}`);
    console.log('─'.repeat(60));
    
    try {
        const result = await algorithm.searchPerfectMatch(testPath, { 
            threshold: 0.01, 
            limit: 10 
        });
        
        if (result.found && result.matches.length > 0) {
            console.log(`✅ BULUNDU: ${result.matches.length} eşleşme`);
            console.log('\n📊 SONUÇLAR:');
            
            result.matches.forEach((match, index) => {
                const fileName = match.name.replace(/\.[^/.]+$/, ''); // Uzantıyı kaldır
                console.log(`   ${index + 1}. ${match.similarity.toFixed(4)} - ${fileName}`);
                console.log(`      📁 ${match.path}`);
                
                if (match.matchDetails) {
                    console.log(`      📊 E:${match.matchDetails.exactScore?.toFixed(3) || 'N/A'} F:${match.matchDetails.fuzzyScore?.toFixed(3) || 'N/A'} P:${match.matchDetails.parenthesesScore?.toFixed(3) || 'N/A'}`);
                }
            });
            
            // En iyi eşleşmeyi kontrol et
            const topMatch = result.matches[0];
            const topFileName = topMatch.name.replace(/\.[^/.]+$/, '');
            
            console.log(`\n🏆 EN İYİ EŞLEŞME: ${topFileName}`);
            console.log(`   Skor: ${topMatch.similarity.toFixed(4)}`);
            
            // "Sarı Sarı" içeren dosyaları kontrol et
            const sarıSarıMatches = result.matches.filter(match => 
                match.name.toLowerCase().includes('sarı') || 
                match.name.toLowerCase().includes('sari')
            );
            
            if (sarıSarıMatches.length > 0) {
                console.log(`\n🎯 "SARI SARI" İÇEREN DOSYALAR:`);
                sarıSarıMatches.forEach((match, index) => {
                    const fileName = match.name.replace(/\.[^/.]+$/, '');
                    console.log(`   ${index + 1}. ${match.similarity.toFixed(4)} - ${fileName}`);
                });
            } else {
                console.log(`\n❌ "SARI SARI" İÇEREN DOSYA BULUNAMADI!`);
            }
            
        } else {
            console.log('❌ BULUNAMADI');
        }
        
    } catch (error) {
        console.error('❌ HATA:', error.message);
    }
}

// Test çalıştır
testFixedAlgorithm();
