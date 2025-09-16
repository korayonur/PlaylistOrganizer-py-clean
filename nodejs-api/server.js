const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const fs = require('fs-extra');
const path = require('path');
const xml2js = require('xml2js');

// Logging sistemi
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

function logError(error, context = '') {
    const timestamp = new Date().toISOString();
    const logMessage = {
        timestamp,
        level: 'ERROR',
        context,
        message: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno
    };
    
    console.error(`[${timestamp}] ERROR ${context}:`, error.message);
    
    // Log dosyasına yaz
    const logFile = path.join(logDir, `error_${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logMessage) + '\n');
}

function logInfo(message, context = '') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO ${context}:`, message);
}

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

// Desteklenen formatlar (Python'daki SUPPORTED_FORMATS ile aynı)
const SUPPORTED_FORMATS = {
    "audio": [
        "mp3", "wav", "cda", "wma", "asf", "ogg", "m4a", "aac", "aif", "aiff",
        "flac", "mpc", "ape", "wv", "opus", "ra", "rm", "3gp", "amr", "au"
    ],
    "video": [
        "mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4v", "3gp", "ogv"
    ],
    "vdj": [
        "vdjfolder", "vdjplaylist", "vdj"
    ],
    "image": [
        "jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp", "svg"
    ]
};

// Python'daki önemli fonksiyonları Node.js'e aktar
function normalizeText(text, options = {}) {
    /**
     * Tüm uygulama için merkezi string normalizasyon fonksiyonu
     * İndeksleme ile uyumlu hale getirildi
     */
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

    // Boşluk düzenleme - çoklu boşlukları tek boşluğa çevir
    // Bu işlem keepSpaces parametresinden bağımsız olarak yapılmalı
    // çünkü özel karakter kaldırma işlemi çift boşluk oluşturabiliyor
    normalized = normalized.replace(/\s+/g, ' ');

    return normalized.trim();
}

function normalizeFileName(text) {
    /**Dosya adı normalizasyonu*/
    return normalizeText(text, { keepSpaces: true, keepSpecialChars: true });
}

function normalizePath(text) {
    /**Yol normalizasyonu*/
    return normalizeText(text, { keepSpaces: true, keepSpecialChars: true, keepCase: false });
}

/**
 * HİBRİT PARANTEZ SİSTEMİ
 * Ana kelimeler öncelikli, parantez kelimeleri ikincil
 */
function hybridParenthesesFilter(text) {
    // Ana metni parantezlerden temizle
    const mainText = text
        .replace(/\([^)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\{[^}]*\}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Parantez içeriklerini çıkar
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
            
            // Gürültü kontrolü
            const isNoise = noiseWords.includes(normalizedWord);
            const isNumber = /^\d{1,4}$/.test(normalizedWord);
            
            // Önemli kelime ise koru (sanatçı adları, remix yapımcıları)
            if (!isNoise && !isNumber && normalizedWord.length >= 3) {
                importantParenthesesWords.push(normalizedWord);
            }
        });
    });
    
    return {
        mainText: mainText,
        parenthesesWords: importantParenthesesWords,
        // Hibrit: Ana kelimeler + seçilmiş parantez kelimeleri
        hybridText: mainText + (importantParenthesesWords.length > 0 ? ' ' + importantParenthesesWords.join(' ') : '')
    };
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
        // Bağlaç kelimeler
        'feat', 'featuring', 'ft', 'with', 'vs', 'versus', 'and', 've', 'ile',
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
            
            // Sayı kontrolü (1-4 haneli sayılar genelde gürültü)
            const isNumber = /^\d{1,4}$/.test(normalizedWord);
            
            // Önemli kelime ise koru
            if (!isNoise && !isNumber && normalizedWord.length >= 3) {
                importantParenthesesWords.push(normalizedWord);
            }
        });
    });
    
    return {
        mainText: mainText,
        parenthesesWords: importantParenthesesWords,
        allText: mainText + (importantParenthesesWords.length > 0 ? ' ' + importantParenthesesWords.join(' ') : '')
    };
}



function extractImprovedWords(fileName, filePath = "") {
    /**Geliştirilmiş kelime çıkarma - parantez temizleme ve klasör/dosya adı ayrımı*/
    const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
    
    // Tüm klasörleri al (sadece son 1 değil)
    const relevantFolders = pathParts;
    
    // Dosya adını normalize et ve parantezleri temizle
    const fileNameWithoutExt = path.parse(fileName).name;
    
    // PARANTEZ İÇİ SAYI NORMALIZASYONU - kritik düzeltme
    const cleanedNameForParentheses = fileNameWithoutExt.replace(/\(\d+\)/g, '').trim();
    
    // HİBRİT PARANTEZ SİSTEMİ - Ana kelimeler öncelikli
    const hybridFiltered = hybridParenthesesFilter(cleanedNameForParentheses);
    const cleanedFileName = hybridFiltered.mainText; // Sadece ana kelimeler
    
    // GELİŞTİRİLMİŞ KELİME AYIRMA - Tüm ayırıcıları dahil et
    const fileNameParts = cleanedFileName.split(/[-_\s\.\,\&\+\|\~\!\@\#\$\%\^\*\(\)\[\]\{\}]+/).map(part => part.trim()).filter(part => part.length > 0);
    
    // Klasör kelimelerini normalize et
    const folderWords = [];
    for (const folder of relevantFolders) {
        const normalizedFolder = normalizeText(folder, { keepSpaces: false });
        const camelCaseWords = normalizedFolder.replace(/([a-z])([A-Z])/g, '$1 $2');
        folderWords.push(...camelCaseWords.split(/\s+/).filter(w => w.length > 1));
    }
    
    // Dosya adı kelimelerini normalize et - parantez temizlenmiş hali
    const fileWords = [];
    for (const part of fileNameParts) {
        if (part.trim()) { // Boş parçaları atla
        const normalizedPart = normalizeText(part, { keepSpaces: false });
            const words = normalizedPart.split(/\s+/).filter(w => w.length > 1);
            fileWords.push(...words);
        }
    }
    
    // Hibrit sistem: ana kelimeler + önemli parantez kelimeleri
    const parenthesesWords = hybridFiltered.parenthesesWords;
    
    const result = {
        'folder_words': folderWords,
        'file_words': fileWords,
        'parentheses_words': parenthesesWords,  // Yeni: parantez kelimeleri
        'all_words': [...folderWords, ...fileWords, ...parenthesesWords]
    };
    
    return result;
}

// YENİ BENZERLİK ALGORİTMASI FONKSİYONLARI

/**
 * Levenshtein distance hesaplama
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

/**
 * Exact kelime eşleşmesi - Kelime sırası bonusu ile
 */
function calculateExactMatch(searchWords, targetWords) {
    const searchFile = searchWords['file_words'];
    const targetFile = targetWords['file_words'];
    
    if (searchFile.length === 0 || targetFile.length === 0) {
        return 0.0;
    }
    
    let exactMatches = 0;
    let sequenceBonus = 0;
    
    // 1. Tam kelime eşleşmeleri
    for (const searchWord of searchFile) {
        if (targetFile.includes(searchWord)) {
            exactMatches++;
        }
    }
    
    // 2. Kelime sırası bonusu - ardışık eşleşmeler
    for (let i = 0; i < searchFile.length - 1; i++) {
        const currentWord = searchFile[i];
        const nextWord = searchFile[i + 1];
        
        const currentIndex = targetFile.indexOf(currentWord);
        const nextIndex = targetFile.indexOf(nextWord);
        
        // Ardışık kelimeler aynı sırada mı?
        if (currentIndex !== -1 && nextIndex !== -1 && nextIndex === currentIndex + 1) {
            sequenceBonus += 0.2; // Sıra bonusu
        }
    }
    
    // 3. Tam sıra eşleşmesi bonusu - tüm kelimeler aynı sırada
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
            fullSequenceBonus = 0.3; // Tam sıra bonusu
        }
    }
    
    const baseScore = exactMatches / searchFile.length;
    return Math.min(1.0, baseScore + sequenceBonus + fullSequenceBonus);
}

/**
 * Fuzzy kelime eşleşmesi (Levenshtein distance tabanlı)
 */
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

/**
 * Dinamik kelime eşleştirmeleri - Sabit liste YOK!
 */
function calculateSpecialMatches(searchWords, targetWords) {
    const searchFile = searchWords['file_words'];
    const targetFile = targetWords['file_words'];
    
    let specialScore = 0;
    let specialCount = 0;
    
    // DİNAMİK ALGORİTMA - Sabit liste yok!
    for (const searchWord of searchFile) {
        for (const targetWord of targetFile) {
            
            // 1. Kelime içerme kontrolü (dinamik)
            if (targetWord.includes(searchWord) && searchWord.length >= 3) {
                specialScore += 0.8;
                specialCount++;
            } else if (searchWord.includes(targetWord) && targetWord.length >= 3) {
                specialScore += 0.7;
                specialCount++;
            }
            
            // 2. Ortak kök analizi (dinamik)
            const commonPrefix = getCommonPrefix(searchWord, targetWord);
            if (commonPrefix.length >= 4) { // En az 4 karakter ortak kök
                const prefixScore = commonPrefix.length / Math.max(searchWord.length, targetWord.length);
                if (prefixScore > 0.6) {
                    specialScore += prefixScore * 0.8;
                    specialCount++;
                }
            }
            
            // 3. Ortak son ek analizi (dinamik)
            const commonSuffix = getCommonSuffix(searchWord, targetWord);
            if (commonSuffix.length >= 3) { // En az 3 karakter ortak son ek
                const suffixScore = commonSuffix.length / Math.max(searchWord.length, targetWord.length);
                if (suffixScore > 0.5) {
                    specialScore += suffixScore * 0.6;
                    specialCount++;
                }
            }
        }
    }
    
    // 4. Kelime birleştirme analizi (dinamik)
    for (const searchWord of searchFile) {
        // Arama kelimesini parçalara ayır ve hedefte ara
        for (let i = 3; i <= searchWord.length - 3; i++) { // Minimum 3 karakter parçalar
            const part1 = searchWord.substring(0, i);
            const part2 = searchWord.substring(i);
            
            // Her iki parçanın da hedefte olup olmadığını kontrol et
            const part1Found = targetFile.some(word => word.includes(part1) && part1.length >= 3);
            const part2Found = targetFile.some(word => word.includes(part2) && part2.length >= 3);
            
            if (part1Found && part2Found) {
                specialScore += 0.85; // Kelime birleştirme bonusu
                specialCount++;
                break; // İlk başarılı birleştirmede dur
            }
        }
    }
    
    return specialCount > 0 ? specialScore / specialCount : 0.0;
}

/**
 * Ortak ön ek bulma (dinamik)
 */
function getCommonPrefix(str1, str2) {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i].toLowerCase() === str2[i].toLowerCase()) {
        i++;
    }
    return str1.substring(0, i);
}

/**
 * Ortak son ek bulma (dinamik)  
 */
function getCommonSuffix(str1, str2) {
    let i = 0;
    while (i < str1.length && i < str2.length && 
           str1[str1.length - 1 - i].toLowerCase() === str2[str2.length - 1 - i].toLowerCase()) {
        i++;
    }
    return str1.substring(str1.length - i);
}

// ---------------- V4 BENZERLIK ALGORITMASI YARDIMCILARI ----------------
function lcsLengthTokens(a, b) {
    const n = a.length, m = b.length;
    if (n === 0 || m === 0) return 0;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[n][m];
}

function weightedTokenOverlap(searchFile, targetFile) {
    // Ağırlık: uzun kelimeler daha değerli, 4+ harf bonus
    const weightOf = w => Math.min(1, Math.max(0.4, w.length / 7));
    const targetSet = new Set(targetFile);
    let sumWeights = 0;
    let matchedWeights = 0;
    let exactMatchedCount = 0;
    for (const w of searchFile) {
        const wgt = weightOf(w);
        sumWeights += wgt;
        if (targetSet.has(w)) {
            matchedWeights += wgt;
            exactMatchedCount++;
        } else {
            // Kısmi içerme: hedefteki bir kelime içinde aranıyorsa ufak bonus
            const partial = targetFile.find(t => t.includes(w) || w.includes(t));
            if (partial && w.length >= 3) {
                matchedWeights += wgt * 0.5; // yarım puan
            }
        }
    }
    const overlapScore = sumWeights > 0 ? matchedWeights / sumWeights : 0;
    const exactScore = searchFile.length > 0 ? exactMatchedCount / searchFile.length : 0;
    return { overlapScore, exactScore };
}

function orderSimilarity(searchFile, targetFile) {
    // Eşleşen kelimelerin hedefteki sıralamasını al, LIS uzunluğu / eşleşen sayısı
    const positions = [];
    for (const w of searchFile) {
        const idx = targetFile.indexOf(w);
        if (idx !== -1) positions.push(idx);
    }
    if (positions.length <= 1) return positions.length; // 0 -> 0, 1 -> 1
    // LIS
    const tails = [];
    for (const x of positions) {
        let l = 0, r = tails.length;
        while (l < r) {
            const m = (l + r) >> 1;
            if (tails[m] < x) l = m + 1; else r = m;
        }
        tails[l] = x;
    }
    const lis = tails.length;
    return lis / positions.length; // [0,1]
}

function computeParenthesesScore(searchParentheses, targetParentheses) {
    if (!searchParentheses || !targetParentheses) return 0;
    if (searchParentheses.length === 0 || targetParentheses.length === 0) return 0;
    let matches = 0;
    for (const w of searchParentheses) if (targetParentheses.includes(w)) matches++;
    return matches / searchParentheses.length;
}

function computeFolderBoost(folderSearch, folderTarget) {
    if (!folderSearch || !folderTarget || folderSearch.length === 0 || folderTarget.length === 0) return 0;
    const exact = folderSearch.filter(w => folderTarget.includes(w)).length;
    return (exact / Math.max(folderSearch.length, folderTarget.length));
}

function computeLengthPenalty(searchFile, targetFile) {
    let penalty = 0;
    const targetHasNumbers = targetFile.some(word => /^\d+$/.test(word));
    if (targetHasNumbers) penalty += 0.1;
    if (targetFile.length > searchFile.length * 1.5) {
        const ratio = targetFile.length / searchFile.length;
        penalty += Math.min(0.25, (ratio - 1.5) * 0.1);
    }
    return penalty;
}

function calculateSimilarityV4(searchWords, targetWords) {
    if (!searchWords || !targetWords) return 0;
    const searchFile = searchWords['file_words'] || [];
    const targetFile = targetWords['file_words'] || [];
    if (searchFile.length === 0 || targetFile.length === 0) return 0;

    const { overlapScore, exactScore } = weightedTokenOverlap(searchFile, targetFile);
    const ordScore = orderSimilarity(searchFile, targetFile);
    const lcsScore = lcsLengthTokens(searchFile, targetFile) / Math.max(1, searchFile.length);
    const parScore = computeParenthesesScore(searchWords['parentheses_words'], targetWords['parentheses_words']);
    const folderBoost = computeFolderBoost(searchWords['folder_words'], targetWords['folder_words']);
    const lengthPenalty = computeLengthPenalty(searchFile, targetFile);

    // Ağırlıklı birleşim
    const base = (overlapScore * 0.5) + (ordScore * 0.2) + (lcsScore * 0.2) + (folderBoost * 0.05) + (parScore * 0.05);
    const final = Math.max(0, Math.min(1, base - lengthPenalty));
    return final;
}
// ---------------- V4 SONU ----------------

/**
 * YENİ ANA BENZERLİK HESAPLAMA FONKSİYONU
 */
function calculateNewSimilarity(searchWords, targetWords) {
    // Boş kontrolleri
    if (!searchWords || !targetWords || 
        !searchWords['file_words'] || !targetWords['file_words'] ||
        searchWords['file_words'].length === 0 || targetWords['file_words'].length === 0) {
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
    
    // Parantez kelimeleri için ek skor hesaplama
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
    
    // 5. Dosya adı uzunluğu penaltısı (mashup'lar için)
    let lengthPenalty = 0.0;
    const targetFileWords = targetWords['file_words'];
    const searchFileWords = searchWords['file_words'];
    
    // Hedef dosyada gereksiz sayılar var mı kontrol et
    const targetHasNumbers = targetFileWords.some(word => /^\d+$/.test(word));
    if (targetHasNumbers) {
        lengthPenalty += 0.15; // Sayı penaltısı
    }
    
    if (targetFileWords.length > searchFileWords.length * 1.5) {
        // Hedef dosya uzunsa (mashup olabilir) - threshold düşürüldü
        const lengthRatio = targetFileWords.length / searchFileWords.length;
        lengthPenalty += Math.min(0.25, (lengthRatio - 1.5) * 0.1); // Arttırılmış penaltı
    }
    
    // İYİLEŞTİRİLMİŞ ağırlıklı toplam hesaplama - parantez kelimeleri önemli
    const baseScore = (exactScore * 0.4) + (fuzzyScore * 0.2) + (contextScore * 0.05) + (specialScore * 0.15) + (parenthesesScore * 0.2);
    const finalScore = Math.max(0.0, baseScore - lengthPenalty);
    
    // Minimum threshold kontrolü - tamamen kaldırıldı (debug için)
    // if (exactScore < 0.05 && fuzzyScore < 0.1) {
    //     return 0.0;
    // }
    
    return Math.max(0.0, Math.min(1.0, finalScore));
}

// ESKİ ALGORİTMA (DEPRECATED - SADECE YEDEK İÇİN BIRAKILIYOR)
function calculateImprovedSimilarity_OLD(searchWords, targetWords) {
    /**SADELEŞTİRİLMİŞ BENZERLİK ALGORİTMASI - Filtreleme yok*/
    if (!searchWords['all_words'] || !targetWords['all_words'] || 
        searchWords['all_words'].length === 0 || targetWords['all_words'].length === 0) {
        return 0.0;
    }
    
    // 1. DOSYA KELİME EŞLEŞMESİ (Ana skor)
    const fileSearch = searchWords['file_words'] || [];
    const fileTarget = targetWords['file_words'] || [];
    
    if (!fileSearch || !fileTarget || fileSearch.length === 0 || fileTarget.length === 0) {
        return 0.0;
    }
    
    // Dosya kelime eşleşmesi (tam kelime + harf bazlı) - genel algoritma
    let exactFileMatches = 0;
    for (const word of fileSearch) {
        if (fileTarget.includes(word)) {
            exactFileMatches += 1.0; // Tam eşleşme: 1.0 puan
        }
    }
    
    // Geliştirilmiş kelime birleştirme + harf eşleşme algoritması
    for (const word of fileSearch) {
        // Eğer kelime tam eşleşmiyorsa, kelime birleştirme + harf eşleşme dene
        if (!fileTarget.includes(word)) {
            let bestCombinationScore = 0;
            
            // Kelimeyi 2 parçaya böl ve target'da ara
            for (let i = 1; i < word.length; i++) {
                const part1 = word.substring(0, i);
                const part2 = word.substring(i);
                
                // Her iki parçayı da target'da ara
                const part1Index = fileTarget.findIndex(w => w.toLowerCase() === part1.toLowerCase());
                const part2Index = fileTarget.findIndex(w => w.toLowerCase() === part2.toLowerCase());
                
                if (part1Index !== -1 && part2Index !== -1) {
                    // Tam kelime birleştirme başarılı
                    bestCombinationScore = Math.max(bestCombinationScore, 1.0);
                } else {
                    // Harf eşleşme ile kelime birleştirme dene
                    const combinedWord = part1 + ' ' + part2; // "tabii ki"
                    const searchChars = word.toLowerCase().split('');
                    const targetChars = combinedWord.toLowerCase().split('');
                    
                    // Harf sıklığını hesapla
                    const searchCharCount = {};
                    const targetCharCount = {};
                    
                    searchChars.forEach(char => {
                        searchCharCount[char] = (searchCharCount[char] || 0) + 1;
                    });
                    
                    targetChars.forEach(char => {
                        targetCharCount[char] = (targetCharCount[char] || 0) + 1;
                    });
                    
                    // Minimum harf sayısını hesapla
                    let minCharCount = 0;
                    for (const char in searchCharCount) {
                        if (targetCharCount[char]) {
                            minCharCount += Math.min(searchCharCount[char], targetCharCount[char]);
                        }
                    }
                    
                    // Harf eşleşme puanı hesapla
                    const charSimilarity = minCharCount / Math.max(searchChars.length, targetChars.length);
                    
                    if (charSimilarity > 0.6) { // %60 harf eşleşmesi
                        bestCombinationScore = Math.max(bestCombinationScore, charSimilarity);
                    }
                }
            }
            
            if (bestCombinationScore > 0) {
                exactFileMatches += bestCombinationScore;
            }
        }
    }
    
    // Harf bazlı eşleşme - her kelimeyi ayrı ayrı kontrol et
    let charSimilarity = 0;
    let charMatches = 0;
    
    for (const searchWord of fileSearch) {
        for (const targetWord of fileTarget) {
            const searchChars = searchWord.toLowerCase().split('');
            const targetChars = targetWord.toLowerCase().split('');
            
            const commonChars = searchChars.filter(char => targetChars.includes(char));
            const wordSimilarity = commonChars.length / Math.max(searchChars.length, targetChars.length);
            
            if (wordSimilarity > 0.3) { // %30 harf eşleşmesi
                charSimilarity += wordSimilarity;
                charMatches++;
            }
        }
    }
    
    // Ek kontrol: arama kelimesi hedef kelimenin içinde var mı?
    for (const searchWord of fileSearch) {
        for (const targetWord of fileTarget) {
            if (targetWord.toLowerCase().includes(searchWord.toLowerCase()) && searchWord.length >= 3) {
                charSimilarity += 0.8; // İçerme bonusu
                charMatches++;
            }
        }
    }
    
    // Ortalama harf benzerliği
    if (charMatches > 0) {
        charSimilarity = charSimilarity / charMatches;
    }
    
    // Tam kelime eşleşmesi + harf bazlı eşleşme
    const totalMatches = exactFileMatches + Math.floor(charSimilarity * 2); // Harf eşleşmesini 2'ye çarp
    const fileScore = totalMatches / Math.max(fileSearch.length, fileTarget.length);
    
    // SABIT KELIME FİLTRELEMESİ KALDIRILDI - TÜM KELİMELER EŞİT
    // En az 1 dosya kelimesi eşleşmeli (tam kelime + harf bazlı)
    if (totalMatches < 1) {
        return 0.0;
    }
    
    
    // 2. KLASÖR KELİME EŞLEŞMESİ (Bonus)
    const folderSearch = searchWords['folder_words'] || [];
    const folderTarget = targetWords['folder_words'] || [];
    
    let folderBonus = 0.0;
    if (folderSearch.length > 0 && folderTarget.length > 0) {
        const exactFolderMatches = folderSearch.filter(word => folderTarget.includes(word)).length;
        folderBonus = (exactFolderMatches / Math.max(folderSearch.length, folderTarget.length)) * 0.3;
    }
    
    // UZUN KELİME BONUSU KALDIRILDI - TÜM KELİMELER EŞİT
    
    // 4. TAM EŞLEŞME BONUSU
    let fullMatchBonus = 0.0;
    if (exactFileMatches >= 3) {
        fullMatchBonus = 0.15;
    }
    
    // Toplam skor hesapla - SABIT KELIME BONUSU YOK
    const totalScore = fileScore + folderBonus + fullMatchBonus;
    
    // 0.0 - 1.0 arasında sınırla
    return Math.max(0.0, Math.min(1.0, totalScore));
}

// Python'daki search_single_file fonksiyonunu Node.js'e aktar

// Dosya arama fonksiyonu
async function searchFile(searchPath, options = {}) {
    const startTime = Date.now();
    
    // Cache kontrolü
    if (!musicDatabase || !databaseLoadTime || (Date.now() - databaseLoadTime) > DATABASE_CACHE_DURATION) {
        await loadDatabase();
    }
    
    if (!musicDatabase) {
        return {
            originalPath: searchPath,
            found: false,
            status: 'database_error',
            processTime: Date.now() - startTime
        };
    }
    
    const fileName = path.basename(searchPath);
    const fileNameWithoutExt = path.parse(fileName).name;
    const fileDir = path.dirname(searchPath);
    
    // 1. Tam yol eşleşmesi
    const exactMatch = musicDatabase.musicFiles.find(file => file.path === searchPath);
    if (exactMatch) {
        return {
            originalPath: searchPath,
            found: true,
            status: 'exact_match',
            matchType: 'tamYolEsleme',
            foundPath: searchPath,
            similarity: 1.0,
            processTime: Date.now() - startTime
        };
    }
    
    // 2. Aynı klasör farklı uzantı (HIZLI - O(1))
    const extensions = ['.mp3', '.m4a', '.flac', '.wav', '.mp4', '.avi', '.mkv'];
    for (const ext of extensions) {
        const altPath = path.join(fileDir, fileNameWithoutExt + ext);
        const altMatch = musicDatabase.musicFiles.find(file => file.path === altPath);
        if (altMatch) {
            return {
                originalPath: searchPath,
                found: true,
                status: 'exact_match',
                matchType: 'ayniKlasorFarkliUzanti',
                foundPath: altPath,
                similarity: 0.9,
                processTime: Date.now() - startTime
            };
        }
    }
    
    // 3. Farklı klasör aynı ad (YAVAŞ - O(n))
    const sameNameMatch = musicDatabase.musicFiles.find(file => 
        path.basename(file.path) === fileName
    );
    if (sameNameMatch) {
        return {
            originalPath: searchPath,
            found: true,
            status: 'exact_match',
            matchType: 'farkliKlasorveUzanti',
            foundPath: sameNameMatch.path,
            similarity: 0.8,
            processTime: Date.now() - startTime
        };
    }
    
    // 4. Benzerlik araması
    const searchWords = extractImprovedWords(fileName, searchPath);
    if (!searchWords || !searchWords.all_words || searchWords.all_words.length === 0) {
        return {
            originalPath: searchPath,
            found: false,
            status: 'no_search_words',
            processTime: Date.now() - startTime
        };
    }
    
    const candidates = [];
    const limit = options.limit || 1;
    const threshold = options.threshold || 0.1; // İyileştirilmiş threshold - 0.3'ten 0.1'e düşürüldü
    
    console.log(`🔍 TOPLAM DOSYA SAYISI: ${musicDatabase.musicFiles.length}`);
    let processedCount = 0;
    
    // Debug kodları kaldırıldı - API response'ta zaten var
    
    for (const file of musicDatabase.musicFiles) {
        // TÜM DOSYALAR İÇİN DEBUG - FİLTRELEME YOK
        processedCount++;
        
        // Her 1000 dosyada bir log
        if (processedCount % 1000 === 0) {
            console.log(`📊 İşlenen dosya sayısı: ${processedCount}`);
        }
        
        // Özel debug kodları kaldırıldı - performans optimizasyonu
        
        // FİLTRELEME KALDIRILDI - TÜM DOSYALAR İŞLENİR
        // Yeni DB formatında fileWords mutlaka var, sadece boş olabilir
        if (file.fileWords.length === 0) {
            continue;
        }
        
        // Yeni hibrit format - parantez kelimeleri dahil
        const targetWords = {
            'folder_words': file.folderWords,
            'file_words': file.fileWords,
            'parentheses_words': file.parenthesesWords, // YENİ: Parantez kelimeleri
            'all_words': [...file.folderWords, ...file.fileWords, ...file.parenthesesWords]
        };
        
        const algorithm = options.algorithm || 'v4';
        const searchFileWords = searchWords['file_words'];
        const targetFileWords = targetWords['file_words'];

        let similarity = 0;
        if (algorithm === 'v4') {
            similarity = calculateSimilarityV4(searchWords, targetWords);
        } else {
            similarity = calculateNewSimilarity(searchWords, targetWords);
        }
        
        // Yeni algoritma için sadeleştirilmiş debug verileri
        let newAlgorithmDebug = null;
        if (similarity > 0) {
            if (algorithm === 'v4') {
                const tokenStats = weightedTokenOverlap(searchFileWords, targetFileWords);
                const ordScore = orderSimilarity(searchFileWords, targetFileWords);
                const lcsScore = lcsLengthTokens(searchFileWords, targetFileWords) / Math.max(1, searchFileWords.length);
                const parScore = computeParenthesesScore(searchWords['parentheses_words'], targetWords['parentheses_words']);
                const folderBoost = computeFolderBoost(searchWords['folder_words'], targetWords['folder_words']);
                const lengthPenalty = computeLengthPenalty(searchFileWords, targetFileWords);
                newAlgorithmDebug = {
                    algorithm: 'similarity_v4',
                    overlapScore: tokenStats.overlapScore,
                    exactScore: tokenStats.exactScore,
                    orderScore: ordScore,
                    lcsScore: lcsScore,
                    parenthesesScore: parScore,
                    folderBoost: folderBoost,
                    lengthPenalty: lengthPenalty,
                    finalScore: similarity,
                    thresholdPassed: similarity >= threshold
                };
            } else {
                const exactScore = calculateExactMatch(searchWords, targetWords);
                const fuzzyScore = calculateFuzzyMatch(searchWords, targetWords);
                const contextScore = calculateContextMatch(searchWords, targetWords);
                const specialScore = calculateSpecialMatches(searchWords, targetWords);
                
                // Parantez skoru hesapla
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

                newAlgorithmDebug = {
                    exactScore: exactScore,
                    fuzzyScore: fuzzyScore,
                    contextScore: contextScore,
                    specialScore: specialScore,
                    parenthesesScore: parenthesesScore,
                    finalScore: similarity,
                    algorithm: 'new_similarity_v3_hybrid',
                    thresholdPassed: similarity >= threshold
                };
            }
        }
        
        // Sadeleştirilmiş debug bilgileri - eski karmaşık kodlar temizlendi
        
        // Yeni algoritma için sadeleştirilmiş debug bilgileri
        const matchDetails = {
            filePath: file.path,
            searchWords: searchWords,
            targetWords: targetWords,
            similarity: similarity,
            algorithm: algorithm,
            newAlgorithmDebug: newAlgorithmDebug
        };
        
        if (similarity > threshold) {
            candidates.push({
                path: file.path,
                similarity: similarity,
                file: file,
                matchDetails: matchDetails
            });
        }
    }
    
    if (candidates.length > 0) {
        // GELİŞTİRİLMİŞ SIRALAMA ALGORİTMASI - ORİJİNAL ÖNCE
        candidates.sort((a, b) => {
            // 1. Remix/parantez kontrolü
            const aHasParentheses = a.file.name.includes('(') && a.file.name.includes(')');
            const bHasParentheses = b.file.name.includes('(') && b.file.name.includes(')');
            const aIsRemix = a.file.name.toLowerCase().includes('remix');
            const bIsRemix = b.file.name.toLowerCase().includes('remix');
            
            // Remix veya parantez içeren dosyalar son sırada (arama remix değilse)
            const searchHasRemix = searchWords.file_words.some(w => w.toLowerCase().includes('remix'));
            if (!searchHasRemix) {
                if ((aIsRemix || aHasParentheses) && !(bIsRemix || bHasParentheses)) {
                    return 1; // a remix/parantezli, b temiz -> b önce
                }
                if (!(aIsRemix || aHasParentheses) && (bIsRemix || bHasParentheses)) {
                    return -1; // a temiz, b remix/parantezli -> a önce  
                }
            }
            
            // 2. Benzerlik skoruna göre sırala
            if (Math.abs(a.similarity - b.similarity) > 0.001) {
                return b.similarity - a.similarity;
            }
            
            // 3. Dosya adı uzunluğuna göre (daha kısa = daha spesifik)
            const aLength = a.file.fileNameOnly.length;
            const bLength = b.file.fileNameOnly.length;
            if (Math.abs(aLength - bLength) > 5) {
                return aLength - bLength;
            }
            
            // 4. Exact match sayısına göre
            const aExact = a.matchDetails.newAlgorithmDebug?.exactScore || 0;
            const bExact = b.matchDetails.newAlgorithmDebug?.exactScore || 0;
            return bExact - aExact;
        });
        
        const bestMatch = candidates[0];
        
        // Limit kadar sonuç al
        const matches = candidates.slice(0, limit).map(candidate => ({
            path: candidate.path,
            similarity: candidate.similarity,
            matchDetails: candidate.matchDetails
        }));
        
        return {
            originalPath: searchPath,
            found: true,
            status: 'similar_found',
            matchType: 'benzerDosya',
            foundPath: bestMatch.path,
            similarity: bestMatch.similarity,
            processTime: Date.now() - startTime,
            matches: matches,
            debugInfo: {
                bestMatch: bestMatch,
                totalCandidates: candidates.length,
                searchWords: searchWords,
                matchDetails: bestMatch.matchDetails
            }
        }
    }
    
    return {
        originalPath: searchPath,
        found: false,
        status: 'not_found',
        processTime: Date.now() - startTime
    };
}

// Veritabanı yükleme
async function searchByQuery(query, options = {}) {
    const startTime = Date.now();

    // Cache kontrolü
    if (!musicDatabase || !databaseLoadTime || (Date.now() - databaseLoadTime) > DATABASE_CACHE_DURATION) {
        await loadDatabase();
    }

    if (!musicDatabase) {
        return {
            query,
            found: false,
            status: 'database_error',
            processTime: Date.now() - startTime
        };
    }

    if (typeof query !== 'string' || query.trim().length === 0) {
        return {
            query,
            found: false,
            status: 'invalid_query',
            processTime: Date.now() - startTime
        };
    }

    const algorithm = options.algorithm || 'v4';
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.1;

    const searchWords = extractImprovedWords(query, "");
    if (!searchWords || !searchWords.all_words || searchWords.all_words.length === 0) {
        return {
            query,
            found: false,
            status: 'no_search_words',
            processTime: Date.now() - startTime
        };
    }

    const candidates = [];
    let processedCount = 0;

    for (const file of musicDatabase.musicFiles) {
        processedCount++;
        if (!file || !file.fileWords || file.fileWords.length === 0) continue;

        const targetWords = {
            'folder_words': file.folderWords || [],
            'file_words': file.fileWords || [],
            'parentheses_words': file.parenthesesWords || [],
            'all_words': [ ...(file.folderWords || []), ...(file.fileWords || []), ...(file.parenthesesWords || []) ]
        };

        const searchFileWords = searchWords['file_words'] || [];
        const targetFileWords = targetWords['file_words'] || [];

        let similarity = 0;
        if (algorithm === 'v4') {
            similarity = calculateSimilarityV4(searchWords, targetWords);
        } else {
            similarity = calculateNewSimilarity(searchWords, targetWords);
        }

        let newAlgorithmDebug = null;
        if (similarity > 0) {
            if (algorithm === 'v4') {
                const tokenStats = weightedTokenOverlap(searchFileWords, targetFileWords);
                const ordScore = orderSimilarity(searchFileWords, targetFileWords);
                const lcsScore = lcsLengthTokens(searchFileWords, targetFileWords) / Math.max(1, searchFileWords.length);
                const parScore = computeParenthesesScore(searchWords['parentheses_words'], targetWords['parentheses_words']);
                const folderBoost = computeFolderBoost(searchWords['folder_words'], targetWords['folder_words']);
                const lengthPenalty = computeLengthPenalty(searchFileWords, targetFileWords);
                newAlgorithmDebug = {
                    algorithm: 'similarity_v4',
                    overlapScore: tokenStats.overlapScore,
                    exactScore: tokenStats.exactScore,
                    orderScore: ordScore,
                    lcsScore: lcsScore,
                    parenthesesScore: parScore,
                    folderBoost: folderBoost,
                    lengthPenalty: lengthPenalty,
                    finalScore: similarity,
                    thresholdPassed: similarity >= threshold
                };
            } else {
                const exactScore = calculateExactMatch(searchWords, targetWords);
                const fuzzyScore = calculateFuzzyMatch(searchWords, targetWords);
                const contextScore = calculateContextMatch(searchWords, targetWords);
                const specialScore = calculateSpecialMatches(searchWords, targetWords);

                let parenthesesScore = 0.0;
                const searchParentheses = searchWords['parentheses_words'] || [];
                const targetParentheses = targetWords['parentheses_words'] || [];
                if (searchParentheses.length > 0 && targetParentheses.length > 0) {
                    let parenthesesMatches = 0;
                    for (const searchWord of searchParentheses) {
                        if (targetParentheses.includes(searchWord)) {
                            parenthesesMatches++;
                        }
                    }
                    parenthesesScore = parenthesesMatches / searchParentheses.length;
                }

                newAlgorithmDebug = {
                    exactScore: exactScore,
                    fuzzyScore: fuzzyScore,
                    contextScore: contextScore,
                    specialScore: specialScore,
                    parenthesesScore: parenthesesScore,
                    finalScore: similarity,
                    algorithm: 'new_similarity_v3_hybrid',
                    thresholdPassed: similarity >= threshold
                };
            }
        }

        const matchDetails = {
            filePath: file.path,
            searchWords: searchWords,
            targetWords: targetWords,
            similarity: similarity,
            algorithm: algorithm,
            newAlgorithmDebug: newAlgorithmDebug
        };

        if (similarity > threshold) {
            candidates.push({
                path: file.path,
                similarity: similarity,
                file: file,
                matchDetails: matchDetails
            });
        }
    }

    candidates.sort((a, b) => b.similarity - a.similarity);
    const matches = candidates.slice(0, limit);

    return {
        query,
        found: matches.length > 0,
        status: matches.length > 0 ? 'matches_found' : 'no_match',
        matches: matches,
        processTime: Date.now() - startTime,
        totalProcessed: processedCount
    };
}

let musicDatabase = null;
let databaseLoadTime = null;
const DATABASE_CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

async function loadDatabase() {
    try {
        const dbPath = path.join(__dirname, '../musicfiles.db.json');
        
        // Dosya varlığını kontrol et
        if (!await fs.pathExists(dbPath)) {
            console.error('❌ Veritabanı dosyası bulunamadı:', dbPath);
            return false;
        }
        
        // Dosya boyutunu kontrol et
        const stats = await fs.stat(dbPath);
        if (stats.size === 0) {
            console.error('❌ Veritabanı dosyası boş:', dbPath);
            return false;
        }
        
        // Güvenli okuma
        const dbData = await fs.readJson(dbPath);
        
        if (!dbData || !dbData.musicFiles) {
            console.error('❌ Geçersiz veritabanı formatı');
            return false;
        }
        
        musicDatabase = dbData;
        databaseLoadTime = Date.now();
        console.log(`✅ Veritabanı yüklendi: ${musicDatabase.musicFiles.length} dosya`);                                                                        
        return true;
    } catch (error) {
        console.error('❌ Veritabanı yükleme hatası:', error);
        console.error('❌ Hata detayları:', {
            code: error.code,
            errno: error.errno,
            syscall: error.syscall,
            path: error.path
        });
        return false;
    }
}

const app = express();
const PORT = process.env.PORT || 50001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/search/files', async (req, res) => {
    try {
        const { paths, options = {} } = req.body;
        
        if (!Array.isArray(paths)) {
            return res.status(400).json({
                status: 'error',
                message: 'paths parametresi dizi olmalı'
            });
        }
        
        const startTime = Date.now();
        const results = [];
        const matchDetails = {
            tamYolEsleme: { count: 0, time: 0 },
            ayniKlasorFarkliUzanti: { count: 0, time: 0 },
            farkliKlasorveUzanti: { count: 0, time: 0 },
            benzerDosya: { count: 0, time: 0 }
        };
        
        for (const searchPath of paths) {
            const result = await searchFile(searchPath, options);
            results.push(result);
            
            if (result.found && result.matchType) {
                matchDetails[result.matchType].count++;
                matchDetails[result.matchType].time += result.processTime;
            }
        }
        
        const executionTime = Date.now() - startTime;
        
        // Sadeleştirilmiş istatistikler - duplikasyon kaldırıldı
        const processStats = {
            totalFilesProcessed: musicDatabase ? musicDatabase.musicFiles.length : 0,
            timestamp: new Date().toISOString()
        };
        
        res.json({
            status: 'success',
            data: results,
            stats: {
                totalProcessed: paths.length,
                executionTime: executionTime,
                averageProcessTime: Math.round(executionTime / paths.length),
                matchDetails: matchDetails
            },
            processStats: processStats  // Sadeleştirilmiş - duplikasyon yok
        });
        
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Arama sırasında hata oluştu',
            error: error.message,
            details: error.stack
        });
    }
});

// Yeni: Sorgu tabanlı arama endpointi
app.post('/api/search/query', async (req, res) => {
    try {
        const { query, options = {} } = req.body;
        if (typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({ status: 'error', message: 'query parametresi zorunlu ve string olmalı' });
        }

        const startTime = Date.now();
        const result = await searchByQuery(query, options);
        const executionTime = Date.now() - startTime;

        res.json({
            status: 'success',
            data: result,
            stats: {
                totalProcessed: 1,
                executionTime,
                averageProcessTime: executionTime
            }
        });
    } catch (error) {
        console.error('Query search error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Sorgu araması sırasında hata oluştu',
            error: error.message,
            details: error.stack
        });
    }
});

// Global missing files endpoint
app.get('/api/playlistsong/global-missing', async (req, res) => {
    try {
        // Python'daki gibi iki ayrı klasör kullan
        const settingsPath = path.join(__dirname, '..', 'py', 'settings.json');
        let virtualdjRoot = '/Users/koray/Library/Application Support/VirtualDJ';
        
        if (await fs.pathExists(settingsPath)) {
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            if (settings.virtualdj_root) {
                virtualdjRoot = settings.virtualdj_root;
            }
        }
        
        const playlistsFolders = path.join(virtualdjRoot, 'Folders');
        const playlistsMyLists = path.join(virtualdjRoot, 'MyLists');
        
        // Python'daki gibi os.walk benzeri recursive tarama
        async function getAllPlaylists(dirPath) {
            const playlists = [];
            try {
                const items = await fs.readdir(dirPath);
                for (const item of items) {
                    const fullPath = path.join(dirPath, item);
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.isDirectory()) {
                        // Alt klasörleri recursive olarak tara
                        const subPlaylists = await getAllPlaylists(fullPath);
                        playlists.push(...subPlaylists);
                    } else if (item.endsWith('.vdjfolder')) {
                        playlists.push(fullPath);
                    }
                }
            } catch (error) {
                console.error(`Klasör okunamadı: ${dirPath}`, error.message);
            }
            return playlists;
        }
        
        let allPlaylists = [];
        
        // Folders klasöründeki playlist'leri tara - PARALEL
        const folderPromises = [];
        if (await fs.pathExists(playlistsFolders)) {
            folderPromises.push(getAllPlaylists(playlistsFolders));
        }
        
        // MyLists klasöründeki playlist'leri tara - PARALEL
        if (await fs.pathExists(playlistsMyLists)) {
            folderPromises.push(getAllPlaylists(playlistsMyLists));
        }
        
        // Tüm klasörleri paralel olarak tara
        const results = await Promise.all(folderPromises);
        for (const result of results) {
            allPlaylists.push(...result);
        }
        
        console.log(`Toplam ${allPlaylists.length} playlist bulundu`);
        
        const allMissingFiles = [];
        const missingFilePaths = new Set();
        
        // XML parser'ı bir kez oluştur - PERFORMANS OPTİMİZASYONU
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser();
        
        let virtualFolderCount = 0;
        
        for (const playlistPath of allPlaylists) {
            try {
                const stats = await fs.stat(playlistPath);
                if (stats.size < 1000) continue; // 1KB'dan küçükse atla
                
                const content = await fs.readFile(playlistPath, 'utf8');
                
                // VirtualFolder içermiyorsa atla - PERFORMANS OPTİMİZASYONU
                if (!content.includes('<VirtualFolder') || !content.includes('<song')) {
                    continue;
                }
                
                virtualFolderCount++;
                
                const result = await parser.parseStringPromise(content);
                
                const playlistName = path.basename(playlistPath, '.vdjfolder');
                let songs = [];
                
                // VirtualFolder yapısını kontrol et - PYTHON GİBİ SADELEŞTİRİLMİŞ
                if (result.VirtualFolder && result.VirtualFolder.song) {
                    songs = Array.isArray(result.VirtualFolder.song) 
                        ? result.VirtualFolder.song 
                        : [result.VirtualFolder.song];
                } else {
                    // Python gibi - FavoriteFolder'ı atla (çok yavaş)
                    continue;
                }
                
                for (const song of songs) {
                    const filePath = song.$.path;
                    if (filePath && !(await fs.pathExists(filePath))) {
                        if (!missingFilePaths.has(filePath)) {
                            missingFilePaths.add(filePath);
                            
                            // Sadece dosya yoksa ekle - benzerlik araması yapma
                            allMissingFiles.push({
                                originalPath: filePath,
                                playlistName: playlistName,
                                playlistPath: playlistPath,
                                artist: song.$.artist || 'Bilinmeyen',
                                title: song.$.title || 'Bilinmeyen',
                                isFileExists: false,
                                found: false,
                                foundPath: null,
                                similarity: 0,
                                matchType: 'missing'
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Playlist okuma hatası ${playlistPath}:`, error);
            }
        }
        
        res.json({
            success: true,
            total_missing_files: allMissingFiles.length,
            unique_missing_files: allMissingFiles.length,
            playlists_checked: allPlaylists.length,
            missing_files: allMissingFiles
        });
        
    } catch (error) {
        console.error('Global missing files error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Eksik dosyalar alınırken hata oluştu',
            error: error.message
        });
    }
});

// Playlist listesi endpoint'i
app.get('/api/playlists/list', async (req, res) => {
    try {
        // Python'daki gibi iki ayrı klasör kullan
        const settingsPath = path.join(__dirname, '..', 'py', 'settings.json');
        let virtualdjRoot = '/Users/koray/Library/Application Support/VirtualDJ';
        
        if (await fs.pathExists(settingsPath)) {
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            if (settings.virtualdj_root) {
                virtualdjRoot = settings.virtualdj_root;
            }
        }
        
        // Python'daki gibi iki ayrı klasör
        const playlistsFolders = path.join(virtualdjRoot, 'Folders');
        const playlistsMyLists = path.join(virtualdjRoot, 'MyLists');
        
        // Python'daki build_playlist_tree fonksiyonunu implement et
        async function buildPlaylistTree(dirPath, isMyLists = false) {
            try {
                const items = await fs.readdir(dirPath);
                const result = [];
                
                // Gizli dosyaları filtrele
                const visibleItems = items.filter(item => !item.startsWith('.'));
                
                // Klasörleri ve playlist dosyalarını ayır
                const folders = [];
                const files = [];
                
                for (const item of visibleItems) {
                    const fullPath = path.join(dirPath, item);
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.isDirectory() || item.endsWith('.subfolders')) {
                        folders.push({ name: item, path: fullPath, isDir: stat.isDirectory() });
                    } else if (item.endsWith('.vdjfolder')) {
                        files.push({ name: item, path: fullPath });
                    }
                }
                
                // Klasörleri işle
                for (const folder of folders) {
                    if (folder.name === 'My Library.subfolders') {
                        continue; // Python'daki gibi atla
                    }
                    
                    const isSubfolder = folder.name.endsWith('.subfolders');
                    
                    if (isSubfolder || isMyLists) {
                        const children = await buildPlaylistTree(folder.path, isMyLists);
                        if (children.length > 0) {
                            result.push({
                                id: Buffer.from(folder.path).toString('hex'),
                                name: folder.name.replace('.subfolders', ''),
                                path: folder.path,
                                type: 'folder',
                                children: children
                            });
                        }
                    }
                }
                
                // Playlist dosyalarını işle
                for (const file of files) {
                    try {
                        const content = await fs.readFile(file.path, 'utf8');
                        if (!content.trim()) {
                            console.log(`Boş playlist dosyası: ${file.path}`);
                            continue;
                        }
                        
                        // XML parsing ile şarkı sayısını hesapla
                        const xml2js = require('xml2js');
                        const parser = new xml2js.Parser();
                        const result_xml = await parser.parseStringPromise(content);
                        
                        let songCount = 0;
                        if (result_xml && result_xml.VirtualFolder && result_xml.VirtualFolder.song) {
                            const songs = result_xml.VirtualFolder.song;
                            songCount = Array.isArray(songs) ? songs.length : 1;
                        }
                        
                        result.push({
                            id: Buffer.from(file.path).toString('hex'),
                            name: file.name.replace('.vdjfolder', ''),
                            path: file.path,
                            type: 'playlist',
                            songCount: songCount
                        });
                    } catch (error) {
                        console.error(`Playlist dosyası okunamadı: ${file.path}`, error.message);
                    }
                }
                
                // GELİŞTİRİLMİŞ SIRALAMA: Özel klasörler önce, sonra alfabetik
                return result.sort((a, b) => {
                    // 1. Tip sıralaması (klasör önce)
                    const aType = a.type === 'folder' ? 0 : 1;
                    const bType = b.type === 'folder' ? 0 : 1;
                    if (aType !== bType) return aType - bType;
                    
                    // 2. Özel klasör önceliği
                    if (a.type === 'folder' && b.type === 'folder') {
                        const aName = a.name.toLowerCase();
                        const bName = b.name.toLowerCase();
                        
                        // Özel klasör öncelik sırası
                        const specialFolders = [
                            'mylists',      // MyLists en üstte
                            'serato',       // Serato ikinci
                            'my library',   // My Library üçüncü
                            'favorites',    // Favorites dördüncü
                            'history'       // History beşinci
                        ];
                        
                        const aSpecial = specialFolders.findIndex(special => aName.includes(special));
                        const bSpecial = specialFolders.findIndex(special => bName.includes(special));
                        
                        // Her ikisi de özel klasörse
                        if (aSpecial !== -1 && bSpecial !== -1) {
                            return aSpecial - bSpecial;
                        }
                        // Sadece a özel klasörse
                        if (aSpecial !== -1 && bSpecial === -1) {
                            return -1;
                        }
                        // Sadece b özel klasörse  
                        if (aSpecial === -1 && bSpecial !== -1) {
                            return 1;
                        }
                    }
                    
                    // 3. Alfabetik sıralama
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });
            } catch (error) {
                console.error(`Klasör okunamadı: ${dirPath}`, error.message);
                return [];
            }
        }
        
        // Her iki klasörden de playlist'leri al
        const foldersTree = await buildPlaylistTree(playlistsFolders);
        const mylistsTree = await buildPlaylistTree(playlistsMyLists, true);
        
        // İki ağacı birleştir
        const combinedTree = [];
        
        // Folders klasörü varsa ekle
        if (await fs.pathExists(playlistsFolders) && foldersTree.length > 0) {
            combinedTree.push({
                id: Buffer.from(playlistsFolders).toString('hex'),
                name: 'Folders',
                path: playlistsFolders,
                type: 'folder',
                children: foldersTree
            });
        }
        
        // MyLists klasörü varsa ekle
        if (await fs.pathExists(playlistsMyLists) && mylistsTree.length > 0) {
            combinedTree.push({
                id: Buffer.from(playlistsMyLists).toString('hex'),
                name: 'MyLists',
                path: playlistsMyLists,
                type: 'folder',
                children: mylistsTree
            });
        }
        
        // İstatistikleri hesapla (Python'daki gibi recursive)
        function countNodes(tree) {
            let total = 0;
            for (const item of tree) {
                total++;
                if (item.children) {
                    total += countNodes(item.children);
                }
            }
            return total;
        }
        
        function countByType(tree, type) {
            let count = 0;
            for (const item of tree) {
                if (item.type === type) {
                    count++;
                }
                if (item.children) {
                    count += countByType(item.children, type);
                }
            }
            return count;
        }
        
        const stats = {
            totalNodes: countNodes(combinedTree),
            folders: countByType(combinedTree, 'folder'),
            playlists: countByType(combinedTree, 'playlist')
        };
        
        res.json({
            success: true,
            data: combinedTree,
            stats: stats
        });
        
    } catch (error) {
        console.error('Playlist list error:', error);
        res.status(500).json({
            success: false,
            message: 'Playlist listesi alınırken hata oluştu',
            error: error.message
        });
    }
});

// Port bilgisi endpoint'i
app.get('/api/port', (req, res) => {
    res.json({
        status: 'ok',
        port: PORT,
        host: 'localhost',
        apiUrl: `http://localhost:${PORT}/api`
    });
});

// Test endpoint'i
app.get('/api/test', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Settings endpoints
app.get('/api/settings', async (req, res) => {
    try {
        const settingsPath = path.join(__dirname, '..', 'py', 'settings.json');
        
        if (await fs.pathExists(settingsPath)) {
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            res.json(settings);
        } else {
            // Varsayılan ayarları döndür
            const defaultSettings = {
                music_folder: '/Users/koray/Music',
                virtualdj_root: '/Users/koray/Library/Application Support/VirtualDJ',
                last_updated: null
            };
            res.json(defaultSettings);
        }
    } catch (error) {
        console.error('Settings get error:', error);
        res.status(500).json({
            success: false,
            message: 'Ayarlar yüklenirken hata oluştu',
            error: error.message
        });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const settingsPath = path.join(__dirname, '..', 'py', 'settings.json');
        const settings = req.body;
        
        // Ayarları dosyaya kaydet
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
        
        res.json({
            success: true,
            message: 'Ayarlar başarıyla kaydedildi'
        });
    } catch (error) {
        console.error('Settings save error:', error);
        res.status(500).json({
            success: false,
            message: 'Ayarlar kaydedilirken hata oluştu',
            error: error.message
        });
    }
});

// Playlist güncelleme endpoint'leri
app.post('/api/playlistsong/update', async (req, res) => {
    try {
        const { playlistPath, items } = req.body;
        
        if (!playlistPath || !items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                error: 'playlistPath ve items gerekli'
            });
        }
        
        // Playlist dosyasını oku
        const content = await fs.readFile(playlistPath, 'utf8');
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(content);
        
        if (!result.VirtualFolder || !result.VirtualFolder.song) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz playlist formatı'
            });
        }
        
        let songs = result.VirtualFolder.song;
        if (!Array.isArray(songs)) {
            songs = [songs];
        }
        
        let updatedCount = 0;
        for (const item of items) {
            const { oldPath, newPath } = item;
            for (const song of songs) {
                if (song.$ && song.$.path === oldPath) {
                    song.$.path = newPath;
                    updatedCount++;
                }
            }
        }
        
        if (updatedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Hiçbir şarkı güncellenemedi',
                details: { items: items }
            });
        }
        
        // XML'i geri yaz
        const builder = new xml2js.Builder();
        const xml = builder.buildObject(result);
        await fs.writeFile(playlistPath, xml);
        
        res.json({
            success: true,
            message: `${updatedCount} şarkı bu playlist'te güncellendi`
        });
    } catch (error) {
        console.error('Playlist update error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

app.post('/api/playlistsong/global-update', async (req, res) => {
    try {
        console.log('Global update request body:', JSON.stringify(req.body, null, 2));
        const { items, updateAllPlaylists = true } = req.body;
        
        if (!items || !Array.isArray(items)) {
            console.log('Invalid items:', items);
            return res.status(400).json({
                success: false,
                error: 'Güncellenecek öğe bulunamadı'
            });
        }
        
        // Python'daki gibi iki ayrı klasör kullan
        const settingsPath = path.join(__dirname, '..', 'py', 'settings.json');
        let virtualdjRoot = '/Users/koray/Library/Application Support/VirtualDJ';
        
        if (await fs.pathExists(settingsPath)) {
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            if (settings.virtualdj_root) {
                virtualdjRoot = settings.virtualdj_root;
            }
        }
        
        const playlistsFolders = path.join(virtualdjRoot, 'Folders');
        const playlistsMyLists = path.join(virtualdjRoot, 'MyLists');
        
        // Python'daki gibi os.walk benzeri recursive tarama
        async function getAllPlaylists(dirPath) {
            const playlists = [];
            try {
                const items = await fs.readdir(dirPath);
                for (const item of items) {
                    const fullPath = path.join(dirPath, item);
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.isDirectory()) {
                        // Alt klasörleri recursive olarak tara
                        const subPlaylists = await getAllPlaylists(fullPath);
                        playlists.push(...subPlaylists);
                    } else if (item.endsWith('.vdjfolder')) {
                        playlists.push(fullPath);
                    }
                }
            } catch (error) {
                console.error(`Klasör okunamadı: ${dirPath}`, error.message);
            }
            return playlists;
        }
        
        let allPlaylists = [];
        
        // Folders klasöründeki playlist'leri tara
        if (await fs.pathExists(playlistsFolders)) {
            const foldersPlaylists = await getAllPlaylists(playlistsFolders);
            allPlaylists.push(...foldersPlaylists);
        }
        
        // MyLists klasöründeki playlist'leri tara
        if (await fs.pathExists(playlistsMyLists)) {
            const mylistsPlaylists = await getAllPlaylists(playlistsMyLists);
            allPlaylists.push(...mylistsPlaylists);
        }
        
        let totalUpdated = 0;
        let totalPlaylistsUpdated = 0;
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser();
        const builder = new xml2js.Builder();
        
        for (const playlistPath of allPlaylists) {
            try {
                const content = await fs.readFile(playlistPath, 'utf8');
                const result = await parser.parseStringPromise(content);
                
                if (!result.VirtualFolder || !result.VirtualFolder.song) continue;
                
                let songs = result.VirtualFolder.song;
                if (!Array.isArray(songs)) {
                    songs = [songs];
                }
                
                let playlistUpdated = false;
                for (const song of songs) {
                    for (const item of items) {
                        if (song.$ && song.$.path === item.oldPath) {
                            song.$.path = item.newPath;
                            playlistUpdated = true;
                            totalUpdated++;
                        }
                    }
                }
                
                if (playlistUpdated) {
                    const xml = builder.buildObject(result);
                    await fs.writeFile(playlistPath, xml);
                    totalPlaylistsUpdated++;
                }
            } catch (error) {
                console.error(`Playlist ${playlistPath} güncellenirken hata:`, error);
            }
        }
        
        res.json({
            success: true,
            message: `${totalUpdated} şarkı ${totalPlaylistsUpdated} playlist'te güncellendi`,
            totalUpdated,
            totalPlaylistsUpdated
        });
    } catch (error) {
        console.error('Global playlist update error:', error);
        res.status(500).json({
            success: false,
            message: 'Global playlist güncellenirken hata oluştu',
            error: error.message
        });
    }
});

// Playlist okuma endpoint'i
app.post('/api/playlistsongs/read', async (req, res) => {
    try {
        const { playlistPath } = req.body;
        
        if (!playlistPath) {
            return res.status(400).json({
                success: false,
                error: 'playlistPath gerekli'
            });
        }
        
        if (!await fs.pathExists(playlistPath)) {
            return res.status(404).json({
                success: false,
                error: 'Playlist dosyası bulunamadı'
            });
        }
        
        const content = await fs.readFile(playlistPath, 'utf8');
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(content);
        
        // VirtualFolder yapısını kontrol et
        if (result.VirtualFolder && result.VirtualFolder.song) {
            // Normal VirtualFolder yapısı
        } else if (result.FavoriteFolder && result.FavoriteFolder.$.path) {
            // FavoriteFolder yapısı - VirtualDJ gibi recursive tarama yap
            const folderPath = result.FavoriteFolder.$.path;
            console.log(`FavoriteFolder detected, recursively scanning path: ${folderPath}`);
            
            try {
                // Recursive dosya tarama fonksiyonu
                async function scanDirectoryRecursively(dirPath) {
                    const allFiles = [];
                    
                    async function scanDir(currentPath) {
                        try {
                            const items = await fs.readdir(currentPath);
                            
                            for (const item of items) {
                                const fullPath = path.join(currentPath, item);
                                const stat = await fs.stat(fullPath);
                                
                                if (stat.isDirectory()) {
                                    // Alt klasörü recursive olarak tara
                                    await scanDir(fullPath);
                                } else if (stat.isFile()) {
                                    // Dosya uzantısını kontrol et
                                    const ext = path.extname(item).toLowerCase();
                                    const supportedExts = ['.mp3', '.wav', '.m4a', '.flac', '.mp4', '.avi', '.mkv', '.ogg', '.aac', '.wma'];
                                    
                                    if (supportedExts.includes(ext)) {
                                        allFiles.push(fullPath);
                                    }
                                }
                            }
                        } catch (error) {
                            console.warn(`Klasör taranamadı: ${currentPath}`, error.message);
                        }
                    }
                    
                    await scanDir(dirPath);
                    return allFiles;
                }
                
                const allMusicFiles = await scanDirectoryRecursively(folderPath);
                console.log(`Found ${allMusicFiles.length} music files in ${folderPath}`);
                
                const songList = await Promise.all(allMusicFiles.map(async (filePath, index) => {
                    const fileName = path.basename(filePath);
                    const parsedName = path.parse(fileName);
                    
                    // Dosya adından artist ve title çıkarmaya çalış
                    let artist = '';
                    let title = parsedName.name;
                    
                    // "Artist - Title" formatını kontrol et
                    const dashIndex = parsedName.name.indexOf(' - ');
                    if (dashIndex > 0) {
                        artist = parsedName.name.substring(0, dashIndex).trim();
                        title = parsedName.name.substring(dashIndex + 3).trim();
                    }
                    
                    return {
                        file: filePath,
                        name: fileName,
                        artist: artist,
                        title: title,
                        duration: '0:00',
                        isFileExists: await fs.pathExists(filePath)
                    };
                }));
                
                const stats = {
                    totalSongs: songList.length,
                    existingSongs: songList.filter(song => song.isFileExists).length,
                    missingSongs: songList.filter(song => !song.isFileExists).length
                };
                
                return res.json({
                    success: true,
                    songs: songList,
                    stats: stats
                });
            } catch (error) {
                console.error(`FavoriteFolder path okunamadı: ${folderPath}`, error.message);
                return res.json({
                    success: true,
                    songs: []
                });
            }
        } else {
            return res.json({
                success: true,
                songs: []
            });
        }
        
        let songs = result.VirtualFolder.song;
        if (!Array.isArray(songs)) {
            songs = [songs];
        }
        
        const songList = await Promise.all(songs.map(async song => {
            const filePath = song.$.path || '';
            return {
                file: filePath,
                name: song.$.name || (filePath ? path.basename(filePath) : ''),
                artist: song.$.artist || '',
                title: song.$.title || '',
                duration: song.$.duration || '0:00',
                isFileExists: filePath ? await fs.pathExists(filePath) : false
            };
        }));
        
        const stats = {
            totalSongs: songList.length,
            existingSongs: songList.filter(song => song.isFileExists).length,
            missingSongs: songList.filter(song => !song.isFileExists).length
        };
        
        res.json({
            success: true,
            songs: songList,
            stats: stats
        });
    } catch (error) {
        console.error('Playlist read error:', error);
        res.status(500).json({
            success: false,
            message: 'Playlist okunurken hata oluştu',
            error: error.message
        });
    }
});

// Playlist'ten kaldırma endpoint'i
app.post('/api/playlistsong/remove-from-all', async (req, res) => {
    try {
        const { songPath } = req.body;
        
        if (!songPath) {
            return res.status(400).json({
                success: false,
                error: 'songPath parametresi gerekli'
            });
        }
        
        // Python'daki gibi iki ayrı klasör kullan
        const settingsPath = path.join(__dirname, '..', 'py', 'settings.json');
        let virtualdjRoot = '/Users/koray/Library/Application Support/VirtualDJ';
        
        if (await fs.pathExists(settingsPath)) {
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            if (settings.virtualdj_root) {
                virtualdjRoot = settings.virtualdj_root;
            }
        }
        
        const playlistsFolders = path.join(virtualdjRoot, 'Folders');
        const playlistsMyLists = path.join(virtualdjRoot, 'MyLists');
        
        // Python'daki gibi os.walk benzeri recursive tarama
        async function getAllPlaylists(dirPath) {
            const playlists = [];
            try {
                const items = await fs.readdir(dirPath);
                for (const item of items) {
                    const fullPath = path.join(dirPath, item);
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.isDirectory()) {
                        // Alt klasörleri recursive olarak tara
                        const subPlaylists = await getAllPlaylists(fullPath);
                        playlists.push(...subPlaylists);
                    } else if (item.endsWith('.vdjfolder')) {
                        playlists.push(fullPath);
                    }
                }
            } catch (error) {
                console.error(`Klasör okunamadı: ${dirPath}`, error.message);
            }
            return playlists;
        }
        
        let allPlaylists = [];
        
        // Folders klasöründeki playlist'leri tara
        if (await fs.pathExists(playlistsFolders)) {
            const foldersPlaylists = await getAllPlaylists(playlistsFolders);
            allPlaylists.push(...foldersPlaylists);
        }
        
        // MyLists klasöründeki playlist'leri tara
        if (await fs.pathExists(playlistsMyLists)) {
            const mylistsPlaylists = await getAllPlaylists(playlistsMyLists);
            allPlaylists.push(...mylistsPlaylists);
        }
        
        let totalRemoved = 0;
        const removedFromPlaylists = [];
        let totalPlaylistsChecked = 0;
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser();
        const builder = new xml2js.Builder();
        
        // Path karşılaştırması için normalize et
        function normalizePath(path) {
            if (!path) return "";
            return path.normalize().toLowerCase().trim();
        }
        
        const targetPathNormalized = normalizePath(songPath);
        
        for (const playlistPath of allPlaylists) {
            try {
                totalPlaylistsChecked++;
                const content = await fs.readFile(playlistPath, 'utf8');
                const result = await parser.parseStringPromise(content);
                
                if (!result.VirtualFolder || !result.VirtualFolder.song) continue;
                
                let songs = result.VirtualFolder.song;
                if (!Array.isArray(songs)) {
                    songs = [songs];
                }
                
                const originalLength = songs.length;
                
                // Şarkıyı bul ve kaldır - song.$.path kullan
                songs = songs.filter(song => {
                    const songPathNormalized = normalizePath(song.$ && song.$.path);
                    return songPathNormalized !== targetPathNormalized;
                });
                
                if (songs.length < originalLength) {
                    const playlistName = path.basename(playlistPath, '.vdjfolder');
                    const removedCount = originalLength - songs.length;
                    
                    removedFromPlaylists.push({
                        playlistName: playlistName,
                        playlistPath: playlistPath,
                        removedCount: removedCount
                    });
                    
                    // XML'i güncelle
                    if (songs.length > 0) {
                        result.VirtualFolder.song = songs;
                    } else {
                        // Eğer hiç şarkı kalmadıysa, song elementini kaldır
                        delete result.VirtualFolder.song;
                    }
                    
                    const xml = builder.buildObject(result);
                    await fs.writeFile(playlistPath, xml);
                    totalRemoved += removedCount;
                }
            } catch (error) {
                console.error(`Playlist ${playlistPath} güncellenirken hata:`, error);
            }
        }
        
        res.json({
            success: true,
            songPath: songPath,
            removedFromPlaylists: removedFromPlaylists,
            totalPlaylistsChecked: totalPlaylistsChecked,
            totalRemovedCount: totalRemoved
        });
    } catch (error) {
        console.error('Remove from all playlists error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            songPath: req.body.songPath || "",
            removedFromPlaylists: [],
            totalPlaylistsChecked: 0,
            totalRemovedCount: 0
        });
    }
});

// İndeks oluşturma endpoint'i
app.post('/api/index/create', async (req, res) => {
    try {
        const { musicFolder, virtualdjFolder } = req.body;
        
        if (!musicFolder) {
            return res.status(400).json({
                success: false,
                error: 'musicFolder gerekli'
            });
        }
        
        console.log(`🔄 İndeksleme başlatılıyor: ${musicFolder}`);
        
        // MusicFileIndexer'ı import et ve kullan
        const MusicFileIndexer = require('./indexer');
        const indexer = new MusicFileIndexer();
        
        // İndeksleme işlemini başlat
        const result = await indexer.indexMusicFiles(musicFolder);
        
        if (result.success) {
            // Veritabanını yeniden yükle
            musicDatabase = null;
            await loadDatabase();
            
            console.log(`✅ İndeksleme tamamlandı: ${result.data.totalFiles} dosya`);
            
            res.json({
                success: true,
                message: 'İndeksleme başarıyla tamamlandı',
                data: result.data
            });
        } else {
            console.error(`❌ İndeksleme hatası: ${result.message}`);
            res.status(500).json({
                success: false,
                message: 'İndeks oluşturulurken hata oluştu',
                error: result.message,
                details: result.details
            });
        }
    } catch (error) {
        console.error('Index create error:', error);
        res.status(500).json({
            success: false,
            message: 'İndeks oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

// İndeks durumu endpoint'i
app.get('/api/index/status', async (req, res) => {
    try {
        const dbPath = path.join(__dirname, '../musicfiles.db.json');
        
        if (await fs.pathExists(dbPath)) {
            const stats = await fs.stat(dbPath);
            const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
            
            res.json({
                success: true,
                indexed: true,
                fileCount: dbData.musicFiles ? dbData.musicFiles.length : 0,
                lastModified: stats.mtime.toISOString(),
                databaseSize: stats.size
            });
        } else {
            res.json({
                success: true,
                indexed: false,
                fileCount: 0,
                lastModified: null,
                databaseSize: 0
            });
        }
    } catch (error) {
        console.error('Index status error:', error);
        res.status(500).json({
            success: false,
            message: 'İndeks durumu alınırken hata oluştu',
            error: error.message
        });
    }
});

// Dosya streaming endpoint'i
app.post('/api/stream', async (req, res) => {
    try {
        const { filePath } = req.body;
        
        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: 'filePath gerekli'
            });
        }
        
        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'Dosya bulunamadı'
            });
        }
        
        // Dosya streaming için basit bir response
        res.json({
            success: true,
            message: 'Dosya streaming hazır',
            filePath
        });
    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({
            success: false,
            message: 'Dosya streaming hatası',
            error: error.message
        });
    }
});

// Server başlatma
async function startServer() {
    try {
        logInfo('Server başlatılıyor...', 'STARTUP');
        
        // Veritabanını yükle
        const dbLoaded = await loadDatabase();
        if (!dbLoaded) {
            logError(new Error('Veritabanı yüklenemedi'), 'STARTUP');
            process.exit(1);
        }
        
        // Server'ı başlat
        const server = app.listen(PORT, () => {
            logInfo(`🚀 Node.js API server başlatıldı: http://localhost:${PORT}`, 'STARTUP');
            logInfo(`📊 Veritabanı: ${musicDatabase ? musicDatabase.musicFiles.length : 0} dosya`, 'STARTUP');
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logInfo('SIGTERM alındı, server kapatılıyor...', 'SHUTDOWN');
            server.close(() => {
                logInfo('Server kapatıldı', 'SHUTDOWN');
                process.exit(0);
            });
        });
        
        process.on('SIGINT', () => {
            logInfo('SIGINT alındı, server kapatılıyor...', 'SHUTDOWN');
            server.close(() => {
                logInfo('Server kapatıldı', 'SHUTDOWN');
                process.exit(0);
            });
        });
        
    } catch (error) {
        logError(error, 'STARTUP');
        process.exit(1);
    }
}

startServer();
