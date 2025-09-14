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
     * Metni normalize eder (Türkçe karakterleri ASCII'ye çevirir)
     */
    normalizeText(text) {
        if (!text) return '';
        
        const charMap = {
            'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
            'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
        };
        
        return text
            .toLowerCase()
            .split('')
            .map(char => charMap[char] || char)
            .join('')
            .replace(/[^a-z0-9\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Dosya adından kelimeler çıkarır
     */
    extractWords(fileName, filePath) {
        // Klasör parçalarını al (son 2 klasör)
        const pathParts = filePath.split('/').filter(part => part && part !== '.');
        const relevantFolders = pathParts.slice(-2);
        
        // Dosya adını parçalara ayır
        const fileNameWithoutExt = path.parse(fileName).name;
        const fileNameParts = fileNameWithoutExt.split(/[-–—]/).map(part => part.trim());
        
        // Tüm parçaları birleştir
        const allParts = [...relevantFolders, ...fileNameParts];
        
        // Kelimelere ayır ve normalize et
        const words = allParts
            .join(' ')
            .split(/\s+/)
            .map(word => this.normalizeText(word))
            .filter(word => word.length > 1);
            
        return words;
    }

    /**
     * Müzik dosyası bilgilerini oluşturur
     */
    createMusicFile(filePath, stats) {
        const fileName = path.basename(filePath);
        const fileNameOnly = path.parse(fileName).name;
        const extension = path.extname(fileName).slice(1).toLowerCase();
        
        if (!this.allFormats.includes(extension)) {
            return null;
        }

        const normalizedName = this.normalizeText(fileNameOnly);
        const indexedWords = this.extractWords(fileName, filePath);

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
            indexedWords: indexedWords,
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
