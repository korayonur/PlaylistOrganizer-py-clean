'use strict';

const express = require('express');
const importService = require('./import-service');
// const { getLogger } = require('../../shared/logger'); // Artık gerek yok - console.log kullanıyoruz

const router = express.Router();
// const logger = getLogger().module('ImportRoutes'); // Artık gerek yok - console.log kullanıyoruz


/**
 * POST /api/import/scan
 * Klasörü tara ve import et (asenkron)
 */
router.post('/scan', async (req, res) => {
    try {
        console.log(`🚀 VirtualDJ import scan isteği`);
        
        // Hemen response döndür
        res.json({
            success: true,
            message: 'Import süreci başlatıldı',
            data: {
                status: 'started',
                message: 'Import arka planda çalışıyor, /api/import/status ile durumu kontrol edebilirsiniz'
            }
        });
        
        // Import'u arka planda başlat
        setImmediate(async () => {
            try {
                console.log(`🚀 Arka plan import süreci başlatılıyor...`);
                const result = await importService.scanAndImport();
                console.log(`✅ Arka plan import tamamlandı:`, result);
            } catch (error) {
                console.error(`❌ Arka plan import hatası:`, error);
            }
        });
        
    } catch (error) {
        console.error(`❌ Import scan hatası: ${error.message}`);
        
        res.status(500).json({
            success: false,
            message: 'Import scan hatası',
            error: error.message
        });
    }
});

/**
 * GET /api/import/status
 * Import durumunu kontrol et (tüm tablo sayıları + progress)
 */
router.get('/status', async (req, res) => {
    try {
        console.log(`📊 Import durum kontrolü`);
        
        const result = await importService.getImportStatus();
        
        res.json(result);
    } catch (error) {
        console.error(`❌ Import durum kontrolü hatası: ${error.message}`);
        
        res.status(500).json({
            success: false,
            message: 'Import durum kontrolü hatası',
            error: error.message
        });
    }
});

/**
 * GET /api/import/stats
 * Import istatistiklerini al
 */
router.get('/stats', async (req, res) => {
    try {
        console.log(`📈 Import istatistikleri isteniyor`);
        
        const result = importService.getImportStats();
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error(`❌ Import istatistik hatası: ${error.message}`);
        
        res.status(500).json({
            success: false,
            message: 'Import istatistik hatası',
            error: error.message
        });
    }
});

/**
 * GET /api/import/sessions
 * Son import session'larını al
 */
router.get('/sessions', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        console.log(`📋 Son import session'lar isteniyor (limit: ${limit})`);
        
        const result = importService.getRecentSessions(parseInt(limit));
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error(`❌ Import session listesi hatası: ${error.message}`);
        
        res.status(500).json({
            success: false,
            message: 'Import session listesi hatası',
            error: error.message
        });
    }
});




module.exports = router;
