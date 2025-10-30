'use strict';

const Database = require('better-sqlite3');
const config = require('../../shared/config');

/**
 * Database Connection Singleton
 * Better-sqlite3 connection yönetimi
 */
class DatabaseConnection {
    constructor() {
        this.db = null;
        this.isConnected = false;
    }

    /**
     * Database'e bağlan
     */
    connect() {
        if (this.isConnected && this.db) {
            return this.db;
        }

        try {
            const dbPath = config.getDatabasePath();
            console.log(`📊 Database bağlantısı kuruluyor: ${dbPath}`);
            
            this.db = new Database(dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
            
            this.isConnected = true;
            console.log(`✅ Database bağlantısı başarılı`);
            
            return this.db;
        } catch (error) {
            console.error(`❌ Database bağlantı hatası: ${error.message}`);
            throw error;
        }
    }

    /**
     * Database bağlantısını al (varsa)
     */
    getConnection() {
        if (!this.isConnected || !this.db) {
            return this.connect();
        }
        return this.db;
    }

    /**
     * Database bağlantısını kapat
     */
    close() {
        if (this.db && this.isConnected) {
            try {
                this.db.close();
                this.isConnected = false;
                console.log(`✅ Database bağlantısı kapatıldı`);
            } catch (error) {
                console.error(`❌ Database kapatma hatası: ${error.message}`);
            }
        }
    }

    /**
     * Database istatistikleri
     */
    getStats() {
        if (!this.isConnected) {
            return null;
        }

        try {
            return {
                musicFiles: this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count,
                tracks: this.db.prepare('SELECT COUNT(*) as count FROM tracks').get().count,
                playlists: this.db.prepare('SELECT COUNT(*) as count FROM playlists').get().count,
                playlistTracks: this.db.prepare('SELECT COUNT(*) as count FROM playlist_tracks').get().count,
                trackWords: this.db.prepare('SELECT COUNT(*) as count FROM track_words').get().count,
                musicWords: this.db.prepare('SELECT COUNT(*) as count FROM music_words').get().count,
                importSessions: this.db.prepare('SELECT COUNT(*) as count FROM import_sessions').get().count
            };
        } catch (error) {
            console.error(`❌ Database stats hatası: ${error.message}`);
            return null;
        }
    }
}

// Singleton instance
let instance = null;

/**
 * Database connection singleton'ını al
 */
function getDatabaseConnection() {
    if (!instance) {
        instance = new DatabaseConnection();
    }
    return instance;
}

module.exports = {
    DatabaseConnection,
    getDatabaseConnection
};

