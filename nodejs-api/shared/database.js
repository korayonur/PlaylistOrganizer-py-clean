const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

class CleanDatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, '../../musicfiles.db');
        this.initialize();
    }

    initialize() {
        try {
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.createTables();
            // this.createViews(); // Geçici olarak devre dışı
            console.log('✅ Database başarıyla başlatıldı');
        } catch (error) {
            console.error('❌ Database başlatılamadı:', error.message);
            throw error;
        }
    }

    createTables() {
        // Music files tablosu
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS music_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE NOT NULL,
                fileName TEXT NOT NULL,
                fileNameOnly TEXT NOT NULL,
                normalizedFileName TEXT NOT NULL,
                extension TEXT,
                size INTEGER,
                modifiedTime INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Tracks tablosu (temizlenmiş)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL,
                fileName TEXT NOT NULL,
                fileNameOnly TEXT NOT NULL,
                normalizedFileName TEXT NOT NULL,
                source TEXT NOT NULL,
                source_file TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Import sessions tablosu
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS import_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT,
                total_files INTEGER DEFAULT 0,
                processed_files INTEGER DEFAULT 0,
                added_files INTEGER DEFAULT 0,
                skipped_files INTEGER DEFAULT 0,
                error_files INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Similarity fix suggestions tablosu
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS similarity_fix_suggestions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL,
                suggested_music_file_id INTEGER NOT NULL,
                similarity_score REAL NOT NULL,
                match_type TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (track_id) REFERENCES tracks (id),
                FOREIGN KEY (suggested_music_file_id) REFERENCES music_files (id)
            );
        `);
    }

    createViews() {
        // View'lar manuel olarak oluşturuldu, bu metod boş
        console.log('Viewlar manuel olarak olusturuldu');
    }

    getDatabase() {
        return this.db;
    }

    getCounts() {
        return {
            musicFiles: this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count,
            historyTracks: this.db.prepare('SELECT COUNT(*) as count FROM tracks').get().count,
            playlists: 0, // Geçici olarak 0
            dbSize: this.getDatabaseSize(),
            similarity_suggestions: 0, // Geçici olarak 0
            exact_path_matches: 0, // Geçici olarak 0
            filename_matches: 0, // Geçici olarak 0
            filename_only_matches: 0, // Geçici olarak 0
            normalized_matches: 0, // Geçici olarak 0
            unmatched_tracks: 0 // Geçici olarak 0
        };
    }

    getStats() {
        return this.getCounts();
    }

    /**
     * Veritabanı boyutunu al
     */
    getDatabaseSize() {
        try {
            const fs = require('fs');
            const path = require('path');
            const dbPath = path.join(__dirname, '../../musicfiles.db');
            const stats = fs.statSync(dbPath);
            return Math.round(stats.size / 1024 / 1024 * 100) / 100; // MB cinsinden
        } catch (error) {
            return 0;
        }
    }

    /**
     * SQL sorgusu çalıştır (execute wrapper)
     */
    execute(sql, params = []) {
        const stmt = this.db.prepare(sql);
        if (params.length > 0) {
            return stmt.get(...params);
        }
        return stmt.get();
    }

    // =====================================================
    // OPTİMİZE EDİLMİŞ METODLAR
    // =====================================================

    /**
     * Tam eşleşen kayıtları getir (optimize edilmiş)
     */
    getExactMatches(limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM v_exact_path_matches_optimized
            ORDER BY track_created_at DESC
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Tam eşleşmeyen kayıtları getir (optimize edilmiş)
     */
    getNonExactMatches(limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM v_filename_matches_optimized
            ORDER BY track_created_at DESC
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Dosya adı eşleşen kayıtları getir (optimize edilmiş)
     */
    getFilenameMatches(limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM v_filename_matches_optimized
            ORDER BY track_created_at DESC
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Sadece dosya adı eşleşen kayıtları getir (optimize edilmiş)
     */
    getFilenameOnlyMatches(limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM v_filename_only_matches_optimized
            ORDER BY track_created_at DESC
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Normalize edilmiş dosya adı eşleşen kayıtları getir (optimize edilmiş)
     */
    getNormalizedMatches(limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM v_normalized_matches_optimized
            ORDER BY track_created_at DESC
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Eşleşmeyen kayıtları getir (optimize edilmiş)
     */
    getUnmatchedTracks(limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM v_unmatched_tracks_optimized
            ORDER BY track_created_at DESC
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Tüm eşleşmelerin özetini getir (optimize edilmiş)
     */
    getAllMatchesSummary() {
        const stmt = this.db.prepare(`
            SELECT * FROM v_all_matches_summary_optimized
            ORDER BY match_count DESC
        `);
        return stmt.all();
    }

    /**
     * Müzik dosyası ekle
     */
    addMusicFile(fileData) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO music_files (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(
                fileData.path,
                fileData.fileName,
                fileData.fileNameOnly,
                fileData.normalizedFileName,
                fileData.extension,
                fileData.size,
                fileData.modifiedTime
            );
            
            return { success: true, id: result.lastInsertRowid };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, message: 'Dosya zaten mevcut' };
            }
            throw error;
        }
    }

    /**
     * Track ekle
     */
    addTrack(trackData) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO tracks (path, fileName, fileNameOnly, normalizedFileName, source, source_file)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(
                trackData.path,
                trackData.fileName,
                trackData.fileNameOnly,
                trackData.normalizedFileName,
                trackData.source,
                trackData.source_file
            );
            
            return { success: true, id: result.lastInsertRowid };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Import session oluştur
     */
    createImportSession(path, totalFiles) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO import_sessions (path, total_files, processed_files, added_files, skipped_files, error_files)
                VALUES (?, ?, 0, 0, 0, 0)
            `);
            
            const result = stmt.run(path, totalFiles);
            return result.lastInsertRowid;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Import session güncelle
     */
    updateImportSession(sessionId, updates) {
        try {
            const stmt = this.db.prepare(`
                UPDATE import_sessions 
                SET processed_files = ?, added_files = ?, skipped_files = ?, error_files = ?
                WHERE id = ?
            `);
            
            stmt.run(
                updates.processed_files || 0,
                updates.added_files || 0,
                updates.skipped_files || 0,
                updates.error_files || 0,
                sessionId
            );
            
            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Import session'ları getir
     */
    getImportSessions(limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM import_sessions
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Database'i kapat
     */
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

// Singleton instance
let dbInstance = null;

function getDatabase() {
    if (!dbInstance) {
        dbInstance = new CleanDatabaseManager();
    }
    return dbInstance;
}

module.exports = {
    CleanDatabaseManager,
    getDatabase
};
