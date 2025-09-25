#!/usr/bin/env node

const SQLiteSimilarityUDF = require('./sqlite_similarity_udf');

console.log('🚀 Hızlı Benzerlik Test Başlatılıyor...\n');

try {
    const udf = new SQLiteSimilarityUDF('./musicfiles.db');
    
    console.log('1️⃣ Test Verilerini Hazırlıyorum...');
    
    // Sadece 5 track ve 10 music_file ile test
    const testTracks = udf.db.prepare(`
        SELECT id, normalizedFileName, fileName
        FROM tracks 
        WHERE path NOT IN (
            SELECT DISTINCT mf.path FROM music_files mf 
            WHERE mf.path IS NOT NULL AND mf.path != '' AND mf.path LIKE '/%'
        )
        AND normalizedFileName IS NOT NULL 
        AND normalizedFileName != ''
        LIMIT 5
    `).all();
    
    const testMusicFiles = udf.db.prepare(`
        SELECT id, normalizedFileName, fileName
        FROM music_files 
        WHERE normalizedFileName IS NOT NULL 
        AND normalizedFileName != ''
        LIMIT 10
    `).all();
    
    console.log(`   Test Track Sayısı: ${testTracks.length}`);
    console.log(`   Test Music File Sayısı: ${testMusicFiles.length}\n`);
    
    console.log('2️⃣ Benzerlik Hesaplaması Yapılıyor...');
    
    const matches = [];
    
    for (const track of testTracks) {
        console.log(`   Track: ${track.normalizedFileName.substring(0, 50)}...`);
        
        let bestMatch = null;
        let bestScore = 0;
        
        for (const musicFile of testMusicFiles) {
            const similarity = udf.db.prepare('SELECT similarity(?, ?) as sim').get(
                track.normalizedFileName, 
                musicFile.normalizedFileName
            ).sim;
            
            const wordSimilarity = udf.db.prepare('SELECT word_similarity(?, ?) as sim').get(
                track.normalizedFileName, 
                musicFile.normalizedFileName
            ).sim;
            
            if (similarity > bestScore && similarity >= 0.6) {
                bestScore = similarity;
                bestMatch = {
                    track: track,
                    musicFile: musicFile,
                    similarity: similarity,
                    wordSimilarity: wordSimilarity
                };
            }
        }
        
        if (bestMatch) {
            matches.push(bestMatch);
            console.log(`      ✅ En iyi eşleşme: ${bestMatch.musicFile.normalizedFileName.substring(0, 50)}...`);
            console.log(`         Benzerlik: ${bestMatch.similarity.toFixed(3)}, Kelime: ${bestMatch.wordSimilarity.toFixed(3)}`);
        } else {
            console.log(`      ❌ Eşleşme bulunamadı`);
        }
        console.log('');
    }
    
    console.log('3️⃣ Sonuçlar:');
    console.log(`   Toplam Track: ${testTracks.length}`);
    console.log(`   Eşleşen: ${matches.length}`);
    console.log(`   Eşleşme Oranı: ${((matches.length / testTracks.length) * 100).toFixed(1)}%`);
    
    if (matches.length > 0) {
        console.log(`   Ortalama Benzerlik: ${(matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length).toFixed(3)}`);
    }
    
    console.log('\n✅ Test tamamlandı!');
    udf.close();
    
} catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
}
