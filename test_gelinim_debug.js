#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Test verileri
const testCases = [
    {
        name: "GELINIM Test - Kenan Doğulu",
        searchPath: "/Users/koray/Music/KorayMusics/galadugun/MÜZİKAL GÖRÜŞME/İLK DANS/Kenan Doğulu_Gel Gelinim.mp3",
        expectedTarget: "/Users/koray/Music/KorayMusics/deemix Music/Kenan Doğulu - Gelinim.m4a",
        searchWords: ["kenan", "dogulu", "gel", "gelinim"],
        targetWords: ["kenan", "dogulu", "gelinim"]
    }
];

// Benzerlik hesaplama fonksiyonu (server.js'den kopyala)
function normalizeText(text) {
    if (!text) return '';
    
    let normalized = text.toLowerCase()
        .replace(/[çğıöşü]/g, match => {
            const map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' };
            return map[match] || match;
        })
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    return normalized;
}

function extractImprovedWords(fileName, filePath) {
    const normalized = normalizeText(fileName);
    const words = normalized.split(/\s+/).filter(w => w.length > 1);
    
    // Klasör kelimeleri - tüm path'i al
    const pathParts = filePath.split('/').filter(part => part.length > 0);
    const relevantFolders = pathParts.slice(0, -1); // Son eleman dosya adı
    const folderWords = relevantFolders.flatMap(folder => 
        normalizeText(folder).split(/\s+/).filter(w => w.length > 1)
    );
    
    // Dosya kelimeleri
    const fileWords = words;
    
    return {
        folder_words: folderWords,
        file_words: fileWords,
        all_words: [...folderWords, ...fileWords]
    };
}

function calculateImprovedSimilarity(searchWords, targetWords) {
    const fileSearch = targetWords.file_words || [];
    const fileTarget = targetWords.file_words || [];
    
    console.log(`\n🔍 BENZERLİK HESAPLAMA:`);
    console.log(`   Arama: ${JSON.stringify(searchWords)}`);
    console.log(`   Hedef: ${JSON.stringify(fileTarget)}`);
    
    if (fileSearch.length === 0 || fileTarget.length === 0) {
        console.log(`   ❌ Boş kelime listesi - similarity: 0`);
        return 0.0;
    }
    
    // Tam kelime eşleşmeleri
    let exactFileMatches = 0;
    const matchedWords = [];
    
    for (const searchWord of searchWords) {
        if (fileTarget.includes(searchWord)) {
            exactFileMatches++;
            matchedWords.push(searchWord);
            console.log(`   ✅ Tam eşleşme: "${searchWord}"`);
        }
    }
    
    console.log(`   📊 Tam eşleşmeler: ${exactFileMatches}/${searchWords.length}`);
    
    // Harf bazlı benzerlik
    let charSimilarity = 0;
    let charMatches = 0;
    
    for (const searchWord of searchWords) {
        for (const targetWord of fileTarget) {
            if (searchWord.length >= 3 && targetWord.length >= 3) {
                const commonChars = [...searchWord].filter(char => targetWord.includes(char)).length;
                const maxLength = Math.max(searchWord.length, targetWord.length);
                const wordSimilarity = commonChars / maxLength;
                
                if (wordSimilarity > 0.3) {
                    charSimilarity += wordSimilarity;
                    charMatches++;
                    console.log(`   🔤 Harf benzerliği: "${searchWord}" vs "${targetWord}" = ${wordSimilarity.toFixed(3)}`);
                }
            }
        }
    }
    
    if (charMatches > 0) {
        charSimilarity = charSimilarity / charMatches;
    }
    
    console.log(`   📊 Harf benzerliği: ${charSimilarity.toFixed(3)} (${charMatches} eşleşme)`);
    
    // İçerme bonusu
    let inclusionBonus = 0;
    for (const searchWord of searchWords) {
        for (const targetWord of fileTarget) {
            if (searchWord.length >= 3 && targetWord.includes(searchWord)) {
                inclusionBonus += 0.5;
                console.log(`   🎯 İçerme bonusu: "${searchWord}" ⊆ "${targetWord}" (+0.5)`);
            }
        }
    }
    
    // Toplam eşleşmeler
    const totalMatches = exactFileMatches + Math.floor(charSimilarity * 2) + inclusionBonus;
    const fileScore = totalMatches / Math.max(searchWords.length, fileTarget.length);
    
    console.log(`   📊 Toplam eşleşmeler: ${totalMatches}`);
    console.log(`   📊 Dosya skoru: ${fileScore.toFixed(3)}`);
    
    // En az 2 eşleşme kontrolü
    if (totalMatches < 2) {
        console.log(`   ❌ Yetersiz eşleşme (${totalMatches} < 2) - similarity: 0`);
        return 0.0;
    }
    
    // Önemli kelimeler kontrolü
    const importantWords = searchWords.filter(word => word.length >= 4);
    const importantMatches = importantWords.filter(searchWord => {
        if (fileTarget.includes(searchWord)) return true;
        return fileTarget.some(targetWord => 
            targetWord.includes(searchWord) && searchWord.length >= 3
        );
    });
    
    const importantRatio = importantWords.length > 0 ? importantMatches.length / importantWords.length : 1;
    console.log(`   📊 Önemli kelimeler: ${importantMatches.length}/${importantWords.length} (${(importantRatio * 100).toFixed(1)}%)`);
    
    if (importantRatio < 0.5) {
        console.log(`   ❌ Yetersiz önemli kelime eşleşmesi (${(importantRatio * 100).toFixed(1)}% < 50%) - similarity: 0`);
        return 0.0;
    }
    
    // Final skor
    let finalScore = fileScore;
    
    // Klasör bonusu
    const folderWords = targetWords.folder_words || [];
    const folderMatches = searchWords.filter(word => folderWords.includes(word)).length;
    if (folderMatches > 0) {
        const folderBonus = folderMatches * 0.1;
        finalScore += folderBonus;
        console.log(`   📁 Klasör bonusu: ${folderMatches} eşleşme (+${folderBonus.toFixed(3)})`);
    }
    
    // Uzun kelime bonusu
    const longWords = searchWords.filter(word => word.length >= 6).length;
    if (longWords > 0) {
        const longWordBonus = longWords * 0.1;
        finalScore += longWordBonus;
        console.log(`   📏 Uzun kelime bonusu: ${longWords} kelime (+${longWordBonus.toFixed(3)})`);
    }
    
    // Tam eşleşme bonusu
    if (exactFileMatches === searchWords.length) {
        const fullMatchBonus = 0.2;
        finalScore += fullMatchBonus;
        console.log(`   🎯 Tam eşleşme bonusu: +${fullMatchBonus}`);
    }
    
    finalScore = Math.min(finalScore, 1.0);
    
    console.log(`   🏆 Final skor: ${finalScore.toFixed(3)}`);
    
    return finalScore;
}

// Test fonksiyonu
function runTest(testCase) {
    console.log(`\n🧪 TEST: ${testCase.name}`);
    console.log(`   Arama: ${testCase.searchPath}`);
    console.log(`   Beklenen: ${testCase.expectedTarget}`);
    
    // Hedef dosyayı bul
    const dbPath = path.join(__dirname, 'musicfiles.db.json');
    if (!fs.existsSync(dbPath)) {
        console.log(`   ❌ Veritabanı bulunamadı: ${dbPath}`);
        return;
    }
    
    const dbContent = fs.readFileSync(dbPath, 'utf8');
    const musicDatabase = JSON.parse(dbContent);
    
    const targetFile = musicDatabase.musicFiles.find(file => 
        file.path === testCase.expectedTarget
    );
    
    if (!targetFile) {
        console.log(`   ❌ Hedef dosya bulunamadı: ${testCase.expectedTarget}`);
        return;
    }
    
    console.log(`   ✅ Hedef dosya bulundu`);
    console.log(`   📁 Klasör kelimeleri: ${JSON.stringify(targetFile.folderWords || [])}`);
    console.log(`   📄 Dosya kelimeleri: ${JSON.stringify(targetFile.fileWords || [])}`);
    
    // Target words oluştur
    let targetWords;
    if (targetFile.folderWords && targetFile.fileWords) {
        targetWords = {
            'folder_words': targetFile.folderWords || [],
            'file_words': targetFile.fileWords || [],
            'all_words': targetFile.indexedWords || []
        };
    } else {
        // Eski format
        const fileName = path.basename(targetFile.path);
        const fileNameWithoutExt = path.parse(fileName).name;
        const extracted = extractImprovedWords(fileNameWithoutExt, targetFile.path);
        targetWords = {
            'folder_words': extracted.folder_words,
            'file_words': extracted.file_words,
            'all_words': targetFile.indexedWords || []
        };
    }
    
    // Benzerlik hesapla
    const similarity = calculateImprovedSimilarity(testCase.searchWords, targetWords);
    
    console.log(`\n🎯 SONUÇ:`);
    console.log(`   Benzerlik: ${similarity.toFixed(3)}`);
    console.log(`   Beklenen: > 0.3`);
    console.log(`   Durum: ${similarity > 0.3 ? '✅ BAŞARILI' : '❌ BAŞARISIZ'}`);
    
    return similarity;
}

// Ana test
console.log('🚀 GELINIM BENZERLİK TEST SİSTEMİ');
console.log('=====================================');

let totalTests = 0;
let passedTests = 0;

for (const testCase of testCases) {
    totalTests++;
    const similarity = runTest(testCase);
    if (similarity > 0.3) {
        passedTests++;
    }
}

console.log(`\n📊 TEST ÖZETİ:`);
console.log(`   Toplam test: ${totalTests}`);
console.log(`   Başarılı: ${passedTests}`);
console.log(`   Başarısız: ${totalTests - passedTests}`);
console.log(`   Başarı oranı: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
