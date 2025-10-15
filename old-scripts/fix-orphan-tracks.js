#!/usr/bin/env node

/**
 * Orphan Track'leri Temizle
 * Hiçbir playlist'e bağlı olmayan track'leri siler
 */

const { getDatabase } = require('./shared/database');

const db = getDatabase().getDatabase();

console.log('═══════════════════════════════════════════════════════');
console.log('  ORPHAN TRACK\'LERİ TEMİZLE');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// Orphan track'leri bul
const orphanTracks = db.prepare(`
    SELECT t.id, t.path, t.fileName
    FROM tracks t
    LEFT JOIN playlist_tracks pt ON t.id = pt.track_id
    WHERE pt.track_id IS NULL
`).all();

console.log(`📊 Tespit edilen orphan track: ${orphanTracks.length}`);
console.log('');

if (orphanTracks.length === 0) {
    console.log('✅ Orphan track yok!');
    process.exit(0);
}

// Kullanıcı onayı
console.log('⚠️  DİKKAT: Bu işlem geri alınamaz!');
console.log(`   ${orphanTracks.length} orphan track silinecek.`);
console.log('');

// İlk 10 örnek göster
if (orphanTracks.length > 0) {
    console.log('Silinecek track örnekleri (ilk 10):');
    orphanTracks.slice(0, 10).forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.fileName}`);
    });
    if (orphanTracks.length > 10) {
        console.log(`   ... ve ${orphanTracks.length - 10} track daha`);
    }
    console.log('');
}

// Silme işlemi
console.log('🗑️  Orphan track\'ler siliniyor...');

try {
    // İlk önce track_words'leri temizle
    const trackPaths = orphanTracks.map(t => t.path);
    const placeholders = trackPaths.map(() => '?').join(',');
    
    const deletedWords = db.prepare(`
        DELETE FROM track_words 
        WHERE track_path IN (${placeholders})
    `).run(...trackPaths);
    
    console.log(`   ✓ ${deletedWords.changes} track_words kaydı silindi`);
    
    // Sonra track'leri sil
    const deletedTracks = db.prepare(`
        DELETE FROM tracks 
        WHERE id IN (
            SELECT t.id FROM tracks t
            LEFT JOIN playlist_tracks pt ON t.id = pt.track_id
            WHERE pt.track_id IS NULL
        )
    `).run();
    
    console.log(`   ✓ ${deletedTracks.changes} track silindi`);
    
} catch (error) {
    console.error(`❌ Silme hatası: ${error.message}`);
    process.exit(1);
}

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  SONUÇ');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('✅ Orphan track\'ler başarıyla temizlendi!');
console.log('');

