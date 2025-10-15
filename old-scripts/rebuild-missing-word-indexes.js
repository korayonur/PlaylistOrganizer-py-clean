#!/usr/bin/env node

/**
 * Eksik Kelime İndekslerini Yeniden Oluştur
 * music_files'da var ama music_words'de olmayan dosyalar için kelime indeksi oluşturur
 */

const { getDatabase } = require('./shared/database');
const kelimeArama = require('./shared/kelime-arama-servisi');
const fs = require('fs');

const db = getDatabase().getDatabase();

console.log('═══════════════════════════════════════════════════════');
console.log('  EKSİK KELİME İNDEKSLERİNİ YENİDEN OLUŞTUR');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// Eksik indeksleri bul
const filesWithoutWords = db.prepare(`
    SELECT mf.path, mf.fileName
    FROM music_files mf
    LEFT JOIN (SELECT DISTINCT music_path FROM music_words) mw ON mf.path = mw.music_path
    WHERE mw.music_path IS NULL
`).all();

console.log(`📊 Tespit edilen eksik indeks: ${filesWithoutWords.length} dosya`);
console.log('');

if (filesWithoutWords.length === 0) {
    console.log('✅ Tüm dosyalar için kelime indeksi mevcut!');
    process.exit(0);
}

let successCount = 0;
let errorCount = 0;
const errors = [];

console.log('🔄 Kelime indeksleri oluşturuluyor...');
console.log('');

for (let i = 0; i < filesWithoutWords.length; i++) {
    const file = filesWithoutWords[i];
    
    try {
        // Fiziksel dosya var mı kontrol et
        if (!fs.existsSync(file.path)) {
            console.log(`⚠️  [${i + 1}/${filesWithoutWords.length}] Dosya bulunamadı: ${file.fileName}`);
            errorCount++;
            errors.push({ file: file.fileName, error: 'File not found' });
            continue;
        }
        
        // Kelime indeksi oluştur
        kelimeArama.kelimeIndexiOlusturMusic(file.path, file.fileName);
        successCount++;
        
        if ((i + 1) % 10 === 0 || i === filesWithoutWords.length - 1) {
            console.log(`   İşlenen: ${i + 1}/${filesWithoutWords.length} (${successCount} başarılı, ${errorCount} hata)`);
        }
        
    } catch (error) {
        console.log(`❌ [${i + 1}/${filesWithoutWords.length}] Hata: ${file.fileName} - ${error.message}`);
        errorCount++;
        errors.push({ file: file.fileName, error: error.message });
    }
}

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  SONUÇ');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log(`✅ Başarılı: ${successCount} dosya`);
console.log(`❌ Hatalı: ${errorCount} dosya`);
console.log('');

if (errors.length > 0) {
    console.log('Hatalı dosyalar:');
    errors.slice(0, 10).forEach(e => {
        console.log(`   - ${e.file}: ${e.error}`);
    });
    if (errors.length > 10) {
        console.log(`   ... ve ${errors.length - 10} dosya daha`);
    }
    console.log('');
}

console.log('✅ İşlem tamamlandı!');
console.log('');

