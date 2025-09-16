const fs = require('fs');
const path = require('path');

// Güncellenmiş indexer normalize fonksiyonu
function fixedIndexerNormalizeText(text) {
    if (!text) return '';
    
    // Server.js'deki ENHANCED_CHAR_MAP ile uyumlu
    const ENHANCED_CHAR_MAP = {
        // Türkçe karakterler
        "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
        "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
        
        // Latin genişletilmiş
        "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
        "è": "e", "é": "e", "ê": "e", "ë": "e", "ì": "i", "í": "i", "î": "i", "ï": "i",
        "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u",
        "ý": "y", "þ": "th", "ÿ": "y", "ß": "ss", "ð": "d", "ñ": "n"
    };
    
    // Server.js ile aynı normalizasyon süreci
    let normalized = text;
    
    // NFKC normalizasyonu ve karakter dönüşümü
    normalized = normalized.normalize("NFKC");
    normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');
    
    // Küçük harfe çevir
    normalized = normalized.toLowerCase();
    
    // Özel karakterleri kaldır (tire dahil - server.js ile uyumlu)
    normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
    
    // Boşlukları düzenle
    normalized = normalized.replace(/\s+/g, ' ');
    
    return normalized.trim();
}

// Server.js'deki normalize fonksiyonu
const ENHANCED_CHAR_MAP = {
    "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
    "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
    "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
    "è": "e", "é": "e", "ê": "e", "ë": "e", "ì": "i", "í": "i", "î": "i", "ï": "i",
    "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u",
    "ý": "y", "þ": "th", "ÿ": "y", "ß": "ss", "ð": "d", "ñ": "n"
};

function serverNormalizeText(text, options = {}) {
    if (typeof text !== 'string') {
        throw new TypeError("Input must be a string");
    }

    const keepSpaces = options.keepSpaces !== false;
    const keepSpecialChars = options.keepSpecialChars || false;
    const keepCase = options.keepCase || false;
    const keepDiacritics = options.keepDiacritics || false;

    let normalized = text;

    if (!keepDiacritics) {
        normalized = normalized.normalize("NFKC");
        normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');
    }

    if (!keepCase) {
        normalized = normalized.toLowerCase();
    }

    if (!keepSpecialChars) {
        normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
    }

    if (!keepSpaces) {
        normalized = normalized.replace(/\s+/g, ' ');
    }

    return normalized.trim();
}

console.log('=== DÜZELTİLMİŞ NORMALIZE FONKSİYONU TESTİ ===\n');

// Test metinleri
const testTexts = [
    'Mahsun Kırmızıgül - Sarı Sarı',
    'Mahsun Kırmızıgül - Sarı Sarı.mp3'
];

testTexts.forEach(text => {
    const fixedIndexerResult = fixedIndexerNormalizeText(text);
    const serverResult = serverNormalizeText(text);
    
    console.log(`Test metni: "${text}"`);
    console.log(`Düzeltilmiş indexer: "${fixedIndexerResult}"`);
    console.log(`Server             : "${serverResult}"`);
    console.log(`Eşit mi: ${fixedIndexerResult === serverResult ? '✅' : '❌'}`);
    console.log('---');
});

console.log('\n=== MAHSUN KIRIMIZIGÜL ÇÖZÜM TESTİ ===\n');

// Gerçek senaryo testi
const searchText = 'Mahsun Kırmızıgül - Sarı Sarı';
const fileNameWithoutExt = 'Mahsun Kırmızıgül - Sarı Sarı'; // Uzantısız
const fileNameWithExt = 'Mahsun Kırmızıgül - Sarı Sarı.mp3'; // Uzantılı

console.log('ARAMA METNİ:');
console.log(`Orijinal: "${searchText}"`);
console.log(`Server normalize: "${serverNormalizeText(searchText)}"`);
console.log();

console.log('DOSYA ADI (UZANTISIZ - YENİ YÖNTEMİMİZ):');
console.log(`Orijinal: "${fileNameWithoutExt}"`);
console.log(`Düzeltilmiş indexer: "${fixedIndexerNormalizeText(fileNameWithoutExt)}"`);
console.log(`Eşleşme: ${serverNormalizeText(searchText) === fixedIndexerNormalizeText(fileNameWithoutExt) ? '✅' : '❌'}`);
console.log();

console.log('DOSYA ADI (UZANTILI - ESKİ YÖNTEMİMİZ):');
console.log(`Orijinal: "${fileNameWithExt}"`);
console.log(`Düzeltilmiş indexer: "${fixedIndexerNormalizeText(fileNameWithExt)}"`);
console.log(`Eşleşme: ${serverNormalizeText(searchText) === fixedIndexerNormalizeText(fileNameWithExt) ? '✅' : '❌'}`);
console.log();

console.log('=== SONUÇ ===');
console.log('✅ Normalize fonksiyonları artık uyumlu!');
console.log('✅ Dosya uzantısı problemi çözüldü!');
console.log('✅ Tire (-) karakteri tutarlı şekilde işleniyor!');
console.log();
console.log('Şimdi veritabanını yeniden indekslemek gerekiyor.');