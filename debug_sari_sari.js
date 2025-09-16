/**
 * SARİ SARİ DEBUG - Exact match hesaplamasını kontrol et
 */

const PerfectSimilarityAlgorithm = require('./perfect_similarity_algorithm.js');

async function debugSariSari() {
    console.log('🔍 SARİ SARİ DEBUG - Exact Match Hesaplaması');
    console.log('='.repeat(60));
    
    const algorithm = new PerfectSimilarityAlgorithm();
    
    // Test case: Mahsun Kırmızıgül - Sarı Sarı
    const testPath = '/Users/koray/Music/KorayMusics/Video2019/Mahsun Kırmızıgül - Sarı Sarı.m4a';
    
    console.log(`\n🎵 Test: ${testPath}`);
    console.log('─'.repeat(60));
    
    try {
        // Arama kelimelerini çıkar
        const searchWords = algorithm.extractPerfectWords('Mahsun Kırmızıgül - Sarı Sarı.m4a', testPath);
        console.log('🔍 Arama kelimeleri:', searchWords.file_words);
        
        // İki farklı dosyayı test et
        const testFiles = [
            {
                name: 'Sarı Sarı - Mahsun Kırmızıgül.m4a',
                path: '/Users/koray/Music/KorayMusics/2023_newyear/80ler 90lar/Sarı Sarı - Mahsun Kırmızıgül.m4a'
            },
            {
                name: 'Mahsun Kırmızıgül - Dinle.m4a', 
                path: '/Users/koray/Music/KorayMusics/2022_Dugun/Mahsun Kırmızıgül - Dinle.m4a'
            }
        ];
        
        for (const testFile of testFiles) {
            console.log(`\n📁 Test dosyası: ${testFile.name}`);
            console.log('─'.repeat(40));
            
            const targetWords = algorithm.extractPerfectWords(testFile.name, testFile.path);
            console.log('📝 Hedef kelimeleri:', targetWords.file_words);
            
            // Exact match hesapla
            const exactScore = algorithm.calculateExactMatch(searchWords, targetWords);
            console.log(`📊 Exact Score: ${exactScore.toFixed(4)}`);
            
            // Kelime sayılarını kontrol et
            const searchWordCounts = {};
            const targetWordCounts = {};
            
            for (const word of searchWords.file_words) {
                searchWordCounts[word] = (searchWordCounts[word] || 0) + 1;
            }
            
            for (const word of targetWords.file_words) {
                targetWordCounts[word] = (targetWordCounts[word] || 0) + 1;
            }
            
            console.log('🔢 Arama kelime sayıları:', searchWordCounts);
            console.log('🔢 Hedef kelime sayıları:', targetWordCounts);
            
            // Eşleşmeleri hesapla
            let exactMatches = 0;
            for (const [word, searchCount] of Object.entries(searchWordCounts)) {
                if (targetWordCounts[word]) {
                    const targetCount = targetWordCounts[word];
                    const matchedCount = Math.min(searchCount, targetCount);
                    exactMatches += matchedCount;
                    
                    console.log(`   "${word}": arama=${searchCount}, hedef=${targetCount}, eşleşme=${matchedCount}`);
                    
                    if (matchedCount > 1) {
                        const bonus = (matchedCount - 1) * 0.5;
                        exactMatches += bonus;
                        console.log(`   "${word}": tekrar bonusu=${bonus.toFixed(2)}`);
                    }
                }
            }
            
            const finalExactScore = exactMatches / searchWords.file_words.length;
            console.log(`📊 Final Exact Score: ${finalExactScore.toFixed(4)} (${exactMatches}/${searchWords.file_words.length})`);
        }
        
    } catch (error) {
        console.error('❌ HATA:', error.message);
    }
}

// Test çalıştır
debugSariSari();
