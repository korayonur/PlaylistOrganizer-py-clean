#!/usr/bin/env node

const { getDatabase } = require('./shared/database');

console.log('🧹 DATABASE TAM TEMİZLİK BAŞLIYOR...\n');

try {
    const dbManager = getDatabase();
    const db = dbManager.getDatabase();

    // Mevcut durumu göster
    console.log('📊 MEVCUT DURUM:');
    const musicCount = db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
    const tracksCount = db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;
    const trackWordsCount = db.prepare('SELECT COUNT(*) as count FROM track_words').get().count;
    const musicWordsCount = db.prepare('SELECT COUNT(*) as count FROM music_words').get().count;
    const sessionsCount = db.prepare('SELECT COUNT(*) as count FROM import_sessions').get().count;

    console.log(`   🎵 Music files: ${musicCount.toLocaleString()}`);
    console.log(`   📝 Tracks: ${tracksCount.toLocaleString()}`);
    console.log(`   📝 Track words: ${trackWordsCount.toLocaleString()}`);
    console.log(`   🎵 Music words: ${musicWordsCount.toLocaleString()}`);
    console.log(`   📋 Import sessions: ${sessionsCount.toLocaleString()}\n`);

    // Onay
    console.log('⚠️  TÜM VERİLER SİLİNECEK!');
    console.log('   • music_files tablosu');
    console.log('   • tracks tablosu');
    console.log('   • track_words tablosu');
    console.log('   • music_words tablosu');
    console.log('   • import_sessions tablosu\n');

    // Tüm tabloları temizle
    console.log('🗑️  Tablolar temizleniyor...');
    
    const tablesToClear = [
        'music_files',
        'tracks', 
        'track_words',
        'music_words',
        'import_sessions'
    ];

    for (const table of tablesToClear) {
        try {
            const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
            db.prepare(`DELETE FROM ${table}`).run();
            console.log(`   ✅ ${table}: ${count.toLocaleString()} kayıt silindi`);
        } catch (error) {
            console.log(`   ⚠️  ${table}: Silinemedi - ${error.message}`);
        }
    }

    // VACUUM ile database'i optimize et
    console.log('\n🗜️  Database optimize ediliyor (VACUUM)...');
    db.exec('VACUUM');
    console.log('   ✅ VACUUM tamamlandı');

    // Database boyutunu göster
    const stats = require('fs').statSync(dbManager.getDatabasePath());
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   💾 Database boyutu: ${sizeMB} MB`);

    // Temizlik sonrası durum
    console.log('\n📊 TEMİZLİK SONRASI:');
    const musicCountAfter = db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
    const tracksCountAfter = db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;
    const trackWordsCountAfter = db.prepare('SELECT COUNT(*) as count FROM track_words').get().count;
    const musicWordsCountAfter = db.prepare('SELECT COUNT(*) as count FROM music_words').get().count;
    const sessionsCountAfter = db.prepare('SELECT COUNT(*) as count FROM import_sessions').get().count;

    console.log(`   🎵 Music files: ${musicCountAfter.toLocaleString()}`);
    console.log(`   📝 Tracks: ${tracksCountAfter.toLocaleString()}`);
    console.log(`   📝 Track words: ${trackWordsCountAfter.toLocaleString()}`);
    console.log(`   🎵 Music words: ${musicWordsCountAfter.toLocaleString()}`);
    console.log(`   📋 Import sessions: ${sessionsCountAfter.toLocaleString()}`);

    console.log('\n✅ DATABASE TAM TEMİZLİK TAMAMLANDI!');
    console.log('🚀 Artık yeni import işlemi yapabilirsiniz.\n');

    db.close();
} catch (error) {
    console.error('❌ Temizlik sırasında hata oluştu:', error.message);
}
