#!/usr/bin/env node

const SQLiteSimilarityUDF = require('./sqlite_similarity_udf');

console.log('🚀 Optimize Edilmiş Viewlar Test Ediliyor...\n');

try {
    const udf = new SQLiteSimilarityUDF('./musicfiles.db');
    
    console.log('1️⃣ View Sayıları:');
    const viewCounts = udf.db.prepare(`
        SELECT 
            'optimized_similarity_matches' as view_name, COUNT(*) as count FROM v_optimized_similarity_matches
            UNION ALL
            SELECT 'best_optimized_similarity_matches' as view_name, COUNT(*) as count FROM v_best_optimized_similarity_matches
    `).all();
    
    viewCounts.forEach(view => {
        console.log(`   ${view.view_name}: ${view.count} kayıt`);
    });
    console.log('');
    
    console.log('2️⃣ İstatistikler:');
    const stats = udf.db.prepare(`
        SELECT * FROM v_optimized_similarity_statistics
    `).all();
    
    stats.forEach(stat => {
        console.log(`   ${stat.match_type}:`);
        console.log(`      Kayıt Sayısı: ${stat.match_count}`);
        console.log(`      Ortalama Benzerlik: ${stat.avg_confidence?.toFixed(3) || 'N/A'}`);
        console.log(`      Ortalama Kelime Benzerliği: ${stat.avg_word_confidence?.toFixed(3) || 'N/A'}`);
        console.log(`      Min Benzerlik: ${stat.min_confidence?.toFixed(3) || 'N/A'}`);
        console.log(`      Max Benzerlik: ${stat.max_confidence?.toFixed(3) || 'N/A'}`);
        console.log('');
    });
    
    console.log('3️⃣ Örnek Eşleşmeler (İlk 5):');
    const examples = udf.db.prepare(`
        SELECT 
            track_normalized, 
            music_file_normalized, 
            match_confidence, 
            word_confidence 
        FROM v_best_optimized_similarity_matches 
        LIMIT 5
    `).all();
    
    examples.forEach((ex, i) => {
        console.log(`   ${i+1}. Track: ${ex.track_normalized.substring(0, 50)}...`);
        console.log(`      Music: ${ex.music_file_normalized.substring(0, 50)}...`);
        console.log(`      Benzerlik: ${ex.match_confidence.toFixed(3)}, Kelime: ${ex.word_confidence.toFixed(3)}`);
        console.log('');
    });
    
    console.log('✅ Test tamamlandı!');
    udf.close();
    
} catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
}
