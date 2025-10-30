-- PlaylistOrganizer Database Schema
-- Clean Architecture uyumlu, API'dan Avalonia'ya migration için optimize edilmiş

-- ==============================================
-- CORE ENTITIES
-- ==============================================

-- Music Files Table (Core Entity)
CREATE TABLE IF NOT EXISTS music_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    fileName TEXT NOT NULL,
    fileNameOnly TEXT NOT NULL,
    normalizedFileName TEXT NOT NULL,
    extension TEXT,
    size INTEGER,
    modifiedTime INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Playlists Table (Core Entity)
CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Folder', 'Playlist', 'Root', 'vdjfolder')),
    track_count INTEGER DEFAULT 0 CHECK (track_count >= 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tracks Table (Core Entity)
CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    fileName TEXT NOT NULL,
    fileNameOnly TEXT NOT NULL,
    normalizedFileName TEXT NOT NULL,
    status TEXT DEFAULT 'Missing' CHECK (status IN ('Found', 'Missing', 'Error', 'Processing')),
    playlist_file_path TEXT NOT NULL,
    track_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(path, playlist_file_path, track_order)
);

-- ==============================================
-- SEARCH & INDEXING TABLES
-- ==============================================

-- Track Words Table (Full-text search)
CREATE TABLE IF NOT EXISTS track_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL,
    word TEXT NOT NULL,
    word_length INTEGER NOT NULL,
    word_position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- Music Words Table (Full-text search)
CREATE TABLE IF NOT EXISTS music_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    music_file_id INTEGER NOT NULL,
    word TEXT NOT NULL,
    word_length INTEGER NOT NULL,
    word_position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (music_file_id) REFERENCES music_files(id) ON DELETE CASCADE
);

-- ==============================================
-- OPERATIONAL TABLES
-- ==============================================

-- Import Sessions Table (Audit & Progress)
CREATE TABLE IF NOT EXISTS import_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_type TEXT NOT NULL CHECK (session_type IN ('import', 'scan', 'validate')),
    source_path TEXT,
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    added_files INTEGER DEFAULT 0,
    skipped_files INTEGER DEFAULT 0,
    error_files INTEGER DEFAULT 0,
    music_files_count INTEGER DEFAULT 0,
    tracks_count INTEGER DEFAULT 0,
    playlists_count INTEGER DEFAULT 0,
    index_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    error_message TEXT
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Music Files Indexes
CREATE INDEX IF NOT EXISTS idx_music_files_path ON music_files(path);
CREATE INDEX IF NOT EXISTS idx_music_files_fileName ON music_files(fileName);
CREATE INDEX IF NOT EXISTS idx_music_files_fileNameOnly ON music_files(fileNameOnly);
CREATE INDEX IF NOT EXISTS idx_music_files_normalizedFileName ON music_files(normalizedFileName);
CREATE INDEX IF NOT EXISTS idx_music_files_extension ON music_files(extension);

-- Playlists Indexes
CREATE INDEX IF NOT EXISTS idx_playlists_path ON playlists(path);
CREATE INDEX IF NOT EXISTS idx_playlists_type ON playlists(type);
CREATE INDEX IF NOT EXISTS idx_playlists_track_count ON playlists(track_count);

-- Tracks Indexes
CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path);
CREATE INDEX IF NOT EXISTS idx_tracks_fileName ON tracks(fileName);
CREATE INDEX IF NOT EXISTS idx_tracks_normalizedFileName ON tracks(normalizedFileName);
CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
CREATE INDEX IF NOT EXISTS idx_tracks_playlist_file_path ON tracks(playlist_file_path);
CREATE INDEX IF NOT EXISTS idx_tracks_order ON tracks(playlist_file_path, track_order);

-- Search Indexes
CREATE INDEX IF NOT EXISTS idx_track_words_word ON track_words(word);
CREATE INDEX IF NOT EXISTS idx_track_words_track ON track_words(track_id);
CREATE INDEX IF NOT EXISTS idx_track_words_position ON track_words(track_id, word_position);
CREATE UNIQUE INDEX IF NOT EXISTS idx_track_words_unique ON track_words(track_id, word, word_position);

CREATE INDEX IF NOT EXISTS idx_music_words_word ON music_words(word);
CREATE INDEX IF NOT EXISTS idx_music_words_music_file ON music_words(music_file_id);
CREATE INDEX IF NOT EXISTS idx_music_words_position ON music_words(music_file_id, word_position);
CREATE UNIQUE INDEX IF NOT EXISTS idx_music_words_unique ON music_words(music_file_id, word, word_position);

-- Import Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_import_sessions_type ON import_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_import_sessions_started ON import_sessions(started_at);

-- ==============================================
-- TRIGGERS FOR DATA INTEGRITY
-- ==============================================

-- Track Status Update Trigger - KALDIRILDI (Import sırasında kullanılmıyor)
