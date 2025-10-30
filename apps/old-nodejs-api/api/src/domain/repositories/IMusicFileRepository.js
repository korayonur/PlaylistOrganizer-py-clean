'use strict';

const IRepository = require('./IRepository');

/**
 * MusicFile Repository Interface
 * Müzik dosyası repository interface'i
 */
class IMusicFileRepository extends IRepository {
    /**
     * Path'e göre müzik dosyası bul
     * @param {string} path
     * @returns {Promise<MusicFile|null>}
     */
    async findByPath(path) {
        throw new Error('Method not implemented: findByPath');
    }

    /**
     * Normalize edilmiş dosya adına göre bul
     * @param {string} normalizedName
     * @returns {Promise<MusicFile[]>}
     */
    async findByNormalizedName(normalizedName) {
        throw new Error('Method not implemented: findByNormalizedName');
    }

    /**
     * Toplu oluştur (bulk insert)
     * @param {MusicFile[]} entities
     * @returns {Promise<{added: number, skipped: number, errors: number}>}
     */
    async bulkCreate(entities) {
        throw new Error('Method not implemented: bulkCreate');
    }

    /**
     * Extension'a göre filtrele
     * @param {string} extension
     * @returns {Promise<MusicFile[]>}
     */
    async findByExtension(extension) {
        throw new Error('Method not implemented: findByExtension');
    }

    /**
     * Tüm kayıtları sil
     * @returns {Promise<number>} Silinen kayıt sayısı
     */
    async deleteAll() {
        throw new Error('Method not implemented: deleteAll');
    }
}

module.exports = IMusicFileRepository;

