const path = require('path');

/**
 * Merkezi konfigürasyon dosyası
 * Tüm database path'leri ve diğer ayarlar buradan yönetilir
 */
class Config {
    constructor() {
        // Ana proje klasörü (PlaylistOrganizer-py-backup root)
        // __dirname: apps/old-nodejs-api/api/src/shared
        // Root'a gitmek için 5 seviye yukarı çıkmamız lazım
        this.projectRoot = path.join(__dirname, '../../../../../');
        
        // API Database path - apps/old-nodejs-api/ klasöründe
        this.databasePath = path.join(__dirname, '../../../musicfiles.db');
        
        // Log klasörü (shared/logs/)
        this.logsPath = path.join(this.projectRoot, 'shared/logs');
        
        // Import klasörleri
        this.importPaths = {
            music: '/Users/koray/Music/KorayMusics',  // Müzik dosyaları burada taranır
            virtualDJ: '/Users/koray/Library/Application Support/VirtualDJ',  // M3U ve VDJFOLDER dosyaları sadece burada taranır
            
            // Dışlanacak klasörler (import edilmeyecek)
            excludePaths: [
                '/Users/koray/Library/Application Support/VirtualDJ/Folders/My Library.subfolders'
            ],
            
            // Playlist dosyaları (M3U, VDJFOLDER) sadece VirtualDJ klasöründen taranır
            playlistExtensions: ['.m3u', '.m3u8', '.vdjfolder'],
            
            // Müzik ve medya dosyası uzantıları (VirtualDJ destekli formatlar)
            musicExtensions: [
                // Audio formatları
                '.mp3', '.wav', '.cda', '.wma', '.asf', '.ogg', '.m4a', '.aac', 
                '.aif', '.aiff', '.flac', '.mpc', '.ape', '.weba', '.opus',
                
                // VirtualDJ özel formatları
                '.vdj', '.vdjcache', '.vdjedit', '.vdjsample', '.vdjcachev',
                
                // Video formatları
                '.mp4', '.ogm', '.ogv', '.avi', '.mpg', '.mpeg', '.wmv', 
                '.vob', '.mov', '.divx', '.m4v', '.mkv', '.flv', '.webm',
                
                // Diğer
                '.apng'
            ]
        };
        
        // Server ayarları
        this.server = {
            port: 50001,
            host: 'localhost'
        };
    }
    
    /**
     * Database path'ini döndür
     * @returns {string} Database dosya yolu
     */
    getDatabasePath() {
        return this.databasePath;
    }
    
    /**
     * Log klasörü path'ini döndür
     * @returns {string} Log klasörü yolu
     */
    getLogsPath() {
        return this.logsPath;
    }
    
    /**
     * Import path'lerini döndür
     * @returns {Object} Import path'leri
     */
    getImportPaths() {
        return this.importPaths;
    }
    
    /**
     * Playlist dosyası uzantısı mı kontrol et
     * @param {string} extension - Dosya uzantısı (.m3u gibi)
     * @returns {boolean}
     */
    isPlaylistExtension(extension) {
        return this.importPaths.playlistExtensions.includes(extension.toLowerCase());
    }
    
    /**
     * Müzik dosyası uzantısı mı kontrol et
     * @param {string} extension - Dosya uzantısı (.mp3 gibi)
     * @returns {boolean}
     */
    isMusicExtension(extension) {
        return this.importPaths.musicExtensions.includes(extension.toLowerCase());
    }
    
    /**
     * Bir path'in dışlanacak klasörlerde olup olmadığını kontrol et
     * @param {string} filePath - Kontrol edilecek dosya yolu
     * @returns {boolean} Dışlanacak mı?
     */
    isExcludedPath(filePath) {
        return this.importPaths.excludePaths.some(excludePath => 
            filePath.includes(excludePath)
        );
    }
    
    /**
     * Server ayarlarını döndür
     * @returns {Object} Server ayarları
     */
    getServerConfig() {
        return this.server;
    }
    
    /**
     * Database path'inin var olup olmadığını kontrol et
     * @returns {boolean} Database dosyası var mı?
     */
    databaseExists() {
        const fs = require('fs');
        return fs.existsSync(this.databasePath);
    }
    
    /**
     * Database boyutunu döndür (MB cinsinden)
     * @returns {number} Database boyutu
     */
    getDatabaseSize() {
        try {
            const fs = require('fs');
            const stats = fs.statSync(this.databasePath);
            return Math.round(stats.size / 1024 / 1024 * 100) / 100;
        } catch (error) {
            return 0;
        }
    }
}

// Singleton instance
const config = new Config();

module.exports = config;
