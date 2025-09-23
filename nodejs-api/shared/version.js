/**
 * Versiyon Yönetim Sistemi
 * Her modül için ayrı versiyon takibi
 */

class VersionManager {
    constructor() {
        this.versions = {
            'shared': '1.0.0',
            'database': '1.0.0',
            'logger': '1.0.0',
            'utils': '1.0.0',
            'history': '2.0.0',
            'import': '1.0.0',
            'playlist': '1.0.0',
            'virtualdj': '1.0.0',
            'search': '1.0.0',
            'analytics': '1.0.0',
            'server': '1.0.0'
        };
        
        this.lastUpdated = new Date().toISOString();
    }

    /**
     * Modül versiyonunu al
     * @param {string} moduleName - Modül adı
     * @returns {string} Versiyon
     */
    getVersion(moduleName) {
        return this.versions[moduleName] || '0.0.0';
    }

    /**
     * Modül versiyonunu güncelle
     * @param {string} moduleName - Modül adı
     * @param {string} version - Yeni versiyon
     */
    updateVersion(moduleName, version) {
        this.versions[moduleName] = version;
        this.lastUpdated = new Date().toISOString();
    }

    /**
     * Otomatik versiyon artırma (patch)
     * @param {string} moduleName - Modül adı
     * @returns {string} Yeni versiyon
     */
    autoIncrementVersion(moduleName) {
        const currentVersion = this.getVersion(moduleName);
        const parts = currentVersion.split('.');
        const patch = parseInt(parts[2]) + 1;
        const newVersion = `${parts[0]}.${parts[1]}.${patch}`;
        
        this.updateVersion(moduleName, newVersion);
        return newVersion;
    }

    /**
     * Dosya değişiklik tarihine göre versiyon artırma
     * @param {string} moduleName - Modül adı
     * @param {string} filePath - Dosya yolu
     * @returns {string} Yeni versiyon
     */
    autoIncrementByFileChange(moduleName, filePath) {
        const fs = require('fs');
        
        try {
            const stats = fs.statSync(filePath);
            const fileModified = stats.mtime.getTime();
            const lastUpdated = new Date(this.lastUpdated).getTime();
            
            // Dosya son değişiklikten sonra değişmişse versiyon artır
            if (fileModified > lastUpdated) {
                const newVersion = this.autoIncrementVersion(moduleName);
                console.log(`🔄 ${moduleName} version auto-incremented to ${newVersion} (file changed)`);
                return newVersion;
            }
            
            return this.getVersion(moduleName);
        } catch (error) {
            // Dosya bulunamazsa versiyon artır
            const newVersion = this.autoIncrementVersion(moduleName);
            console.log(`🔄 ${moduleName} version auto-incremented to ${newVersion} (file not found)`);
            return newVersion;
        }
    }

    /**
     * Tüm versiyonları al
     * @returns {Object} Tüm modül versiyonları
     */
    getAllVersions() {
        return {
            versions: this.versions,
            lastUpdated: this.lastUpdated,
            totalModules: Object.keys(this.versions).length
        };
    }

    /**
     * Versiyon uyumluluğunu kontrol et
     * @param {string} moduleName - Modül adı
     * @param {string} requiredVersion - Gerekli versiyon
     * @returns {boolean} Uyumlu mu
     */
    isCompatible(moduleName, requiredVersion) {
        const currentVersion = this.getVersion(moduleName);
        return this.compareVersions(currentVersion, requiredVersion) >= 0;
    }

    /**
     * Versiyon karşılaştırması
     * @param {string} version1 - İlk versiyon
     * @param {string} version2 - İkinci versiyon
     * @returns {number} -1: version1 < version2, 0: eşit, 1: version1 > version2
     */
    compareVersions(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part < v2Part) return -1;
            if (v1Part > v2Part) return 1;
        }
        
        return 0;
    }

    /**
     * Modül değişiklik logunu al
     * @returns {Object} Değişiklik logu
     */
    getChangeLog() {
        return {
            lastUpdated: this.lastUpdated,
            modules: Object.keys(this.versions).map(module => ({
                name: module,
                version: this.versions[module],
                status: 'active'
            }))
        };
    }
}

// Singleton instance
const versionManager = new VersionManager();

module.exports = versionManager;
