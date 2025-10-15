'use strict';

const IRepository = require('./IRepository');

/**
 * Track Repository Interface
 * Track repository interface'i
 */
class ITrackRepository extends IRepository {
    /**
     * Path'e göre track bul
     * @param {string} path
     * @returns {Promise<Track|null>}
     */
    async findByPath(path) {
        throw new Error('Method not implemented: findByPath');
    }

    /**
     * Normalize edilmiş dosya adına göre bul
     * @param {string} normalizedName
     * @returns {Promise<Track[]>}
     */
    async findByNormalizedName(normalizedName) {
        throw new Error('Method not implemented: findByNormalizedName');
    }

    /**
     * Toplu oluştur (bulk insert)
     * @param {Track[]} entities
     * @returns {Promise<{added: number, skipped: number, errors: number}>}
     */
    async bulkCreate(entities) {
        throw new Error('Method not implemented: bulkCreate');
    }

    /**
     * Playlist ID'sine göre track'leri getir
     * @param {number} playlistId
     * @returns {Promise<Track[]>}
     */
    async findByPlaylistId(playlistId) {
        throw new Error('Method not implemented: findByPlaylistId');
    }

    /**
     * Tüm kayıtları sil
     * @returns {Promise<number>} Silinen kayıt sayısı
     */
    async deleteAll() {
        throw new Error('Method not implemented: deleteAll');
    }
}

module.exports = ITrackRepository;

