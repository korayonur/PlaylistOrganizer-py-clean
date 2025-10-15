'use strict';

const path = require('path');
const fs = require('fs-extra');

/**
 * Ortak Yardımcı Fonksiyonlar
 * Tüm modüller için kullanılabilecek utility fonksiyonları
 */

/**
 * MERKEZİ NORMALİZASYON FONKSİYONU
 * Tüm dünya dillerini destekler ve tüm sistem tarafından kullanılır
 * 
 * @param {string} text - Normalize edilecek metin
 * @returns {string} - Normalize edilmiş metin (küçük harf, boşluklarla ayrılmış)
 */
function normalizeText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    // 1. Uzantıyı çıkar (.mp3, .m4a, .mp4, vb)
    const withoutExt = text.replace(/\.(mp3|m4a|mp4|wav|flac|aac|wma|ogg|avi|mkv|mov|wmv|flv|webm)$/i, '');
    
    // 2. Apostrof'u önce sil (I'm → Im, d'Amélie → dAmélie)
    let normalized = withoutExt.replace(/'/g, '');
    
    // 3. ENHANCED_CHAR_MAP ile dönüştür (büyük/küçük harf duyarlı)
    for (const [original, replacement] of Object.entries(ENHANCED_CHAR_MAP)) {
        normalized = normalized.split(original).join(replacement);
    }
    
    // 4. Küçük harfe çevir ve sadece harfleri, rakamları ve boşlukları tut
    return normalized.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Boşluk yerine sil
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Kelimeleri filtrele (minimum 1 harf - tek harfli kelimeler de önemli)
 * @param {string[]} words - Filtrelenecek kelime dizisi
 * @returns {string[]} - Filtrelenmiş kelime dizisi
 */
function filterWords(words) {
    return words.filter(w => w && w.length >= 1);
}

// Desteklenen müzik formatları
const SUPPORTED_AUDIO_FORMATS = [
    'mp3', 'wav', 'cda', 'wma', 'asf', 'ogg', 'm4a', 'aac', 'aif', 'aiff',
    'flac', 'mpc', 'ape', 'wv', 'opus', 'ra', 'rm', '3gp', 'amr', 'au'
];

const SUPPORTED_VIDEO_FORMATS = [
    'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ogv'
];

const SUPPORTED_PLAYLIST_FORMATS = [
    'm3u', 'm3u8', 'pls', 'xspf', 'vdj', 'vdjfolder', 'vdjplaylist'
];

// Kapsamlı uluslararası karakter haritası - Tüm dilleri destekler
const ENHANCED_CHAR_MAP = {
    // Unicode Mathematical Bold karakterleri (U+1D400 - U+1D7FF)
    "𝐀": "A", "𝐁": "B", "𝐂": "C", "𝐃": "D", "𝐄": "E", "𝐅": "F", "𝐆": "G", 
    "𝐇": "H", "𝐈": "I", "𝐉": "J", "𝐊": "K", "𝐋": "L", "𝐌": "M", "𝐍": "N",
    "𝐎": "O", "𝐏": "P", "𝐐": "Q", "𝐑": "R", "𝐒": "S", "𝐓": "T", "𝐔": "U",
    "𝐕": "V", "𝐖": "W", "𝐗": "X", "𝐘": "Y", "𝐙": "Z",
    "𝐚": "a", "𝐛": "b", "𝐜": "c", "𝐝": "d", "𝐞": "e", "𝐟": "f", "𝐠": "g",
    "𝐡": "h", "𝐢": "i", "𝐣": "j", "𝐤": "k", "𝐥": "l", "𝐦": "m", "𝐧": "n",
    "𝐨": "o", "𝐩": "p", "𝐪": "q", "𝐫": "r", "𝐬": "s", "𝐭": "t", "𝐮": "u",
    "𝐯": "v", "𝐰": "w", "𝐱": "x", "𝐲": "y", "𝐳": "z",
    
    // Türkçe karakterler
    "ğ": "g", "Ğ": "G", "ı": "i", "I": "i", "İ": "i", "ş": "s", "Ş": "S",
    "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
    
    // Fransızca karakterler
    "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
    "è": "e", "é": "e", "ê": "e", "ë": "e", "ì": "i", "í": "i", "î": "i", "ï": "i",
    "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u",
    "ý": "y", "ÿ": "y",
    
    // Almanca karakterler
    "ä": "a", "ö": "o", "ü": "u", "ß": "ss",
    "Ä": "A", "Ö": "O", "Ü": "U",
    
    // İspanyolca karakterler
    "ñ": "n", "Ñ": "N", "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u",
    "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U",
    
    // İtalyanca karakterler
    "à": "a", "è": "e", "ì": "i", "ò": "o", "ù": "u",
    "À": "A", "È": "E", "Ì": "I", "Ò": "O", "Ù": "U",
    
    // Portekizce karakterler
    "ã": "a", "õ": "o", "â": "a", "ê": "e", "ô": "o",
    "Ã": "A", "Õ": "O", "Â": "A", "Ê": "E", "Ô": "O",
    
    // Çekçe ve Slovakça karakterler
    "č": "c", "ď": "d", "ě": "e", "ň": "n", "ř": "r", "š": "s", "ť": "t", "ů": "u", "ž": "z",
    "Č": "C", "Ď": "D", "Ě": "E", "Ň": "N", "Ř": "R", "Š": "S", "Ť": "T", "Ů": "U", "Ž": "Z",
    "ć": "c", "Ć": "C", "ł": "l", "Ł": "L", "ń": "n", "Ń": "N", "ś": "s", "Ś": "S", "ź": "z", "Ź": "Z", "ż": "z", "Ż": "Z",
    
    // Lehçe karakterler
    "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n", "ó": "o", "ś": "s", "ź": "z", "ż": "z",
    "Ą": "A", "Ć": "C", "Ę": "E", "Ł": "L", "Ń": "N", "Ó": "O", "Ś": "S", "Ź": "Z", "Ż": "Z",
    
    // Macarca karakterler
    "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ö": "o", "ő": "o", "ű": "u",
    "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ü": "U", "Ö": "O", "Ő": "O", "Ű": "U",
    
    // Romence karakterler
    "ă": "a", "â": "a", "î": "i", "ș": "s", "ț": "t",
    "Ă": "A", "Â": "A", "Î": "I", "Ș": "S", "Ț": "T",
    
    // İskandinav karakterler (Norveççe, Danca, İsveççe)
    "å": "a", "æ": "ae", "ø": "o", "þ": "th", "ð": "d",
    "Å": "A", "Æ": "AE", "Ø": "O", "Þ": "TH", "Ð": "D",
    
    // Rusça karakterler (Kiril alfabesi)
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z",
    "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
    "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    "А": "A", "Б": "B", "В": "V", "Г": "G", "Д": "D", "Е": "E", "Ё": "E", "Ж": "ZH", "З": "Z",
    "И": "I", "Й": "Y", "К": "K", "Л": "L", "М": "M", "Н": "N", "О": "O", "П": "P", "Р": "R",
    "С": "S", "Т": "T", "У": "U", "Ф": "F", "Х": "KH", "Ц": "TS", "Ч": "CH", "Ш": "SH", "Щ": "SHCH",
    "Ъ": "", "Ы": "Y", "Ь": "", "Э": "E", "Ю": "YU", "Я": "YA",
    
    // Yunanca karakterler
    "α": "a", "β": "b", "γ": "g", "δ": "d", "ε": "e", "ζ": "z", "η": "i", "θ": "th", "ι": "i",
    "κ": "k", "λ": "l", "μ": "m", "ν": "n", "ξ": "x", "ο": "o", "π": "p", "ρ": "r", "σ": "s", "ς": "s",
    "τ": "t", "υ": "y", "φ": "f", "χ": "ch", "ψ": "ps", "ω": "o",
    "Α": "A", "Β": "B", "Γ": "G", "Δ": "D", "Ε": "E", "Ζ": "Z", "Η": "I", "Θ": "TH", "Ι": "I",
    "Κ": "K", "Λ": "L", "Μ": "M", "Ν": "N", "Ξ": "X", "Ο": "O", "Π": "P", "Ρ": "R", "Σ": "S",
    "Τ": "T", "Υ": "Y", "Φ": "F", "Χ": "CH", "Ψ": "PS", "Ω": "O",
    
    // Arapça karakterler (temel)
    "ا": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh", "د": "d", "ذ": "dh",
    "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "a",
    "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "و": "w", "ي": "y",
    
    // Arapça büyük harfler
    "أ": "a", "إ": "i", "آ": "aa", "ؤ": "w", "ئ": "y", "ة": "h", "ى": "a",
    
    // Çince karakterler (Pinyin temel)
    "ā": "a", "á": "a", "ǎ": "a", "à": "a", "ē": "e", "é": "e", "ě": "e", "è": "e",
    "ī": "i", "í": "i", "ǐ": "i", "ì": "i", "ō": "o", "ó": "o", "ǒ": "o", "ò": "o",
    "ū": "u", "ú": "u", "ǔ": "u", "ù": "u", "ǖ": "yu", "ǘ": "yu", "ǚ": "yu", "ǜ": "yu",
    
    // Çince temel karakterler (basitleştirilmiş)
    "一": "yi", "二": "er", "三": "san", "四": "si", "五": "wu", "六": "liu", "七": "qi", "八": "ba", "九": "jiu", "十": "shi",
    "人": "ren", "大": "da", "小": "xiao", "中": "zhong", "国": "guo", "学": "xue", "生": "sheng", "工": "gong", "作": "zuo", "时": "shi",
    "音": "yin", "乐": "yue", "歌": "ge", "曲": "qu", "唱": "chang", "听": "ting", "看": "kan", "说": "shuo", "话": "hua", "语": "yu",
    
    // Korece temel karakterler (Hangul)
    "가": "ga", "나": "na", "다": "da", "라": "ra", "마": "ma", "바": "ba", "사": "sa", "아": "a", "자": "ja", "차": "cha",
    "카": "ka", "타": "ta", "파": "pa", "하": "ha", "거": "geo", "너": "neo", "더": "deo", "러": "reo", "머": "meo", "버": "beo",
    "서": "seo", "어": "eo", "저": "jeo", "처": "cheo", "커": "keo", "터": "teo", "퍼": "peo", "허": "heo", "고": "go", "노": "no",
    "도": "do", "로": "ro", "모": "mo", "보": "bo", "소": "so", "오": "o", "조": "jo", "초": "cho", "코": "ko", "토": "to",
    "포": "po", "호": "ho", "구": "gu", "누": "nu", "두": "du", "루": "ru", "무": "mu", "부": "bu", "수": "su", "우": "u",
    "주": "ju", "추": "chu", "쿠": "ku", "투": "tu", "푸": "pu", "후": "hu", "그": "geu", "느": "neu", "드": "deu", "르": "reu",
    "므": "meu", "브": "beu", "스": "seu", "으": "eu", "즈": "jeu", "츠": "cheu", "크": "keu", "트": "teu", "프": "peu", "흐": "heu",
    
    // Japonca karakterler (Hiragana temel)
    "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o", "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
    "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so", "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
    "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no", "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
    "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo", "や": "ya", "ゆ": "yu", "よ": "yo",
    "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro", "わ": "wa", "を": "wo", "ん": "n",
    
    // Japonca Katakana karakterler
    "ア": "a", "イ": "i", "ウ": "u", "エ": "e", "オ": "o", "カ": "ka", "キ": "ki", "ク": "ku", "ケ": "ke", "コ": "ko",
    "サ": "sa", "シ": "shi", "ス": "su", "セ": "se", "ソ": "so", "タ": "ta", "チ": "chi", "ツ": "tsu", "テ": "te", "ト": "to",
    "ナ": "na", "ニ": "ni", "ヌ": "nu", "ネ": "ne", "ノ": "no", "ハ": "ha", "ヒ": "hi", "フ": "fu", "ヘ": "he", "ホ": "ho",
    "マ": "ma", "ミ": "mi", "ム": "mu", "メ": "me", "モ": "mo", "ヤ": "ya", "ユ": "yu", "ヨ": "yo",
    "ラ": "ra", "リ": "ri", "ル": "ru", "レ": "re", "ロ": "ro", "ワ": "wa", "ヲ": "wo", "ン": "n",
    
    // Korece karakterler (Hangul temel)
    "ㄱ": "g", "ㄴ": "n", "ㄷ": "d", "ㄹ": "r", "ㅁ": "m", "ㅂ": "b", "ㅅ": "s", "ㅇ": "ng", "ㅈ": "j", "ㅊ": "ch",
    "ㅋ": "k", "ㅌ": "t", "ㅍ": "p", "ㅎ": "h", "ㅏ": "a", "ㅓ": "eo", "ㅗ": "o", "ㅜ": "u", "ㅡ": "eu", "ㅣ": "i",
    
    // Korece sesli harfler
    "ㅑ": "ya", "ㅕ": "yeo", "ㅛ": "yo", "ㅠ": "yu", "ㅐ": "ae", "ㅔ": "e", "ㅒ": "yae", "ㅖ": "ye",
    "ㅘ": "wa", "ㅙ": "wae", "ㅚ": "oe", "ㅝ": "wo", "ㅞ": "we", "ㅟ": "wi", "ㅢ": "ui",
    
    // Korece sessiz harfler
    "ㄲ": "kk", "ㄸ": "tt", "ㅃ": "pp", "ㅆ": "ss", "ㅉ": "jj",
    
    // Özel karakterler ve noktalama işaretleri
    "–": "-", "—": "-", "_": " ", ".": " ", ",": " ", ";": " ", ":": " ",
    "!": " ", "?": " ", "(": " ", ")": " ", "[": " ", "]": " ",
    "{": " ", "}": " ", "<": " ", ">": " ", "/": " ", "\\": " ",
    "|": " ", "+": " ", "=": " ", "*": " ", "&": " ", "^": " ",
    "%": " ", "$": " ", "#": " ", "@": " ", "~": " ", "`": " ",
    "'": " ", '"': " "
};

/**
 * Dosya uzantısını kontrol et
 */
function isAudioFile(filePath) {
    const ext = path.extname(filePath).toLowerCase().substring(1);
    return SUPPORTED_AUDIO_FORMATS.includes(ext);
}

function isVideoFile(filePath) {
    const ext = path.extname(filePath).toLowerCase().substring(1);
    return SUPPORTED_VIDEO_FORMATS.includes(ext);
}

function isPlaylistFile(filePath) {
    const ext = path.extname(filePath).toLowerCase().substring(1);
    return SUPPORTED_PLAYLIST_FORMATS.includes(ext);
}

function isMediaFile(filePath) {
    return isAudioFile(filePath) || isVideoFile(filePath);
}

/**
 * Dosya adını normalize et
 */
function normalizeFileName(fileName) {
    if (!fileName) return '';
    
    // Uzantıyı çıkar
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
    
    // Unicode normalizasyonu
    let normalized = nameWithoutExt.normalize('NFKC');
    
    // Türkçe karakterleri değiştir
    for (const [char, replacement] of Object.entries(ENHANCED_CHAR_MAP)) {
        // Özel regex karakterlerini escape et
        const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        normalized = normalized.replace(new RegExp(escapedChar, 'g'), replacement);
    }
    
    // Küçük harfe çevir ve özel karakterleri temizle
    return normalized
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Dosya boyutunu formatla
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Süreyi formatla (milisaniye)
 */
function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
}

/**
 * Klasörü recursive olarak tara
 */
async function scanDirectory(dirPath, options = {}) {
    const {
        includeAudio = true,
        includeVideo = false,
        includePlaylists = false,
        recursive = true,
        maxDepth = 10
    } = options;
    
    const files = [];
    const errors = [];
    
    async function scanRecursive(currentPath, depth = 0) {
        if (depth > maxDepth) return;
        
        try {
            const items = await fs.readdir(currentPath);
            
            for (const item of items) {
                const fullPath = path.join(currentPath, item);
                
                try {
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.isDirectory() && recursive) {
                        await scanRecursive(fullPath, depth + 1);
                    } else if (stat.isFile()) {
                        const ext = path.extname(item).toLowerCase().substring(1);
                        
                        if (
                            (includeAudio && SUPPORTED_AUDIO_FORMATS.includes(ext)) ||
                            (includeVideo && SUPPORTED_VIDEO_FORMATS.includes(ext)) ||
                            (includePlaylists && SUPPORTED_PLAYLIST_FORMATS.includes(ext))
                        ) {
                            files.push({
                                path: fullPath,
                                name: item,
                                size: stat.size,
                                modified: stat.mtime,
                                extension: ext
                            });
                        }
                    }
                } catch (error) {
                    errors.push({ path: fullPath, error: error.message });
                }
            }
        } catch (error) {
            errors.push({ path: currentPath, error: error.message });
        }
    }
    
    await scanRecursive(dirPath);
    
    return { files, errors };
}

/**
 * Dosya varlığını kontrol et
 */
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Klasör varlığını kontrol et
 */
async function directoryExists(dirPath) {
    try {
        const stat = await fs.stat(dirPath);
        return stat.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Dosya bilgilerini al
 */
async function getFileInfo(filePath) {
    try {
        const stat = await fs.stat(filePath);
        const ext = path.extname(filePath).toLowerCase().substring(1);
        return {
            exists: true,
            size: stat.size,
            modified: stat.mtime,
            created: stat.birthtime,
            isFile: stat.isFile(),
            isDirectory: stat.isDirectory(),
            extension: ext
        };
    } catch (error) {
        return {
            exists: false,
            error: error.message
        };
    }
}

/**
 * UUID oluştur
 */
function generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Hata mesajını formatla
 */
function formatError(error, context = '') {
    return {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
    };
}

/**
 * API response formatı
 */
function createResponse(success, data = null, message = '', error = null) {
    const response = {
        success,
        timestamp: new Date().toISOString()
    };
    
    if (data !== null) response.data = data;
    if (message) response.message = message;
    if (error) response.error = error;
    
    return response;
}

/**
 * Kelime çıkartmalı benzerlik algoritması - Genel kullanım için
 * Aşamalı kelime azaltma ile arama yapar
 */
class WordSimilaritySearch {
    constructor(database) {
        this.db = database;
    }

    /**
     * Başlangıçtaki rakamları filtrele
     */
    filterNumbers(text) {
        return text.replace(/^\d+\s*/, '').trim();
    }

    /**
     * Kelime kombinasyonları oluştur (en uzundan başlayarak)
     */
    generateWordCombinations(words) {
        const combinations = [];
        
        // Tüm kelimeler
        if (words.length > 0) {
            combinations.push(words.join(' '));
        }
        
        // Son kelimeyi çıkararak
        for (let i = words.length - 1; i >= 2; i--) {
            combinations.push(words.slice(0, i).join(' '));
        }
        
        // En uzun kelimeden başlayarak tek tek
        const sortedWords = [...words].sort((a, b) => b.length - a.length);
        for (const word of sortedWords) {
            combinations.push(word);
        }
        
        return combinations;
    }

    /**
     * Aşamalı kelime azaltma ile arama
     */
    async searchStepByStepCorrect(searchQuery) {
        const filteredQuery = this.filterNumbers(searchQuery);
        const words = filteredQuery.split(/\s+/).filter(word => word.length > 0);
        
        if (words.length === 0) {
            return { found: false, stage: 0, searchPhrase: '', resultsCount: 0, candidates: [] };
        }

        const combinations = this.generateWordCombinations(words);
        let stage = 0;
        let searchPhrase = '';
        let candidates = [];

        // AŞAMA 1: Tüm kelimelerle arama
        stage = 1;
        searchPhrase = combinations[0];
        const query1 = `SELECT id, fileName, normalizedFileName, path FROM music_files WHERE normalizedFileName LIKE ? LIMIT 50`;
        candidates = this.db.prepare(query1).all(`%${searchPhrase}%`);
        
        if (candidates.length > 0) {
            return { found: true, stage, searchPhrase, resultsCount: candidates.length, candidates };
        }

        // AŞAMA 2: Son kelimeyi çıkararak arama
        if (words.length > 2) {
            for (let i = words.length - 1; i >= 2; i--) {
                stage = 2;
                searchPhrase = words.slice(0, i).join(' ');
                const query2 = `SELECT id, fileName, normalizedFileName, path FROM music_files WHERE normalizedFileName LIKE ? LIMIT 50`;
                candidates = this.db.prepare(query2).all(`%${searchPhrase}%`);
                
                if (candidates.length > 0) {
                    return { found: true, stage, searchPhrase, resultsCount: candidates.length, candidates };
                }
            }
        }

        // AŞAMA 3: En uzun kelimeden başla, tek tek arama
        stage = 3;
        const sortedWords = [...words].sort((a, b) => b.length - a.length);
        for (const word of sortedWords) {
            searchPhrase = word;
                const query3 = `SELECT id, fileName, normalizedFileName, path FROM music_files WHERE normalizedFileName LIKE ? LIMIT 50`;
            candidates = this.db.prepare(query3).all(`%${searchPhrase}%`);
            
            if (candidates.length > 0) {
                return { found: true, stage, searchPhrase, resultsCount: candidates.length, candidates };
            }
        }

        return { found: false, stage, searchPhrase: '', resultsCount: 0, candidates: [] };
    }

    /**
     * En iyi eşleşmeyi bul
     */
    findBestMatchDetailed(searchQuery, candidates) {
        if (!candidates || candidates.length === 0) {
            return null;
        }

        let bestMatch = null;
        let bestScore = 0;

        for (const candidate of candidates) {
            const similarityResult = this.calculateWordSimilarityDetailed(searchQuery, candidate.normalizedFileName);
            const score = similarityResult.score; // Extract the score from the object
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = {
                    id: candidate.id,
                    fileName: candidate.fileName,
                    normalizedFileName: candidate.normalizedFileName,
                    path: candidate.path,
                    score: score
                };
            }
        }

        return bestMatch;
    }

    /**
     * Detaylı kelime benzerliği hesapla
     */
    calculateWordSimilarityDetailed(searchQuery, candidateText) {
        const searchWords = this.filterNumbers(searchQuery).toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const candidateWords = candidateText.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        
        if (searchWords.length === 0 || candidateWords.length === 0) {
            return {
                score: 0,
                matchedWords: 0,
                totalWords: searchWords.length,
                wordMatches: []
            };
        }

        let matchedWords = 0;
        const usedMusicWords = new Set();
        const wordMatches = [];

        for (const searchWord of searchWords) {
            let bestMatch = null;
            let bestScore = 0;
            let bestMusicWord = null;

            for (let j = 0; j < candidateWords.length; j++) {
                if (usedMusicWords.has(j)) continue;

                const musicWord = candidateWords[j];
                const similarity = this.calculateSimilarity(searchWord, musicWord);

                if (similarity > bestScore) {
                    bestMatch = j;
                    bestScore = similarity;
                    bestMusicWord = musicWord;
                }
            }

            if (bestMatch !== null) {
                matchedWords++;
                usedMusicWords.add(bestMatch);
                wordMatches.push({
                    trackWord: searchWord,
                    musicWord: bestMusicWord,
                    score: bestScore
                });
            }
        }

        const finalScore = matchedWords > 0 ? wordMatches.reduce((sum, match) => sum + match.score, 0) / searchWords.length : 0;

        return {
            score: finalScore,
            matchedWords,
            totalWords: searchWords.length,
            wordMatches
        };
    }

    /**
     * Levenshtein benzerliği hesapla
     */
    calculateSimilarity(str1, str2) {
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        return maxLength === 0 ? 1 : 1 - (distance / maxLength);
    }

    /**
     * Levenshtein mesafesi hesapla
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;

        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
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

        return matrix[len2][len1];
    }

    /**
     * Ana test fonksiyonu
     */
    async performTestWordSimilaritySearch(searchQuery) {
        try {
            const searchResult = await this.searchStepByStepCorrect(searchQuery);
            
            if (!searchResult.found) {
                return {
                    searchQuery,
                    found: false,
                    stage: searchResult.stage,
                    searchPhrase: searchResult.searchPhrase,
                    resultsCount: 0,
                    bestMatch: null,
                    bestScore: 0,
                    message: 'Eşleşme bulunamadı'
                };
            }

            const bestMatch = this.findBestMatchDetailed(searchQuery, searchResult.candidates);
            
            if (!bestMatch) {
                return {
                    searchQuery,
                    found: false,
                    stage: searchResult.stage,
                    searchPhrase: searchResult.searchPhrase,
                    resultsCount: searchResult.resultsCount,
                    bestMatch: null,
                    bestScore: 0,
                    message: 'Uygun eşleşme bulunamadı'
                };
            }

            const details = this.calculateWordSimilarityDetailed(searchQuery, bestMatch.normalizedFileName);
            bestMatch.details = details;

            return {
                searchQuery,
                found: true,
                stage: searchResult.stage,
                searchPhrase: searchResult.searchPhrase,
                resultsCount: searchResult.resultsCount,
                bestMatch,
                bestScore: bestMatch.score,
                message: `En iyi eşleşme bulundu (skor: ${bestMatch.score.toFixed(3)})`
            };

        } catch (error) {
            return {
                searchQuery,
                found: false,
                stage: 0,
                searchPhrase: '',
                resultsCount: 0,
                bestMatch: null,
                bestScore: 0,
                message: `Hata: ${error.message}`
            };
        }
    }
}

module.exports = {
    // Format kontrolü
    isAudioFile,
    isVideoFile,
    isPlaylistFile,
    isMediaFile,
    
    // String işlemleri
    normalizeText,
    normalizeFileName,
    filterWords,
    
    // Format işlemleri
    formatFileSize,
    formatDuration,
    
    // Dosya işlemleri
    scanDirectory,
    fileExists,
    directoryExists,
    getFileInfo,
    
    // Yardımcı fonksiyonlar
    generateId,
    formatError,
    createResponse,
    
    // Benzerlik arama
    WordSimilaritySearch,
    
    // Sabitler
    SUPPORTED_AUDIO_FORMATS,
    SUPPORTED_VIDEO_FORMATS,
    SUPPORTED_PLAYLIST_FORMATS,
    ENHANCED_CHAR_MAP
};
