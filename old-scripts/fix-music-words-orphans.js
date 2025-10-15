#!/usr/bin/env node

/**
 * Orphan music_words Kayıtlarını Düzelt
 * music_words'de var ama music_files'da olmayan path'leri düzeltir
 */

const { getDatabase } = require('./shared/database');
const kelimeArama = require('./shared/kelime-arama-servisi');
const fs = require('fs');
const path = require('path');

const db = getDatabase().getDatabase();

console.log('═══════════════════════════════════════════════════════');
console.log('  ORPHAN MUSIC_WORDS KAYITLARINI DÜZELT');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// Orphan words'leri bul
const wordsWithoutFiles = db.prepare(`
    SELECT DISTINCT mw.music_path
    FROM music_words mw
    LEFT JOIN music_files mf ON mw.music_path = mf.path
    WHERE mf.path IS NULL
`).all();

console.log(`📊 Tespit edilen orphan path: ${wordsWithoutFiles.length}`);
console.log('');

if (wordsWithoutFiles.length === 0) {
    console.log('✅ Orphan music_words kaydı yok!');
    process.exit(0);
}

let addedCount = 0;
let deletedCount = 0;
let errorCount = 0;

console.log('🔄 Orphan kayıtlar düzeltiliyor...');
console.log('');

for (let i = 0; i < wordsWithoutFiles.length; i++) {
    const orphan = wordsWithoutFiles[i];
    
    try {
        // Fiziksel dosya var mı kontrol et
        if (fs.existsSync(orphan.music_path)) {
            // Dosya fiziksel olarak var, music_files'a ekle
            const stats = fs.statSync(orphan.music_path);
            const fileName = path.basename(orphan.music_path);
            const fileNameOnly = path.parse(fileName).name;
            const extension = path.extname(fileName);
            const normalizedFileName = kelimeArama.normalize(fileName);
            
            db.prepare(`
                INSERT OR REPLACE INTO music_files 
                (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                orphan.music_path,
                fileName,
                fileNameOnly,
                normalizedFileName,
                extension,
                stats.size,
                Math.floor(stats.mtimeMs)
            );
            
            addedCount++;
            console.log(`   ✅ [${i + 1}/${wordsWithoutFiles.length}] Eklendi: ${fileName}`);
            
        } else {
            // Dosya fiziksel olarak yok, music_words'den sil
            db.prepare('DELETE FROM music_words WHERE music_path = ?').run(orphan.music_path);
            deletedCount++;
            console.log(`   🗑️  [${i + 1}/${wordsWithoutFiles.length}] Silindi: ${path.basename(orphan.music_path)}`);
        }
        
    } catch (error) {
        console.log(`❌ [${i + 1}/${wordsWithoutFiles.length}] Hata: ${path.basename(orphan.music_path)} - ${error.message}`);
        errorCount++;
    }
}

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  SONUÇ');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log(`✅ music_files'a eklendi: ${addedCount} dosya`);
console.log(`🗑️  music_words'den silindi: ${deletedCount} orphan path`);
console.log(`❌ Hatalı: ${errorCount} dosya`);
console.log('');
console.log('✅ İşlem tamamlandı!');
console.log('');

