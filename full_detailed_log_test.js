/**
 * TÜM DOSYALAR DETAYLI LOG TEST - 225 dosya için tam analiz
 */

const PerfectSimilarityAlgorithm = require('./perfect_similarity_algorithm.js');
const fs = require('fs');

async function fullDetailedLogTest() {
    console.log('🔍 TÜM DOSYALAR DETAYLI LOG TEST - 225 Dosya Tam Analiz');
    console.log('='.repeat(100));
    
    try {
        // Global-missing dosyasını yükle
        const globalMissingData = JSON.parse(fs.readFileSync('glabal-missing.json', 'utf8'));
        const missingFiles = globalMissingData.missing_files || [];
        
        console.log(`📥 ${missingFiles.length} dosya bulundu`);
        console.log(`🔍 TÜM ${missingFiles.length} dosya detaylı test ediliyor...\n`);
        
        const algorithm = new PerfectSimilarityAlgorithm();
        
        let successCount = 0;
        let totalScore = 0;
        let categoryStats = {
            remix: { total: 0, success: 0, totalScore: 0 },
            parentheses: { total: 0, success: 0, totalScore: 0 },
            artistTitle: { total: 0, success: 0, totalScore: 0 },
            singleWord: { total: 0, success: 0, totalScore: 0 },
            standard: { total: 0, success: 0, totalScore: 0 }
        };
        
        for (let i = 0; i < missingFiles.length; i++) {
            const missingFile = missingFiles[i];
            const fileName = missingFile.originalPath.split('/').pop();
            const searchPath = missingFile.originalPath;
            
            console.log(`[${i+1}/${missingFiles.length}] ${fileName}`);
            console.log('─'.repeat(100));
            console.log(`🔍 ARAMA YOLU: ${searchPath}`);
            console.log('─'.repeat(100));
            
            try {
                const searchResult = await algorithm.searchPerfectMatch(searchPath, { limit: 5 });
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
                    const bestScore = bestMatch.similarity;
                    
                    console.log(`\n🏆 EN İYİ EŞLEŞME: ${bestName}`);
                    console.log(`   Skor: ${bestScore.toFixed(4)}`);
                    console.log(`   📁 BULUNAN YOL: ${bestMatch.path}`);
                    
                    // Başarı kriteri: 0.3+ skor
                    if (bestScore >= 0.3) {
                        successCount++;
                        totalScore += bestScore;
                        console.log(`✅ BAŞARILI! (${bestScore.toFixed(4)} >= 0.3)`);
                    } else {
                        console.log(`❌ BAŞARISIZ! (${bestScore.toFixed(4)} < 0.3)`);
                    }
                    
                    // Kategori analizi
                    const isRemix = fileName.toLowerCase().includes('remix') || fileName.includes('(');
                    const hasParentheses = fileName.includes('(') && fileName.includes(')');
                    const isArtistTitle = fileName.includes(' - ');
                    const isSingleWord = fileName.split(/[-_\s\.\,\&\+\|\~\!\@\#\$\%\^\*\(\)\[\]\{\}]+/).filter(w => w.length > 1).length <= 2;
                    
                    if (isRemix) {
                        categoryStats.remix.total++;
                        if (bestScore >= 0.3) {
                            categoryStats.remix.success++;
                            categoryStats.remix.totalScore += bestScore;
                        }
                    } else if (hasParentheses) {
                        categoryStats.parentheses.total++;
                        if (bestScore >= 0.3) {
                            categoryStats.parentheses.success++;
                            categoryStats.parentheses.totalScore += bestScore;
                        }
                    } else if (isArtistTitle) {
                        categoryStats.artistTitle.total++;
                        if (bestScore >= 0.3) {
                            categoryStats.artistTitle.success++;
                            categoryStats.artistTitle.totalScore += bestScore;
                        }
                    } else if (isSingleWord) {
                        categoryStats.singleWord.total++;
                        if (bestScore >= 0.3) {
                            categoryStats.singleWord.success++;
                            categoryStats.singleWord.totalScore += bestScore;
                        }
                    } else {
                        categoryStats.standard.total++;
                        if (bestScore >= 0.3) {
                            categoryStats.standard.success++;
                            categoryStats.standard.totalScore += bestScore;
                        }
                    }
                    
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
            
            // İlerleme göster
            if ((i + 1) % 25 === 0) {
                const progress = ((i + 1) / missingFiles.length * 100).toFixed(1);
                console.log(`\n📊 İlerleme: ${i + 1}/${missingFiles.length} (${progress}%)`);
                console.log(`✅ Başarılı: ${successCount}/${i + 1} (${(successCount / (i + 1) * 100).toFixed(1)}%)`);
                console.log(`📊 Ortalama skor: ${totalScore > 0 ? (totalScore / successCount).toFixed(4) : '0.0000'}`);
            }
            
            console.log('\n' + '='.repeat(100) + '\n');
        }
        
        // Final rapor
        console.log('\n🎯 FİNAL RAPOR');
        console.log('='.repeat(100));
        console.log(`📊 Toplam dosya: ${missingFiles.length}`);
        console.log(`✅ Başarılı: ${successCount} (${(successCount / missingFiles.length * 100).toFixed(1)}%)`);
        console.log(`📊 Ortalama skor: ${totalScore > 0 ? (totalScore / successCount).toFixed(4) : '0.0000'}`);
        
        console.log('\n📈 KATEGORİ ANALİZİ:');
        Object.entries(categoryStats).forEach(([category, stats]) => {
            if (stats.total > 0) {
                const successRate = (stats.success / stats.total * 100).toFixed(1);
                const avgScore = stats.success > 0 ? (stats.totalScore / stats.success).toFixed(4) : '0.0000';
                console.log(`   ${category}: ${stats.success}/${stats.total} (${successRate}%) - Ort: ${avgScore}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Dosya okuma hatası:', error.message);
    }
}

// Test çalıştır
fullDetailedLogTest();
