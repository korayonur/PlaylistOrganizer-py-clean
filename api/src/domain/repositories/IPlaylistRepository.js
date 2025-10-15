'use strict';

const IRepository = require('./IRepository');

/**
 * Playlist Repository Interface
 * Playlist repository interface'i
 */
class IPlaylistRepository extends IRepository {
    /**
     * Path'e göre playlist bul
     * @param {string} path
     * @returns {Promise<Playlist|null>}
     */
    async findByPath(path) {
        throw new Error('Method not implemented: findByPath');
    }

    /**
     * Type'a göre playlist'leri bul
     * @param {string} type - 'm3u' veya 'vdjfolder'
     * @returns {Promise<Playlist[]>}
     */
    async findByType(type) {
        throw new Error('Method not implemented: findByType');
    }

    /**
     * Toplu oluştur (bulk insert)
     * @param {Playlist[]} entities
     * @returns {Promise<Playlist[]>}
     */
    async bulkCreate(entities) {
        throw new Error('Method not implemented: bulkCreate');
    }

    /**
     * Playlist track count güncelle
     * @param {number} playlistId
     * @param {number} count
     * @returns {Promise<boolean>}
     */
    async updateTrackCount(playlistId, count) {
        throw new Error('Method not implemented: updateTrackCount');
    }

    /**
     * Track'leri ile birlikte playlist getir
     * @param {number} playlistId
     * @returns {Promise<{playlist: Playlist, tracks: Track[]}>}
     */
    async findByIdWithTracks(playlistId) {
        throw new Error('Method not implemented: findByIdWithTracks');
    }

    /**
     * Tüm kayıtları sil
     * @returns {Promise<number>} Silinen kayıt sayısı
     */
    async deleteAll() {
        throw new Error('Method not implemented: deleteAll');
    }
}

module.exports = IPlaylistRepository;

