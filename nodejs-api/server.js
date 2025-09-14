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

// Karakter dönüşüm haritası (Python'daki CHAR_MAP ile aynı)
const CHAR_MAP = {
    // Latin Alfabesi Genişletilmiş
    "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
    "ç": "c", "ć": "c", "č": "c", "ď": "d", "è": "e", "é": "e", "ê": "e", "ë": "e",
    "ì": "i", "í": "i", "î": "i", "ï": "i", "ð": "d", "ñ": "n", "ò": "o", "ó": "o",
    "ô": "o", "õ": "o", "ö": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u", "ü": "u",
    "ý": "y", "þ": "th", "ÿ": "y", "ğ": "g", "ı": "i", "İ": "I", "ş": "s",
    "Š": "S", "ž": "z", "ß": "ss"
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
        // NFKC normalizasyonu ve CHAR_MAP dönüşümü
        normalized = normalized.normalize("NFKC");
        normalized = normalized.split('').map(c => CHAR_MAP[c.toLowerCase()] || c).join('');
    }

    if (!keepCase) {
        normalized = normalized.toLowerCase();
    }

    if (!keepSpecialChars) {
        normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
    }

    if (!keepSpaces) {
        normalized = normalized.replace(/\s+/g, '_');
    }

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

function extractNormalizedWords(fileName, filePath = "") {
    /**Dosya adını ve klasör yolunu kelimelere ayırıp normalize et*/
    const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
    const relevantFolders = pathParts.slice(-2);
    const fileNameParts = fileName.split("-").map(part => part.trim());
    const allParts = [...relevantFolders, ...fileNameParts];
    
    const words = allParts.join(" ").split(/\s+/);
    return words.filter(word => word.length > 1).map(word => normalizeText(word));
}

function calculateTwoStageSimilarity(words1, words2) {
    /**İki aşamalı benzerlik hesapla*/
    if (!words1 || !words2 || words1.length === 0 || words2.length === 0) {
        return 0.0;
    }

    // Tam kelime eşleşmesi
    const exactMatches = words1.filter(word => words2.includes(word)).length;
    const exactMatchScore = exactMatches / Math.max(words1.length, words2.length);

    // Kısmi kelime eşleşmesi
    const partialMatches = words1.filter(word => 
        words2.some(w => 
            (word.length > 3 && w.includes(word)) || 
            (w.length > 3 && word.includes(w))
        )
    ).length;
    const partialMatchScore = partialMatches / Math.max(words1.length, words2.length);

    return (exactMatchScore * 0.7) + (partialMatchScore * 0.3);
}

function extractImprovedWords(fileName, filePath = "") {
    /**Geliştirilmiş kelime çıkarma - klasör ve dosya adını ayırır - Sadeleştirilmiş versiyon*/
    const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
    
    // Sadece son 1 klasörü al
    const relevantFolders = pathParts.slice(-1);
    
    // Dosya adını normalize et
    const fileNameWithoutExt = path.parse(fileName).name;
    const fileNameParts = fileNameWithoutExt.split("-").map(part => part.trim());
    
    // Klasör kelimelerini normalize et
    const folderWords = [];
    for (const folder of relevantFolders) {
        folderWords.push(...normalizeText(folder, { keepSpaces: false }).split(/\s+/).filter(w => w.length > 1));
    }
    
    // Dosya adı kelimelerini normalize et - sanatçı/şarkı ayrımı yok
    const fileWords = [];
    for (const part of fileNameParts) {
        fileWords.push(...part.split(/\s+/).map(word => normalizeText(word, { keepSpaces: false })).filter(w => w.length > 1));
    }
    
    // Genel kelimeler (filtreleme için)
    const commonWords = new Set([
        'remix', 'mix', 'dj', 'feat', 'ft', 'music', 'song', 'mp3', 'm4a', 'flac', 'wmv',
        'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
        'official', 'video', 'hd', 'version', 'edit', 'extended', 'radio', 'clean',
        'original', 'acoustic', 'live', 'studio', 'album', 'single', 'ep', 'lp',
        've', 'ile', 'için', 'olan', 'gibi', 'kadar', 'sonra', 'önce',
        'müzik', 'şarkı', 'parça',
        // Video ve medya terimleri
        'mv', 'clip', 'trailer', 'teaser', 'preview', 'behind', 'scenes', 'making', 'of'
    ]);
    
    // Anlamlı kelimeler (genel kelimeler filtrelenmiş)
    const meaningfulWords = fileWords.filter(w => !commonWords.has(w));
    
    const result = {
        'folder_words': folderWords,
        'file_words': fileWords,
        'all_words': [...folderWords, ...fileWords],
        'meaningful_words': meaningfulWords
    };
    
    return result;
}

function calculateImprovedSimilarity(searchWords, targetWords) {
    /**SADELEŞTİRİLMİŞ BENZERLİK ALGORİTMASI - Sanatçı/şarkı ayrımı yok*/
    if (!searchWords['all_words'] || !targetWords['all_words'] || 
        searchWords['all_words'].length === 0 || targetWords['all_words'].length === 0) {
        return 0.0;
    }
    
    // Genel kelimeler (filtreleme için)
    const commonWords = new Set([
        'remix', 'mix', 'dj', 'feat', 'ft', 'music', 'song', 'mp3', 'm4a', 'flac', 'wmv',
        'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
        'official', 'video', 'hd', 'version', 'edit', 'extended', 'radio', 'clean',
        'original', 'acoustic', 'live', 'studio', 'album', 'single', 'ep', 'lp',
        've', 'ile', 'için', 'olan', 'gibi', 'kadar', 'sonra', 'önce',
        'müzik', 'şarkı', 'parça',
        // Video ve medya terimleri
        'mv', 'clip', 'trailer', 'teaser', 'preview', 'behind', 'scenes', 'making', 'of'
    ]);
    
    // 1. ANLAMLI KELİME EŞLEŞMESİ (Ana skor)
    const meaningfulSearch = searchWords['meaningful_words'] || [];
    const meaningfulTarget = targetWords['meaningful_words'] || [];
    
    // Eğer anlamlı kelime yoksa, düşük skor ver
    if (!meaningfulSearch || !meaningfulTarget || meaningfulSearch.length === 0 || meaningfulTarget.length === 0) {
        if (!searchWords['file_words'] || !targetWords['file_words'] || 
            searchWords['file_words'].length === 0 || targetWords['file_words'].length === 0) {
            return 0.0;
        }
        const exactMatches = searchWords['file_words'].filter(word => targetWords['file_words'].includes(word)).length;
        return (exactMatches / Math.max(searchWords['file_words'].length, targetWords['file_words'].length)) * 0.3;
    }
    
    // Anlamlı kelime eşleşmesi
    const exactMeaningfulMatches = meaningfulSearch.filter(word => meaningfulTarget.includes(word)).length;
    const meaningfulScore = exactMeaningfulMatches / Math.max(meaningfulSearch.length, meaningfulTarget.length);
    
    // En az 1 anlamlı kelime eşleşmeli
    if (exactMeaningfulMatches < 1) {
        return 0.0;
    }
    
    // 2. KELİME UZUNLUK BONUSU (Uzun kelimeler daha önemli)
    const longWordMatches = meaningfulSearch.filter(word => meaningfulTarget.includes(word) && word.length >= 4).length;
    const longWordBonus = longWordMatches / Math.max(meaningfulSearch.length, meaningfulTarget.length) * 0.2;
    
    // 3. TAM EŞLEŞME BONUSU
    let fullMatchBonus = 0.0;
    if (exactMeaningfulMatches >= 3) {
        fullMatchBonus = 0.15;
    }
    
    // 4. GENEL KELİME PENALTY
    let generalWordPenalty = 0.0;
    const generalMatches = searchWords['file_words'].filter(word => 
        targetWords['file_words'].includes(word) && commonWords.has(word)
    ).length;
    if (generalMatches > 0) {
        generalWordPenalty = Math.min(0.2, generalMatches * 0.05);
    }
    
    // Toplam skor hesapla
    const totalScore = meaningfulScore + longWordBonus + fullMatchBonus - generalWordPenalty;
    
    // 0.0 - 1.0 arasında sınırla
    return Math.max(0.0, Math.min(1.0, totalScore));
}

// Python'daki search_single_file fonksiyonunu Node.js'e aktar
async function searchFile(searchPath, options = {}) {
    const searchStartTime = Date.now();
    const searchFileName = path.basename(searchPath);
    const searchFileNameWithoutExt = path.parse(searchPath).name;
    const searchDir = path.dirname(searchPath);
    const normalizedSearchDir = normalizePath(searchDir);
    
    // Veritabanını yükle
    const dbPath = path.join(__dirname, '../musicfiles.db.json');
    let dbData = null;
    
    if (await fs.pathExists(dbPath)) {
        try {
            const dbContent = await fs.readFile(dbPath, 'utf8');
            dbData = JSON.parse(dbContent);
        } catch (error) {
            console.error('Veritabanı okuma hatası:', error.message);
        }
    }
    
    if (!dbData || !dbData.musicFiles) {
        const currentProcessTime = Date.now() - searchStartTime;
        return {
            originalPath: searchPath,
            found: false,
            status: "not_found",
            processTime: currentProcessTime
        };
    }
    
    // İndeksleri oluştur
    const pathIndex = new Map();
    const dirIndex = new Map();
    const nameIndex = new Map();
    const normalizedNameIndex = new Map();
    
    for (const file of dbData.musicFiles) {
        if (file.path) {
            pathIndex.set(file.path, file);
            
            const dir = path.dirname(file.path);
            const normalizedDir = normalizePath(dir);
            if (!dirIndex.has(normalizedDir)) {
                dirIndex.set(normalizedDir, []);
            }
            dirIndex.get(normalizedDir).push(file);
            
            const fileName = path.parse(file.path).name;
            const normalizedName = normalizeText(fileName);
            
            if (!nameIndex.has(fileName)) {
                nameIndex.set(fileName, []);
            }
            nameIndex.get(fileName).push(file);
            
            if (!normalizedNameIndex.has(normalizedName)) {
                normalizedNameIndex.set(normalizedName, []);
            }
            normalizedNameIndex.get(normalizedName).push(file);
        }
    }
    
    // 1. Tam yol eşleşme kontrolü
    if (pathIndex.has(searchPath)) {
        const currentProcessTime = Date.now() - searchStartTime;
        return {
            originalPath: searchPath,
            found: true,
            status: "exact_match",
            matchType: "tamYolEsleme",
            foundPath: searchPath,
            processTime: currentProcessTime
        };
    }
    
    // 2. Aynı klasörde farklı uzantı kontrolü
    if (dirIndex.has(normalizedSearchDir)) {
        const dirFiles = dirIndex.get(normalizedSearchDir);
        for (const file of dirFiles) {
            if (file.path) {
                const fileStem = path.parse(file.path).name;
                if (normalizeFileName(fileStem) === normalizeFileName(searchFileNameWithoutExt)) {
                    const currentProcessTime = Date.now() - searchStartTime;
                    return {
                        originalPath: searchPath,
                        found: true,
                        status: "exact_match",
                        matchType: "ayniKlasorFarkliUzanti",
                        foundPath: file.path,
                        processTime: currentProcessTime
                    };
                }
            }
        }
    }
    
    // 3. Farklı klasörde aynı ad kontrolü
    if (nameIndex.has(searchFileNameWithoutExt)) {
        const currentProcessTime = Date.now() - searchStartTime;
        const foundPath = nameIndex.get(searchFileNameWithoutExt)[0].path;
        return {
            originalPath: searchPath,
            found: true,
            status: "exact_match",
            matchType: "farkliKlasor",
            foundPath: foundPath,
            processTime: currentProcessTime
        };
    }
    
    // 4. Farklı klasörde farklı uzantı kontrolü
    const normalizedName = normalizeText(searchFileNameWithoutExt);
    if (normalizedNameIndex.has(normalizedName)) {
        const currentProcessTime = Date.now() - searchStartTime;
        const foundPath = normalizedNameIndex.get(normalizedName)[0].path;
        return {
            originalPath: searchPath,
            found: true,
            status: "exact_match",
            matchType: "farkliKlasorveUzanti",
            foundPath: foundPath,
            processTime: currentProcessTime
        };
    }
    
    // 5. Benzerlik bazlı arama
    const fuzzySearchEnabled = options.fuzzySearch !== false;
    if (!fuzzySearchEnabled) {
        const currentProcessTime = Date.now() - searchStartTime;
        return {
            originalPath: searchPath,
            found: false,
            status: "not_found",
            processTime: currentProcessTime
        };
    }
    
    try {
        const searchWords = extractImprovedWords(searchFileName, searchPath);
        
        if (!searchWords || !searchWords['all_words'] || searchWords['all_words'].length === 0) {
            const currentProcessTime = Date.now() - searchStartTime;
            return {
                originalPath: searchPath,
                found: false,
                status: "not_found",
                processTime: currentProcessTime
            };
        }
        
        const candidates = [];
        const threshold = options.threshold || 0.3;
        
        // Tüm dosyaları kontrol et - Python ile aynı mantık
        for (const file of dbData.musicFiles) {
            if (file.path && file.indexedWords) {
                // Veritabanındaki indexedWords'den kelime kategorilerini oluştur - Sadeleştirilmiş
                const targetWords = {
                    'folder_words': file.folderWords || [],
                    'file_words': file.fileWords || [],
                    'all_words': file.indexedWords || [],
                    'meaningful_words': file.meaningfulWords || []
                };
                
                const similarity = calculateImprovedSimilarity(searchWords, targetWords);
                
                if (similarity >= threshold) {
                    candidates.push({
                        file: file,
                        similarity: similarity,
                        target_words: targetWords
                    });
                }
            }
        }
        
        // En iyi eşleşmeyi bul
        if (candidates.length > 0) {
            candidates.sort((a, b) => b.similarity - a.similarity);
            const bestMatch = candidates[0];
            const currentProcessTime = Date.now() - searchStartTime;
            
            return {
                originalPath: searchPath,
                found: true,
                status: "similar_match",
                matchType: "benzerDosya",
                foundPath: bestMatch.file.path,
                similarity: bestMatch.similarity,
                processTime: currentProcessTime
            };
        }
        
        const currentProcessTime = Date.now() - searchStartTime;
        return {
            originalPath: searchPath,
            found: false,
            status: "not_found",
            processTime: currentProcessTime
        };
        
    } catch (error) {
        console.error(`Benzerlik arama hatası: ${searchPath}`, error.message);
        const currentProcessTime = Date.now() - searchStartTime;
        return {
            originalPath: searchPath,
            found: false,
            status: "error",
            error: error.message,
            processTime: currentProcessTime
        };
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


// Filtre kelimeleri
const COMMON_WORDS = new Set([
    'remix', 'mix', 'dj', 'feat', 'ft', 'music', 'song', 'mp3', 'm4a', 'flac', 'wmv',
    'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
    'official', 'video', 'hd', 'version', 'edit', 'extended', 'radio', 'clean',
    'original', 'acoustic', 'live', 'studio', 'album', 'single', 'ep', 'lp',
    've', 'ile', 'için', 'olan', 'gibi', 'kadar', 'sonra', 'önce',
    'müzik', 'şarkı', 'parça',
    // Video ve medya terimleri
    'mv', 'clip', 'trailer', 'teaser', 'preview', 'behind', 'scenes', 'making', 'of'
]);

// Metin normalizasyon fonksiyonları
function normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    let normalized = text;
    
    // Karakter dönüşümü
    normalized = normalized.split('').map(c => CHAR_MAP[c] || c).join('');
    
    // Küçük harfe çevir
    normalized = normalized.toLowerCase();
    
    // Özel karakterleri temizle
    normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
    
    // Çoklu boşlukları tek boşluğa çevir
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
}

function normalizeFileName(text) {
    return normalizeText(text);
}

function extractWords(text) {
    if (!text) return [];
    
    const normalized = normalizeText(text);
    const words = normalized.split(/\s+/).filter(word => 
        word.length > 0 && !COMMON_WORDS.has(word.toLowerCase())
    );
    
    return words;
}

// extractWords fonksiyonu artık sadece eski kod için kullanılıyor
// Yeni kod extractImprovedWords kullanmalı

// Benzerlik hesaplama fonksiyonları
function calculateWordBasedSimilarity(words1, words2) {
    if (!words1 || !words2 || words1.length === 0 || words2.length === 0) {
        return 0.0;
    }

    // Klasör isimlerini çıkar (ilk 4 kelime)
    const searchWords = words1.slice(4);
    const targetWords = words2.slice(4);

    // Sanatçı adı karşılaştırması (ilk 2 kelime)
    const artistMatch = (
        searchWords.length >= 2 &&
        targetWords.length >= 2 &&
        searchWords[0] === targetWords[0] &&
        searchWords[1] === targetWords[1]
    );

    // Şarkı adı karşılaştırması (kalan kelimeler)
    const songWords1 = searchWords.slice(2);
    const songWords2 = targetWords.slice(2);

    const songMatch = songWords1.some(word =>
        songWords2.some(targetWord =>
            word === targetWord ||
            (word.length >= 3 && targetWord.includes(word)) ||
            (targetWord.length >= 3 && word.includes(targetWord))
        )
    );

    // Ağırlıklı skor hesaplama
    const artistScore = artistMatch ? 0.7 : 0.0;
    const songScore = songMatch ? 0.3 : 0.0;

    return artistScore + songScore;
}

function calculateSimpleSimilarity(words1, words2) {
    if (!words1 || !words2 || words1.length === 0 || words2.length === 0) {
        return 0.0;
    }

    const matches = words1.filter(word =>
        words2.some(w =>
            word === w ||
            (word.length > 3 && w.includes(word)) ||
            (w.length > 3 && word.includes(w))
        )
    ).length;

    return matches / Math.max(words1.length, words2.length);
}

function calculateTwoStageSimilarity(words1, words2) {
    if (!words1 || !words2 || words1.length === 0 || words2.length === 0) {
        return 0.0;
    }

    // İlk aşama: Tam kelime eşleşmesi
    const exactMatches = words1.filter(word => words2.includes(word)).length;
    const exactMatchScore = exactMatches / Math.max(words1.length, words2.length);

    // İkinci aşama: Kısmi kelime eşleşmesi
    const partialMatches = words1.filter(word =>
        words2.some(w =>
            (word.length > 3 && w.includes(word)) ||
            (w.length > 3 && word.includes(w))
        )
    ).length;
    const partialMatchScore = partialMatches / Math.max(words1.length, words2.length);

    // Ağırlıklı toplam skor
    return (exactMatchScore * 0.7) + (partialMatchScore * 0.3);
}

// calculateSimilarity fonksiyonu kaldırıldı - sadece calculateImprovedSimilarity kullanılıyor

// Veritabanı yükleme
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
    
    // 2. Aynı klasör farklı uzantı
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
    
    // 3. Farklı klasör aynı ad
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
    const searchWords = extractWords(fileNameWithoutExt);
    if (searchWords.length === 0) {
        return {
            originalPath: searchPath,
            found: false,
            status: 'no_search_words',
            processTime: Date.now() - startTime
        };
    }
    
    const candidates = [];
    const threshold = 0.3;
    
    for (const file of musicDatabase.musicFiles) {
        if (!file.indexedWords || file.indexedWords.length === 0) continue;
        
        // Eski indexedWords'den yeni format'a çevir - Sadeleştirilmiş
        const targetWords = {
            'folder_words': file.folderWords || [],
            'file_words': file.fileWords || [],
            'all_words': file.indexedWords || [],
            'meaningful_words': file.meaningfulWords || []
        };
        
        const similarity = calculateImprovedSimilarity(searchWords, targetWords);
        
        if (similarity > threshold) {
            candidates.push({
                path: file.path,
                similarity: similarity,
                file: file
            });
        }
    }
    
    if (candidates.length > 0) {
        // En yüksek benzerlik skoruna göre sırala
        candidates.sort((a, b) => b.similarity - a.similarity);
        const bestMatch = candidates[0];
        
        return {
            originalPath: searchPath,
            found: true,
            status: 'similar_found',
            matchType: 'benzerDosya',
            foundPath: bestMatch.path,
            similarity: bestMatch.similarity,
            processTime: Date.now() - startTime
        };
    }
    
    return {
        originalPath: searchPath,
        found: false,
        status: 'not_found',
        processTime: Date.now() - startTime
    };
}

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
        
        res.json({
            status: 'success',
            data: results,
            stats: {
                totalProcessed: paths.length,
                executionTime: executionTime,
                averageProcessTime: Math.round(executionTime / paths.length),
                matchDetails: matchDetails
            }
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
        
        console.log(`Toplam ${allPlaylists.length} playlist taranıyor`);
        
        const allMissingFiles = [];
        const missingFilePaths = new Set();
        
        for (const playlistPath of allPlaylists) {
            try {
                const content = await fs.readFile(playlistPath, 'utf8');
                const xml2js = require('xml2js');
                const parser = new xml2js.Parser();
                const result = await parser.parseStringPromise(content);
                
                const playlistName = path.basename(playlistPath, '.vdjfolder');
                let songs = [];
                
                // VirtualFolder yapısını kontrol et
                if (result.VirtualFolder && result.VirtualFolder.song) {
                    songs = Array.isArray(result.VirtualFolder.song) 
                        ? result.VirtualFolder.song 
                        : [result.VirtualFolder.song];
                } else if (result.FavoriteFolder && result.FavoriteFolder.$.path) {
                    // FavoriteFolder yapısı - recursive tarama yap
                    const folderPath = result.FavoriteFolder.$.path;
                    
                    async function scanDirectoryRecursively(dirPath) {
                        const allFiles = [];
                        
                        async function scanDir(currentPath) {
                            try {
                                const items = await fs.readdir(currentPath);
                                
                                for (const item of items) {
                                    const fullPath = path.join(currentPath, item);
                                    const stat = await fs.stat(fullPath);
                                    
                                    if (stat.isDirectory()) {
                                        await scanDir(fullPath);
                                    } else if (stat.isFile()) {
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
                    songs = allMusicFiles.map(filePath => ({
                        $: {
                            path: filePath,
                            name: path.basename(filePath),
                            artist: '',
                            title: path.parse(path.basename(filePath)).name,
                            duration: '0:00'
                        }
                    }));
                }
                
                for (const song of songs) {
                    const filePath = song.$.path;
                    if (filePath && !(await fs.pathExists(filePath))) {
                        if (!missingFilePaths.has(filePath)) {
                            missingFilePaths.add(filePath);
                            
                            // Benzerlik araması yap
                            const searchResult = await searchFile(filePath);
                            
                            allMissingFiles.push({
                                originalPath: filePath,
                                playlistName: playlistName,
                                playlistPath: playlistPath,
                                artist: song.$.artist || 'Bilinmeyen',
                                title: song.$.title || 'Bilinmeyen',
                                isFileExists: false,
                                found: searchResult.found,
                                foundPath: searchResult.foundPath,
                                similarity: searchResult.similarity || 0,
                                matchType: searchResult.matchType || 'missing'
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
                
                // Python'daki gibi sırala: önce klasörler (0), sonra playlist'ler (1), alfabetik
                return result.sort((a, b) => {
                    const aType = a.type === 'folder' ? 0 : 1;
                    const bType = b.type === 'folder' ? 0 : 1;
                    if (aType !== bType) return aType - bType;
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
            message: `${updatedCount} şarkı yolu güncellendi`
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
            message: `${totalUpdated} şarkı global olarak güncellendi`,
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
