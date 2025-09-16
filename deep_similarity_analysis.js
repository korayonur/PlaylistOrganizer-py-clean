const fs = require('fs');
const path = require('path');

console.log('=== DERİNLEMESİNE BENZERLİK ANALİZİ ===\n');

// Önceki fonksiyonları kopyala (kısaltılmış versiyon)
const ENHANCED_CHAR_MAP = {
    "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
    "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
    "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
    "è": "e", "é": "e", "ê": "e", "ë": "e", "ì": "i", "í": "i", "î": "i", "ï": "i",
    "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u",
    "ý": "y", "þ": "th", "ÿ": "y", "ß": "ss", "ð": "d", "ñ": "n"
};

function normalizeText(text, options = {}) {
    if (typeof text !== 'string') return '';
    const keepSpaces = options.keepSpaces !== false;
    const keepSpecialChars = options.keepSpecialChars || false;
    const keepCase = options.keepCase || false;
    const keepDiacritics = options.keepDiacritics || false;

    let normalized = text;
    if (!keepDiacritics) {
        normalized = normalized.normalize("NFKC");
        normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');
    }
    if (!keepCase) normalized = normalized.toLowerCase();
    if (!keepSpecialChars) normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
    if (!keepSpaces) normalized = normalized.replace(/\s+/g, ' ');
    return normalized.trim();
}

function hybridParenthesesFilter(text) {
    const mainText = text
        .replace(/\([^)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\{[^}]*\}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    const parenthesesMatches = text.match(/\([^)]*\)/g) || [];
    const bracketMatches = text.match(/\[[^\]]*\]/g) || [];
    const braceMatches = text.match(/\{[^}]*\}/g) || [];
    const allMatches = [...parenthesesMatches, ...bracketMatches, ...braceMatches];
    
    const importantParenthesesWords = [];
    const noiseWords = ['official', 'audio', 'video', 'music', 'hd', 'stereo', 'mono', 'remaster', 'remastered', 'enhanced', 'deluxe', 'high', 'quality', 'feat', 'featuring', 'ft', 'with', 'vs', 'and', 've', 'ile', 'youtube', 'spotify', 'apple', 'lyric', 'lyrics', 'karaoke', 'resmi', 'muzik', 'sarki', 'klip', 'canli', 'performans'];
    
    allMatches.forEach(match => {
        const content = match.replace(/[\(\)\[\]\{\}]/g, '');
        const words = content.split(/[\s\-_,&]+/).filter(w => w.length > 1);
        words.forEach(word => {
            const normalizedWord = normalizeText(word, { keepSpaces: false });
            const isNoise = noiseWords.includes(normalizedWord);
            const isNumber = /^\d{1,4}$/.test(normalizedWord);
            if (!isNoise && !isNumber && normalizedWord.length >= 3) {
                importantParenthesesWords.push(normalizedWord);
            }
        });
    });
    
    return {
        mainText: mainText,
        parenthesesWords: importantParenthesesWords,
        hybridText: mainText + (importantParenthesesWords.length > 0 ? ' ' + importantParenthesesWords.join(' ') : '')
    };
}

function extractImprovedWords(fileName, filePath = "") {
    const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
    const relevantFolders = pathParts;
    const fileNameWithoutExt = path.parse(fileName).name;
    const hybridFiltered = hybridParenthesesFilter(fileNameWithoutExt);
    const cleanedFileName = hybridFiltered.mainText;
    const fileNameParts = cleanedFileName.split(/[-_\s\.\,\&\+\|\~\!\@\#\$\%\^\*\(\)\[\]\{\}]+/).map(part => part.trim()).filter(part => part.length > 0);
    
    const folderWords = [];
    for (const folder of relevantFolders) {
        const normalizedFolder = normalizeText(folder, { keepSpaces: false });
        const camelCaseWords = normalizedFolder.replace(/([a-z])([A-Z])/g, '$1 $2');
        folderWords.push(...camelCaseWords.split(/\s+/).filter(w => w.length > 1));
    }
    
    const fileWords = [];
    for (const part of fileNameParts) {
        if (part.trim()) {
            const normalizedPart = normalizeText(part, { keepSpaces: false });
            const words = normalizedPart.split(/\s+/).filter(w => w.length > 1);
            fileWords.push(...words);
        }
    }
    
    const parenthesesWords = hybridFiltered.parenthesesWords;
    
    return {
        'folder_words': folderWords,
        'file_words': fileWords,
        'parentheses_words': parenthesesWords,
        'all_words': [...folderWords, ...fileWords, ...parenthesesWords],
        'raw_filename': fileName,
        'cleaned_filename': cleanedFileName,
        'file_path': filePath
    };
}

// Test verileri
const searchQuery = "Mahsun Kirmizigul - Sari Sari.mp3";
const originalFile = "Mahsun Kırmızıgül - Sarı Sarı.m4a";
const foundFile = "mahsun kırmızıgül-sarı sarı(remix)_Dj SEF@ .m4a";

const searchWords = extractImprovedWords(searchQuery, "");
const originalWords = extractImprovedWords(originalFile, "/Users/koray/Music/KorayMusics/Video2019/");
const foundWords = extractImprovedWords(foundFile, "/Users/koray/Music/KorayMusics/Downloads2019/");

console.log('=== DETAYLI KARŞILAŞTIRMA ===');
console.log('\n1. HAM DOSYA ADI KARŞILAŞTIRMASI:');
console.log('Arama:', searchQuery);
console.log('Orijinal:', originalFile);
console.log('Bulunan:', foundFile);

console.log('\n2. NORMALİZE EDİLMİŞ KARŞILAŞTIRMA:');
console.log('Arama normalize:', normalizeText(searchQuery));
console.log('Orijinal normalize:', normalizeText(originalFile));
console.log('Bulunan normalize:', normalizeText(foundFile));

console.log('\n3. KELİME BAZLI KARŞILAŞTIRMA:');
console.log('Arama kelimeleri:', searchWords.file_words);
console.log('Orijinal kelimeleri:', originalWords.file_words);
console.log('Bulunan kelimeleri:', foundWords.file_words);

console.log('\n4. PARANTEZ İÇERİKLERİ:');
console.log('Arama parantez:', searchWords.parentheses_words);
console.log('Orijinal parantez:', originalWords.parentheses_words);
console.log('Bulunan parantez:', foundWords.parentheses_words);

console.log('\n5. KLASÖR CONTEXT:');
console.log('Arama klasör:', searchWords.folder_words);
console.log('Orijinal klasör:', originalWords.folder_words);
console.log('Bulunan klasör:', foundWords.folder_words);

// Kritik fark analizi
console.log('\n=== KRİTİK FARK ANALİZİ ===');

console.log('\n1. DOSYA ADI UZUNLUĞU:');
console.log('Arama kelime sayısı:', searchWords.file_words.length);
console.log('Orijinal kelime sayısı:', originalWords.file_words.length);
console.log('Bulunan kelime sayısı:', foundWords.file_words.length);

console.log('\n2. EK KELİMELER:');
const originalExtra = originalWords.file_words.filter(w => !searchWords.file_words.includes(w));
const foundExtra = foundWords.file_words.filter(w => !searchWords.file_words.includes(w));
console.log('Orijinal ek kelimeler:', originalExtra);
console.log('Bulunan ek kelimeler:', foundExtra);

console.log('\n3. PARANTEZ BONUSU:');
console.log('Bulunan dosyada parantez kelimesi var mı?', foundWords.parentheses_words.length > 0);
console.log('Parantez kelimeleri:', foundWords.parentheses_words);

console.log('\n4. DOSYA YOLU FARKI:');
console.log('Orijinal yol:', originalWords.file_path);
console.log('Bulunan yol:', foundWords.file_path);

console.log('\n5. KARAKTER FARKLARI:');
console.log('Arama - Türkçe karakter var mı?', /[ğĞıİşŞçÇüÜöÖ]/.test(searchQuery));
console.log('Orijinal - Türkçe karakter var mı?', /[ğĞıİşŞçÇüÜöÖ]/.test(originalFile));
console.log('Bulunan - Türkçe karakter var mı?', /[ğĞıİşŞçÇüÜöÖ]/.test(foundFile));

// Sıralama faktörleri
console.log('\n=== SIRALAMA FAKTÖRLERİ ===');

console.log('\n1. DOSYA BOYUTU PENALTISI:');
console.log('Bulunan dosyada fazla kelime var mı?', foundWords.file_words.length > searchWords.file_words.length);
console.log('Fazla kelime sayısı:', foundWords.file_words.length - searchWords.file_words.length);

console.log('\n2. ÖZEL KARAKTER PENALTISI:');
const originalSpecialChars = (originalFile.match(/[^a-zA-Z0-9\s]/g) || []).length;
const foundSpecialChars = (foundFile.match(/[^a-zA-Z0-9\s]/g) || []).length;
console.log('Orijinal özel karakter sayısı:', originalSpecialChars);
console.log('Bulunan özel karakter sayısı:', foundSpecialChars);

console.log('\n3. DOSYA UZANTISI:');
console.log('Arama uzantısı:', path.extname(searchQuery));
console.log('Orijinal uzantısı:', path.extname(originalFile));
console.log('Bulunan uzantısı:', path.extname(foundFile));

console.log('\n4. ALFABE SIRASI:');
console.log('Alfabetik sıralama:', [originalFile, foundFile].sort());

console.log('\n=== SONUÇ ===');
console.log('Eğer skorlar eşitse, sıralama şu faktörlere bağlı olabilir:');
console.log('- Dosya yolu (alfabetik)');
console.log('- Dosya adı uzunluğu');
console.log('- Özel karakter sayısı');
console.log('- Parantez içeriği');
console.log('- İlk bulunma sırası');

console.log('\n' + '='.repeat(60));
console.log('Detaylı analiz tamamlandı!');