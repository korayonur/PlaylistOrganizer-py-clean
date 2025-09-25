#!/usr/bin/env node

const SQLiteSimilarityUDF = require('./sqlite_similarity_udf');

console.log('🚀 Gelişmiş Benzerlik Test Başlatılıyor...\n');

try {
    const udf = new SQLiteSimilarityUDF('./musicfiles.db');
    
    console.log('1️⃣ Test Verilerini Hazırlıyorum...');
    
    // Daha fazla test verisi
    const testTracks = udf.db.prepare(`
        SELECT id, normalizedFileName, fileName
        FROM tracks 
        WHERE path NOT IN (
            SELECT DISTINCT mf.path FROM music_files mf 
            WHERE mf.path IS NOT NULL AND mf.path != '' AND mf.path LIKE '/%'
        )
        AND normalizedFileName IS NOT NULL 
        AND normalizedFileName != ''
        AND LENGTH(normalizedFileName) > 10
        LIMIT 10
    `).all();
    
    const testMusicFiles = udf.db.prepare(`
        SELECT id, normalizedFileName, fileName
        FROM music_files 
        WHERE normalizedFileName IS NOT NULL 
        AND normalizedFileName != ''
        AND LENGTH(normalizedFileName) > 10
        LIMIT 20
    `).all();
    
    console.log(`   Test Track Sayısı: ${testTracks.length}`);
    console.log(`   Test Music File Sayısı: ${testMusicFiles.length}\n`);
    
    console.log('2️⃣ Benzerlik Hesaplaması Yapılıyor...');
    
    const matches = [];
    const allScores = [];
    
    for (const track of testTracks) {
        console.log(`   Track: ${track.normalizedFileName.substring(0, 60)}...`);
        
        let bestMatch = null;
        let bestScore = 0;
        const trackScores = [];
        
        for (const musicFile of testMusicFiles) {
            const similarity = udf.db.prepare('SELECT similarity(?, ?) as sim').get(
                track.normalizedFileName, 
                musicFile.normalizedFileName
            ).sim;
            
            const wordSimilarity = udf.db.prepare('SELECT word_similarity(?, ?) as sim').get(
                track.normalizedFileName, 
                musicFile.normalizedFileName
            ).sim;
            
            trackScores.push({
                musicFile: musicFile,
                similarity: similarity,
                wordSimilarity: wordSimilarity
            });
            
            if (similarity > bestScore) {
                bestScore = similarity;
                bestMatch = {
                    track: track,
                    musicFile: musicFile,
                    similarity: similarity,
                    wordSimilarity: wordSimilarity
                };
            }
        }
        
        // En iyi 3 skoru göster
        trackScores.sort((a, b) => b.similarity - a.similarity);
        console.log(`      En iyi 3 skor:`);
        for (let i = 0; i < Math.min(3, trackScores.length); i++) {
            const score = trackScores[i];
            console.log(`         ${i+1}. ${score.similarity.toFixed(3)} - ${score.musicFile.normalizedFileName.substring(0, 40)}...`);
        }
        
        if (bestMatch && bestScore >= 0.3) { // Düşük threshold
            matches.push(bestMatch);
            console.log(`      ✅ En iyi eşleşme: ${bestMatch.musicFile.normalizedFileName.substring(0, 60)}...`);
            console.log(`         Benzerlik: ${bestMatch.similarity.toFixed(3)}, Kelime: ${bestMatch.wordSimilarity.toFixed(3)}`);
        } else {
            console.log(`      ❌ Eşleşme bulunamadı (en iyi: ${bestScore.toFixed(3)})`);
        }
        
        allScores.push(...trackScores.map(s => s.similarity));
        console.log('');
    }
    
    console.log('3️⃣ Sonuçlar:');
    console.log(`   Toplam Track: ${testTracks.length}`);
    console.log(`   Eşleşen: ${matches.length}`);
    console.log(`   Eşleşme Oranı: ${((matches.length / testTracks.length) * 100).toFixed(1)}%`);
    
    if (allScores.length > 0) {
        const avgScore = allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
        const maxScore = Math.max(...allScores);
        const minScore = Math.min(...allScores);
        console.log(`   Ortalama Skor: ${avgScore.toFixed(3)}`);
        console.log(`   En Yüksek Skor: ${maxScore.toFixed(3)}`);
        console.log(`   En Düşük Skor: ${minScore.toFixed(3)}`);
    }
    
    if (matches.length > 0) {
        console.log(`   Eşleşenlerin Ortalama Benzerliği: ${(matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length).toFixed(3)}`);
    }
    
    console.log('\n✅ Test tamamlandı!');
    udf.close();
    
} catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
}
