const fs = require('fs');
const path = require('path');

// İndeksleme dosyasındaki normalize fonksiyonu
function indexerNormalizeText(text) {
    if (!text) return '';
    
    const charMap = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
    };
    
    return text
        .toLowerCase()
        .split('')
        .map(char => charMap[char] || char)
        .join('')
        .replace(/[^a-z0-9\s-]/g, '') // Boşluk bırakma, direkt sil
        .replace(/\s+/g, ' ')
        .trim();
}

// Server.js'deki ENHANCED_CHAR_MAP
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

// Server.js'deki normalize fonksiyonu
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
        // NFKC normalizasyonu ve ENHANCED_CHAR_MAP dönüşümü
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

console.log('=== NORMALIZE FONKSİYONLARI KARŞILAŞTIRMASI ===\n');

// Test metinleri
const testTexts = [
    'Mahsun Kırmızıgül - Sarı Sarı',
    'Mahsun Kirmizigul - Sari Sari',
    'İstanbul',
    'Istanbul', 
    'ığüşöç',
    'IĞÜŞÖÇ',
    'Müzik',
    'Muzik',
    'ı i İ I',
    'Çiğdem',
    'Cigdem'
];

testTexts.forEach(text => {
    const indexerResult = indexerNormalizeText(text);
    const serverResult = serverNormalizeText(text);
    
    console.log(`Orijinal: "${text}"`);
    console.log(`Indexer : "${indexerResult}"`);
    console.log(`Server  : "${serverResult}"`);
    console.log(`Eşit mi : ${indexerResult === serverResult ? '✅' : '❌'}`);
    console.log('---');
});

console.log('\n=== MAHSUN KIRIMIZIGÜL ÖZEL TESTİ ===\n');

// Mahsun Kırmızıgül özel testi
const searchText = 'Mahsun Kırmızıgül - Sarı Sarı';
const candidateFiles = [
    'Mahsun Kirmizigul - Sari Sari.mp3',
    'Mahsun Kırmızıgül - Sarı Sarı.mp3'
];

console.log(`Arama metni: "${searchText}"`);
console.log(`Arama (indexer): "${indexerNormalizeText(searchText)}"`);
console.log(`Arama (server) : "${serverNormalizeText(searchText)}"`);
console.log();

candidateFiles.forEach((file, index) => {
    const indexerResult = indexerNormalizeText(file);
    const serverResult = serverNormalizeText(file);
    
    console.log(`Dosya ${index + 1}: "${file}"`);
    console.log(`Indexer : "${indexerResult}"`);
    console.log(`Server  : "${serverResult}"`);
    
    // Arama metni ile karşılaştırma
    const searchIndexer = indexerNormalizeText(searchText);
    const searchServer = serverNormalizeText(searchText);
    
    console.log(`Indexer eşleşme: ${searchIndexer === indexerResult ? '✅' : '❌'}`);
    console.log(`Server eşleşme : ${searchServer === serverResult ? '✅' : '❌'}`);
    console.log('---');
});

console.log('\n=== KARAKTER BAZLI ANALİZ ===\n');

// Karakter bazlı analiz
const problematicChars = ['ı', 'i', 'İ', 'I', 'ğ', 'Ğ', 'ü', 'Ü', 'ş', 'Ş', 'ç', 'Ç', 'ö', 'Ö'];

problematicChars.forEach(char => {
    const indexerResult = indexerNormalizeText(char);
    const serverResult = serverNormalizeText(char);
    
    console.log(`'${char}' -> Indexer: '${indexerResult}', Server: '${serverResult}', Eşit: ${indexerResult === serverResult ? '✅' : '❌'}`);
});

console.log('\n=== SONUÇ ===\n');
console.log('Bu test, indexer.js ve server.js arasındaki normalize fonksiyonu farklarını gösterir.');
console.log('Eğer farklılıklar varsa, bu benzerlik algoritmasının başarısızlığının nedeni olabilir.');