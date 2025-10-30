-- Database İyileştirme Scripti - SQLite Uyumlu
-- PlaylistOrganizer Database Schema Improvements

-- 1. Foreign Key Constraints'i etkinleştir
PRAGMA foreign_keys = ON;

-- 2. Yeni tablolar oluştur (mevcut veriyi koruyarak)
-- playlists tablosunu yeniden oluştur
CREATE TABLE playlists_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('m3u', 'vdjfolder', 'Folder', 'Playlist', 'Root')),
    track_count INTEGER DEFAULT 0 CHECK (track_count >= 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    parent_id INTEGER DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES playlists_new(id) ON DELETE CASCADE
);

-- tracks tablosunu yeniden oluştur
CREATE TABLE tracks_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    fileName TEXT NOT NULL,
    fileNameOnly TEXT NOT NULL,
    normalizedFileName TEXT NOT NULL,
    status TEXT DEFAULT 'Missing' CHECK (status IN ('Found', 'Missing', 'Error', 'Processing')),
    playlist_id INTEGER,
    music_file_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists_new(id) ON DELETE SET NULL,
    FOREIGN KEY (music_file_id) REFERENCES music_files(path) ON DELETE SET NULL
);

-- playlist_tracks tablosunu yeniden oluştur
CREATE TABLE playlist_tracks_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,
    track_order INTEGER CHECK (track_order > 0),
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists_new(id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES tracks_new(id) ON DELETE CASCADE,
    UNIQUE(playlist_id, track_id)
);

-- 3. Veriyi yeni tablolara kopyala
INSERT INTO playlists_new SELECT * FROM playlists;
INSERT INTO tracks_new SELECT id, path, fileName, fileNameOnly, normalizedFileName, status, NULL, NULL, created_at FROM tracks;
INSERT INTO playlist_tracks_new SELECT * FROM playlist_tracks;

-- 4. Eski tabloları sil ve yenilerini yeniden adlandır
DROP TABLE playlist_tracks;
DROP TABLE tracks;
DROP TABLE playlists;

ALTER TABLE playlist_tracks_new RENAME TO playlist_tracks;
ALTER TABLE tracks_new RENAME TO tracks;
ALTER TABLE playlists_new RENAME TO playlists;

-- 5. Index'leri yeniden oluştur
CREATE INDEX IF NOT EXISTS idx_playlists_path ON playlists(path);
CREATE INDEX IF NOT EXISTS idx_playlists_type ON playlists(type);
CREATE INDEX IF NOT EXISTS idx_playlists_parent_type ON playlists(parent_id, type);
CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path);
CREATE INDEX IF NOT EXISTS idx_tracks_normalized ON tracks(normalizedFileName);
CREATE INDEX IF NOT EXISTS idx_tracks_playlist_status ON tracks(playlist_id, status);
CREATE INDEX IF NOT EXISTS idx_tracks_music_file ON tracks(music_file_id);
CREATE INDEX IF NOT EXISTS idx_tracks_status_created ON tracks(status, created_at);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_order ON playlist_tracks(playlist_id, track_order);

-- 6. Trigger'ları ekle
CREATE TRIGGER IF NOT EXISTS tr_playlist_tracks_insert
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

CREATE TRIGGER IF NOT EXISTS tr_playlist_tracks_delete
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

-- 7. View'ları güncelle
DROP VIEW IF EXISTS v_unmatched_tracks;
CREATE VIEW v_unmatched_tracks AS
SELECT 
    t.id as track_id,
    t.path as track_path,
    t.fileName as track_fileName,
    t.normalizedFileName as track_normalized,
    t.status as track_status,
    t.created_at as track_created_at,
    p.name as playlist_name,
    p.type as playlist_type,
    p.id as playlist_id,
    m.path as music_file_path,
    CASE WHEN m.path IS NOT NULL THEN 'Found' ELSE 'Missing' END as file_status
FROM tracks t
LEFT JOIN playlists p ON t.playlist_id = p.id
LEFT JOIN music_files m ON t.normalizedFileName = m.normalizedFileName;

-- 8. İstatistik view'ı
CREATE VIEW IF NOT EXISTS v_database_stats AS
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
FROM playlists;

-- 9. Veri tutarlılığı kontrolü
-- Eksik foreign key'leri temizle
UPDATE tracks SET playlist_id = NULL WHERE playlist_id NOT IN (SELECT id FROM playlists);
UPDATE tracks SET music_file_id = NULL WHERE music_file_id NOT IN (SELECT path FROM music_files);
UPDATE playlists SET parent_id = 0 WHERE parent_id NOT IN (SELECT id FROM playlists) AND parent_id != 0;

-- 10. Analiz için yararlı view'lar
CREATE VIEW IF NOT EXISTS v_playlist_hierarchy AS
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
SELECT * FROM playlist_tree ORDER BY level, name;

-- 11. Foreign key kontrolü
PRAGMA foreign_key_check;
