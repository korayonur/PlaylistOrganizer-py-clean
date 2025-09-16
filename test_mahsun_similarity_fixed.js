const fs = require('fs');
const path = require('path');

console.log('=== MAHSUN KIRMIZIGUL BENZERLİK TESTİ ===\n');

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

// Python'daki önemli fonksiyonları Node.js'e aktar
function normalizeText(text, options = {}) {
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
    const noiseWords = [
        'official', 'audio', 'video', 'music', 'hd', 'stereo', 'mono',
        'remaster', 'remastered', 'enhanced', 'deluxe', 'high', 'quality',
        'feat', 'featuring', 'ft', 'with', 'vs', 'and', 've', 'ile',
        'youtube', 'spotify', 'apple', 'lyric', 'lyrics', 'karaoke',
        'resmi', 'muzik', 'sarki', 'klip', 'canli', 'performans'
    ];
    
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
    
    const result = {
        'folder_words': folderWords,
        'file_words': fileWords,
        'parentheses_words': parenthesesWords,
        'all_words': [...folderWords, ...fileWords, ...parenthesesWords]
    };
    
    return result;
}

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

function calculateExactMatch(searchWords, targetWords) {
    const searchFile = searchWords['file_words'];
    const targetFile = targetWords['file_words'];
    
    if (searchFile.length === 0 || targetFile.length === 0) {
        return 0.0;
    }
    
    let exactMatches = 0;
    let sequenceBonus = 0;
    
    for (const searchWord of searchFile) {
        if (targetFile.includes(searchWord)) {
            exactMatches++;
        }
    }
    
    for (let i = 0; i < searchFile.length - 1; i++) {
        const currentWord = searchFile[i];
        const nextWord = searchFile[i + 1];
        
        const currentIndex = targetFile.indexOf(currentWord);
        const nextIndex = targetFile.indexOf(nextWord);
        
        if (currentIndex !== -1 && nextIndex !== -1 && nextIndex === currentIndex + 1) {
            sequenceBonus += 0.2;
        }
    }
    
    let fullSequenceBonus = 0;
    if (searchFile.length >= 2 && targetFile.length >= searchFile.length) {
        let isFullSequence = true;
        let lastIndex = -1;
        
        for (const searchWord of searchFile) {
            const index = targetFile.indexOf(searchWord);
            if (index === -1 || index <= lastIndex) {
                isFullSequence = false;
                break;
            }
            lastIndex = index;
        }
        
        if (isFullSequence) {
            fullSequenceBonus = 0.3;
        }
    }
    
    const baseScore = exactMatches / searchFile.length;
    return Math.min(1.0, baseScore + sequenceBonus + fullSequenceBonus);
}

function calculateFuzzyMatch(searchWords, targetWords) {
    const searchFile = searchWords['file_words'];
    const targetFile = targetWords['file_words'];
    
    if (searchFile.length === 0 || targetFile.length === 0) {
        return 0.0;
    }
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (const searchWord of searchFile) {
        let bestSimilarity = 0;
        
        for (const targetWord of targetFile) {
            const distance = levenshteinDistance(searchWord, targetWord);
            const maxLength = Math.max(searchWord.length, targetWord.length);
            const similarity = (maxLength - distance) / maxLength;
            
            if (similarity > 0.6) {
                bestSimilarity = Math.max(bestSimilarity, similarity);
            }
            
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

function calculateContextMatch(searchWords, targetWords) {
    const searchFolder = searchWords['folder_words'];
    const targetFolder = targetWords['folder_words'];
    
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

function getCommonPrefix(str1, str2) {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i].toLowerCase() === str2[i].toLowerCase()) {
        i++;
    }
    return str1.substring(0, i);
}

function getCommonSuffix(str1, str2) {
    let i = 0;
    while (i < str1.length && i < str2.length && 
           str1[str1.length - 1 - i].toLowerCase() === str2[str2.length - 1 - i].toLowerCase()) {
        i++;
    }
    return str1.substring(str1.length - i);
}

function calculateSpecialMatches(searchWords, targetWords) {
    const searchFile = searchWords['file_words'];
    const targetFile = targetWords['file_words'];
    
    let specialScore = 0;
    let specialCount = 0;
    
    for (const searchWord of searchFile) {
        for (const targetWord of targetFile) {
            
            if (targetWord.includes(searchWord) && searchWord.length >= 3) {
                specialScore += 0.8;
                specialCount++;
            } else if (searchWord.includes(targetWord) && targetWord.length >= 3) {
                specialScore += 0.7;
                specialCount++;
            }
            
            const commonPrefix = getCommonPrefix(searchWord, targetWord);
            if (commonPrefix.length >= 4) {
                const prefixScore = commonPrefix.length / Math.max(searchWord.length, targetWord.length);
                if (prefixScore > 0.6) {
                    specialScore += prefixScore * 0.8;
                    specialCount++;
                }
            }
            
            const commonSuffix = getCommonSuffix(searchWord, targetWord);
            if (commonSuffix.length >= 3) {
                const suffixScore = commonSuffix.length / Math.max(searchWord.length, targetWord.length);
                if (suffixScore > 0.5) {
                    specialScore += suffixScore * 0.6;
                    specialCount++;
                }
            }
        }
    }
    
    for (const searchWord of searchFile) {
        for (let i = 3; i <= searchWord.length - 3; i++) {
            const part1 = searchWord.substring(0, i);
            const part2 = searchWord.substring(i);
            
            const part1Found = targetFile.some(word => word.includes(part1) && part1.length >= 3);
            const part2Found = targetFile.some(word => word.includes(part2) && part2.length >= 3);
            
            if (part1Found && part2Found) {
                specialScore += 0.85;
                specialCount++;
                break;
            }
        }
    }
    
    return specialCount > 0 ? specialScore / specialCount : 0.0;
}

function calculateNewSimilarity(searchWords, targetWords) {
    if (!searchWords || !targetWords || 
        !searchWords['file_words'] || !targetWords['file_words'] ||
        searchWords['file_words'].length === 0 || targetWords['file_words'].length === 0) {
        return 0.0;
    }
    
    const exactScore = calculateExactMatch(searchWords, targetWords);
    const fuzzyScore = calculateFuzzyMatch(searchWords, targetWords);
    const contextScore = calculateContextMatch(searchWords, targetWords);
    const specialScore = calculateSpecialMatches(searchWords, targetWords);
    
    let parenthesesScore = 0.0;
    const searchParentheses = searchWords['parentheses_words'];
    const targetParentheses = targetWords['parentheses_words'];
    
    if (searchParentheses.length > 0 && targetParentheses.length > 0) {
        let parenthesesMatches = 0;
        for (const searchWord of searchParentheses) {
            if (targetParentheses.includes(searchWord)) {
                parenthesesMatches++;
            }
        }
        parenthesesScore = parenthesesMatches / searchParentheses.length;
    }
    
    let lengthPenalty = 0.0;
    const targetFileWords = targetWords['file_words'];
    const searchFileWords = searchWords['file_words'];
    
    const targetHasNumbers = targetFileWords.some(word => /^\d+$/.test(word));
    const targetLength = targetFileWords.length;
    const searchLength = searchFileWords.length;
    
    if (targetLength > searchLength * 1.5 || targetHasNumbers) {
        lengthPenalty = 0.1;
    }
    
    const weights = {
        exact: 0.4,
        fuzzy: 0.25,
        context: 0.15,
        special: 0.15,
        parentheses: 0.05
    };
    
    const finalScore = (
        exactScore * weights.exact +
        fuzzyScore * weights.fuzzy +
        contextScore * weights.context +
        specialScore * weights.special +
        parenthesesScore * weights.parentheses
    ) - lengthPenalty;
    
    return Math.max(0.0, Math.min(1.0, finalScore));
}

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