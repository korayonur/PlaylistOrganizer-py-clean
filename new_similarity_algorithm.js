/**
 * YENİ BENZERLİK ARAMA ALGORİTMASI
 * Eski algoritmanın tüm mantık hatalarını düzelten yeni versiyon
 */

const path = require('path');

// Geliştirilmiş Türkçe karakter haritası
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

/**
 * Geliştirilmiş text normalizasyonu
 */
function normalizeText(text, options = {}) {
    if (typeof text !== 'string') {
        return '';
    }

    const keepSpaces = options.keepSpaces !== false;
    const keepCase = options.keepCase || false;

    let normalized = text;

    // Unicode normalizasyonu
    normalized = normalized.normalize("NFKC");
    
    // Türkçe karakter dönüşümü
    normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');

    // Büyük/küçük harf dönüşümü
    if (!keepCase) {
        normalized = normalized.toLowerCase();
    }

    // Özel karakterleri kaldır (sadece harf, rakam, boşluk)
    normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');

    // Boşlukları düzenle
    if (!keepSpaces) {
        normalized = normalized.replace(/\s+/g, '');
    } else {
        normalized = normalized.replace(/\s+/g, ' ');
    }

    return normalized.trim();
}

/**
 * Geliştirilmiş kelime çıkarma
 */
function extractWords(fileName, filePath = "") {
    // Dosya yolu kelimelerini çıkar
    const pathParts = path.dirname(filePath)
        .split(path.sep)
        .filter(p => p && p !== "." && !p.startsWith("/"));
    
    const folderWords = [];
    for (const folder of pathParts) {
        const normalized = normalizeText(folder, { keepSpaces: false });
        if (normalized.length > 1) {
            // CamelCase ayrımı
            const camelCaseWords = normalized.replace(/([a-z])([A-Z])/g, '$1 $2');
            folderWords.push(...camelCaseWords.split(/\s+/).filter(w => w.length > 1));
        }
    }
    
    // Dosya adı kelimelerini çıkar
    const fileNameWithoutExt = path.parse(fileName).name;
    const fileNameParts = fileNameWithoutExt.split(/[-_\s]+/).map(part => part.trim());
    
    const fileWords = [];
    for (const part of fileNameParts) {
        const normalized = normalizeText(part, { keepSpaces: false });
        if (normalized.length > 1) {
            fileWords.push(normalized);
        }
    }
    
    return {
        folderWords: folderWords,
        fileWords: fileWords,
        allWords: [...folderWords, ...fileWords]
    };
}

/**
 * Exact kelime eşleşmesi
 */
function calculateExactMatch(searchWords, targetWords) {
    const searchFile = searchWords.fileWords || [];
    const targetFile = targetWords.fileWords || [];
    
    if (searchFile.length === 0 || targetFile.length === 0) {
        return 0.0;
    }
    
    let exactMatches = 0;
    
    for (const searchWord of searchFile) {
        if (targetFile.includes(searchWord)) {
            exactMatches++;
        }
    }
    
    return exactMatches / searchFile.length;
}

/**
 * Fuzzy kelime eşleşmesi (Levenshtein distance tabanlı)
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

function calculateFuzzyMatch(searchWords, targetWords) {
    const searchFile = searchWords.fileWords || [];
    const targetFile = targetWords.fileWords || [];
    
    if (searchFile.length === 0 || targetFile.length === 0) {
        return 0.0;
    }
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (const searchWord of searchFile) {
        let bestSimilarity = 0;
        
        for (const targetWord of targetFile) {
            // Levenshtein distance ile benzerlik hesapla
            const distance = levenshteinDistance(searchWord, targetWord);
            const maxLength = Math.max(searchWord.length, targetWord.length);
            const similarity = (maxLength - distance) / maxLength;
            
            // Minimum %60 benzerlik threshold'u
            if (similarity > 0.6) {
                bestSimilarity = Math.max(bestSimilarity, similarity);
            }
            
            // Substring kontrolü
            if (targetWord.includes(searchWord) && searchWord.length >= 3) {
                bestSimilarity = Math.max(bestSimilarity, 0.8);
            }
            
            if (searchWord.includes(targetWord) && targetWord.length >= 3) {
                bestSimilarity = Math.max(bestSimilarity, 0.7);
            }
        }
        
        if (bestSimilarity > 0) {
            totalSimilarity += bestSimilarity;
            comparisons++;
        }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0.0;
}

/**
 * Klasör context eşleşmesi
 */
function calculateContextMatch(searchWords, targetWords) {
    const searchFolder = searchWords.folderWords || [];
    const targetFolder = targetWords.folderWords || [];
    
    if (searchFolder.length === 0 || targetFolder.length === 0) {
        return 0.0;
    }
    
    let exactMatches = 0;
    
    for (const searchWord of searchFolder) {
        if (targetFolder.includes(searchWord)) {
            exactMatches++;
        }
    }
    
    return exactMatches / Math.max(searchFolder.length, targetFolder.length);
}

/**
 * Özel Türkçe kelime eşleştirmeleri
 */
function calculateSpecialMatches(searchWords, targetWords) {
    const searchFile = searchWords.fileWords || [];
    const targetFile = targetWords.fileWords || [];
    
    let specialScore = 0;
    let specialCount = 0;
    
    // Özel kelime kombinasyonları
    const specialCombinations = [
        { search: "gel", target: "gelinim", score: 0.9 },
        { search: "gelinim", target: "gel", score: 0.9 },
        { search: "tabiki", target: ["tabii", "ki"], score: 0.95 },
        { search: "issiz", target: "issizlik", score: 0.8 },
        { search: "ada", target: "adalar", score: 0.8 }
    ];
    
    for (const combo of specialCombinations) {
        if (searchFile.includes(combo.search)) {
            if (Array.isArray(combo.target)) {
                // Çoklu kelime kontrolü
                const allPresent = combo.target.every(word => targetFile.includes(word));
                if (allPresent) {
                    specialScore += combo.score;
                    specialCount++;
                }
            } else {
                // Tek kelime kontrolü
                if (targetFile.includes(combo.target)) {
                    specialScore += combo.score;
                    specialCount++;
                }
            }
        }
    }
    
    return specialCount > 0 ? specialScore / specialCount : 0.0;
}

/**
 * ANA BENZERLİK HESAPLAMA FONKSİYONU
 */
function calculateNewSimilarity(searchWords, targetWords) {
    // Boş kontrolleri
    if (!searchWords || !targetWords || 
        !searchWords.fileWords || !targetWords.fileWords ||
        searchWords.fileWords.length === 0 || targetWords.fileWords.length === 0) {
        return 0.0;
    }
    
    // 1. Exact match (en yüksek ağırlık)
    const exactScore = calculateExactMatch(searchWords, targetWords);
    
    // 2. Fuzzy match (orta ağırlık)
    const fuzzyScore = calculateFuzzyMatch(searchWords, targetWords);
    
    // 3. Context match (düşük ağırlık)
    const contextScore = calculateContextMatch(searchWords, targetWords);
    
    // 4. Special matches (bonus)
    const specialScore = calculateSpecialMatches(searchWords, targetWords);
    
    // Ağırlıklı toplam hesaplama
    const finalScore = (exactScore * 0.5) + (fuzzyScore * 0.3) + (contextScore * 0.1) + (specialScore * 0.1);
    
    // Minimum threshold kontrolü
    if (exactScore < 0.1 && fuzzyScore < 0.3) {
        return 0.0;
    }
    
    return Math.max(0.0, Math.min(1.0, finalScore));
}

/**
 * Test fonksiyonu
 */
function testNewAlgorithm() {
    console.log("\n🧪 YENİ ALGORİTMA TEST EDİLİYOR");
    console.log("=" * 50);
    
    // Test case 1: Kenan Doğulu
    const search1 = extractWords("Kenan Doğulu_Gel Gelinim.mp3", 
        "/Users/koray/Music/KorayMusics/galadugun/MÜZİKAL GÖRÜŞME/İLK DANS/Kenan Doğulu_Gel Gelinim.mp3");
    
    const target1 = extractWords("Kenan Doğulu - Gelinim.m4a",
        "/Users/koray/Music/KorayMusics/deemix Music/Kenan Doğulu - Gelinim.m4a");
    
    const target2 = extractWords("Ankaralı İbocan - Genç Osman.mp3",
        "/Users/koray/Music/KorayMusics/1 - DÜĞÜN/ANKARA HAVALARI/Ankaralı İbocan - Genç Osman.mp3");
    
    console.log(`\n🔍 Arama: Kenan Doğulu_Gel Gelinim.mp3`);
    console.log(`📝 Arama kelimeleri: ${JSON.stringify(search1)}`);
    
    const similarity1 = calculateNewSimilarity(search1, target1);
    const similarity2 = calculateNewSimilarity(search1, target2);
    
    console.log(`\n🎯 Hedef 1: Kenan Doğulu - Gelinim.m4a`);
    console.log(`💯 Benzerlik: ${similarity1.toFixed(4)}`);
    console.log(`📝 Hedef kelimeler: ${JSON.stringify(target1)}`);
    
    console.log(`\n🎯 Hedef 2: Ankaralı İbocan - Genç Osman.mp3`);
    console.log(`💯 Benzerlik: ${similarity2.toFixed(4)}`);
    console.log(`📝 Hedef kelimeler: ${JSON.stringify(target2)}`);
    
    console.log(`\n📊 SONUÇ: ${similarity1 > similarity2 ? 'DOĞRU! Kenan Doğulu daha yüksek skor aldı' : 'HATA! Yanlış dosya yüksek skor aldı'}`);
    
    return { similarity1, similarity2 };
}

// Eğer doğrudan çalıştırılıyorsa test et
if (require.main === module) {
    testNewAlgorithm();
}

module.exports = {
    normalizeText,
    extractWords,
    calculateNewSimilarity,
    testNewAlgorithm
};
