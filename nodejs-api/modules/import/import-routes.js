'use strict';

const express = require('express');
const ImportService = require('./import-service');
const { getLogger } = require('../../shared/logger');

const router = express.Router();
const importService = new ImportService();
const logger = getLogger().module('ImportRoutes');

/**
 * GET /api/import/check
 * Klasör kontrolü yap
 */
router.get('/check', async (req, res) => {
    try {
        const { path: dirPath } = req.query;
        
        if (!dirPath) {
            return res.status(400).json({
                success: false,
                message: 'Path parametresi gerekli'
            });
        }

        logger.info(`Import check isteği: ${dirPath}`);
        
        const result = await importService.checkDirectory(dirPath);
        
        res.json(result);

    } catch (error) {
        logger.error(`Import check hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Import check hatası',
            error: error.message
        });
    }
});

/**
 * POST /api/import/scan
 * Klasörü tara ve import et
 */
router.post('/scan', async (req, res) => {
    try {
        const { path: dirPath, options = {} } = req.body;
        
        if (!dirPath) {
            return res.status(400).json({
                success: false,
                message: 'Path parametresi gerekli'
            });
        }

        logger.info(`Import scan isteği: ${dirPath}`, { options });
        
        const result = await importService.importDirectory(dirPath, options);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Import scan hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Import scan hatası',
            error: error.message
        });
    }
});

/**
 * GET /api/import/status
 * Import durumunu kontrol et
 */
router.get('/status', async (req, res) => {
    try {
        const { path: dirPath } = req.query;
        
        if (!dirPath) {
            return res.status(400).json({
                success: false,
                message: 'Path parametresi gerekli'
            });
        }

        logger.info(`Import durum kontrolü: ${dirPath}`);
        
        const result = await importService.checkImportStatus(dirPath);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Import durum kontrolü hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
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
        logger.info('Import istatistikleri isteniyor');
        
        const result = importService.getImportStats();
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Import istatistik hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
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
        
        logger.info(`Son import session'lar isteniyor`, { limit });
        
        const result = importService.getRecentSessions(parseInt(limit));
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Import session listesi hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Import session listesi hatası',
            error: error.message
        });
    }
});

/**
 * POST /api/import/verify
 * Import doğrulama
 */
router.post('/verify', async (req, res) => {
    try {
        const { path: dirPath } = req.body;
        
        if (!dirPath) {
            return res.status(400).json({
                success: false,
                message: 'Path parametresi gerekli'
            });
        }

        logger.info(`Import doğrulama: ${dirPath}`);
        
        const result = await importService.verifyImport(dirPath);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Import doğrulama hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Import doğrulama hatası',
            error: error.message
        });
    }
});

/**
 * DELETE /api/import/session/:id
 * Import session'ı sil
 */
router.delete('/session/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sessionId = parseInt(id);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz session ID'
            });
        }

        logger.info(`Import session siliniyor: ${sessionId}`);
        
        const result = importService.deleteSession(sessionId);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Import session silme hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Import session silme hatası',
            error: error.message
        });
    }
});

/**
 * DELETE /api/import/clear
 * Tüm import session'larını temizle
 */
router.delete('/clear', async (req, res) => {
    try {
        logger.info('Tüm import session\'lar temizleniyor');
        
        const result = importService.clearAllSessions();
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error(`Import session temizleme hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Import session temizleme hatası',
            error: error.message
        });
    }
});

module.exports = router;
