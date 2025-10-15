#!/usr/bin/env node
'use strict';

/**
 * Veritabanını tamamen temizle
 * Tüm tabloları boşalt ve sıfırla
 */

const { getDatabase } = require('./shared/database');

console.log('🧹 Veritabanı tamamen temizleniyor...\n');

const db = getDatabase().getDatabase();

// Temizleme işlemi
const cleanDatabase = () => {
    console.log('📝 Tablolar temizleniyor...');
    
    // 1. Kelime indexlerini temizle
    console.log('   - track_words tablosu temizleniyor...');
    db.exec('DELETE FROM track_words');
    
    console.log('   - music_words tablosu temizleniyor...');
    db.exec('DELETE FROM music_words');
    
    // 2. İlişki tablolarını temizle
    console.log('   - playlist_tracks tablosu temizleniyor...');
    db.exec('DELETE FROM playlist_tracks');
    
    // 3. Ana tabloları temizle
    console.log('   - tracks tablosu temizleniyor...');
    db.exec('DELETE FROM tracks');
    
    console.log('   - playlists tablosu temizleniyor...');
    db.exec('DELETE FROM playlists');
    
    console.log('   - music_files tablosu temizleniyor...');
    db.exec('DELETE FROM music_files');
    
    // 4. Import session'larını temizle
    console.log('   - import_sessions tablosu temizleniyor...');
    db.exec('DELETE FROM import_sessions');
    
    // 5. Auto-increment ID'leri sıfırla
    console.log('   - Auto-increment ID\'ler sıfırlanıyor...');
    db.exec('DELETE FROM sqlite_sequence');
    
    console.log('✅ Veritabanı tamamen temizlendi!\n');
};

// Temizleme işlemini çalıştır
cleanDatabase();

// Sonuç kontrolü
console.log('📊 TEMİZLİK SONUCU:');
console.log('═'.repeat(40));

const tables = [
    'track_words',
    'music_words', 
    'playlist_tracks',
    'tracks',
    'playlists',
    'music_files',
    'import_sessions'
];

tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
    console.log(`${table}: ${count} kayıt`);
});

console.log('═'.repeat(40));
console.log('🎉 Veritabanı hazır! Yeniden import edilebilir.\n');

