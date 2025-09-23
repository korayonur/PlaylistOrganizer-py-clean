'use strict';

const path = require('path');
const fs = require('fs-extra');

/**
 * Ortak Yardımcı Fonksiyonlar
 * Tüm modüller için kullanılabilecek utility fonksiyonları
 */

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

// Gelişmiş Türkçe karakter haritası
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
        normalized = normalized.replace(new RegExp(char, 'g'), replacement);
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

module.exports = {
    // Format kontrolü
    isAudioFile,
    isVideoFile,
    isPlaylistFile,
    isMediaFile,
    
    // String işlemleri
    normalizeFileName,
    
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
    
    // Sabitler
    SUPPORTED_AUDIO_FORMATS,
    SUPPORTED_VIDEO_FORMATS,
    SUPPORTED_PLAYLIST_FORMATS,
    ENHANCED_CHAR_MAP
};
