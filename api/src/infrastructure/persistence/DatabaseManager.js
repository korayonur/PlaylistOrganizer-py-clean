'use strict';

const { getDatabaseConnection } = require('../database/connection');
const { applySchema } = require('../database/schema');
const MusicFileRepository = require('../database/repositories/MusicFileRepository');
const TrackRepository = require('../database/repositories/TrackRepository');
const PlaylistRepository = require('../database/repositories/PlaylistRepository');
const ImportSessionRepository = require('../database/repositories/ImportSessionRepository');

/**
 * Database Manager
 * Repository'leri yöneten merkezi sınıf
 */
class DatabaseManager {
    constructor() {
        this.connection = null;
        this.db = null;
        this.repositories = {};
    }

    /**
     * Database'i başlat
     */
    initialize() {
        if (this.db) {
            return; // Already initialized
        }

        // Connection'ı al
        this.connection = getDatabaseConnection();
        this.db = this.connection.connect();

        // Schema'yı uygula
        applySchema(this.db);

        // Repository'leri oluştur
        this.repositories.musicFiles = new MusicFileRepository(this.db);
        this.repositories.tracks = new TrackRepository(this.db);
        this.repositories.playlists = new PlaylistRepository(this.db);
        this.repositories.importSessions = new ImportSessionRepository(this.db);

        console.log('✅ DatabaseManager başlatıldı');
    }

    /**
     * Repository'leri al
     */
    getRepositories() {
        if (!this.db) {
            this.initialize();
        }
        return this.repositories;
    }

    /**
     * Database instance'ı al
     */
    getDatabase() {
        if (!this.db) {
            this.initialize();
        }
        return this.db;
    }

    /**
     * Database istatistikleri
     */
    getStats() {
        if (!this.connection) {
            return null;
        }
        return this.connection.getStats();
    }

    /**
     * Database'i kapat
     */
    close() {
        if (this.connection) {
            this.connection.close();
            this.db = null;
            this.repositories = {};
        }
    }
}

// Singleton instance
let instance = null;

/**
 * DatabaseManager singleton'ını al
 */
function getDatabaseManager() {
    if (!instance) {
        instance = new DatabaseManager();
    }
    return instance;
}

module.exports = {
    DatabaseManager,
    getDatabaseManager
};

