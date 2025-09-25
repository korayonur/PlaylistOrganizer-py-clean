#!/usr/bin/env node

const SQLiteSimilarityUDF = require('./sqlite_similarity_udf');

console.log('🚀 Benzerlik View Hızlı Test Başlatılıyor...\n');

try {
    const udf = new SQLiteSimilarityUDF('./musicfiles.db');
    
    console.log('1️⃣ UDF Fonksiyonları Test Ediliyor...');
    udf.testSimilarity();
    console.log('✅ UDF fonksiyonları çalışıyor\n');
    
    console.log('2️⃣ View Sayıları Kontrol Ediliyor...');
    const viewCounts = udf.db.prepare(`
        SELECT 
            'similarity_matches' as view_name, COUNT(*) as count FROM v_similarity_matches
            UNION ALL
            SELECT 'high_similarity_matches' as view_name, COUNT(*) as count FROM v_high_similarity_matches
            UNION ALL
            SELECT 'word_similarity_matches' as view_name, COUNT(*) as count FROM v_word_similarity_matches
            UNION ALL
            SELECT 'best_similarity_matches' as view_name, COUNT(*) as count FROM v_best_similarity_matches
    `).all();
    
    viewCounts.forEach(view => {
        console.log(`   ${view.view_name}: ${view.count} kayıt`);
    });
    console.log('');
    
    console.log('3️⃣ Örnek Eşleşmeler (İlk 3):');
    const examples = udf.db.prepare(`
        SELECT 
            track_normalized, 
            music_file_normalized, 
            match_confidence, 
            word_confidence 
        FROM v_best_similarity_matches 
        LIMIT 3
    `).all();
    
    examples.forEach((ex, i) => {
        console.log(`   ${i+1}. Track: ${ex.track_normalized.substring(0, 60)}...`);
        console.log(`      Music: ${ex.music_file_normalized.substring(0, 60)}...`);
        console.log(`      Benzerlik: ${ex.match_confidence.toFixed(3)}, Kelime: ${ex.word_confidence.toFixed(3)}`);
        console.log('');
    });
    
    console.log('4️⃣ İstatistikler:');
    const stats = udf.db.prepare(`
        SELECT 
            match_type,
            COUNT(*) as count,
            AVG(match_confidence) as avg_confidence,
            MIN(match_confidence) as min_confidence,
            MAX(match_confidence) as max_confidence
        FROM v_similarity_statistics 
        GROUP BY match_type
    `).all();
    
    stats.forEach(stat => {
        console.log(`   ${stat.match_type}: ${stat.count} kayıt, ortalama: ${stat.avg_confidence?.toFixed(3) || 'N/A'}`);
    });
    
    console.log('\n✅ Test tamamlandı!');
    udf.close();
    
} catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
}
