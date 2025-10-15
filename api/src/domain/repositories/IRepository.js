'use strict';

/**
 * Base Repository Interface
 * Tüm repository'lerin implement edeceği temel interface
 */
class IRepository {
    /**
     * ID ile entity bul
     * @param {number} id
     * @returns {Promise<Entity|null>}
     */
    async findById(id) {
        throw new Error('Method not implemented: findById');
    }

    /**
     * Tüm entity'leri listele
     * @param {Object} options - Filtreleme, sıralama, sayfalama
     * @returns {Promise<Entity[]>}
     */
    async findAll(options = {}) {
        throw new Error('Method not implemented: findAll');
    }

    /**
     * Entity oluştur
     * @param {Entity} entity
     * @returns {Promise<Entity>}
     */
    async create(entity) {
        throw new Error('Method not implemented: create');
    }

    /**
     * Entity güncelle
     * @param {Entity} entity
     * @returns {Promise<Entity>}
     */
    async update(entity) {
        throw new Error('Method not implemented: update');
    }

    /**
     * Entity sil
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    async delete(id) {
        throw new Error('Method not implemented: delete');
    }

    /**
     * Toplam kayıt sayısı
     * @param {Object} criteria - Filtreleme kriterleri
     * @returns {Promise<number>}
     */
    async count(criteria = {}) {
        throw new Error('Method not implemented: count');
    }

    /**
     * Entity var mı?
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    async exists(id) {
        throw new Error('Method not implemented: exists');
    }
}

module.exports = IRepository;

