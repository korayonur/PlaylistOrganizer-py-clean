'use strict';

const IRepository = require('./IRepository');

/**
 * ImportSession Repository Interface
 * Import session repository interface'i
 */
class IImportSessionRepository extends IRepository {
    /**
     * Path'e göre son session'ı bul
     * @param {string} path
     * @returns {Promise<ImportSession|null>}
     */
    async findLastByPath(path) {
        throw new Error('Method not implemented: findLastByPath');
    }

    /**
     * Son N session'ı getir
     * @param {number} limit
     * @returns {Promise<ImportSession[]>}
     */
    async findRecent(limit = 10) {
        throw new Error('Method not implemented: findRecent');
    }

    /**
     * Session istatistiklerini güncelle
     * @param {number} sessionId
     * @param {Object} stats
     * @returns {Promise<boolean>}
     */
    async updateStats(sessionId, stats) {
        throw new Error('Method not implemented: updateStats');
    }

    /**
     * Tüm session'ları sil
     * @returns {Promise<number>} Silinen kayıt sayısı
     */
    async deleteAll() {
        throw new Error('Method not implemented: deleteAll');
    }

    /**
     * Tamamlanan session'ları bul
     * @returns {Promise<ImportSession[]>}
     */
    async findCompleted() {
        throw new Error('Method not implemented: findCompleted');
    }
}

module.exports = IImportSessionRepository;

