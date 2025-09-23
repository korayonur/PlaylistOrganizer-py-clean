'use strict';

const { getDatabase } = require('../../shared/database');
const { getLogger } = require('../../shared/logger');

class HistoryRepository {
    constructor() {
        this.dbManager = getDatabase();
        this.logger = getLogger().module('HistoryRepository');
    }

    /**
     * History track'lerini toplu olarak ekle
     * @param {Array<Object>} tracks
     * @param {string} m3uFilePath
     */
    insertTracks(tracks, m3uFilePath) {
        this.logger.info(`💾 insertTracks called with ${tracks ? tracks.length : 0} tracks`);
        
        if (!tracks || tracks.length === 0) {
            this.logger.warn(`❌ No tracks to insert`);
            return;
        }

        try {
            this.logger.info(`📝 Preparing to insert ${tracks.length} tracks into database`);
            
            const stmt = this.dbManager.db.prepare(`
                INSERT INTO tracks 
                (path, normalized_name, source, source_file, is_matched, matched_music_file_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            const insertMany = this.dbManager.db.transaction((tracks) => {
                for (const track of tracks) {
                    this.logger.debug(`📝 Inserting track: ${track.originalPath}`);
                    stmt.run(
                        track.originalPath,
                        track.normalizedName,
                        'history',
                        m3uFilePath,
                        0, // is_matched
                        null // matched_music_file_id
                    );
                }
            });

            insertMany(tracks);
            this.logger.info(`✅ ${tracks.length} history track eklendi`);
        } catch (error) {
            this.logger.error(`History track ekleme hatası: ${error.message}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Tam yol eşleştirmesi yap
     */
    performExactMatching() {
        try {
            const stmt = this.dbManager.db.prepare(`
                UPDATE tracks 
                SET is_matched = 1, matched_music_file_id = (
                    SELECT id FROM music_files 
                    WHERE music_files.path = tracks.path
                )
                WHERE source = 'history' 
                AND is_matched = 0 
                AND EXISTS (
                    SELECT 1 FROM music_files 
                    WHERE music_files.path = tracks.path
                )
            `);

            const result = stmt.run();
            this.logger.info(`${result.changes} history track tam yol eşleştirmesi yapıldı`);
            return result.changes;
        } catch (error) {
            this.logger.error(`Tam yol eşleştirme hatası: ${error.message}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Benzer isim eşleştirmesi yap
     */
    performSimilarMatching() {
        try {
            const stmt = this.dbManager.db.prepare(`
                UPDATE tracks 
                SET is_matched = 1, matched_music_file_id = (
                    SELECT id FROM music_files 
                    WHERE music_files.normalizedFileName = tracks.normalized_name
                    AND music_files.id NOT IN (
                        SELECT matched_music_file_id FROM tracks 
                        WHERE matched_music_file_id IS NOT NULL
                    )
                    LIMIT 1
                )
                WHERE source = 'history' 
                AND is_matched = 0 
                AND EXISTS (
                    SELECT 1 FROM music_files 
                    WHERE music_files.normalizedFileName = tracks.normalized_name
                )
            `);

            const result = stmt.run();
            this.logger.info(`${result.changes} history track benzer isim eşleştirmesi yapıldı`);
            return result.changes;
        } catch (error) {
            this.logger.error(`Benzer isim eşleştirme hatası: ${error.message}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Tüm eşleştirmeleri yap (exact + similar)
     */
    performBulkMatching() {
        try {
            const exactMatches = this.performExactMatching();
            const similarMatches = this.performSimilarMatching();
            
            this.logger.info(`Toplu eşleştirme tamamlandı: ${exactMatches} tam yol + ${similarMatches} benzer isim`);
            return exactMatches + similarMatches;
        } catch (error) {
            this.logger.error(`Toplu eşleştirme hatası: ${error.message}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Tüm track'leri getir
     * @param {number} limit
     * @param {number} offset
     * @param {boolean} matched
     */
    getAllTracks(limit = 100, offset = 0, matched = null) {
        try {
            let query = `
                SELECT t.*, mf.path as music_file_path, mf.fileName as music_file_name
                FROM tracks t
                LEFT JOIN music_files mf ON t.matched_music_file_id = mf.id
                WHERE t.source = 'history'
            `;
            
            const params = [];
            
            if (matched !== null) {
                query += ` AND t.is_matched = ?`;
                params.push(matched ? 1 : 0);
            }
            
            query += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
            params.push(limit, offset);

            const stmt = this.dbManager.db.prepare(query);
            return stmt.all(...params);
        } catch (error) {
            this.logger.error(`Track listeleme hatası: ${error.message}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Eşleşmemiş track'leri getir
     * @param {number} limit
     * @param {number} offset
     */
    getUnmatchedTracks(limit = 100, offset = 0) {
        return this.getAllTracks(limit, offset, false);
    }

    /**
     * İstatistikleri getir
     */
    getStats() {
        try {
            const totalStmt = this.dbManager.db.prepare(`
                SELECT COUNT(*) as total FROM tracks WHERE source = 'history'
            `);
            const matchedStmt = this.dbManager.db.prepare(`
                SELECT COUNT(*) as matched FROM tracks WHERE source = 'history' AND is_matched = 1
            `);
            const unmatchedStmt = this.dbManager.db.prepare(`
                SELECT COUNT(*) as unmatched FROM tracks WHERE source = 'history' AND is_matched = 0
            `);

            const total = totalStmt.get().total;
            const matched = matchedStmt.get().matched;
            const unmatched = unmatchedStmt.get().unmatched;

            return {
                total,
                matched,
                unmatched
            };
        } catch (error) {
            this.logger.error(`İstatistik alma hatası: ${error.message}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Track'i ID ile getir
     * @param {number} trackId
     */
    getTrackById(trackId) {
        try {
            const stmt = this.dbManager.db.prepare(`
                SELECT t.*, mf.path as music_file_path, mf.fileName as music_file_name
                FROM tracks t
                LEFT JOIN music_files mf ON t.matched_music_file_id = mf.id
                WHERE t.id = ? AND t.source = 'history'
            `);
            return stmt.get(trackId);
        } catch (error) {
            this.logger.error(`Track getirme hatası: ${error.message}`, { trackId, error: error.message });
            throw error;
        }
    }

    /**
     * Track'in yolunu güncelle
     * @param {number} trackId
     * @param {string} newPath
     */
    updateTrackPath(trackId, newPath) {
        try {
            const stmt = this.dbManager.db.prepare(`
                UPDATE tracks 
                SET path = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND source = 'history'
            `);
            const result = stmt.run(newPath, trackId);
            return result.changes > 0;
        } catch (error) {
            this.logger.error(`Track yolu güncelleme hatası: ${error.message}`, { trackId, newPath, error: error.message });
            throw error;
        }
    }

    /**
     * Track'i sil
     * @param {number} trackId
     */
    deleteTrack(trackId) {
        try {
            const stmt = this.dbManager.db.prepare(`
                DELETE FROM tracks WHERE id = ? AND source = 'history'
            `);
            const result = stmt.run(trackId);
            return result.changes > 0;
        } catch (error) {
            this.logger.error(`Track silme hatası: ${error.message}`, { trackId, error: error.message });
            throw error;
        }
    }

    /**
     * Dosyanın daha önce işlenip işlenmediğini kontrol et
     * @param {string} filePath
     * @returns {boolean}
     */
    isFileProcessed(filePath) {
        try {
            const stmt = this.dbManager.db.prepare(`
                SELECT COUNT(*) as count FROM tracks 
                WHERE source = 'history' AND source_file = ?
            `);
            const result = stmt.get(filePath);
            const isProcessed = result.count > 0;
            this.logger.debug(`File ${filePath} processed check: ${isProcessed} (${result.count} tracks)`);
            return isProcessed;
        } catch (error) {
            this.logger.error(`Dosya işlenme kontrolü hatası: ${error.message}`, { filePath, error: error.message });
            return false;
        }
    }

    /**
     * Tüm history track'lerini temizle
     */
    clearAllTracks() {
        try {
            const stmt = this.dbManager.db.prepare(`
                DELETE FROM tracks WHERE source = 'history'
            `);
            const result = stmt.run();
            this.logger.info(`${result.changes} history track temizlendi`);
            return result.changes;
        } catch (error) {
            this.logger.error(`History track temizleme hatası: ${error.message}`, { error: error.message });
            throw error;
        }
    }
}

module.exports = HistoryRepository;