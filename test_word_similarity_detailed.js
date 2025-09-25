const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database bağlantısı
const dbPath = path.join(__dirname, 'musicfiles.db');
const db = new Database(dbPath);

console.log('🔍 Detaylı Test başlatılıyor...');

// 1. Rakam filtreleme fonksiyonu
function filterNumbers(text) {
    return text.replace(/^\d+\s*/, '').trim();
}

// 2. Kelime kombinasyonları oluşturma (en uzundan başla)
function generateWordCombinations(words) {
    const combinations = [];
    for (let i = words.length; i >= 1; i--) {
        for (let j = 0; j <= words.length - i; j++) {
            combinations.push(words.slice(j, j + i).join(' '));
        }
    }
    return combinations;
}

// 3. Kademeli arama fonksiyonu
function searchStepByStep(trackName) {
    console.log(`\n🔍 Kademeli arama başlatılıyor: "${trackName}"`);
    
    const filteredName = filterNumbers(trackName);
    console.log(`📝 Rakam filtrelendi: "${trackName}" → "${filteredName}"`);
    
    const words = filteredName.split(' ').filter(w => w.length > 0);
    console.log(`📝 Kelimeler: [${words.join(', ')}] (${words.length} kelime)`);
    
    const combinations = generateWordCombinations(words);
    console.log(`📝 Kombinasyonlar (${combinations.length} adet):`);
    combinations.slice(0, 5).forEach((combo, i) => {
        console.log(`   ${i+1}. "${combo}"`);
    });
    if (combinations.length > 5) {
        console.log(`   ... ve ${combinations.length - 5} tane daha`);
    }

    for (let i = 0; i < combinations.length; i++) {
        const combination = combinations[i];
        console.log(`\n🔎 Arama ${i+1}/${combinations.length}: "${combination}"`);
        
        const results = db.prepare(`
            SELECT id, normalizedFileName, fileName 
            FROM music_files 
            WHERE normalizedFileName LIKE ?
            LIMIT 5
        `).all(`%${combination}%`);

        console.log(`   📊 Sonuç: ${results.length} adet bulundu`);
        
        if (results.length > 0) {
            console.log(`   ✅ İlk 3 sonuç:`);
            results.slice(0, 3).forEach((result, idx) => {
                console.log(`      ${idx+1}. ${result.normalizedFileName}`);
            });
            return { combination, results };
        }
    }

    console.log(`❌ Hiçbir kombinasyon bulunamadı`);
    return null;
}

// 4. Benzerlik hesaplama fonksiyonu
function calculateWordSimilarity(trackName, musicName) {
    const trackWords = trackName.split(' ').filter(w => w.length > 0);
    const musicWords = musicName.split(' ').filter(w => w.length > 0);

    let matchedWords = 0;
    const usedMusicWords = new Set();

    for (const trackWord of trackWords) {
        let bestMatch = null;
        let bestScore = 0;

        for (let i = 0; i < musicWords.length; i++) {
            if (usedMusicWords.has(i)) continue;

            const musicWord = musicWords[i];
            // Basit Levenshtein benzerliği
            const similarity = calculateLevenshteinSimilarity(trackWord, musicWord);

            if (similarity > 0.7 && similarity > bestScore) {
                bestMatch = i;
                bestScore = similarity;
            }
        }

        if (bestMatch !== null) {
            matchedWords++;
            usedMusicWords.add(bestMatch);
        }
    }

    return matchedWords / trackWords.length;
}

// 5. Levenshtein benzerlik hesaplama
function calculateLevenshteinSimilarity(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
        for (let j = 1; j <= len1; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
}

// 6. En iyi eşleşmeyi bulma
function findBestMatch(originalName, candidates) {
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidates) {
        const score = calculateWordSimilarity(originalName, candidate.normalizedFileName);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = candidate;
        }
    }

    return bestMatch ? { match: bestMatch, score: bestScore } : null;
}

// 7. Test verilerini al
console.log('\n📊 Test verileri alınıyor...');

// Eşleşmemiş track'lerden 10 tane al (anlamlı track'leri bul)
const unmatchedTracks = db.prepare(`
    SELECT id, normalizedFileName, fileName 
    FROM tracks 
    WHERE is_matched = 0 
    AND normalizedFileName LIKE '% %'
    AND LENGTH(normalizedFileName) > 15
    ORDER BY id 
    LIMIT 10
`).all();

console.log(`📊 ${unmatchedTracks.length} eşleşmemiş track bulundu:`);
unmatchedTracks.forEach((track, i) => {
    console.log(`   ${i+1}. ${track.normalizedFileName}`);
});

// 8. Test sonuçlarını dosyaya yaz
const testResults = [];
const startTime = new Date();

console.log('\n🚀 Detaylı Test başlatılıyor...\n');

// 9. Her track için test yap
for (let i = 0; i < unmatchedTracks.length; i++) {
    const track = unmatchedTracks[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎵 TEST ${i+1}/${unmatchedTracks.length}: ${track.normalizedFileName}`);
    console.log(`${'='.repeat(80)}`);
    
    const testStartTime = new Date();
    const searchResult = searchStepByStep(track.normalizedFileName);
    const testEndTime = new Date();
    const testDuration = testEndTime - testStartTime;
    
    let testResult = {
        testNumber: i + 1,
        trackName: track.normalizedFileName,
        duration: testDuration,
        found: false,
        combination: null,
        resultsCount: 0,
        bestMatch: null,
        bestScore: 0,
        threshold: 0.3
    };
    
    if (searchResult && searchResult.results.length > 0) {
        console.log(`\n✅ BAŞARILI! Bulunan kombinasyon: "${searchResult.combination}"`);
        console.log(`📊 Toplam ${searchResult.results.length} sonuç bulundu`);
        
        // En iyi eşleşmeyi bul
        const bestMatch = findBestMatch(track.normalizedFileName, searchResult.results);
        
        if (bestMatch) {
            console.log(`🎯 En iyi eşleşme: "${bestMatch.match.normalizedFileName}"`);
            console.log(`📊 Skor: ${bestMatch.score.toFixed(3)}`);
            
            testResult.found = true;
            testResult.combination = searchResult.combination;
            testResult.resultsCount = searchResult.results.length;
            testResult.bestMatch = bestMatch.match.normalizedFileName;
            testResult.bestScore = bestMatch.score;
            
            if (bestMatch.score >= 0.3) {
                console.log(`✅ EŞLEŞME YETERLİ! (${bestMatch.score.toFixed(3)} >= 0.3)`);
                testResult.matched = true;
            } else {
                console.log(`❌ EŞLEŞME YETERSİZ! (${bestMatch.score.toFixed(3)} < 0.3)`);
                testResult.matched = false;
            }
        } else {
            console.log(`❌ En iyi eşleşme bulunamadı`);
            testResult.matched = false;
        }
    } else {
        console.log(`\n❌ BAŞARISIZ! Hiçbir eşleşme bulunamadı`);
        testResult.matched = false;
    }
    
    testResults.push(testResult);
}

const endTime = new Date();
const totalDuration = endTime - startTime;

// 10. Test sonuçlarını dosyaya yaz
const reportContent = `
# Kelime Çıkartmalı Algoritma Test Raporu
## Test Tarihi: ${new Date().toISOString()}
## Toplam Süre: ${totalDuration}ms
## Test Edilen Track Sayısı: ${unmatchedTracks.length}

## Test Sonuçları:

${testResults.map((result, i) => `
### Test ${result.testNumber}: ${result.trackName}
- **Süre**: ${result.duration}ms
- **Bulundu**: ${result.found ? '✅ Evet' : '❌ Hayır'}
- **Kombinasyon**: ${result.combination || 'Yok'}
- **Sonuç Sayısı**: ${result.resultsCount}
- **En İyi Eşleşme**: ${result.bestMatch || 'Yok'}
- **Skor**: ${result.bestScore.toFixed(3)}
- **Eşleşme**: ${result.matched ? '✅ Yeterli' : '❌ Yetersiz'}
`).join('')}

## Özet İstatistikler:
- **Toplam Test**: ${testResults.length}
- **Başarılı Arama**: ${testResults.filter(r => r.found).length}
- **Yeterli Eşleşme**: ${testResults.filter(r => r.matched).length}
- **Başarı Oranı**: ${((testResults.filter(r => r.matched).length / testResults.length) * 100).toFixed(1)}%
- **Ortalama Süre**: ${(testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length).toFixed(0)}ms

## Detaylı Loglar:
${console.log.toString()}
`;

// Dosyaya yaz
fs.writeFileSync('test_word_similarity_report.md', reportContent);

console.log('\n🏁 Test tamamlandı!');
console.log(`📊 Rapor dosyaya yazıldı: test_word_similarity_report.md`);
console.log(`📈 Başarı oranı: ${((testResults.filter(r => r.matched).length / testResults.length) * 100).toFixed(1)}%`);

db.close();
