const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../shared/database');
// const { getLogger } = require('../../shared/logger'); // Artık gerek yok - console.log kullanıyoruz

// const logger = getLogger('Database'); // Artık gerek yok - console.log kullanıyoruz
const dbManager = getDatabase();
const db = dbManager.getDatabase();

/**
 * Database yönetim API'leri
 * Tüm tabloları sil/oluştur/reset işlemleri
 */

// Database durumu
router.get('/status', (req, res) => {
    try {
        const stats = dbManager.getStats();
        res.json({
            success: true,
            data: {
                ...stats,
                tables: {
                    music_files: stats.musicFiles,
                    tracks: stats.tracks,
                    import_sessions: dbManager.execute('SELECT COUNT(*) as count FROM import_sessions').count
                }
            },
            message: 'Database durumu alındı'
        });
    } catch (error) {
        console.error(`❌ Database durumu hatası: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Database durumu alınamadı',
            error: error.message
        });
    }
});

// GÜVENLİK RİSKİ: Tüm tabloları silme endpoint'i kaldırıldı!
// Bu endpoint production'da tehlikeli olabilir.

// Tüm tabloları oluştur
router.post('/tables', (req, res) => {
    try {
        console.log(`🏗️ Tüm tablolar oluşturuluyor...`);
        
        // Database manager'ın createTables metodunu çağır
        dbManager.createTables();
        dbManager.prepareStatements();
        
        console.log(`✅ Tüm tablolar başarıyla oluşturuldu`);
        
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
        console.error(`❌ Tablo oluşturma hatası: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Tablo oluşturma hatası',
            error: error.message
        });
    }
});

// GÜVENLİK RİSKİ: Database reset endpoint'i kaldırıldı!
// Bu endpoint production'da tehlikeli olabilir.

// Belirli tablo silme endpoint'i kaldırıldı - Güvenlik riski!

// Database optimize et
router.post('/optimize', (req, res) => {
    try {
        console.log(`⚡ Database optimize ediliyor...`);
        
        // VACUUM işlemi
        dbManager.execute('VACUUM');
        
        // ANALYZE işlemi
        dbManager.execute('ANALYZE');
        
        // WAL modunu optimize et
        dbManager.execute('PRAGMA wal_checkpoint(TRUNCATE)');
        
        const stats = dbManager.getStats();
        
        console.log(`✅ Database başarıyla optimize edildi`);
        
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
        console.error(`❌ Database optimize hatası: ${error.message}`);
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
        const dbManager = getDatabase();
        const db = dbManager.getDatabase();
        const views = db.prepare(`
            SELECT name, sql 
            FROM sqlite_master 
            WHERE type = 'view' 
            AND name LIKE 'v_%'
            ORDER BY name
        `).all();
        
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
        console.error(`❌ View listesi hatası: ${error.message}`);
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
        const dbManager = getDatabase();
        const db = dbManager.getDatabase();
        const summary = db.prepare(`
            SELECT * FROM v_all_matches_summary_optimized
            ORDER BY match_count DESC
        `).all();
        
        res.json({
            success: true,
            data: {
                summary,
                totalMatches: summary.reduce((sum, item) => sum + item.match_count, 0)
            },
            message: 'Eşleşme özeti getirildi'
        });
    } catch (error) {
        console.error(`❌ Eşleşme özeti hatası: ${error.message}`);
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
