const fs = require('fs-extra');
const path = require('path');

/**
 * Node.js Müzik Dosyası İndeksleme Script'i
 * Python server'daki index_music_files.py'nin Node.js karşılığı
 */

class MusicFileIndexer {
    constructor() {
        this.supportedFormats = {
            audio: ['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'wma'],
            video: ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm']
        };
        this.allFormats = [...this.supportedFormats.audio, ...this.supportedFormats.video];
    }

    /**
     * Metni normalize eder (server.js ile uyumlu)
     * Türkçe karakterleri ASCII'ye çevirir ve server.js ile aynı davranışı sergiler
     */
    normalizeText(text) {
        if (!text) return '';
        
        // Server.js'deki ENHANCED_CHAR_MAP ile uyumlu
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
        
        // Server.js ile aynı normalizasyon süreci
        let normalized = text;
        
        // NFKC normalizasyonu ve karakter dönüşümü
        normalized = normalized.normalize("NFKC");
        normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');
        
        // Küçük harfe çevir
        normalized = normalized.toLowerCase();
        
        // Özel karakterleri kaldır (tire dahil - server.js ile uyumlu)
        normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
        
        // Boşlukları düzenle
        normalized = normalized.replace(/\s+/g, ' ');
        
        return normalized.trim();
    }

    /**
     * HİBRİT PARANTEZ FİLTRELEME - İndeksleme için
     */
    hybridParenthesesFilter(text) {
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
                const normalizedWord = this.normalizeText(word);
                
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
            allText: mainText + (importantParenthesesWords.length > 0 ? ' ' + importantParenthesesWords.join(' ') : '')
        };
    }

    /**
     * Geliştirilmiş kelime çıkarma - hibrit parantez sistemi ile
     */
    extractImprovedWords(fileName, filePath) {
        const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
        
        // Tüm klasör yolu - her klasör ayrı kelime
        const relevantFolders = pathParts;
        
        // Dosya adını hibrit parantez sistemi ile işle
        const fileNameWithoutExt = path.parse(fileName).name;
        
        // PARANTEZ İÇİ SAYI NORMALIZASYONU - kritik düzeltme
        const cleanedNameForParentheses = fileNameWithoutExt.replace(/\(\d+\)/g, '').trim();
        const hybridFiltered = this.hybridParenthesesFilter(cleanedNameForParentheses);
        
        // Ana kelimeler (parantez dışı)
        const mainParts = hybridFiltered.mainText.split(/[-_\s]/).map(part => part.trim());
        const mainWords = [];
        
        for (const part of mainParts) {
            if (part.trim()) {
                const normalizedPart = this.normalizeText(part);
                const words = normalizedPart.split(/\s+/).filter(w => w.length > 1);
                mainWords.push(...words);
            }
        }
        
        // Parantez kelimeleri (önemli olanlar)
        const parenthesesWords = hybridFiltered.parenthesesWords;
        
        // Klasör kelimelerini normalize et
        const folderWords = [];
        for (const folder of relevantFolders) {
            const normalizedFolder = this.normalizeText(folder);
            const camelCaseWords = normalizedFolder.replace(/([a-z])([A-Z])/g, '$1 $2');
            folderWords.push(...camelCaseWords.split(/\s+/).filter(w => w.length > 1));
        }
        
        const result = {
            'folder_words': folderWords,
            'file_words': mainWords,                    // Ana kelimeler
            'parentheses_words': parenthesesWords,      // Parantez kelimeleri AYRI
            'all_words': [...folderWords, ...mainWords, ...parenthesesWords]
        };
        
        return result;
    }

    /**
     * Müzik dosyası bilgilerini oluşturur
     */
    createMusicFile(filePath, stats) {
        const fileName = path.basename(filePath);
        const fileNameOnly = path.parse(fileName).name; // Uzantısız dosya adı
        const extension = path.extname(fileName).slice(1).toLowerCase();
        
        if (!this.allFormats.includes(extension)) {
            return null;
        }

        // ÖNEMLİ: Dosya uzantısını kaldırarak normalize et
        const normalizedName = this.normalizeText(fileNameOnly); // fileName yerine fileNameOnly
        const improvedWords = this.extractImprovedWords(fileNameOnly, filePath); // fileName yerine fileNameOnly

        // Dosya tipini belirle
        let fileType = 'unknown';
        if (this.supportedFormats.audio.includes(extension)) {
            fileType = 'audio';
        } else if (this.supportedFormats.video.includes(extension)) {
            fileType = 'video';
        }

        return {
            path: filePath,
            name: fileName,
            fileNameOnly: fileNameOnly,
            normalizedName: normalizedName,
            folderWords: improvedWords.folder_words,
            fileWords: improvedWords.file_words,
            parenthesesWords: improvedWords.parentheses_words,  // YENİ: Parantez kelimeleri
            extension: extension,
            fileType: fileType,
            size: stats.size,
            modifiedTime: stats.mtime.toISOString()
        };
    }

    /**
     * Klasörü recursive olarak tarar
     */
    async scanDirectory(dirPath) {
        const files = [];
        
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    // Hidden klasörleri atla
                    if (!entry.name.startsWith('.')) {
                        const subFiles = await this.scanDirectory(fullPath);
                        files.push(...subFiles);
                    }
                } else if (entry.isFile()) {
                    try {
                        const stats = await fs.stat(fullPath);
                        const musicFile = this.createMusicFile(fullPath, stats);
                        
                        if (musicFile) {
                            files.push(musicFile);
                        }
                    } catch (error) {
                        console.warn(`Dosya okunamadı: ${fullPath} - ${error.message}`);
                    }
                }
            }
        } catch (error) {
            console.error(`Klasör taranamadı: ${dirPath} - ${error.message}`);
        }
        
        return files;
    }

    /**
     * Ana indexleme fonksiyonu
     */
    async indexMusicFiles(musicRoot) {
        console.log(`🎵 Müzik dosyaları indeksleniyor: ${musicRoot}`);
        
        const startTime = Date.now();
        let totalFiles = 0;
        let errorCount = 0;
        const errorDetails = [];

        try {
            // Klasör varlığını kontrol et
            if (!await fs.pathExists(musicRoot)) {
                throw new Error(`Ana müzik klasörü bulunamadı: ${musicRoot}`);
            }

            // Dosyaları tara
            const musicFiles = await this.scanDirectory(musicRoot);
            totalFiles = musicFiles.length;

            console.log(`📊 Toplam ${totalFiles} müzik dosyası bulundu`);

            // Veritabanı yapısını oluştur
            const database = {
                version: "1.0",
                lastUpdate: new Date().toISOString(),
                encoding: "utf-8",
                musicFiles: musicFiles
            };

            // Veritabanını kaydet
            const dbPath = path.join(__dirname, '..', 'musicfiles.db.json');
            await fs.writeFile(dbPath, JSON.stringify(database, null, 2), 'utf8');

            const executionTime = Date.now() - startTime;

            console.log(`✅ İndeksleme tamamlandı: ${totalFiles} dosya, ${executionTime}ms`);

            return {
                success: true,
                data: {
                    totalFiles: totalFiles,
                    newFiles: totalFiles,
                    duration: executionTime,
                    lastUpdate: new Date().toISOString(),
                    errorCount: errorCount,
                    errorDetails: errorDetails.length > 0 ? errorDetails : null,
                    databasePath: dbPath
                }
            };

        } catch (error) {
            console.error('❌ İndeksleme hatası:', error.message);
            return {
                success: false,
                message: error.message,
                details: {
                    error_code: error.code || null,
                    error_message: error.message
                }
            };
        }
    }
}

// CLI kullanımı için
if (require.main === module) {
    const indexer = new MusicFileIndexer();
    const musicRoot = process.argv[2] || '/Users/koray/Music/KorayMusics';
    
    indexer.indexMusicFiles(musicRoot)
        .then(result => {
            console.log('İndeksleme sonucu:', JSON.stringify(result, null, 2));
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = MusicFileIndexer;
