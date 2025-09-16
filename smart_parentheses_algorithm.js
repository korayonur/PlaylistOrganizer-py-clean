/**
 * AKILLI PARANTEZ FİLTRELEME ALGORİTMASI
 * Parantez içi tamamen silmek yerine akıllı filtreleme
 */

const path = require('path');

// Geliştirilmiş Türkçe karakter haritası
const ENHANCED_CHAR_MAP = {
    "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
    "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
    "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
    "è": "e", "é": "e", "ê": "e", "ë": "e", "ì": "i", "í": "i", "î": "i", "ï": "i",
    "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u",
    "ý": "y", "þ": "th", "ÿ": "y", "ß": "ss", "ð": "d", "ñ": "n"
};

function normalizeText(text, options = {}) {
    if (typeof text !== 'string') {
        return '';
    }

    const keepSpaces = options.keepSpaces !== false;
    const keepCase = options.keepCase || false;

    let normalized = text;
    normalized = normalized.normalize("NFKC");
    normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');

    if (!keepCase) {
        normalized = normalized.toLowerCase();
    }

    normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');

    if (!keepSpaces) {
        normalized = normalized.replace(/\s+/g, '');
    } else {
        normalized = normalized.replace(/\s+/g, ' ');
    }

    return normalized.trim();
}

/**
 * AKILLI PARANTEZ FİLTRELEME
 * Gereksiz kelimeleri filtreler, önemli kelimeleri korur
 */
function smartParenthesesFilter(text) {
    // Parantez içindeki metinleri çıkar ama tamamen silme
    const parenthesesContent = [];
    
    // Parantez içeriklerini topla
    const parenthesesMatches = text.match(/\([^)]*\)/g) || [];
    const bracketMatches = text.match(/\[[^\]]*\]/g) || [];
    const braceMatches = text.match(/\{[^}]*\}/g) || [];
    
    const allMatches = [...parenthesesMatches, ...bracketMatches, ...braceMatches];
    
    allMatches.forEach(match => {
        // Parantez işaretlerini kaldır
        const content = match.replace(/[\(\)\[\]\{\}]/g, '');
        parenthesesContent.push(content);
    });
    
    // Ana metni parantezlerden temizle
    let mainText = text
        .replace(/\([^)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\{[^}]*\}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Parantez içindeki önemli kelimeleri filtrele
    const importantParenthesesWords = [];
    const commonNoiseWords = [
        // Teknik terimler
        'official', 'audio', 'video', 'music', 'clip', 'klip', 'hd', 'stereo', 'mono',
        // Kalite belirteçleri  
        'high', 'quality', 'remaster', 'remastered', 'enhanced', 'deluxe',
        // Platform belirteçleri
        'youtube', 'spotify', 'apple', 'music', 'lyric', 'lyrics', 'karaoke',
        // Yıl ve sayılar (4 haneli yıllar ve tek rakamlar)
        /^\d{4}$/, /^\d{1,2}$/, 
        // Türkçe teknik terimler
        'resmi', 'muzik', 'sarki', 'klip', 'canli', 'performans'
    ];
    
    parenthesesContent.forEach(content => {
        const words = content.split(/[\s\-_,&]+/).filter(w => w.length > 1);
        
        words.forEach(word => {
            const normalizedWord = normalizeText(word, { keepSpaces: false });
            
            // Gürültü kelimesi mi kontrol et
            const isNoise = commonNoiseWords.some(noisePattern => {
                if (noisePattern instanceof RegExp) {
                    return noisePattern.test(normalizedWord);
                }
                return normalizedWord === noisePattern;
            });
            
            // Önemli kelime ise koru (sanatçı adları, remix yapımcıları vs.)
            if (!isNoise && normalizedWord.length >= 3) {
                importantParenthesesWords.push(normalizedWord);
            }
        });
    });
    
    return {
        mainText: mainText,
        parenthesesWords: importantParenthesesWords,
        allText: mainText + ' ' + importantParenthesesWords.join(' ')
    };
}

/**
 * GELİŞTİRİLMİŞ KELIME ÇIKARMA - Akıllı parantez filtreleme ile
 */
function extractSmartWords(fileName, filePath = "") {
    const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
    
    const relevantFolders = pathParts;
    const fileNameWithoutExt = path.parse(fileName).name;
    
    // Akıllı parantez filtreleme
    const smartFiltered = smartParenthesesFilter(fileNameWithoutExt);
    
    // Ana kelimeler (parantez dışı)
    const mainParts = smartFiltered.mainText.split(/[-_\s]/).map(part => part.trim());
    const mainWords = [];
    
    for (const part of mainParts) {
        if (part.trim()) {
            const normalizedPart = normalizeText(part, { keepSpaces: false });
            const words = normalizedPart.split(/\s+/).filter(w => w.length > 1);
            mainWords.push(...words);
        }
    }
    
    // Parantez içindeki önemli kelimeler
    const parenthesesWords = smartFiltered.parenthesesWords;
    
    // Klasör kelimeleri
    const folderWords = [];
    for (const folder of relevantFolders) {
        const normalizedFolder = normalizeText(folder, { keepSpaces: false });
        const camelCaseWords = normalizedFolder.replace(/([a-z])([A-Z])/g, '$1 $2');
        folderWords.push(...camelCaseWords.split(/\s+/).filter(w => w.length > 1));
    }
    
    return {
        'folder_words': folderWords,
        'file_words': mainWords,
        'parentheses_words': parenthesesWords, // Yeni: önemli parantez kelimeleri
        'all_words': [...folderWords, ...mainWords, ...parenthesesWords]
    };
}

// Test fonksiyonu
function testSmartFiltering() {
    console.log("🧪 AKILLI PARANTEZ FİLTRELEME TESTLERİ");
    console.log("=" * 60);
    
    const testCases = [
        {
            name: "Billie Eilish - Bad Guy (FlexB, Vinci, Darrell Remix) (4).mp3",
            description: "Remix yapımcıları korunmalı, '4' sayısı filtrelenmeli"
        },
        {
            name: "Sezen Aksu - Kutlama (Official Audio).mp3", 
            description: "'Official Audio' filtrelenmeli"
        },
        {
            name: "Tarkan - Dudu (feat. Sezen Aksu).mp3",
            description: "Sezen Aksu korunmalı, 'feat' filtrelenmeli"
        },
        {
            name: "Kenan Doğulu - Aşka Sürgün (2023 Remaster).mp3",
            description: "'2023' ve 'Remaster' filtrelenmeli"
        },
        {
            name: "Barış Manço - Gülpembe (Canlı Performans).mp3",
            description: "'Canlı Performans' filtrelenmeli ama 'Canlı' önemli olabilir"
        }
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`\n📁 Test ${index + 1}: ${testCase.name}`);
        console.log(`📝 Beklenen: ${testCase.description}`);
        
        const result = extractSmartWords(testCase.name, `/Users/koray/Music/test/${testCase.name}`);
        
        console.log(`   🎯 Ana kelimeler: ${JSON.stringify(result.file_words)}`);
        console.log(`   🎭 Parantez kelimeleri: ${JSON.stringify(result.parentheses_words)}`);
        console.log(`   📂 Klasör kelimeleri: ${JSON.stringify(result.folder_words)}`);
        console.log(`   🔗 Tüm kelimeler: ${JSON.stringify(result.all_words)}`);
        
        // Akıllı filtreleme başarısını değerlendir
        const hasNoiseWords = result.parentheses_words.some(word => 
            ['official', 'audio', 'video', 'remaster', '2023', '4'].includes(word)
        );
        
        const hasImportantWords = result.parentheses_words.some(word =>
            ['flexb', 'vinci', 'darrell', 'remix', 'sezen', 'aksu'].includes(word)
        );
        
        console.log(`   📊 Gürültü filtrelendi: ${!hasNoiseWords ? '✅' : '❌'}`);
        console.log(`   📊 Önemli kelimeler korundu: ${hasImportantWords ? '✅' : '⚠️'}`);
    });
}

// Eğer doğrudan çalıştırılıyorsa test et
if (require.main === module) {
    testSmartFiltering();
}

module.exports = {
    smartParenthesesFilter,
    extractSmartWords,
    testSmartFiltering
};
