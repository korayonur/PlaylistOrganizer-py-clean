'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

/**
 * OPTİMİZE EDİLMİŞ DATABASE MANAGER
 * Performanslı SQL sorguları ve view'lar ile
 */
class OptimizedDatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, 'musicfiles.db');
        this.db = null;
        this.statements = {};
        this.initialize();
    }

    initialize() {
        try {
            this.db = new Database(this.dbPath);
            
            // WAL modunu etkinleştir (performans için)
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('cache_size = 20000');
            this.db.pragma('temp_store = MEMORY');
            this.db.pragma('mmap_size = 268435456'); // 256MB
            
            console.log('✅ Optimize edilmiş Database Manager başlatıldı:', this.dbPath);
        } catch (error) {
            console.error('❌ Database Manager başlatılamadı:', error);
            throw error;
        }
    }

    /**
     * Tam eşleşen kayıtları getir
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
     * Tam eşleşmeyen kayıtları getir
     */
    getNonExactMatches(limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM v_non_exact_matches_optimized 
            ORDER BY track_created_at DESC 
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Dosya adı eşleşmelerini getir
     */
    getFilenameMatches(limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM v_filename_matches_optimized 
            ORDER BY match_confidence DESC, track_created_at DESC 
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Uzantısız dosya adı eşleşmelerini getir
     */
    getFilenameOnlyMatches(limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM v_filename_only_matches_optimized 
            ORDER BY match_confidence DESC, track_created_at DESC 
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Normalize edilmiş dosya adı eşleşmelerini getir
     */
    getNormalizedMatches(limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM v_normalized_matches_optimized 
            ORDER BY match_confidence DESC, track_created_at DESC 
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Eşleşmemiş kayıtları getir
     */
    getUnmatchedTracks(limit = 50, offset = 0, reason = null) {
        let sql = `
            SELECT * FROM v_unmatched_tracks_optimized 
        `;
        
        const params = [limit, offset];
        
        if (reason) {
            sql += ` WHERE unmatched_reason = ? `;
            params.unshift(reason);
        }
        
        sql += ` ORDER BY track_created_at DESC LIMIT ? OFFSET ?`;
        
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    /**
     * Invalid path'li kayıtları getir (M3U fix için)
     */
    getInvalidPathTracks(limit = 50, offset = 0) {
        return this.getUnmatchedTracks(limit, offset, 'invalid_path');
    }

    /**
     * Belirli bir source'dan eşleşmemiş kayıtları getir
     */
    getUnmatchedTracksBySource(source, limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM v_unmatched_tracks_optimized 
            WHERE source = ? 
            ORDER BY track_created_at DESC 
            LIMIT ? OFFSET ?
        `);
        return stmt.all(source, limit, offset);
    }

    /**
     * Özet istatistikleri getir
     */
    getMatchSummary() {
        const stmt = this.db.prepare(`
            SELECT * FROM v_all_matches_summary_optimized
        `);
        return stmt.all();
    }

    /**
     * Toplam sayıları getir
     */
    getCounts() {
        const exactMatches = this.db.prepare('SELECT COUNT(*) as count FROM v_exact_path_matches_optimized').get().count;
        const nonExactMatches = this.db.prepare('SELECT COUNT(*) as count FROM v_non_exact_matches_optimized').get().count;
        const unmatchedTracks = this.db.prepare('SELECT COUNT(*) as count FROM v_unmatched_tracks_optimized').get().count;
        const invalidPathTracks = this.db.prepare('SELECT COUNT(*) as count FROM v_unmatched_tracks_optimized WHERE unmatched_reason = ?').get('invalid_path').count;
        
        return {
            exactMatches,
            nonExactMatches,
            unmatchedTracks,
            invalidPathTracks,
            total: exactMatches + nonExactMatches + unmatchedTracks
        };
    }

    /**
     * M3U dosyalarından gelen invalid path'li kayıtları getir
     */
    getM3UInvalidPathTracks(limit = 50, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM v_unmatched_tracks_optimized 
            WHERE unmatched_reason = 'invalid_path' 
            AND source_file LIKE '%.m3u'
            ORDER BY track_created_at DESC 
            LIMIT ? OFFSET ?
        `);
        return stmt.all(limit, offset);
    }

    /**
     * Track yolunu güncelle (M3U fix için)
     */
    updateTrackPath(trackId, newPath) {
        const stmt = this.db.prepare(`
            UPDATE tracks 
            SET path = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);
        return stmt.run(newPath, trackId);
    }

    /**
     * Track'i eşleşmiş olarak işaretle
     */
    markTrackAsMatched(trackId, musicFileId) {
        const stmt = this.db.prepare(`
            UPDATE tracks 
            SET is_matched = 1, matched_music_file_id = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);
        return stmt.run(musicFileId, trackId);
    }

    /**
     * Batch update - birden fazla track'i güncelle
     */
    batchUpdateTracks(updates) {
        const updateStmt = this.db.prepare(`
            UPDATE tracks 
            SET path = ?, is_matched = ?, matched_music_file_id = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);
        
        const transaction = this.db.transaction((updates) => {
            for (const update of updates) {
                updateStmt.run(
                    update.path,
                    update.is_matched || 0,
                    update.matched_music_file_id || null,
                    update.track_id
                );
            }
        });
        
        return transaction(updates);
    }

    /**
     * Performans istatistikleri
     */
    getPerformanceStats() {
        const start = Date.now();
        
        const counts = this.getCounts();
        const summary = this.getMatchSummary();
        
        const end = Date.now();
        const queryTime = end - start;
        
        return {
            ...counts,
            summary,
            queryTime,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Veritabanı temizliği
     */
    cleanup() {
        try {
            // WAL dosyasını checkpoint'e al
            this.db.pragma('wal_checkpoint(TRUNCATE)');
            
            // Veritabanını optimize et
            this.db.pragma('optimize');
            
            console.log('✅ Veritabanı temizliği tamamlandı');
        } catch (error) {
            console.error('❌ Veritabanı temizliği hatası:', error);
        }
    }

    close() {
        if (this.db) {
            this.cleanup();
            this.db.close();
            console.log('✅ Database connection closed');
        }
    }
}

// Singleton instance
let dbInstance = null;

function getOptimizedDatabase() {
    if (!dbInstance) {
        dbInstance = new OptimizedDatabaseManager();
    }
    return dbInstance;
}

module.exports = {
    OptimizedDatabaseManager,
    getOptimizedDatabase
};
