/**
 * DETAYLI LOG TEST - Arama yolu ve bulunan yolları göster
 */

const PerfectSimilarityAlgorithm = require('./perfect_similarity_algorithm.js');
const fs = require('fs');

async function detailedLogTest() {
    console.log('🔍 DETAYLI LOG TEST - Arama ve Bulunan Yollar');
    console.log('='.repeat(80));
    
    try {
        // Global-missing dosyasını yükle
        const globalMissingData = JSON.parse(fs.readFileSync('glabal-missing.json', 'utf8'));
        const missingFiles = globalMissingData.missing_files || [];
        
        console.log(`📥 ${missingFiles.length} dosya bulundu`);
        console.log(`🔍 İlk 20 dosya detaylı test ediliyor...\n`);
        
        const algorithm = new PerfectSimilarityAlgorithm();
        
        for (let i = 0; i < Math.min(20, missingFiles.length); i++) {
            const missingFile = missingFiles[i];
            const fileName = missingFile.originalPath.split('/').pop();
            const searchPath = missingFile.originalPath;
            
            console.log(`[${i+1}/20] ${fileName}`);
            console.log('─'.repeat(80));
            console.log(`🔍 ARAMA YOLU: ${searchPath}`);
            console.log('─'.repeat(80));
            
            try {
                const searchResult = await algorithm.searchPerfectMatch(searchPath, { limit: 3 });
                const results = searchResult.matches || [];
                
                console.log(`✅ BULUNDU: ${results.length} eşleşme`);
                
                if (results.length > 0) {
                    console.log('📊 SONUÇLAR:');
                    results.forEach((result, index) => {
                        const displayName = result.name || result.path.split('/').pop();
                        console.log(`   ${index + 1}. ${result.similarity.toFixed(4)} - ${displayName}`);
                        console.log(`      📁 BULUNAN YOL: ${result.path}`);
                        if (result.debug) {
                            console.log(`      📊 E:${result.debug.exactScore.toFixed(3)} F:${result.debug.fuzzyScore.toFixed(3)} P:${result.debug.parenthesesScore.toFixed(3)}`);
                        }
                    });
                    
                    // En iyi eşleşmeyi kontrol et
                    const bestMatch = results[0];
                    const bestName = bestMatch.name || bestMatch.path.split('/').pop();
                    console.log(`\n🏆 EN İYİ EŞLEŞME: ${bestName}`);
                    console.log(`   Skor: ${bestMatch.similarity.toFixed(4)}`);
                    console.log(`   📁 BULUNAN YOL: ${bestMatch.path}`);
                    
                    // Arama kelimelerini kontrol et
                    const searchWords = algorithm.extractPerfectWords(fileName, searchPath);
                    console.log(`🔍 Arama kelimeleri: [${searchWords.file_words.join(', ')}]`);
                    
                    // Parantez kelimeleri varsa göster
                    if (searchWords.parentheses_words.length > 0) {
                        console.log(`📦 Parantez kelimeleri: [${searchWords.parentheses_words.join(', ')}]`);
                    }
                    
                } else {
                    console.log('❌ HİÇ EŞLEŞME BULUNAMADI');
                }
                
            } catch (error) {
                console.error(`❌ HATA: ${error.message}`);
            }
            
            console.log('\n' + '='.repeat(80) + '\n');
        }
        
    } catch (error) {
        console.error('❌ Dosya okuma hatası:', error.message);
    }
}

// Test çalıştır
detailedLogTest();
