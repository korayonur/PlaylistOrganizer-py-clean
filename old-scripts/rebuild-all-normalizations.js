#!/usr/bin/env node

/**
 * Tüm Normalizasyonları Yeniden Oluştur
 * music_files ve tracks tablolarındaki normalizedFileName'leri günceller
 */

const { getDatabase } = require('./shared/database');
const kelimeArama = require('./shared/kelime-arama-servisi');

const db = getDatabase().getDatabase();

console.log('═══════════════════════════════════════════════════════');
console.log('  TÜM NORMALİZASYONLARI YENİDEN OLUŞTUR');
console.log('═══════════════════════════════════════════════════════');
console.log('');

console.log('⚠️  Bu işlem tüm normalizasyonları yeniden oluşturacak.');
console.log('');

// music_files normalizasyonları
console.log('🔄 music_files normalizasyonları güncelleniyor...');

const files = db.prepare('SELECT path, fileName, normalizedFileName FROM music_files').all();
let musicUpdatedCount = 0;

const updateMusicStmt = db.prepare('UPDATE music_files SET normalizedFileName = ? WHERE path = ?');

const musicTransaction = db.transaction((files) => {
    for (const file of files) {
        const normalized = kelimeArama.normalize(file.fileName);
        if (file.normalizedFileName !== normalized) {
            updateMusicStmt.run(normalized, file.path);
            musicUpdatedCount++;
        }
    }
});

musicTransaction(files);
console.log(`   ✓ ${musicUpdatedCount} dosya güncellendi (toplam ${files.length})`);

// tracks normalizasyonları
console.log('🔄 tracks normalizasyonları güncelleniyor...');

const tracks = db.prepare('SELECT path, fileName, normalizedFileName FROM tracks').all();
let tracksUpdatedCount = 0;

const updateTrackStmt = db.prepare('UPDATE tracks SET normalizedFileName = ? WHERE path = ?');

const tracksTransaction = db.transaction((tracks) => {
    for (const track of tracks) {
        const normalized = kelimeArama.normalize(track.fileName);
        if (track.normalizedFileName !== normalized) {
            updateTrackStmt.run(normalized, track.path);
            tracksUpdatedCount++;
        }
    }
});

tracksTransaction(tracks);
console.log(`   ✓ ${tracksUpdatedCount} track güncellendi (toplam ${tracks.length})`);

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  SONUÇ');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log(`✅ music_files: ${musicUpdatedCount} güncelleme`);
console.log(`✅ tracks: ${tracksUpdatedCount} güncelleme`);
console.log('');
console.log('✅ Normalizasyonlar başarıyla güncellendi!');
console.log('');

