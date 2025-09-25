const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../shared/database');
const { getLogger } = require('../../shared/logger');

const logger = getLogger('Database');
const db = getDatabase();

/**
 * Database yönetim API'leri
 * Tüm tabloları sil/oluştur/reset işlemleri
 */

// Database durumu
router.get('/status', (req, res) => {
    try {
        const stats = db.getStats();
        res.json({
            success: true,
            data: {
                ...stats,
                tables: {
                    music_files: stats.musicFiles,
                    tracks: stats.tracks,
                    import_sessions: db.execute('SELECT COUNT(*) as count FROM import_sessions').count
                }
            },
            message: 'Database durumu alındı'
        });
    } catch (error) {
        logger.error('Database durumu hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Database durumu alınamadı',
            error: error.message
        });
    }
});

// Tüm tabloları sil
router.delete('/tables', (req, res) => {
    try {
        logger.info('Tüm tablolar siliniyor...');
        
        // Foreign key constraints'leri geçici olarak devre dışı bırak
        db.execute('PRAGMA foreign_keys = OFF');
        
        // Tüm tabloları sil
        const tables = ['tracks', 'music_files', 'import_sessions'];
        for (const table of tables) {
            db.execute(`DROP TABLE IF EXISTS ${table}`);
            logger.info(`✅ ${table} tablosu silindi`);
        }
        
        // Index'leri de sil
        db.execute('DROP INDEX IF EXISTS idx_music_files_path');
        db.execute('DROP INDEX IF EXISTS idx_music_files_fileNameOnly');
        db.execute('DROP INDEX IF EXISTS idx_music_files_normalized');
        db.execute('DROP INDEX IF EXISTS idx_tracks_path');
        db.execute('DROP INDEX IF EXISTS idx_tracks_fileNameOnly');
        db.execute('DROP INDEX IF EXISTS idx_tracks_normalized');
        db.execute('DROP INDEX IF EXISTS idx_tracks_source');
        db.execute('DROP INDEX IF EXISTS idx_tracks_matched');
        db.execute('DROP INDEX IF EXISTS idx_tracks_source_id');
        
        // Foreign key constraints'leri tekrar etkinleştir
        db.execute('PRAGMA foreign_keys = ON');
        
        logger.info('✅ Tüm tablolar başarıyla silindi');
        
        res.json({
            success: true,
            message: 'Tüm tablolar başarıyla silindi',
            data: {
                deletedTables: tables,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Tablo silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Tablo silme hatası',
            error: error.message
        });
    }
});

// Tüm tabloları oluştur
router.post('/tables', (req, res) => {
    try {
        logger.info('Tüm tablolar oluşturuluyor...');
        
        // Database manager'ın createTables metodunu çağır
        db.createTables();
        db.prepareStatements();
        
        logger.info('✅ Tüm tablolar başarıyla oluşturuldu');
        
        res.json({
            success: true,
            message: 'Tüm tablolar başarıyla oluşturuldu',
            data: {
                createdTables: ['music_files', 'tracks', 'import_sessions'],
                indexes: [
                    'idx_music_files_path',
                    'idx_music_files_fileNameOnly', 
                    'idx_music_files_normalized',
                    'idx_tracks_path',
                    'idx_tracks_fileNameOnly',
                    'idx_tracks_normalized',
                    'idx_tracks_source',
                    'idx_tracks_matched',
                    'idx_tracks_source_id'
                ],
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Tablo oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Tablo oluşturma hatası',
            error: error.message
        });
    }
});

// Database'i tamamen resetle (sil + oluştur)
router.post('/reset', (req, res) => {
    try {
        logger.info('Database tamamen resetleniyor...');
        
        // Önce tüm tabloları sil
        db.execute('PRAGMA foreign_keys = OFF');
        const tables = ['tracks', 'music_files', 'import_sessions'];
        for (const table of tables) {
            db.execute(`DROP TABLE IF EXISTS ${table}`);
        }
        
        // Index'leri sil
        const indexes = [
            'idx_music_files_path', 'idx_music_files_fileNameOnly', 'idx_music_files_normalized',
            'idx_tracks_path', 'idx_tracks_fileNameOnly', 'idx_tracks_normalized',
            'idx_tracks_source', 'idx_tracks_matched', 'idx_tracks_source_id'
        ];
        for (const index of indexes) {
            db.execute(`DROP INDEX IF EXISTS ${index}`);
        }
        
        // Tabloları yeniden oluştur
        db.createTables();
        db.prepareStatements();
        
        db.execute('PRAGMA foreign_keys = ON');
        
        logger.info('✅ Database başarıyla resetlendi');
        
        res.json({
            success: true,
            message: 'Database başarıyla resetlendi',
            data: {
                action: 'reset',
                deletedTables: tables,
                createdTables: tables,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Database reset hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Database reset hatası',
            error: error.message
        });
    }
});

// Belirli tablo silme endpoint'i kaldırıldı - Güvenlik riski!

// Database optimize et
router.post('/optimize', (req, res) => {
    try {
        logger.info('Database optimize ediliyor...');
        
        // VACUUM işlemi
        db.execute('VACUUM');
        
        // ANALYZE işlemi
        db.execute('ANALYZE');
        
        // WAL modunu optimize et
        db.execute('PRAGMA wal_checkpoint(TRUNCATE)');
        
        const stats = db.getStats();
        
        logger.info('✅ Database başarıyla optimize edildi');
        
        res.json({
            success: true,
            message: 'Database başarıyla optimize edildi',
            data: {
                ...stats,
                optimizations: ['VACUUM', 'ANALYZE', 'WAL_CHECKPOINT'],
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Database optimize hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Database optimize hatası',
            error: error.message
        });
    }
});

/**
 * GET /api/database/views
 * Tüm view'ları listele
 */
router.get('/views', (req, res) => {
    try {
        const db = getDatabase();
        const views = db.query(`
            SELECT name, sql 
            FROM sqlite_master 
            WHERE type = 'view' 
            AND name LIKE 'v_%'
            ORDER BY name
        `);
        
        res.json({
            success: true,
            data: {
                views: views.map(view => ({
                    name: view.name,
                    description: getViewDescription(view.name),
                    sql: view.sql
                }))
            },
            message: `${views.length} view bulundu`
        });
    } catch (error) {
        logger.error('View listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'View listesi alınamadı',
            error: error.message
        });
    }
});

// View oluşturma endpoint'i kaldırıldı - Manuel işlem!

/**
 * DELETE /api/database/views
 * Tüm view'ları sil
 */
// View silme endpoint'i kaldırıldı - Güvenlik riski!

// View veri getirme endpoint'i kaldırıldı - Gereksiz!

/**
 * GET /api/database/views/summary
 * Tüm eşleşme türlerinin özetini getir
 */
router.get('/views/summary', (req, res) => {
    try {
        const db = getDatabase();
        const summary = db.query(`
            SELECT * FROM v_all_matches_summary
            ORDER BY match_count DESC
        `);
        
        res.json({
            success: true,
            data: {
                summary,
                totalMatches: summary.reduce((sum, item) => sum + item.match_count, 0)
            },
            message: 'Eşleşme özeti getirildi'
        });
    } catch (error) {
        logger.error('Eşleşme özeti hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Eşleşme özeti alınamadı',
            error: error.message
        });
    }
});

// SQL Query endpoint'i kaldırıldı - Güvenlik riski!

// SQL Execute endpoint kaldırıldı - Güvenlik riski!

// View açıklamaları
function getViewDescription(viewName) {
    const descriptions = {
        'v_exact_path_matches': 'Tam yol eşleşmeleri (path = path)',
        'v_filename_matches': 'Dosya adı eşleşmeleri (fileName = fileName)',
        'v_filename_only_matches': 'Uzantısız dosya adı eşleşmeleri (fileNameOnly = fileNameOnly)',
        'v_unmatched_tracks': 'Eşleşmemiş track\'ler',
        'v_all_matches_summary': 'Tüm eşleşme türlerinin özeti'
    };
    return descriptions[viewName] || 'Bilinmeyen view';
}

module.exports = router;
