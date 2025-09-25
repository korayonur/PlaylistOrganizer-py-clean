'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

/**
 * Ortak Database Katmanı
 * Tüm modüller için merkezi veritabanı yönetimi
 */
class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, '../../musicfiles.db');
        this.db = null;
        this.statements = {};
        this.initialize();
    }

    initialize() {
        try {
            // Veritabanı dosyasını oluştur veya aç
            this.db = new Database(this.dbPath);
            
            // WAL modunu etkinleştir (performans için)
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('cache_size = 10000');
            this.db.pragma('temp_store = MEMORY');
            
        // UDF fonksiyonları kaldırıldı
            
            // Tabloları oluştur
            this.createTables();
            this.prepareStatements();
            
            console.log('✅ Ortak Database Manager başlatıldı:', this.dbPath);
        } catch (error) {
            console.error('❌ Database Manager başlatılamadı:', error);
            throw error;
        }
    }

    // UDF fonksiyonları kaldırıldı - JavaScript yaklaşımı kullanılıyor

    createTables() {
        // Music files tablosu (mevcut)
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
            )
        `);

        // Tracks tablosu (unified)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL,
                fileName TEXT NOT NULL,
                fileNameOnly TEXT NOT NULL,
                normalizedFileName TEXT NOT NULL,
                source TEXT NOT NULL, -- 'history', 'playlist'
                source_id INTEGER, -- history_track_id veya playlist_id
                source_file TEXT, -- m3u_file_path veya playlist_name
                track_order INTEGER, -- playlist'teki sıra
                is_matched BOOLEAN DEFAULT 0,
                matched_music_file_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (matched_music_file_id) REFERENCES music_files(id)
            )
        `);

        // Import sessions tablosu (yeni)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS import_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'scanning',
                total_files INTEGER DEFAULT 0,
                processed_files INTEGER DEFAULT 0,
                added_files INTEGER DEFAULT 0,
                skipped_files INTEGER DEFAULT 0,
                error_files INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
            )
        `);

        // Playlists tablosu kaldırıldı - tracks tablosundan sorgulanabilir


        // Index'ler oluştur
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_music_files_path ON music_files(path);
            CREATE INDEX IF NOT EXISTS idx_music_files_fileName ON music_files(fileName);
            CREATE INDEX IF NOT EXISTS idx_music_files_fileNameOnly ON music_files(fileNameOnly);
            CREATE INDEX IF NOT EXISTS idx_music_files_normalized ON music_files(normalizedFileName);
            CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path);
            CREATE INDEX IF NOT EXISTS idx_tracks_fileName ON tracks(fileName);
            CREATE INDEX IF NOT EXISTS idx_tracks_fileNameOnly ON tracks(fileNameOnly);
            CREATE INDEX IF NOT EXISTS idx_tracks_normalized ON tracks(normalizedFileName);
            CREATE INDEX IF NOT EXISTS idx_tracks_source ON tracks(source);
            CREATE INDEX IF NOT EXISTS idx_tracks_matched ON tracks(is_matched);
            CREATE INDEX IF NOT EXISTS idx_tracks_source_id ON tracks(source_id);
        `);

        // View'ları oluştur
        this.createViews();
    }

    createViews() {
        // 1. Exact Path Match View - Tam yol eşleşmesi
        this.db.exec(`
            CREATE VIEW IF NOT EXISTS v_exact_path_matches AS
            SELECT 
                t.id as track_id,
                t.path as track_path,
                t.fileName as track_fileName,
                t.source as track_source,
                t.source_file as track_source_file,
                mf.id as music_file_id,
                mf.path as music_file_path,
                mf.fileName as music_file_name,
                'exact_path' as match_type,
                1.0 as match_confidence,
                t.created_at as matched_at
            FROM tracks t
            INNER JOIN music_files mf ON t.path = mf.path
            WHERE t.is_matched = 1
        `);

        // 2. Filename Match View - Dosya adı eşleşmesi
        this.db.exec(`
            CREATE VIEW IF NOT EXISTS v_filename_matches AS
            SELECT 
                t.id as track_id,
                t.path as track_path,
                t.fileName as track_fileName,
                t.source as track_source,
                t.source_file as track_source_file,
                mf.id as music_file_id,
                mf.path as music_file_path,
                mf.fileName as music_file_name,
                'filename' as match_type,
                0.9 as match_confidence,
                t.updated_at as matched_at
            FROM tracks t
            INNER JOIN music_files mf ON t.fileName = mf.fileName
            WHERE t.is_matched = 1
            AND t.path != mf.path  -- Exact path değil
        `);

        // 3. Filename-Only Match View - Uzantısız dosya adı eşleşmesi
        this.db.exec(`
            CREATE VIEW IF NOT EXISTS v_filename_only_matches AS
            SELECT 
                t.id as track_id,
                t.path as track_path,
                t.fileName as track_fileName,
                t.fileNameOnly as track_fileNameOnly,
                t.source as track_source,
                t.source_file as track_source_file,
                mf.id as music_file_id,
                mf.path as music_file_path,
                mf.fileName as music_file_name,
                mf.fileNameOnly as music_file_nameOnly,
                'filename_only' as match_type,
                0.8 as match_confidence,
                t.updated_at as matched_at
            FROM tracks t
            INNER JOIN music_files mf ON t.fileNameOnly = mf.fileNameOnly
            WHERE t.is_matched = 1
            AND t.path != mf.path  -- Exact path değil
            AND t.fileName != mf.fileName  -- Filename match değil
        `);

        // 4. Unmatched Tracks View - Eşleşmemiş track'ler
        this.db.exec(`
            CREATE VIEW IF NOT EXISTS v_unmatched_tracks AS
            SELECT 
                t.id as track_id,
                t.path as track_path,
                t.fileName as track_fileName,
                t.fileNameOnly as track_fileNameOnly,
                t.normalizedFileName as track_normalized,
                t.source as track_source,
                t.source_file as track_source_file,
                t.created_at,
                'unmatched' as status
            FROM tracks t
            WHERE t.is_matched = 0
        `);

        // 5. All Matches Summary View - Tüm eşleşmelerin özeti
        this.db.exec(`
            CREATE VIEW IF NOT EXISTS v_all_matches_summary AS
            SELECT 
                match_type,
                COUNT(*) as match_count,
                AVG(match_confidence) as avg_confidence,
                MIN(matched_at) as first_match,
                MAX(matched_at) as last_match
            FROM (
                SELECT 'exact_path' as match_type, match_confidence, matched_at FROM v_exact_path_matches
                UNION ALL
                SELECT 'filename' as match_type, match_confidence, matched_at FROM v_filename_matches
                UNION ALL
                SELECT 'filename_only' as match_type, match_confidence, matched_at FROM v_filename_only_matches
            ) matches
            GROUP BY match_type
        `);

        console.log('✅ Eşleşme view\'ları oluşturuldu (5 view)');
    }

    prepareStatements() {
        // Music files için hazır sorgular
        this.statements.musicFiles = {
            insert: this.db.prepare(`
                INSERT OR REPLACE INTO music_files 
                (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `),
            findByPath: this.db.prepare(`
                SELECT * FROM music_files WHERE path = ?
            `),
            findByFileName: this.db.prepare(`
                SELECT * FROM music_files WHERE fileName = ?
            `),
            findByFileNameOnly: this.db.prepare(`
                SELECT * FROM music_files WHERE fileNameOnly = ?
            `),
            findByNormalized: this.db.prepare(`
                SELECT * FROM music_files WHERE normalizedFileName = ?
            `),
            count: this.db.prepare(`
                SELECT COUNT(*) as count FROM music_files
            `)
        };

        // Tracks için hazır sorgular (unified)
        this.statements.tracks = {
            insert: this.db.prepare(`
                INSERT INTO tracks 
                (path, fileName, fileNameOnly, normalizedFileName, source, source_id, source_file, track_order, is_matched, matched_music_file_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `),
            findByPath: this.db.prepare(`
                SELECT * FROM tracks WHERE path = ?
            `),
            findByFileName: this.db.prepare(`
                SELECT * FROM tracks WHERE fileName = ?
            `),
            findByFileNameOnly: this.db.prepare(`
                SELECT * FROM tracks WHERE fileNameOnly = ?
            `),
            findByNormalized: this.db.prepare(`
                SELECT * FROM tracks WHERE normalizedFileName = ?
            `),
            findBySource: this.db.prepare(`
                SELECT * FROM tracks WHERE source = ? AND source_id = ?
            `),
            findUnmatched: this.db.prepare(`
                SELECT * FROM tracks WHERE is_matched = 0
            `),
            findMatched: this.db.prepare(`
                SELECT * FROM tracks WHERE is_matched = 1
            `),
            findAll: this.db.prepare(`
                SELECT * FROM tracks ORDER BY created_at DESC
            `),
            count: this.db.prepare(`
                SELECT COUNT(*) as count FROM tracks
            `),
            countMatched: this.db.prepare(`
                SELECT COUNT(*) as count FROM tracks WHERE is_matched = 1
            `),
            countUnmatched: this.db.prepare(`
                SELECT COUNT(*) as count FROM tracks WHERE is_matched = 0
            `),
            countBySource: this.db.prepare(`
                SELECT COUNT(*) as count FROM tracks WHERE source = ?
            `)
        };

        // Import sessions için hazır sorgular
        this.statements.importSessions = {
            insert: this.db.prepare(`
                INSERT INTO import_sessions 
                (path, status, total_files, processed_files, added_files, skipped_files, error_files)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `),
            update: this.db.prepare(`
                UPDATE import_sessions 
                SET status = ?, processed_files = ?, added_files = ?, skipped_files = ?, error_files = ?, completed_at = ?
                WHERE id = ?
            `),
            findById: this.db.prepare(`
                SELECT * FROM import_sessions WHERE id = ?
            `),
            findByPath: this.db.prepare(`
                SELECT * FROM import_sessions WHERE path = ? ORDER BY created_at DESC LIMIT 1
            `)
        };

        // Playlists statements kaldırıldı

    }

    // Transaction wrapper
    transaction(callback) {
        const transaction = this.db.transaction(callback);
        return transaction;
    }

    // Generic query method
    query(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.all(params);
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    // Generic execute method
    execute(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            return stmt.run(params);
        } catch (error) {
            console.error('Database execute error:', error);
            throw error;
        }
    }

    // Get prepared statement
    getStatement(category, name) {
        if (!this.statements[category] || !this.statements[category][name]) {
            throw new Error(`Statement not found: ${category}.${name}`);
        }
        return this.statements[category][name];
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close();
            console.log('✅ Database connection closed');
        }
    }

    // Get database statistics
    getStats() {
        const musicFilesCount = this.statements.musicFiles.count.get().count;
        const tracksCount = this.statements.tracks.count.get().count;
        
        const dbSize = fs.statSync(this.dbPath).size;

        return {
            musicFiles: musicFilesCount,
            tracks: tracksCount,
            dbSize,
            dbPath: this.dbPath
        };
    }
}

// Singleton instance
let dbInstance = null;

function getDatabase() {
    if (!dbInstance) {
        dbInstance = new DatabaseManager();
    }
    return dbInstance;
}

module.exports = {
    DatabaseManager,
    getDatabase
};
