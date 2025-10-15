#!/usr/bin/env node

/**
 * FOREIGN KEY İhlallerini Düzelt
 * playlist_tracks tablosundaki geçersiz referansları temizler
 */

const { getDatabase } = require('./shared/database');

const db = getDatabase().getDatabase();

console.log('═══════════════════════════════════════════════════════');
console.log('  FOREIGN KEY İHLALLERİNİ DÜZELT');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// Geçersiz playlist_id referansları
const invalidPlaylistRefs = db.prepare(`
    SELECT pt.id, pt.playlist_id, pt.track_id
    FROM playlist_tracks pt
    LEFT JOIN playlists p ON pt.playlist_id = p.id
    WHERE p.id IS NULL
`).all();

// Geçersiz track_id referansları
const invalidTrackRefs = db.prepare(`
    SELECT pt.id, pt.playlist_id, pt.track_id
    FROM playlist_tracks pt
    LEFT JOIN tracks t ON pt.track_id = t.id
    WHERE t.id IS NULL
`).all();

console.log(`📊 Geçersiz playlist_id: ${invalidPlaylistRefs.length}`);
console.log(`📊 Geçersiz track_id: ${invalidTrackRefs.length}`);
console.log('');

const totalViolations = invalidPlaylistRefs.length + invalidTrackRefs.length;

if (totalViolations === 0) {
    console.log('✅ FOREIGN KEY ihlali yok!');
    process.exit(0);
}

console.log('🗑️  Geçersiz referanslar siliniyor...');

try {
    // Geçersiz referansları temizle
    const result = db.prepare(`
        DELETE FROM playlist_tracks 
        WHERE playlist_id NOT IN (SELECT id FROM playlists)
           OR track_id NOT IN (SELECT id FROM tracks)
    `).run();
    
    console.log(`   ✓ ${result.changes} geçersiz referans silindi`);
    
} catch (error) {
    console.error(`❌ Silme hatası: ${error.message}`);
    process.exit(1);
}

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  SONUÇ');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('✅ FOREIGN KEY ihlalleri temizlendi!');
console.log('');

