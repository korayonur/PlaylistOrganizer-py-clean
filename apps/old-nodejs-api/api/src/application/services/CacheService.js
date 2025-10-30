const fs = require('fs').promises;
const path = require('path');

/**
 * Cache Service - JSON dosya tabanlı cache sistemi
 */
class CacheService {
    constructor() {
        this.cacheDir = path.join(__dirname, '../../../cache');
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 saat
    }

    /**
     * Cache dosyası yolu oluştur
     */
    getCachePath(key) {
        return path.join(this.cacheDir, `${key}.json`);
    }

    /**
     * Cache dosyasını kontrol et ve oku
     */
    async get(key) {
        try {
            const cachePath = this.getCachePath(key);
            const stats = await fs.stat(cachePath);
            const now = Date.now();
            const fileAge = now - stats.mtime.getTime();
            
            if (fileAge < this.cacheExpiry) {
                console.log(`📁 Cache'den okunuyor: ${key}`);
                const data = await fs.readFile(cachePath, 'utf8');
                return JSON.parse(data);
            } else {
                console.log(`⏰ Cache süresi dolmuş: ${key}`);
                return null;
            }
        } catch (error) {
            console.log(`📁 Cache dosyası bulunamadı: ${key}`);
            return null;
        }
    }

    /**
     * Cache dosyasına yaz
     */
    async set(key, data) {
        try {
            // Cache klasörünü oluştur
            await fs.mkdir(this.cacheDir, { recursive: true });
            
            // Cache verisine timestamp ekle
            const cacheData = {
                ...data,
                cached_at: new Date().toISOString(),
                cache_key: key
            };
            
            // Cache'e yaz
            const cachePath = this.getCachePath(key);
            await fs.writeFile(cachePath, JSON.stringify(cacheData, null, 2));
            console.log(`💾 Cache'e kaydedildi: ${key} (${cachePath})`);
            return true;
        } catch (error) {
            console.error(`❌ Cache kaydetme hatası (${key}):`, error.message);
            return false;
        }
    }

    /**
     * Cache dosyasını sil
     */
    async delete(key) {
        try {
            const cachePath = this.getCachePath(key);
            await fs.unlink(cachePath);
            console.log(`🗑️ Cache silindi: ${key}`);
            return true;
        } catch (error) {
            console.log(`📁 Cache dosyası silinemedi: ${key}`);
            return false;
        }
    }

    /**
     * Cache'i sil (invalidate)
     */
    async invalidate(key) {
        return await this.delete(key);
    }

    /**
     * Cache var mı kontrol et
     */
    async exists(key) {
        try {
            const cachePath = this.getCachePath(key);
            await fs.access(cachePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Cache yaşını getir (milisaniye)
     */
    async getAge(key) {
        try {
            const cachePath = this.getCachePath(key);
            const stats = await fs.stat(cachePath);
            return Date.now() - stats.mtime.getTime();
        } catch (error) {
            return null;
        }
    }

    /**
     * Cache istatistikleri
     */
    async getStats() {
        try {
            const files = await fs.readdir(this.cacheDir);
            const stats = {
                total_files: files.length,
                files: []
            };
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.cacheDir, file);
                    const stat = await fs.stat(filePath);
                    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    
                    stats.files.push({
                        key: file.replace('.json', ''),
                        size: stat.size,
                        created: stat.birthtime,
                        modified: stat.mtime,
                        cached_at: data.cached_at,
                        count: data.suggestions ? data.suggestions.length : 0
                    });
                }
            }
            
            return stats;
        } catch (error) {
            console.error('❌ Cache istatistik hatası:', error.message);
            return { total_files: 0, files: [] };
        }
    }
}

module.exports = CacheService;
