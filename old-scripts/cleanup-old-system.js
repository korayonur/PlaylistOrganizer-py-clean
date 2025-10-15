#!/usr/bin/env node

const { getDatabase } = require('./shared/database');

console.log('🧹 ESKİ SİSTEM TEMİZLİĞİ BAŞLIYOR...\n');

const dbManager = getDatabase();
const db = dbManager.getDatabase();

// 1. similarity_fix_suggestions tablosunu kaldır
console.log('📦 similarity_fix_suggestions tablosu kaldırılıyor...');
db.exec('DROP TABLE IF EXISTS similarity_fix_suggestions');
console.log('✅ Tablo kaldırıldı\n');

// 2. Gereksiz view'leri kaldır
console.log('👁️  Gereksiz view\'ler kaldırılıyor...');
const viewsToRemove = [
    'v_truly_unmatched_tracks',
    'v_all_matches_summary',
    'v_tracks_match_priority',
    'v_all_matches_summary_v2'
];

for (const view of viewsToRemove) {
    try {
        db.exec(`DROP VIEW IF EXISTS ${view}`);
        console.log(`   ✅ ${view} kaldırıldı`);
    } catch (error) {
        console.log(`   ⚠️  ${view} kaldırılamadı: ${error.message}`);
    }
}

// 3. Gereksiz indexleri kaldır
console.log('\n🗂️  Gereksiz indexler kaldırılıyor...');
const indexesToRemove = [
    'idx_similarity_match_type',
    'idx_similarity_score'
];

for (const index of indexesToRemove) {
    try {
        db.exec(`DROP INDEX IF EXISTS ${index}`);
        console.log(`   ✅ ${index} kaldırıldı`);
    } catch (error) {
        console.log(`   ⚠️  ${index} kaldırılamadı: ${error.message}`);
    }
}

// 4. temp_tracks tablosunu kaldır (eğer varsa)
console.log('\n🗑️  Geçici tablolar temizleniyor...');
db.exec('DROP TABLE IF EXISTS temp_tracks');
console.log('   ✅ temp_tracks kaldırıldı');

// 5. VACUUM (database boyutunu küçült)
console.log('\n🗜️  Database optimize ediliyor (VACUUM)...');
db.exec('VACUUM');
console.log('   ✅ VACUUM tamamlandı');

// 6. Kalan view'leri göster
console.log('\n📊 KALAN VIEW\'LER:');
const remainingViews = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='view' ORDER BY name
`).all();
remainingViews.forEach(v => console.log(`   - ${v.name}`));

// 7. Kalan tabloları göster
console.log('\n📦 KALAN TABLOLAR:');
const remainingTables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name
`).all();
remainingTables.forEach(t => console.log(`   - ${t.name}`));

// 8. Database boyutunu göster
console.log('\n💾 DATABASE BOYUTU:');
const dbSize = dbManager.getDatabaseSize();
console.log(`   ${dbSize} MB`);

console.log('\n✅ TEMİZLİK TAMAMLANDI!\n');

db.close();

