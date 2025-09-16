// Boşluk problemi analizi

const text = 'Mahsun Kırmızıgül - Sarı Sarı';

console.log('=== BOŞLUK PROBLEMİ ANALİZİ ===\n');

console.log('Orijinal metin:', JSON.stringify(text));
console.log();

// Adım adım server.js süreci
let step1 = text.normalize("NFKC");
console.log('1. NFKC normalize:', JSON.stringify(step1));

const ENHANCED_CHAR_MAP = {
    "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
    "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O"
};

let step2 = step1.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');
console.log('2. Karakter dönüşümü:', JSON.stringify(step2));

let step3 = step2.toLowerCase();
console.log('3. toLowerCase:', JSON.stringify(step3));

let step4 = step3.replace(/[^a-zA-Z0-9\s]/g, '');
console.log('4. Özel karakter kaldırma:', JSON.stringify(step4));
console.log('   Dikkat: Tire (-) kaldırıldı ama boşluk kaldı!');

let step5 = step4.replace(/\s+/g, ' ');
console.log('5. Boşluk düzenleme:', JSON.stringify(step5));

let final = step5.trim();
console.log('6. Final:', JSON.stringify(final));

console.log();
console.log('PROBLEM: Tire (-) kaldırıldığında "gül - Sarı" -> "gül  Sarı" oluyor (çift boşluk)');
console.log('ÇÖZÜM: Boşluk düzenleme işlemini daha agresif yapmak gerekiyor.');

console.log();
console.log('=== DOĞRU ÇÖZÜM ===');

// Doğru çözüm
function correctNormalize(text) {
    if (!text) return '';
    
    let normalized = text;
    
    // NFKC normalizasyonu ve karakter dönüşümü
    normalized = normalized.normalize("NFKC");
    normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');
    
    // Küçük harfe çevir
    normalized = normalized.toLowerCase();
    
    // Özel karakterleri kaldır
    normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
    
    // Boşlukları düzenle (çoklu boşlukları tek boşluğa çevir)
    normalized = normalized.replace(/\s+/g, ' ');
    
    return normalized.trim();
}

const corrected = correctNormalize(text);
console.log('Düzeltilmiş sonuç:', JSON.stringify(corrected));
console.log('Karakter sayısı:', corrected.length);
console.log('Boşluk sayısı:', (corrected.match(/ /g) || []).length);