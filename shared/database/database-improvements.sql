-- Database İyileştirme Scripti
-- PlaylistOrganizer Database Schema Improvements

-- 1. Foreign Key Constraints'i etkinleştir
PRAGMA foreign_keys = ON;

-- 2. playlists tablosuna parent_id foreign key ekle
-- (Eğer parent_id = 0 ise root playlist, değilse alt playlist)
ALTER TABLE playlists ADD CONSTRAINT fk_playlists_parent 
    FOREIGN KEY (parent_id) REFERENCES playlists(id) ON DELETE CASCADE;

-- 3. tracks tablosuna playlist_id alanı ekle (eğer yoksa)
-- Bu alan hangi playlist'ten geldiğini gösterir
ALTER TABLE tracks ADD COLUMN playlist_id INTEGER;
ALTER TABLE tracks ADD CONSTRAINT fk_tracks_playlist 
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL;

-- 4. tracks tablosuna music_file_id alanı ekle
-- Bu alan music_files ile ilişki kurar
ALTER TABLE tracks ADD COLUMN music_file_id INTEGER;
ALTER TABLE tracks ADD CONSTRAINT fk_tracks_music_file 
    FOREIGN KEY (music_file_id) REFERENCES music_files(path) ON DELETE SET NULL;

-- 5. Status alanlarını enum'a çevir
-- tracks.status için CHECK constraint ekle
ALTER TABLE tracks ADD CONSTRAINT chk_tracks_status 
    CHECK (status IN ('Found', 'Missing', 'Error', 'Processing'));

-- playlists.type için CHECK constraint ekle  
ALTER TABLE playlists ADD CONSTRAINT chk_playlists_type 
    CHECK (type IN ('Folder', 'Playlist', 'Root'));

-- 6. Index'leri optimize et
-- Composite index'ler ekle
CREATE INDEX IF NOT EXISTS idx_playlists_parent_type 
    ON playlists(parent_id, type);

CREATE INDEX IF NOT EXISTS idx_tracks_playlist_status 
    ON tracks(playlist_id, status);

CREATE INDEX IF NOT EXISTS idx_tracks_music_file 
    ON tracks(music_file_id);

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

-- 8. Trigger'lar ekle - Otomatik güncellemeler için
-- playlist_tracks tablosuna kayıt eklenince track_count güncelle
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

-- playlist_tracks tablosundan kayıt silinince track_count güncelle
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

-- 9. Veri tutarlılığı için CHECK constraint'ler
-- track_order pozitif olmalı
ALTER TABLE playlist_tracks ADD CONSTRAINT chk_playlist_tracks_order 
    CHECK (track_order > 0);

-- track_count negatif olmamalı
ALTER TABLE playlists ADD CONSTRAINT chk_playlists_track_count 
    CHECK (track_count >= 0);

-- 10. Performance için ek index'ler
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_order 
    ON playlist_tracks(playlist_id, track_order);

CREATE INDEX IF NOT EXISTS idx_tracks_status_created 
    ON tracks(status, created_at);

-- 11. Veri temizliği için script
-- Eksik foreign key'leri temizle
UPDATE tracks SET playlist_id = NULL WHERE playlist_id NOT IN (SELECT id FROM playlists);
UPDATE tracks SET music_file_id = NULL WHERE music_file_id NOT IN (SELECT path FROM music_files);
UPDATE playlists SET parent_id = 0 WHERE parent_id NOT IN (SELECT id FROM playlists) AND parent_id != 0;

-- 12. Analiz için yararlı view'lar
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

-- 13. İstatistik view'ı
CREATE VIEW IF NOT EXISTS v_database_stats AS
SELECT 
    'music_files' as table_name, 
    COUNT(*) as record_count,
    COUNT(DISTINCT extension) as unique_extensions,
    AVG(size) as avg_size
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
    AVG(track_count) as avg_track_count
FROM playlists;
