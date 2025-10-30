'use strict';

/**
 * Database Schema Definitions
 * Tablo tanımları ve index'ler
 */

/**
 * Schema'yı veritabanına uygula
 * @param {Database} db - Better-sqlite3 database instance
 */
function applySchema(db) {
    console.log('📋 Database schema kontrol ediliyor...');

    // Music files tablosu
    // ⚠️ UYARI: Mevcut DB'de path PRIMARY KEY (id yok!)
    db.exec(`
        CREATE TABLE IF NOT EXISTS music_files (
            path TEXT PRIMARY KEY NOT NULL,
            fileName TEXT NOT NULL,
            fileNameOnly TEXT NOT NULL,
            normalizedFileName TEXT NOT NULL,
            extension TEXT,
            size INTEGER,
            modifiedTime INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Tracks tablosu
    db.exec(`
        CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            fileName TEXT NOT NULL,
            fileNameOnly TEXT NOT NULL,
            normalizedFileName TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Playlists tablosu
    db.exec(`
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            track_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Playlist-Track ilişki tablosu
    db.exec(`
        CREATE TABLE IF NOT EXISTS playlist_tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER NOT NULL,
            track_id INTEGER NOT NULL,
            track_order INTEGER,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
            UNIQUE(playlist_id, track_id)
        );
    `);

    // Import sessions tablosu
    db.exec(`
        CREATE TABLE IF NOT EXISTS import_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT,
            total_files INTEGER DEFAULT 0,
            processed_files INTEGER DEFAULT 0,
            added_files INTEGER DEFAULT 0,
            skipped_files INTEGER DEFAULT 0,
            error_files INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            operation_type TEXT DEFAULT 'import',
            music_files_count INTEGER DEFAULT 0,
            tracks_count INTEGER DEFAULT 0,
            playlists_count INTEGER DEFAULT 0,
            index_count INTEGER DEFAULT 0
        );
    `);

    // Track words tablosu (kelime bazlı arama)
    db.exec(`
        CREATE TABLE IF NOT EXISTS track_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_path TEXT NOT NULL,
            word TEXT NOT NULL,
            word_length INTEGER NOT NULL,
            word_position INTEGER NOT NULL,
            track_source TEXT NOT NULL,
            track_source_file TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Music words tablosu (kelime bazlı arama)
    db.exec(`
        CREATE TABLE IF NOT EXISTS music_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            music_path TEXT NOT NULL,
            word TEXT NOT NULL,
            word_length INTEGER NOT NULL,
            word_position INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Index'ler - PERFORMANS İÇİN KRİTİK
    db.exec(`
        -- Music files index'leri (performans için önemli)
        CREATE INDEX IF NOT EXISTS idx_music_files_fileName ON music_files(fileName);
        CREATE INDEX IF NOT EXISTS idx_music_files_fileNameOnly ON music_files(fileNameOnly);
        CREATE INDEX IF NOT EXISTS idx_music_files_normalizedFileName ON music_files(normalizedFileName);
        
        -- Track words index'leri
        CREATE INDEX IF NOT EXISTS idx_track_words_word ON track_words(word);
        CREATE INDEX IF NOT EXISTS idx_track_words_path ON track_words(track_path);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_track_words_unique 
            ON track_words(track_path, word, word_position);
        
        -- Music words index'leri
        CREATE INDEX IF NOT EXISTS idx_music_words_word ON music_words(word);
        CREATE INDEX IF NOT EXISTS idx_music_words_path ON music_words(music_path);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_music_words_unique 
            ON music_words(music_path, word, word_position);
        
        -- Tracks index'leri
        CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path);
        CREATE INDEX IF NOT EXISTS idx_tracks_normalized ON tracks(normalizedFileName);
        
        -- Playlists index'leri
        CREATE INDEX IF NOT EXISTS idx_playlists_path ON playlists(path);
        CREATE INDEX IF NOT EXISTS idx_playlists_type ON playlists(type);
        
        -- Playlist tracks index'leri
        CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
        CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id);
    `);

    // Unmatched tracks view (analiz ve debug için)
    db.exec(`
        DROP VIEW IF EXISTS v_unmatched_tracks;
        CREATE VIEW v_unmatched_tracks AS
        SELECT 
            t.path as track_path,
            t.fileName as track_fileName,
            t.normalizedFileName as track_normalized,
            t.created_at as track_created_at,
            GROUP_CONCAT(DISTINCT p.name) as playlists,
            COUNT(DISTINCT pt.playlist_id) as playlist_count,
            GROUP_CONCAT(DISTINCT p.path) as track_source_file,
            GROUP_CONCAT(DISTINCT p.type) as track_source
        FROM tracks t
        LEFT JOIN playlist_tracks pt ON t.id = pt.track_id
        LEFT JOIN playlists p ON pt.playlist_id = p.id
        LEFT JOIN music_files m ON t.normalizedFileName = m.normalizedFileName
        WHERE m.path IS NULL
        GROUP BY t.id;
    `);

    // Unmatched tracks indexed view (pagination için)
    db.exec(`
        DROP VIEW IF EXISTS v_unmatched_tracks_indexed;
        CREATE VIEW v_unmatched_tracks_indexed AS
        SELECT 
            track_path,
            track_normalized,
            track_fileName,
            track_source,
            track_source_file,
            playlists,
            playlist_count,
            ROW_NUMBER() OVER (ORDER BY track_path) as row_num
        FROM v_unmatched_tracks
        WHERE track_normalized IS NOT NULL 
        AND track_normalized != ''
        GROUP BY track_path;
    `);

    console.log('✅ Database schema uygulandı');
}

module.exports = {
    applySchema
};

