#!/usr/bin/env node

const fs = require('fs');

// Test verileri
const searchWords = ["kenan", "dogulu", "gel", "gelinim"];
const targetPath = "/Users/koray/Music/KorayMusics/deemix Music/Kenan Doğulu - Gelinim.m4a";

console.log('🚀 GELINIM BENZERLİK TEST SİSTEMİ');
console.log('=====================================');

// Veritabanından dosyayı bul
const dbContent = fs.readFileSync('musicfiles.db.json', 'utf8');
const musicDatabase = JSON.parse(dbContent);

const targetFile = musicDatabase.musicFiles.find(file => 
    file.path === targetPath
);

if (!targetFile) {
    console.log(`❌ Hedef dosya bulunamadı: ${targetPath}`);
    process.exit(1);
}

console.log(`✅ Hedef dosya bulundu:`);
console.log(`   Path: ${targetFile.path}`);
console.log(`   Name: ${targetFile.name}`);
console.log(`   folderWords: ${JSON.stringify(targetFile.folderWords || 'YOK')}`);
console.log(`   fileWords: ${JSON.stringify(targetFile.fileWords || 'YOK')}`);
console.log(`   indexedWords: ${JSON.stringify(targetFile.indexedWords || 'YOK')}`);

// Target words oluştur
let targetWords;
if (targetFile.folderWords && targetFile.fileWords) {
    targetWords = {
        'folder_words': targetFile.folderWords || [],
        'file_words': targetFile.fileWords || [],
        'all_words': targetFile.indexedWords || []
    };
    console.log(`📋 YENİ FORMAT kullanılıyor`);
} else {
    console.log(`📋 ESKİ FORMAT - indexedWords'den oluşturulacak`);
}

console.log(`\n🔍 BENZERLİK HESAPLAMA:`);
console.log(`   Arama kelimeleri: ${JSON.stringify(searchWords)}`);
console.log(`   Hedef fileWords: ${JSON.stringify(targetFile.fileWords || [])}`);

// Manuel eşleşme kontrolü
const fileTarget = targetFile.fileWords || [];
const exactMatches = [];

for (const searchWord of searchWords) {
    if (fileTarget.includes(searchWord)) {
        exactMatches.push(searchWord);
        console.log(`   ✅ TAM EŞLEŞME: "${searchWord}"`);
    } else {
        console.log(`   ❌ EŞLEŞME YOK: "${searchWord}"`);
    }
}

console.log(`\n📊 ÖZET:`);
console.log(`   Toplam arama kelimesi: ${searchWords.length}`);
console.log(`   Hedef dosya kelimeleri: ${fileTarget.length}`);
console.log(`   Tam eşleşmeler: ${exactMatches.length} (${JSON.stringify(exactMatches)})`);

// İçerme kontrolü
console.log(`\n🔍 İÇERME KONTROLÜ:`);
for (const searchWord of searchWords) {
    for (const targetWord of fileTarget) {
        if (targetWord.includes(searchWord) && searchWord.length >= 3) {
            console.log(`   🎯 İÇERME: "${searchWord}" ⊆ "${targetWord}"`);
        }
    }
}

console.log(`\n🧮 BEKLENEN SONUÇ:`);
console.log(`   - "kenan" = "kenan" ✅`);
console.log(`   - "dogulu" = "dogulu" ✅`);
console.log(`   - "gel" ⊆ "gelinim" ✅`);
console.log(`   Toplam: 3 eşleşme bekleniyor`);

if (exactMatches.length >= 2) {
    console.log(`\n🎯 SONUÇ: ✅ BAŞARILI - ${exactMatches.length} tam eşleşme var!`);
} else {
    console.log(`\n🎯 SONUÇ: ❌ BAŞARISIZ - Sadece ${exactMatches.length} tam eşleşme!`);
}
