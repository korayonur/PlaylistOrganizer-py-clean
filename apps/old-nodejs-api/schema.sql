CREATE TABLE music_files (
            path TEXT PRIMARY KEY NOT NULL,
            fileName TEXT NOT NULL,
            fileNameOnly TEXT NOT NULL,
            normalizedFileName TEXT NOT NULL,
            extension TEXT,
            size INTEGER,
            modifiedTime INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE import_sessions (
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
CREATE TABLE track_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_path TEXT NOT NULL,
            word TEXT NOT NULL,
            word_length INTEGER NOT NULL,
            word_position INTEGER NOT NULL,
            track_source TEXT NOT NULL,
            track_source_file TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
CREATE TABLE music_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            music_path TEXT NOT NULL,
            word TEXT NOT NULL,
            word_length INTEGER NOT NULL,
            word_position INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
CREATE INDEX idx_music_files_fileName ON music_files(fileName);
CREATE INDEX idx_music_files_fileNameOnly ON music_files(fileNameOnly);
CREATE INDEX idx_music_files_normalizedFileName ON music_files(normalizedFileName);
CREATE INDEX idx_track_words_word ON track_words(word);
CREATE INDEX idx_track_words_path ON track_words(track_path);
CREATE UNIQUE INDEX idx_track_words_unique 
            ON track_words(track_path, word, word_position);
CREATE INDEX idx_music_words_word ON music_words(word);
CREATE INDEX idx_music_words_path ON music_words(music_path);
CREATE UNIQUE INDEX idx_music_words_unique 
            ON music_words(music_path, word, word_position);
CREATE TABLE IF NOT EXISTS "playlists" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('m3u', 'vdjfolder', 'Folder', 'Playlist', 'Root')),
    track_count INTEGER DEFAULT 0 CHECK (track_count >= 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    parent_id INTEGER DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES "playlists"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "tracks" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    fileName TEXT NOT NULL,
    fileNameOnly TEXT NOT NULL,
    normalizedFileName TEXT NOT NULL,
    status TEXT DEFAULT 'Missing' CHECK (status IN ('Found', 'Missing', 'Error', 'Processing')),
    playlist_id INTEGER,
    music_file_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES "playlists"(id) ON DELETE SET NULL,
    FOREIGN KEY (music_file_id) REFERENCES music_files(path) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "playlist_tracks" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,
    track_order INTEGER CHECK (track_order > 0),
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES "playlists"(id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES "tracks"(id) ON DELETE CASCADE,
    UNIQUE(playlist_id, track_id)
);
CREATE INDEX idx_playlists_path ON playlists(path);
CREATE INDEX idx_playlists_type ON playlists(type);
CREATE INDEX idx_playlists_parent_type ON playlists(parent_id, type);
CREATE INDEX idx_tracks_path ON tracks(path);
CREATE INDEX idx_tracks_normalized ON tracks(normalizedFileName);
CREATE INDEX idx_tracks_playlist_status ON tracks(playlist_id, status);
CREATE INDEX idx_tracks_music_file ON tracks(music_file_id);
CREATE INDEX idx_tracks_status_created ON tracks(status, created_at);
CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_track ON playlist_tracks(track_id);
CREATE INDEX idx_playlist_tracks_order ON playlist_tracks(playlist_id, track_order);
CREATE TRIGGER tr_playlist_tracks_insert
    AFTER INSERT ON playlist_tracks
BEGIN
    UPDATE playlists 
    SET track_count = (
        SELECT COUNT(*) 
        FROM playlist_tracks 
        WHERE playlist_id = NEW.playlist_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.playlist_id;
END;
CREATE TRIGGER tr_playlist_tracks_delete
    AFTER DELETE ON playlist_tracks
BEGIN
    UPDATE playlists 
    SET track_count = (
        SELECT COUNT(*) 
        FROM playlist_tracks 
        WHERE playlist_id = OLD.playlist_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.playlist_id;
END;
CREATE VIEW v_database_stats AS
SELECT 
    'music_files' as table_name, 
    COUNT(*) as record_count,
    COUNT(DISTINCT extension) as unique_extensions,
    ROUND(AVG(size), 2) as avg_size
FROM music_files
UNION ALL
SELECT 
    'tracks' as table_name, 
    COUNT(*) as record_count,
    COUNT(DISTINCT status) as unique_statuses,
    COUNT(DISTINCT playlist_id) as unique_playlists
FROM tracks
UNION ALL
SELECT 
    'playlists' as table_name, 
    COUNT(*) as record_count,
    COUNT(DISTINCT type) as unique_types,
    ROUND(AVG(track_count), 2) as avg_track_count
FROM playlists
/* v_database_stats(table_name,record_count,unique_extensions,avg_size) */;
CREATE VIEW v_playlist_hierarchy AS
WITH RECURSIVE playlist_tree AS (
    -- Root playlists (parent_id = 0)
    SELECT 
        id, 
        name, 
        type, 
        parent_id, 
        track_count,
        0 as level,
        name as full_path
    FROM playlists 
    WHERE parent_id = 0
    
    UNION ALL
    
    -- Child playlists
    SELECT 
        p.id, 
        p.name, 
        p.type, 
        p.parent_id, 
        p.track_count,
        pt.level + 1,
        pt.full_path || '/' || p.name
    FROM playlists p
    INNER JOIN playlist_tree pt ON p.parent_id = pt.id
)
SELECT * FROM playlist_tree ORDER BY level, name
/* v_playlist_hierarchy(id,name,type,parent_id,track_count,level,full_path) */;
CREATE INDEX idx_music_files_path ON music_files(path);
CREATE INDEX idx_music_files_extension ON music_files(extension);
CREATE INDEX idx_playlists_track_count ON playlists(track_count);
CREATE INDEX idx_tracks_fileName ON tracks(fileName);
CREATE INDEX idx_tracks_normalizedFileName ON tracks(normalizedFileName);
CREATE INDEX idx_tracks_status ON tracks(status);
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
        GROUP BY t.id
/* v_unmatched_tracks(track_path,track_fileName,track_normalized,track_created_at,playlists,playlist_count,track_source_file,track_source) */;
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
        GROUP BY track_path
/* v_unmatched_tracks_indexed(track_path,track_normalized,track_fileName,track_source,track_source_file,playlists,playlist_count,row_num) */;
