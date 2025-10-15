#!/usr/bin/env node
'use strict';

/**
 * Veritabanındaki normalizedFileName alanlarını yeniden hesapla
 * İki farklı normalize fonksiyonu sorunu çözümü
 */

const { getDatabase } = require('./shared/database');
const kelimeArama = require('./shared/kelime-arama-servisi');

console.log('🔄 normalizedFileName alanları güncelleniyor...\n');

const db = getDatabase().getDatabase();

// 1. Tracks tablosunu güncelle
console.log('📝 Tracks tablosu güncelleniyor...');
const tracks = db.prepare('SELECT id, fileName FROM tracks').all();
console.log(`   Toplam ${tracks.length} track bulundu`);

let updatedTracks = 0;
let changedTracks = 0;

const updateTrackStmt = db.prepare('UPDATE tracks SET normalizedFileName = ? WHERE id = ?');

const transaction = db.transaction(() => {
    for (const track of tracks) {
        const oldNormalized = db.prepare('SELECT normalizedFileName FROM tracks WHERE id = ?').get(track.id).normalizedFileName;
        const newNormalized = kelimeArama.normalize(track.fileName);
        
        if (oldNormalized !== newNormalized) {
            updateTrackStmt.run(newNormalized, track.id);
            changedTracks++;
            
            // İlk 5 değişikliği göster
            if (changedTracks <= 5) {
                console.log(`   📌 "${track.fileName}"`);
                console.log(`      ESKİ: "${oldNormalized}"`);
                console.log(`      YENİ: "${newNormalized}"`);
            }
        }
        updatedTracks++;
        
        // İlerleme göster
        if (updatedTracks % 5000 === 0) {
            console.log(`   ⏳ İşlenen: ${updatedTracks}/${tracks.length} (Değişen: ${changedTracks})`);
        }
    }
});

transaction();

console.log(`   ✅ ${updatedTracks} track işlendi, ${changedTracks} track güncellendi\n`);

// 2. Music_files tablosunu güncelle
console.log('📝 Music_files tablosu güncelleniyor...');
const musicFiles = db.prepare('SELECT path, fileName FROM music_files').all();
console.log(`   Toplam ${musicFiles.length} dosya bulundu`);

let updatedMusic = 0;
let changedMusic = 0;

const updateMusicStmt = db.prepare('UPDATE music_files SET normalizedFileName = ? WHERE path = ?');

const musicTransaction = db.transaction(() => {
    for (const file of musicFiles) {
        const oldNormalized = db.prepare('SELECT normalizedFileName FROM music_files WHERE path = ?').get(file.path).normalizedFileName;
        const newNormalized = kelimeArama.normalize(file.fileName);
        
        if (oldNormalized !== newNormalized) {
            updateMusicStmt.run(newNormalized, file.path);
            changedMusic++;
            
            // İlk 5 değişikliği göster
            if (changedMusic <= 5) {
                console.log(`   📌 "${file.fileName}"`);
                console.log(`      ESKİ: "${oldNormalized}"`);
                console.log(`      YENİ: "${newNormalized}"`);
            }
        }
        updatedMusic++;
        
        // İlerleme göster
        if (updatedMusic % 10000 === 0) {
            console.log(`   ⏳ İşlenen: ${updatedMusic}/${musicFiles.length} (Değişen: ${changedMusic})`);
        }
    }
});

musicTransaction();

console.log(`   ✅ ${updatedMusic} dosya işlendi, ${changedMusic} dosya güncellendi\n`);

// 3. Özet rapor
console.log('📊 ÖZET RAPOR');
console.log('═'.repeat(50));
console.log(`Tracks Tablosu:`);
console.log(`  - Toplam: ${tracks.length}`);
console.log(`  - Güncellenen: ${changedTracks} (${(changedTracks/tracks.length*100).toFixed(2)}%)`);
console.log(`\nMusic Files Tablosu:`);
console.log(`  - Toplam: ${musicFiles.length}`);
console.log(`  - Güncellenen: ${changedMusic} (${(changedMusic/musicFiles.length*100).toFixed(2)}%)`);
console.log('═'.repeat(50));
console.log('✅ Tüm normalizedFileName alanları güncellendi!\n');


