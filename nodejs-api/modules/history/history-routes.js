'use strict';

const express = require('express');
const HistoryService = require('./history-service');
const { getLogger } = require('../../shared/logger');

const router = express.Router();
const historyService = new HistoryService();
const logger = getLogger().module('HistoryRoutes');

/**
 * POST /api/history/scan
 * History dosyalarını tara ve import et
 */
router.post('/scan', async (req, res) => {
    try {
        const { path: historyRoot } = req.body;
        
        logger.info(`🚀 History scan request: ${historyRoot || 'default'}`);
        
        const result = await historyService.scanAndImport(historyRoot);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`History scan hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'History scan hatası',
            error: error.message
        });
    }
});

/**
 * GET /api/history/stats
 * History istatistiklerini al
 */
router.get('/stats', async (req, res) => {
    try {
        logger.info('History istatistikleri isteniyor');
        
        const result = await historyService.getStats();
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`History istatistik hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'History istatistik hatası',
            error: error.message
        });
    }
});

/**
 * GET /api/history/tracks
 * History track'lerini al
 */
router.get('/tracks', (req, res) => {
    try {
        const { limit = 100, offset = 0, matched = null } = req.query;
        
        logger.info('History track\'ler isteniyor', { limit, offset, matched });
        
        const result = historyService.getAllTracks({
            limit: parseInt(limit),
            offset: parseInt(offset),
            matched: matched !== null ? matched === 'true' : null
        });
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`History track listesi hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'History track listesi hatası',
            error: error.message
        });
    }
});

/**
 * GET /api/history/unmatched
 * Eşleşmemiş track'leri al
 */
router.get('/unmatched', (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        
        logger.info('Eşleşmemiş track\'ler isteniyor', { limit, offset });
        
        const result = historyService.getUnmatchedTracks({
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Eşleşmemiş track listesi hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Eşleşmemiş track listesi hatası',
            error: error.message
        });
    }
});

/**
 * POST /api/history/match
 * Manuel track eşleştirme
 */
router.post('/match', (req, res) => {
    try {
        const { historyTrackId, musicFileId } = req.body;
        
        if (!historyTrackId || !musicFileId) {
            return res.status(400).json({
                success: false,
                message: 'historyTrackId ve musicFileId gerekli'
            });
        }

        logger.info(`Manuel track eşleştirme: ${historyTrackId} -> ${musicFileId}`);
        
        const result = historyService.matchTrack(historyTrackId, musicFileId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Manuel track eşleştirme hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Manuel track eşleştirme hatası',
            error: error.message
        });
    }
});

/**
 * POST /api/history/auto-match
 * Otomatik track eşleştirme
 */
router.post('/auto-match', (req, res) => {
    try {
        logger.info('Otomatik track eşleştirme başlatılıyor');
        
        const result = historyService.performAutoMatch();
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Otomatik track eşleştirme hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Otomatik track eşleştirme hatası',
            error: error.message
        });
    }
});

/**
 * DELETE /api/history/track/:id
 * Track sil
 */
router.delete('/track/:id', (req, res) => {
    try {
        const { id } = req.params;
        const trackId = parseInt(id);
        
        if (isNaN(trackId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz track ID'
            });
        }

        logger.info(`Track siliniyor: ${trackId}`);
        
        const result = historyService.deleteTrack(trackId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Track silme hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Track silme hatası',
            error: error.message
        });
    }
});

/**
 * DELETE /api/history/clear
 * Tüm track'leri temizle
 */
router.delete('/clear', (req, res) => {
    try {
        logger.info('Tüm history track\'ler temizleniyor');
        
        const result = historyService.clearAllTracks();
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`History track temizleme hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'History track temizleme hatası',
            error: error.message
        });
    }
});

/**
 * POST /api/history/fix
 * Track fix et
 */
router.post('/fix', (req, res) => {
    try {
        const { historyTrackId, newPath } = req.body;
        
        if (!historyTrackId || !newPath) {
            return res.status(400).json({
                success: false,
                message: 'historyTrackId ve newPath gerekli'
            });
        }

        logger.info(`Track fix ediliyor: ${historyTrackId} -> ${newPath}`);
        
        const result = historyService.fixTrack(historyTrackId, newPath);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Track fix hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Track fix hatası',
            error: error.message
        });
    }
});

/**
 * GET /api/history/fix-preview/:id
 * Track fix önizleme
 */
router.get('/fix-preview/:id', (req, res) => {
    try {
        const { id } = req.params;
        const trackId = parseInt(id);
        
        if (isNaN(trackId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz track ID'
            });
        }

        logger.info(`Track fix önizleme: ${trackId}`);
        
        const result = historyService.getFixPreview(trackId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Track fix önizleme hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Track fix önizleme hatası',
            error: error.message
        });
    }
});

module.exports = router;
