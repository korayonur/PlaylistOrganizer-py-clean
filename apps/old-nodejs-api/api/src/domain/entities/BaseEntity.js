'use strict';

/**
 * Base Entity Class
 * Tüm entity'lerin kalıtım alacağı temel sınıf
 */
class BaseEntity {
    constructor(data = {}) {
        this.id = data.id || null;
        this.created_at = data.created_at || new Date().toISOString();
    }

    /**
     * Entity'yi plain object'e çevir
     */
    toJSON() {
        return { ...this };
    }

    /**
     * Entity'yi database row formatına çevir
     */
    toDatabase() {
        const data = { ...this };
        if (data.id === null) {
            delete data.id; // Auto-increment için
        }
        return data;
    }

    /**
     * Entity ID'si var mı?
     */
    isPersisted() {
        return this.id !== null;
    }

    /**
     * İki entity eşit mi?
     */
    equals(other) {
        if (!other) return false;
        if (this.constructor !== other.constructor) return false;
        return this.id === other.id;
    }
}

module.exports = BaseEntity;

