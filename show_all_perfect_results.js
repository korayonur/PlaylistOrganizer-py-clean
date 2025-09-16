/**
 * MÜKEMMEL ALGORİTMA - TÜM SONUÇLARI GÖSTER
 * Sadece mükemmel algoritma çalıştır, API'yi hiç çalıştırma
 */

const PerfectSimilarityAlgorithm = require('./perfect_similarity_algorithm.js');
const path = require('path');
const fs = require('fs');

class PerfectResultsViewer {
    constructor() {
        this.perfectAlgorithm = new PerfectSimilarityAlgorithm();
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

    async showAllResults() {
        console.log('🎵 MÜKEMMEL ALGORİTMA - TÜM SONUÇLAR');
        console.log('='.repeat(80));
        
        // 1. Global-missing dosyalarını yükle
        const missingFiles = await this.loadGlobalMissingFiles();
        if (missingFiles.length === 0) {
            console.log('❌ Test edilecek dosya bulunamadı');
            return;
        }

        console.log(`\n🔍 ${missingFiles.length} dosya için mükemmel algoritma çalıştırılıyor...`);
        console.log('⏱️ Tahmini süre: ' + Math.round(missingFiles.length * 0.4) + ' saniye\n');

        const startTime = Date.now();
        let foundCount = 0;
        let notFoundCount = 0;
        
        // 2. Tüm dosyaları test et
        for (let i = 0; i < missingFiles.length; i++) {
            const file = missingFiles[i];
            const fileName = path.basename(file);
            
            // Progress gösterimi
            if ((i + 1) % 25 === 0) {
                const elapsed = Date.now() - startTime;
                const rate = (i + 1) / elapsed * 1000;
                const eta = (missingFiles.length - i - 1) / rate;
                console.log(`\n📊 İlerleme: ${i + 1}/${missingFiles.length} (${rate.toFixed(1)} dosya/sn, ETA: ${eta.toFixed(0)}s)`);
            }

            try {
                console.log(`\n[${i + 1}/${missingFiles.length}] ${fileName}`);
                console.log('─'.repeat(60));
                
                const result = await this.perfectAlgorithm.searchPerfectMatch(file, { 
                    threshold: 0.01, 
                    limit: 10 
                });

                if (result.found && result.matches.length > 0) {
                    foundCount++;
                    console.log(`✅ BULUNDU: ${result.matches.length} eşleşme`);
                    
                    result.matches.forEach((match, index) => {
                        const matchFileName = path.parse(match.name).name;
                        console.log(`   ${index + 1}. ${match.similarity.toFixed(4)} - ${matchFileName}`);
                        console.log(`      📁 ${match.path}`);
                        
                        if (match.matchDetails) {
                            console.log(`      📊 E:${match.matchDetails.exactScore?.toFixed(3) || 'N/A'} F:${match.matchDetails.fuzzyScore?.toFixed(3) || 'N/A'} P:${match.matchDetails.parenthesesScore?.toFixed(3) || 'N/A'}`);
                        }
                    });
                } else {
                    notFoundCount++;
                    console.log(`❌ BULUNAMADI`);
                }
                
            } catch (error) {
                notFoundCount++;
                console.error(`❌ HATA: ${error.message}`);
            }
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`\n\n📊 FINAL İSTATİSTİKLER`);
        console.log('='.repeat(50));
        console.log(`⏱️ Toplam süre: ${(totalTime / 1000).toFixed(1)}s`);
        console.log(`📈 Ortalama hız: ${(missingFiles.length / totalTime * 1000).toFixed(1)} dosya/sn`);
        console.log(`✅ Bulunan: ${foundCount} dosya (%${(foundCount/missingFiles.length*100).toFixed(1)})`);
        console.log(`❌ Bulunamayan: ${notFoundCount} dosya (%${(notFoundCount/missingFiles.length*100).toFixed(1)})`);
        
        return {
            total: missingFiles.length,
            found: foundCount,
            notFound: notFoundCount,
            time: totalTime
        };
    }
}

// CLI kullanımı
if (require.main === module) {
    const viewer = new PerfectResultsViewer();
    
    async function main() {
        try {
            await viewer.showAllResults();
        } catch (error) {
            console.error('❌ Fatal error:', error);
        }
    }
    
    main();
}

module.exports = PerfectResultsViewer;
