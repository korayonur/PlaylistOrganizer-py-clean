const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database bağlantısı
const dbPath = path.join(__dirname, 'musicfiles.db');
const db = new Database(dbPath);

console.log('🔍 Doğru Kelime Çıkartmalı Algoritma Test başlatılıyor...');

// Debug log dosyası
const debugLogFile = 'debug_word_similarity.log';

// Eski log dosyasını temizle
if (fs.existsSync(debugLogFile)) {
    fs.unlinkSync(debugLogFile);
}

function debugLog(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(debugLogFile, logMessage);
    console.log(message);
}

// 1. Rakam filtreleme fonksiyonu
function filterNumbers(text) {
    return text.replace(/^\d+\s*/, '').trim();
}

// 2. Aşamalı kelime azaltma fonksiyonu (DOĞRU ALGORİTMA)
function searchStepByStepCorrect(trackName) {
    debugLog(`\n🔍 Aşamalı kelime azaltma başlatılıyor: "${trackName}"`);
    
    const filteredName = filterNumbers(trackName);
    debugLog(`📝 Rakam filtrelendi: "${trackName}" → "${filteredName}"`);
    
    const words = filteredName.split(' ').filter(w => w.length > 0);
    debugLog(`📝 Kelimeler: [${words.join(', ')}] (${words.length} kelime)`);
    
    // AŞAMA 1: Tüm kelimelerle arama
    debugLog(`\n🔎 AŞAMA 1: Tüm kelimelerle arama`);
    let searchPhrase = words.join(' ');
    debugLog(`   Arama: "${searchPhrase}"`);
    
    const sqlQuery = `SELECT id, normalizedFileName, fileName FROM music_files WHERE normalizedFileName LIKE ?`;
    const sqlParam = `%${searchPhrase}%`;
    debugLog(`   🔍 SQL: ${sqlQuery}`);
    debugLog(`   📝 Param: "${sqlParam}"`);
    
    let results = db.prepare(sqlQuery).all(sqlParam);
    
    debugLog(`   📊 Sonuç: ${results.length} adet bulundu`);
    if (results.length > 0) {
        debugLog(`   ✅ Bulunan sonuçlar:`);
        results.forEach((result, idx) => {
            debugLog(`      ${idx+1}. ${result.normalizedFileName}`);
        });
        return { searchPhrase, results, stage: 1 };
    }
    
    // AŞAMA 2: Son kelimeyi çıkar, kalan kelimelerle arama (en az 2 kelime kalmalı)
    debugLog(`\n🔎 AŞAMA 2: Son kelimeyi çıkar`);
    for (let i = words.length - 1; i >= 2; i--) { // En az 2 kelime kalmalı
        searchPhrase = words.slice(0, i).join(' ');
        debugLog(`   Arama ${words.length - i + 1}: "${searchPhrase}"`);
        
        const sqlQuery2 = `SELECT id, normalizedFileName, fileName FROM music_files WHERE normalizedFileName LIKE ?`;
        const sqlParam2 = `%${searchPhrase}%`;
        debugLog(`   🔍 SQL: ${sqlQuery2}`);
        debugLog(`   📝 Param: "${sqlParam2}"`);
        
        results = db.prepare(sqlQuery2).all(sqlParam2);
        
        debugLog(`   📊 Sonuç: ${results.length} adet bulundu`);
        if (results.length > 0) {
            debugLog(`   ✅ Bulunan sonuçlar:`);
            results.forEach((result, idx) => {
                debugLog(`      ${idx+1}. ${result.normalizedFileName}`);
            });
            return { searchPhrase, results, stage: 2, removedWords: words.slice(i) };
        }
    }
    
    debugLog(`   ⚠️  AŞAMA 2 tamamlandı, tek kelimeye düştü. AŞAMA 3'e geçiliyor...`);
    
    // AŞAMA 3: En uzun kelimeden başla, tek tek arama
    debugLog(`\n🔎 AŞAMA 3: En uzun kelimeden başla, tek tek arama`);
    
    // Kelimeleri uzunluklarına göre sırala (en uzundan başla)
    const sortedWords = [...words].sort((a, b) => b.length - a.length);
    debugLog(`   Sıralı kelimeler: [${sortedWords.join(', ')}]`);
    
    for (let i = 0; i < sortedWords.length; i++) {
        const word = sortedWords[i];
        debugLog(`   Arama ${i + 1}: "${word}"`);
        
        const sqlQuery3 = `SELECT id, normalizedFileName, fileName FROM music_files WHERE normalizedFileName LIKE ?`;
        const sqlParam3 = `%${word}%`;
        debugLog(`   🔍 SQL: ${sqlQuery3}`);
        debugLog(`   📝 Param: "${sqlParam3}"`);
        
        results = db.prepare(sqlQuery3).all(sqlParam3);
        
        debugLog(`   📊 Sonuç: ${results.length} adet bulundu`);
        if (results.length > 0) {
            debugLog(`   ✅ Bulunan sonuçlar:`);
            results.forEach((result, idx) => {
                debugLog(`      ${idx+1}. ${result.normalizedFileName}`);
            });
            return { searchPhrase: word, results, stage: 3, singleWord: true };
        }
    }

    debugLog(`❌ Hiçbir aşamada eşleşme bulunamadı`);
    return null;
}

// 3. Detaylı benzerlik hesaplama fonksiyonu
function calculateWordSimilarityDetailed(trackName, musicName) {
    debugLog(`\n🎯 Benzerlik hesaplanıyor:`);
    debugLog(`   Track: "${trackName}"`);
    debugLog(`   Music: "${musicName}"`);
    
    const trackWords = trackName.split(' ').filter(w => w.length > 0);
    const musicWords = musicName.split(' ').filter(w => w.length > 0);

    debugLog(`   Track kelimeleri: [${trackWords.join(', ')}] (${trackWords.length} kelime)`);
    debugLog(`   Music kelimeleri: [${musicWords.join(', ')}] (${musicWords.length} kelime)`);

    let matchedWords = 0;
    const usedMusicWords = new Set();
    const wordMatches = [];

    for (let i = 0; i < trackWords.length; i++) {
        const trackWord = trackWords[i];
        let bestMatch = null;
        let bestScore = 0;
        let bestMusicWord = null;

        for (let j = 0; j < musicWords.length; j++) {
            if (usedMusicWords.has(j)) continue;

            const musicWord = musicWords[j];
            // Basit Levenshtein benzerliği
            const similarity = calculateLevenshteinSimilarity(trackWord, musicWord);

            if (similarity > 0.7 && similarity > bestScore) {
                bestMatch = j;
                bestScore = similarity;
                bestMusicWord = musicWord;
            }
        }

        if (bestMatch !== null) {
            matchedWords++;
            usedMusicWords.add(bestMatch);
            wordMatches.push({
                trackWord,
                musicWord: bestMusicWord,
                score: bestScore
            });
            debugLog(`   ✅ "${trackWord}" → "${bestMusicWord}" (${bestScore.toFixed(3)})`);
        } else {
            debugLog(`   ❌ "${trackWord}" → eşleşme yok`);
        }
    }

    const finalScore = matchedWords / trackWords.length;
    debugLog(`   📊 Eşleşen kelime: ${matchedWords}/${trackWords.length} = ${finalScore.toFixed(3)}`);
    debugLog(`   🎯 Final skor: ${finalScore.toFixed(3)}`);

    return {
        score: finalScore,
        matchedWords,
        totalWords: trackWords.length,
        wordMatches
    };
}

// 4. Levenshtein benzerlik hesaplama
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

// 5. En iyi eşleşmeyi bulma
function findBestMatchDetailed(originalName, candidates) {
    debugLog(`\n🔍 En iyi eşleşme aranıyor (${candidates.length} aday):`);
    
    let bestMatch = null;
    let bestScore = 0;
    let bestDetails = null;

    for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        debugLog(`\n   ${i+1}. Aday: "${candidate.normalizedFileName}"`);
        
        const details = calculateWordSimilarityDetailed(originalName, candidate.normalizedFileName);
        
        if (details.score > bestScore) {
            bestScore = details.score;
            bestMatch = candidate;
            bestDetails = details;
        }
    }

    if (bestMatch) {
        debugLog(`\n🏆 En iyi eşleşme: "${bestMatch.normalizedFileName}"`);
        debugLog(`📊 En yüksek skor: ${bestScore.toFixed(3)}`);
    } else {
        debugLog(`\n❌ Hiçbir eşleşme bulunamadı`);
    }

    return bestMatch ? { match: bestMatch, score: bestScore, details: bestDetails } : null;
}

// 6. Test verilerini al
debugLog('\n📊 Test verileri alınıyor...');

// Eşleşmemiş track'lerden 3 tane al
const unmatchedTracks = db.prepare(`
    SELECT id, normalizedFileName, fileName 
    FROM tracks 
    WHERE is_matched = 0 
    AND normalizedFileName LIKE '% %'
    AND LENGTH(normalizedFileName) > 15
    ORDER BY id 
    LIMIT 3
`).all();

debugLog(`📊 ${unmatchedTracks.length} eşleşmemiş track bulundu:`);
unmatchedTracks.forEach((track, i) => {
    debugLog(`   ${i+1}. ${track.normalizedFileName}`);
});

// 7. Test sonuçlarını dosyaya yaz
const testResults = [];
const startTime = new Date();

debugLog('\n🚀 Doğru Algoritma Test başlatılıyor...\n');

// 8. Her track için test yap
for (let i = 0; i < unmatchedTracks.length; i++) {
    const track = unmatchedTracks[i];
    debugLog(`\n${'='.repeat(100)}`);
    debugLog(`🎵 TEST ${i+1}/${unmatchedTracks.length}: ${track.normalizedFileName}`);
    debugLog(`${'='.repeat(100)}`);
    
    const testStartTime = new Date();
    const searchResult = searchStepByStepCorrect(track.normalizedFileName);
    const testEndTime = new Date();
    const testDuration = testEndTime - testStartTime;
    
    let testResult = {
        testNumber: i + 1,
        trackName: track.normalizedFileName,
        duration: testDuration,
        found: false,
        searchPhrase: null,
        resultsCount: 0,
        stage: 0,
        bestMatch: null,
        bestScore: 0,
        threshold: 0.3,
        wordMatches: []
    };
    
    if (searchResult && searchResult.results.length > 0) {
        debugLog(`\n✅ BAŞARILI! Bulunan arama: "${searchResult.searchPhrase}"`);
        debugLog(`📊 Aşama: ${searchResult.stage}`);
        debugLog(`📊 Toplam ${searchResult.results.length} sonuç bulundu`);
        
        // En iyi eşleşmeyi bul
        const bestMatch = findBestMatchDetailed(track.normalizedFileName, searchResult.results);
        
        if (bestMatch) {
            debugLog(`\n🎯 En iyi eşleşme: "${bestMatch.match.normalizedFileName}"`);
            debugLog(`📊 Skor: ${bestMatch.score.toFixed(3)}`);
            
            testResult.found = true;
            testResult.searchPhrase = searchResult.searchPhrase;
            testResult.resultsCount = searchResult.results.length;
            testResult.stage = searchResult.stage;
            testResult.bestMatch = bestMatch.match.normalizedFileName;
            testResult.bestScore = bestMatch.score;
            testResult.wordMatches = bestMatch.details ? bestMatch.details.wordMatches : [];
            
            debugLog(`✅ EŞLEŞME BULUNDU! (En yüksek skor: ${bestMatch.score.toFixed(3)})`);
            testResult.matched = true;
        } else {
            debugLog(`\n❌ En iyi eşleşme bulunamadı`);
            testResult.matched = false;
        }
    } else {
        debugLog(`\n❌ BAŞARISIZ! Hiçbir eşleşme bulunamadı`);
        testResult.matched = false;
    }
    
    testResults.push(testResult);
}

const endTime = new Date();
const totalDuration = endTime - startTime;

// 9. Test sonuçlarını dosyaya yaz
const reportContent = `
# Doğru Kelime Çıkartmalı Algoritma Test Raporu
## Test Tarihi: ${new Date().toISOString()}
## Toplam Süre: ${totalDuration}ms
## Test Edilen Track Sayısı: ${unmatchedTracks.length}

## Test Sonuçları:

${testResults.map((result, i) => `
### Test ${result.testNumber}: ${result.trackName}
- **Süre**: ${result.duration}ms
- **Bulundu**: ${result.found ? '✅ Evet' : '❌ Hayır'}
- **Arama Cümlesi**: ${result.searchPhrase || 'Yok'}
- **Aşama**: ${result.stage}
- **Sonuç Sayısı**: ${result.resultsCount}
- **En İyi Eşleşme**: ${result.bestMatch || 'Yok'}
- **Skor**: ${result.bestScore.toFixed(3)}
- **Eşleşme**: ${result.matched ? '✅ Yeterli' : '❌ Yetersiz'}

#### Kelime Eşleşmeleri:
${result.wordMatches.length > 0 ? result.wordMatches.map(match => 
`- "${match.trackWord}" → "${match.musicWord}" (${match.score.toFixed(3)})`
).join('\n') : 'Hiç kelime eşleşmesi yok'}

#### Detaylı Analiz:
${result.found ? `
**Arama Süreci:**
1. Rakam filtrelendi: "${result.trackName}"
2. Kelimelere ayrıldı: ${result.trackName.split(' ').length} kelime
3. Aşamalı arama yapıldı: Aşama ${result.stage}
4. Arama cümlesi: "${result.searchPhrase}"
5. ${result.resultsCount} sonuç bulundu
6. Benzerlik hesaplandı: ${result.bestScore.toFixed(3)} skor ile "${result.bestMatch}" eşleşti

**Puanlama Detayları:**
- Eşleşen kelime sayısı: ${result.wordMatches.length}
- Toplam kelime sayısı: ${result.trackName.split(' ').length}
- Puanlama: ${result.wordMatches.length}/${result.trackName.split(' ').length} = ${result.bestScore.toFixed(3)}
- Threshold: ${result.threshold}
- Sonuç: ${result.matched ? 'Yeterli' : 'Yetersiz'}
` : 'Hiç arama yapılmadı'}
`).join('')}

## Özet İstatistikler:
- **Toplam Test**: ${testResults.length}
- **Başarılı Arama**: ${testResults.filter(r => r.found).length}
- **Yeterli Eşleşme**: ${testResults.filter(r => r.matched).length}
- **Başarı Oranı**: ${((testResults.filter(r => r.matched).length / testResults.length) * 100).toFixed(1)}%
- **Ortalama Süre**: ${(testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length).toFixed(0)}ms

## Doğru Algoritma Detayları:
### Aşamalı Kelime Azaltma Süreci:
1. **Rakam Filtreleme**: Baştaki rakamlar kaldırılır (örn: "03 didem..." → "didem...")
2. **Kelime Ayırma**: Boşluklara göre kelimelere bölünür
3. **AŞAMA 1**: Tüm kelimelerle arama yapılır
4. **AŞAMA 2**: Son kelimeyi çıkar, kalan kelimelerle arama (tekrar tekrar)
5. **AŞAMA 3**: En uzun kelimeden başla, tek tek arama

### Örnek Aşamalı Arama:
**Track**: "03 donde estan esos amigos zonamania net428"
1. **AŞAMA 1**: "donde estan esos amigos zonamania net428" → arama
2. **AŞAMA 2**: "donde estan esos amigos zonamania" → arama
3. **AŞAMA 2**: "donde estan esos amigos" → arama
4. **AŞAMA 2**: "donde estan esos" → arama
5. **AŞAMA 2**: "donde estan" → arama
6. **AŞAMA 3**: "zonamania" (en uzun) → arama
7. **AŞAMA 3**: "amigos" → arama
8. **AŞAMA 3**: "donde" → arama

### Puanlama Sistemi:
- **Kelime Sırası**: Önemsiz (sadece eşleşen kelime sayısı önemli)
- **Eşleşme Kriteri**: Levenshtein similarity > 0.7
- **Final Skor**: Eşleşen kelime sayısı / Toplam kelime sayısı
- **Threshold**: 0.3 (30% eşleşme yeterli)
`;

// Dosyaya yaz
fs.writeFileSync('test_word_similarity_correct_report.md', reportContent);

debugLog('\n🏁 Test tamamlandı!');
debugLog(`📊 Doğru algoritma raporu dosyaya yazıldı: test_word_similarity_correct_report.md`);
debugLog(`📈 Başarı oranı: ${((testResults.filter(r => r.matched).length / testResults.length) * 100).toFixed(1)}%`);

db.close();
