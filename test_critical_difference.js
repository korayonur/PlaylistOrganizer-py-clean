const fs = require('fs');

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
        .replace(/[^a-z0-9\s-]/g, '') // TİRE (-) KORUNUYOR!
        .replace(/\s+/g, ' ')
        .trim();
}

// Server.js'deki ENHANCED_CHAR_MAP
const ENHANCED_CHAR_MAP = {
    "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
    "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
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
        normalized = normalized.normalize("NFKC");
        normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');
    }

    if (!keepCase) {
        normalized = normalized.toLowerCase();
    }

    if (!keepSpecialChars) {
        normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, ''); // TİRE (-) KALDIRILIR!
    }

    if (!keepSpaces) {
        normalized = normalized.replace(/\s+/g, ' ');
    }

    return normalized.trim();
}

console.log('=== KRİTİK FARK ANALİZİ ===\n');

const testText = 'Mahsun Kırmızıgül - Sarı Sarı';

console.log(`Test metni: "${testText}"`);
console.log();

// Adım adım analiz
console.log('=== ADIM ADIM ANALİZ ===');
console.log();

// İndeksleme süreci
console.log('İNDEKSLEME SÜRECİ:');
let indexerStep1 = testText.toLowerCase();
console.log(`1. toLowerCase(): "${indexerStep1}"`);

let indexerStep2 = indexerStep1.split('').map(char => {
    const charMap = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
    };
    return charMap[char] || char;
}).join('');
console.log(`2. charMap dönüşümü: "${indexerStep2}"`);

let indexerStep3 = indexerStep2.replace(/[^a-z0-9\s-]/g, '');
console.log(`3. Özel karakter temizleme (- korunur): "${indexerStep3}"`);

let indexerFinal = indexerStep3.replace(/\s+/g, ' ').trim();
console.log(`4. Final (indexer): "${indexerFinal}"`);

console.log();

// Server süreci
console.log('SERVER SÜRECİ:');
let serverStep1 = testText.normalize("NFKC");
console.log(`1. NFKC normalize: "${serverStep1}"`);

let serverStep2 = serverStep1.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');
console.log(`2. ENHANCED_CHAR_MAP: "${serverStep2}"`);

let serverStep3 = serverStep2.toLowerCase();
console.log(`3. toLowerCase(): "${serverStep3}"`);

let serverStep4 = serverStep3.replace(/[^a-zA-Z0-9\s]/g, '');
console.log(`4. Özel karakter temizleme (- kaldırılır): "${serverStep4}"`);

let serverFinal = serverStep4.replace(/\s+/g, ' ').trim();
console.log(`5. Final (server): "${serverFinal}"`);

console.log();

console.log('=== SONUÇ ===');
console.log(`İndeksleme sonucu: "${indexerFinal}"`);
console.log(`Server sonucu    : "${serverFinal}"`);
console.log(`Eşit mi: ${indexerFinal === serverFinal ? '✅' : '❌'}`);
console.log();

console.log('=== PROBLEM TESPİTİ ===');
console.log('🔍 BULUNDU: İndeksleme sırasında tire (-) karakteri korunuyor,');
console.log('   ama arama sırasında tire (-) karakteri kaldırılıyor!');
console.log();
console.log('Bu durum şu soruna yol açıyor:');
console.log('- İndekslenen dosya: "mahsun kirmizigul - sari sari"');
console.log('- Arama metni     : "mahsun kirmizigul  sari sari" (tire yok)');
console.log('- Sonuç: Eşleşme başarısız!');
console.log();

console.log('=== DOSYA UZANTISI PROBLEMİ ===');
const fileTest = 'Mahsun Kırmızıgül - Sarı Sarı.mp3';
console.log(`Dosya adı: "${fileTest}"`);
console.log(`İndeksleme: "${indexerNormalizeText(fileTest)}"`);
console.log(`Server    : "${serverNormalizeText(fileTest)}"`);
console.log();
console.log('🔍 İKİNCİ PROBLEM: Dosya uzantısı (.mp3) da normalize edilirken farklı işleniyor!');
console.log('- İndeksleme: Nokta kaldırılır, "mp3" eklenir');
console.log('- Server: Nokta kaldırılır, "mp3" eklenir');
console.log('- Ama arama metni uzantı içermiyor!');

console.log();
console.log('=== ÇÖZÜMLERİ ===');
console.log('1. İndeksleme ve arama için aynı normalize fonksiyonunu kullan');
console.log('2. Dosya uzantısını normalize etmeden önce kaldır');
console.log('3. Tire (-) karakteri için tutarlı davranış belirle');