const fs = require('fs');
const path = require('path');

// Server.js'den fonksiyonları import et
const serverPath = path.join(__dirname, 'nodejs-api', 'server.js');
const serverCode = fs.readFileSync(serverPath, 'utf8');

// Fonksiyonları eval ile yükle (test amaçlı)
eval(serverCode.split('const app = express();')[0]);

console.log('=== MAHSUN KIRMIZIGUL BENZERLİK TESTİ ===\n');

// Test verileri
const searchQuery = "Mahsun Kirmizigul - Sari Sari.mp3";
const originalFile = "Mahsun Kırmızıgül - Sarı Sarı.m4a";
const foundFile = "mahsun kırmızıgül-sarı sarı(remix)_Dj SEF@ .m4a";

console.log('Arama sorgusu:', searchQuery);
console.log('Orijinal dosya:', originalFile);
console.log('Bulunan dosya:', foundFile);
console.log('\n' + '='.repeat(60) + '\n');

// 1. Kelime çıkarma testleri
console.log('1. KELİME ÇIKARMA ANALİZİ:');
console.log('-'.repeat(40));

const searchWords = extractImprovedWords(searchQuery, "");
const originalWords = extractImprovedWords(originalFile, "/Users/koray/Music/KorayMusics/Video2019/");
const foundWords = extractImprovedWords(foundFile, "/Users/koray/Music/KorayMusics/Downloads2019/");

console.log('Arama kelimeler:', JSON.stringify(searchWords, null, 2));
console.log('\nOrijinal kelimeler:', JSON.stringify(originalWords, null, 2));
console.log('\nBulunan kelimeler:', JSON.stringify(foundWords, null, 2));

// 2. Benzerlik skorları
console.log('\n2. BENZERLİK SKORLARI:');
console.log('-'.repeat(40));

const originalSimilarity = calculateNewSimilarity(searchWords, originalWords);
const foundSimilarity = calculateNewSimilarity(searchWords, foundWords);

console.log('Orijinal dosya benzerlik skoru:', originalSimilarity.toFixed(4));
console.log('Bulunan dosya benzerlik skoru:', foundSimilarity.toFixed(4));

// 3. Detaylı skor analizi
console.log('\n3. DETAYLI SKOR ANALİZİ:');
console.log('-'.repeat(40));

function detailedSimilarityAnalysis(searchWords, targetWords, label) {
    console.log(`\n${label} için detaylı analiz:`);
    
    const exactScore = calculateExactMatch(searchWords, targetWords);
    const fuzzyScore = calculateFuzzyMatch(searchWords, targetWords);
    const contextScore = calculateContextMatch(searchWords, targetWords);
    const specialScore = calculateSpecialMatches(searchWords, targetWords);
    
    console.log(`  - Exact Match: ${exactScore.toFixed(4)}`);
    console.log(`  - Fuzzy Match: ${fuzzyScore.toFixed(4)}`);
    console.log(`  - Context Match: ${contextScore.toFixed(4)}`);
    console.log(`  - Special Match: ${specialScore.toFixed(4)}`);
    
    return { exactScore, fuzzyScore, contextScore, specialScore };
}

const originalAnalysis = detailedSimilarityAnalysis(searchWords, originalWords, "ORİJİNAL DOSYA");
const foundAnalysis = detailedSimilarityAnalysis(searchWords, foundWords, "BULUNAN DOSYA");

// 4. Normalizasyon testleri
console.log('\n4. NORMALİZASYON TESTLERİ:');
console.log('-'.repeat(40));

console.log('Arama sorgusu normalize:', normalizeText(searchQuery));
console.log('Orijinal dosya normalize:', normalizeText(originalFile));
console.log('Bulunan dosya normalize:', normalizeText(foundFile));

// 5. Parantez filtreleme testleri
console.log('\n5. PARANTEZ FİLTRELEME TESTLERİ:');
console.log('-'.repeat(40));

const searchParentheses = hybridParenthesesFilter(searchQuery);
const originalParentheses = hybridParenthesesFilter(originalFile);
const foundParentheses = hybridParenthesesFilter(foundFile);

console.log('Arama parantez filtresi:', JSON.stringify(searchParentheses, null, 2));
console.log('Orijinal parantez filtresi:', JSON.stringify(originalParentheses, null, 2));
console.log('Bulunan parantez filtresi:', JSON.stringify(foundParentheses, null, 2));

// 6. Problem analizi
console.log('\n6. PROBLEM ANALİZİ:');
console.log('-'.repeat(40));

if (originalSimilarity > foundSimilarity) {
    console.log('✅ Algoritma DOĞRU çalışıyor - Orijinal dosya daha yüksek skor aldı');
    console.log(`   Fark: ${(originalSimilarity - foundSimilarity).toFixed(4)}`);
} else {
    console.log('❌ Algoritma YANLIŞ çalışıyor - Bulunan dosya daha yüksek skor aldı');
    console.log(`   Fark: ${(foundSimilarity - originalSimilarity).toFixed(4)}`);
    
    console.log('\nPotansiyel problemler:');
    if (foundAnalysis.exactScore > originalAnalysis.exactScore) {
        console.log('- Exact match skoru bulunan dosyada daha yüksek');
    }
    if (foundAnalysis.fuzzyScore > originalAnalysis.fuzzyScore) {
        console.log('- Fuzzy match skoru bulunan dosyada daha yüksek');
    }
    if (foundAnalysis.contextScore > originalAnalysis.contextScore) {
        console.log('- Context match skoru bulunan dosyada daha yüksek');
    }
    if (foundAnalysis.specialScore > originalAnalysis.specialScore) {
        console.log('- Special match skoru bulunan dosyada daha yüksek');
    }
}

console.log('\n' + '='.repeat(60));
console.log('Test tamamlandı!');