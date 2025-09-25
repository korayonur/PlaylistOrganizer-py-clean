#!/usr/bin/env node

console.log('🚀 Native SQLite Benzerlik Hızlı Test...\n');

const Database = require('better-sqlite3');

try {
    const db = new Database('./musicfiles.db');
    
    console.log('1️⃣ 1 Kayıt Test:');
    const singleTest = db.prepare(`
        SELECT 
            t.id as track_id,
            t.normalizedFileName as track_normalized,
            mf.id as music_file_id,
            mf.normalizedFileName as music_file_normalized,
            CASE 
                WHEN t.normalizedFileName = mf.normalizedFileName THEN 1.0
                WHEN t.normalizedFileName LIKE '%' || mf.normalizedFileName || '%' THEN 0.8
                WHEN SUBSTR(t.normalizedFileName, 1, 10) = SUBSTR(mf.normalizedFileName, 1, 10) THEN 0.6
                ELSE 0.2
            END as match_confidence
        FROM tracks t
        INNER JOIN music_files mf ON (
            ABS(LENGTH(t.normalizedFileName) - LENGTH(mf.normalizedFileName)) <= 10
            AND SUBSTR(t.normalizedFileName, 1, 1) = SUBSTR(mf.normalizedFileName, 1, 1)
        )
        WHERE t.path NOT IN (
            SELECT DISTINCT mf2.path FROM music_files mf2 
            WHERE mf2.path IS NOT NULL AND mf2.path != '' AND mf2.path LIKE '/%'
        )
        AND t.normalizedFileName IS NOT NULL 
        AND t.normalizedFileName != ''
        LIMIT 1
    `).get();
    
    if (singleTest) {
        console.log(`   Track: ${singleTest.track_normalized.substring(0, 50)}...`);
        console.log(`   Music: ${singleTest.music_file_normalized.substring(0, 50)}...`);
        console.log(`   Benzerlik: ${singleTest.match_confidence}`);
    }
    
    console.log('\n2️⃣ 5 Kayıt Test:');
    const multiTest = db.prepare(`
        SELECT 
            t.id as track_id,
            t.normalizedFileName as track_normalized,
            mf.id as music_file_id,
            mf.normalizedFileName as music_file_normalized,
            CASE 
                WHEN t.normalizedFileName = mf.normalizedFileName THEN 1.0
                WHEN t.normalizedFileName LIKE '%' || mf.normalizedFileName || '%' THEN 0.8
                WHEN SUBSTR(t.normalizedFileName, 1, 10) = SUBSTR(mf.normalizedFileName, 1, 10) THEN 0.6
                ELSE 0.2
            END as match_confidence
        FROM tracks t
        INNER JOIN music_files mf ON (
            ABS(LENGTH(t.normalizedFileName) - LENGTH(mf.normalizedFileName)) <= 10
            AND SUBSTR(t.normalizedFileName, 1, 1) = SUBSTR(mf.normalizedFileName, 1, 1)
        )
        WHERE t.path NOT IN (
            SELECT DISTINCT mf2.path FROM music_files mf2 
            WHERE mf2.path IS NOT NULL AND mf2.path != '' AND mf2.path LIKE '/%'
        )
        AND t.normalizedFileName IS NOT NULL 
        AND t.normalizedFileName != ''
        LIMIT 5
    `).all();
    
    multiTest.forEach((test, i) => {
        console.log(`   ${i+1}. Track: ${test.track_normalized.substring(0, 40)}...`);
        console.log(`      Music: ${test.music_file_normalized.substring(0, 40)}...`);
        console.log(`      Benzerlik: ${test.match_confidence}`);
        console.log('');
    });
    
    console.log('3️⃣ View Test:');
    const viewTest = db.prepare(`
        SELECT COUNT(*) as count FROM v_native_similarity_matches LIMIT 1
    `).get();
    
    console.log(`   Native similarity matches: ${viewTest.count} kayıt`);
    
    console.log('\n✅ Test tamamlandı!');
    db.close();
    
} catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
}
