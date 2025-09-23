'use strict';

const { getDatabase } = require('../../shared/database');
const { getLogger } = require('../../shared/logger');

class PlaylistRepository {
    constructor() {
        this.dbManager = getDatabase();
        this.logger = getLogger().module('PlaylistRepository');
        this.initializeTables();
    }

    /**
     * Tabloları başlat
     */
    initializeTables() {
        try {
            // Playlists tablosu kaldırıldı - tracks tablosundan sorgulanabilir
            this.logger.info('Playlist sistemi tracks tablosuna uyarlandı');
        } catch (error) {
            this.logger.error(`Tablo başlatma hatası: ${error.message}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Playlist oluştur (tracks tablosuna kaydet)
     * @param {Object} playlistData
     */
    createPlaylist(playlistData) {
        try {
            // Playlist bilgisini tracks tablosuna kaydet
            const stmt = this.dbManager.db.prepare(`
                INSERT INTO tracks (path, normalized_name, source, source_file, track_order, is_matched, matched_music_file_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(
                playlistData.path, // Playlist dosya yolu
                playlistData.name, // Playlist adı
                'playlist', // Source
                playlistData.path, // Source file
                0, // Track order
                0, // Is matched
                null // Matched music file id
            );

            this.logger.info(`Playlist oluşturuldu: ${playlistData.name}`, { trackId: result.lastInsertRowid });
            return result.lastInsertRowid;
        } catch (error) {
            this.logger.error(`Playlist oluşturma hatası: ${error.message}`, { playlistData, error: error.message });
            throw error;
        }
    }

    /**
     * Playlist'i ID ile getir (tracks tablosundan)
     * @param {number} playlistId
     */
    getPlaylistById(playlistId) {
        try {
            const stmt = this.dbManager.db.prepare(`
                SELECT * FROM tracks WHERE id = ? AND source = 'playlist'
            `);
            return stmt.get(playlistId);
        } catch (error) {
            this.logger.error(`Playlist getirme hatası: ${error.message}`, { playlistId, error: error.message });
            throw error;
        }
    }

    /**
     * Tüm playlist'leri getir
     * @param {number} limit
     * @param {number} offset
     */
    getAllPlaylists(limit = 50, offset = 0) {
        try {
            const stmt = this.dbManager.db.prepare(`
                SELECT * FROM tracks 
                WHERE source = 'playlist'
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `);
            return stmt.all(limit, offset);
        } catch (error) {
            this.logger.error(`Playlist listeleme hatası: ${error.message}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Playlist'i güncelle
     * @param {number} playlistId
     * @param {Object} updateData
     */
    updatePlaylist(playlistId, updateData) {
        try {
            const fields = [];
            const values = [];
            
            if (updateData.name) {
                fields.push('name = ?');
                values.push(updateData.name);
            }
            if (updateData.path) {
                fields.push('path = ?');
                values.push(updateData.path);
            }
            if (updateData.file_count !== undefined) {
                fields.push('file_count = ?');
                values.push(updateData.file_count);
            }
            
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(playlistId);

            const stmt = this.dbManager.db.prepare(`
                UPDATE playlists 
                SET ${fields.join(', ')}
                WHERE id = ?
            `);
            
            const result = stmt.run(...values);
            return result.changes > 0;
        } catch (error) {
            this.logger.error(`Playlist güncelleme hatası: ${error.message}`, { playlistId, updateData, error: error.message });
            throw error;
        }
    }

    /**
     * Playlist'i sil
     * @param {number} playlistId
     */
    deletePlaylist(playlistId) {
        try {
            // Önce playlist'e ait track'leri sil
            const deleteTracksStmt = this.dbManager.db.prepare(`
                DELETE FROM tracks WHERE source = 'playlist' AND source_id = ?
            `);
            deleteTracksStmt.run(playlistId);

            // Playlist tracks tablosunda silindi
            const result = { changes: 1 };

            this.logger.info(`Playlist silindi: ${playlistId}`, { playlistId });
            return result.changes > 0;
        } catch (error) {
            this.logger.error(`Playlist silme hatası: ${error.message}`, { playlistId, error: error.message });
            throw error;
        }
    }

    /**
     * Playlist'e track ekle
     * @param {number} playlistId
     * @param {string} trackPath
     * @param {number} trackOrder
     */
    addTrackToPlaylist(playlistId, trackPath, trackOrder) {
        try {
            const stmt = this.dbManager.db.prepare(`
                INSERT INTO tracks 
                (path, normalized_name, source, source_id, track_order, is_matched, matched_music_file_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            // Normalized name oluştur
            const normalizedName = trackPath.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Music file ile eşleştir
            const musicFileStmt = this.dbManager.db.prepare(`
                SELECT id FROM music_files WHERE path = ?
            `);
            const musicFile = musicFileStmt.get(trackPath);

            const result = stmt.run(
                trackPath,
                normalizedName,
                'playlist',
                playlistId,
                trackOrder,
                musicFile ? 1 : 0, // is_matched
                musicFile ? musicFile.id : null // matched_music_file_id
            );

            this.logger.info(`Track playlist'e eklendi: ${trackPath}`, { playlistId, trackOrder });
            return result.lastInsertRowid;
        } catch (error) {
            this.logger.error(`Track ekleme hatası: ${error.message}`, { playlistId, trackPath, trackOrder, error: error.message });
            throw error;
        }
    }

    /**
     * Playlist'ten track çıkar
     * @param {number} playlistId
     * @param {string} trackPath
     */
    removeTrackFromPlaylist(playlistId, trackPath) {
        try {
            const stmt = this.dbManager.db.prepare(`
                DELETE FROM tracks 
                WHERE source = 'playlist' AND source_id = ? AND path = ?
            `);
            const result = stmt.run(playlistId, trackPath);

            this.logger.info(`Track playlist'ten çıkarıldı: ${trackPath}`, { playlistId });
            return result.changes > 0;
        } catch (error) {
            this.logger.error(`Track çıkarma hatası: ${error.message}`, { playlistId, trackPath, error: error.message });
            throw error;
        }
    }

    /**
     * Playlist'teki track'leri getir
     * @param {number} playlistId
     */
    getPlaylistTracks(playlistId) {
        try {
            const stmt = this.dbManager.db.prepare(`
                SELECT t.*, mf.path as music_file_path, mf.fileName as music_file_name
                FROM tracks t
                LEFT JOIN music_files mf ON t.matched_music_file_id = mf.id
                WHERE t.source = 'playlist' AND t.source_id = ?
                ORDER BY t.track_order
            `);
            return stmt.all(playlistId);
        } catch (error) {
            this.logger.error(`Playlist track'leri getirme hatası: ${error.message}`, { playlistId, error: error.message });
            throw error;
        }
    }

    /**
     * Playlist istatistikleri
     */
    getStats() {
        try {
            const totalStmt = this.dbManager.db.prepare(`
                SELECT COUNT(DISTINCT source_file) as total FROM tracks WHERE source = 'playlist'
            `);
            const tracksStmt = this.dbManager.db.prepare(`
                SELECT COUNT(*) as total_tracks FROM tracks WHERE source = 'playlist'
            `);
            const matchedStmt = this.dbManager.db.prepare(`
                SELECT COUNT(*) as matched_tracks FROM tracks WHERE source = 'playlist' AND is_matched = 1
            `);

            const total = totalStmt.get().total;
            const totalTracks = tracksStmt.get().total_tracks;
            const matchedTracks = matchedStmt.get().matched_tracks;

            return {
                totalPlaylists: total,
                totalTracks,
                matchedTracks,
                unmatchedTracks: totalTracks - matchedTracks
            };
        } catch (error) {
            this.logger.error(`Playlist istatistik hatası: ${error.message}`, { error: error.message });
            throw error;
        }
    }
}

module.exports = PlaylistRepository;