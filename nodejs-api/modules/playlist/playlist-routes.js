'use strict';

const express = require('express');
const playlistService = require('./playlist-service');
const { getLogger } = require('../../shared/logger');

const router = express.Router();
const logger = getLogger().module('PlaylistRoutes');

/**
 * POST /api/playlist/scan
 * Playlist dosyalarını tara ve import et
 */
router.post('/scan', async (req, res) => {
    try {
        const { playlistRoot } = req.body;
        
        if (!playlistRoot) {
            return res.status(400).json({
                success: false,
                message: 'playlistRoot parametresi gerekli'
            });
        }

        logger.info(`Playlist scan isteği: ${playlistRoot}`);
        const result = await playlistService.scanAndImport(playlistRoot);
        
        res.json(result);

    } catch (error) {
        logger.error('Playlist scan hatası', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });

        res.status(500).json({
            success: false,
            message: 'Playlist scan hatası',
            error: error.message
        });
    }
});

/**
 * GET /api/playlist/stats
 * Playlist istatistikleri
 */
router.get('/stats', (req, res) => {
    try {
        logger.info('Playlist istatistikleri isteği');
        const result = playlistService.getStats();
        res.json({ success: true, stats: result });
    } catch (error) {
        logger.error(`Playlist istatistikleri hatası: ${error.message}`, { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Playlist istatistikleri hatası',
            error: error.message
        });
    }
});

/**
 * GET /api/playlist
 * Tüm playlist'leri listele
 */
router.get('/', (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        logger.info(`Playlist listeleme isteği: limit=${limit}, offset=${offset}`);
        
        // Playlist'leri tracks tablosundan al
        const playlists = playlistService.db.prepare(`
            SELECT DISTINCT source_file as path,
                            COUNT(*) as trackCount,
                            MIN(created_at) as createdAt
            FROM tracks
            WHERE source = ?
            GROUP BY source_file
            ORDER BY createdAt DESC
            LIMIT ? OFFSET ?
        `).all('playlist', parseInt(limit), parseInt(offset));

        const total = playlistService.db.prepare('SELECT COUNT(DISTINCT source_file) as count FROM tracks WHERE source = ?').get('playlist').count;

        res.json({
            success: true,
            data: {
                playlists,
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        logger.error(`Playlist listeleme hatası: ${error.message}`, { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Playlist listeleme hatası',
            error: error.message
        });
    }
});

// M3U dosyalarını tarar ve import eder
router.post('/scan-m3u', async (req, res) => {
    try {
        const { directoryPath } = req.body;
        
        if (!directoryPath) {
            return res.status(400).json({
                success: false,
                message: 'directoryPath parametresi gerekli'
            });
        }

        logger.info(`M3U import isteği: ${directoryPath}`);
        const result = await playlistService.scanAndImportM3U(directoryPath);
        
        res.json(result);

    } catch (error) {
        logger.error('M3U import route hatası', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });

        res.status(500).json({
            success: false,
            message: 'M3U import hatası',
            error: error.message
        });
    }
});

// VDJ dosyalarını tarar ve import eder
router.post('/scan-vdj', async (req, res) => {
    try {
        const { directoryPath, source } = req.body;
        
        if (!directoryPath || !source) {
            return res.status(400).json({
                success: false,
                message: 'directoryPath ve source parametreleri gerekli'
            });
        }

        if (!['folders', 'mylists'].includes(source)) {
            return res.status(400).json({
                success: false,
                message: 'source parametresi "folders" veya "mylists" olmalı'
            });
        }

        logger.info(`VDJ import isteği: ${directoryPath} (${source})`);
        const result = await playlistService.scanAndImportVDJ(directoryPath, source);
        
        res.json(result);

    } catch (error) {
        logger.error('VDJ import route hatası', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });

        res.status(500).json({
            success: false,
            message: 'VDJ import hatası',
            error: error.message
        });
    }
});

// Playlist'leri listeler
router.get('/list', async (req, res) => {
    try {
        const { source, format, limit, offset } = req.query;
        
        const options = {
            source: source || undefined,
            format: format || undefined,
            limit: limit ? parseInt(limit) : 100,
            offset: offset ? parseInt(offset) : 0
        };

        logger.info('Playlist listesi isteği', options);
        const playlists = playlistService.getPlaylists(options);
        
        res.json({
            success: true,
            playlists,
            count: playlists.length
        });

    } catch (error) {
        logger.error('Playlist listesi route hatası', {
            error: error.message,
            stack: error.stack,
            query: req.query
        });

        res.status(500).json({
            success: false,
            message: 'Playlist listesi hatası',
            error: error.message
        });
    }
});

// Playlist istatistiklerini getirir
router.get('/stats', async (req, res) => {
    try {
        logger.info('Playlist istatistik isteği');
        const stats = playlistService.getStats();
        
        res.json({
            success: true,
            stats
        });

    } catch (error) {
        logger.error('Playlist istatistik route hatası', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Playlist istatistik hatası',
            error: error.message
        });
    }
});

// Playlist detayını getirir
router.get('/:id', async (req, res) => {
    try {
        const playlistId = parseInt(req.params.id);
        
        if (isNaN(playlistId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz playlist ID'
            });
        }

        logger.info(`Playlist detay isteği: ${playlistId}`);
        const playlist = playlistService.getPlaylist(playlistId);
        
        if (!playlist) {
            return res.status(404).json({
                success: false,
                message: 'Playlist bulunamadı'
            });
        }

        res.json({
            success: true,
            playlist
        });

    } catch (error) {
        logger.error('Playlist detay route hatası', {
            error: error.message,
            stack: error.stack,
            playlistId: req.params.id
        });

        res.status(500).json({
            success: false,
            message: 'Playlist detay hatası',
            error: error.message
        });
    }
});

// Playlist track'lerini getirir
router.get('/:id/tracks', async (req, res) => {
    try {
        const playlistId = parseInt(req.params.id);
        const { limit, offset } = req.query;
        
        if (isNaN(playlistId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz playlist ID'
            });
        }

        const options = {
            limit: limit ? parseInt(limit) : 1000,
            offset: offset ? parseInt(offset) : 0
        };

        logger.info(`Playlist track isteği: ${playlistId}`, options);
        const tracks = playlistService.getPlaylistTracks(playlistId, options);
        
        res.json({
            success: true,
            tracks,
            count: tracks.length
        });

    } catch (error) {
        logger.error('Playlist track route hatası', {
            error: error.message,
            stack: error.stack,
            playlistId: req.params.id,
            query: req.query
        });

        res.status(500).json({
            success: false,
            message: 'Playlist track hatası',
            error: error.message
        });
    }
});

// Playlist'i siler
router.delete('/:id', async (req, res) => {
    try {
        const playlistId = parseInt(req.params.id);
        
        if (isNaN(playlistId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz playlist ID'
            });
        }

        logger.info(`Playlist silme isteği: ${playlistId}`);
        const result = playlistService.deletePlaylist(playlistId);
        
        res.json(result);

    } catch (error) {
        logger.error('Playlist silme route hatası', {
            error: error.message,
            stack: error.stack,
            playlistId: req.params.id
        });

        res.status(500).json({
            success: false,
            message: 'Playlist silme hatası',
            error: error.message
        });
    }
});

// Tüm playlist'leri siler
router.delete('/clear', async (req, res) => {
    try {
        logger.info('Tüm playlist\'leri silme isteği');
        const result = playlistService.clearAllPlaylists();
        
        res.json(result);

    } catch (error) {
        logger.error('Playlist temizleme route hatası', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Playlist temizleme hatası',
            error: error.message
        });
    }
});

/**
 * GET /api/playlist/:pathBase64/tracks
 * Belirli bir playlist'in track'lerini listele
 */
router.get('/:pathBase64/tracks', (req, res) => {
    try {
        const { pathBase64 } = req.params;
        const playlistPath = Buffer.from(pathBase64, 'base64').toString('utf8');
        const { limit, offset } = req.query;

        logger.info(`Playlist track listeleme isteği: path=${playlistPath}, limit=${limit}, offset=${offset}`);
        const result = playlistService.getPlaylistTracks(playlistPath, { limit: parseInt(limit), offset: parseInt(offset) });
        res.json(result);
    } catch (error) {
        logger.error(`Playlist track listeleme hatası: ${error.message}`, { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Playlist track listeleme hatası',
            error: error.message
        });
    }
});

/**
 * DELETE /api/playlist/:pathBase64
 * Belirli bir playlist'i siler
 */
router.delete('/:pathBase64', (req, res) => {
    try {
        const { pathBase64 } = req.params;
        const playlistPath = Buffer.from(pathBase64, 'base64').toString('utf8');

        logger.info(`Playlist silme isteği: path=${playlistPath}`);
        const result = playlistService.deletePlaylist(playlistPath);
        res.json(result);
    } catch (error) {
        logger.error(`Playlist silme hatası: ${error.message}`, { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Playlist silme hatası',
            error: error.message
        });
    }
});

/**
 * DELETE /api/playlist/clear
 * Tüm playlist'leri temizler
 */
router.delete('/clear', (req, res) => {
    try {
        logger.warn('Tüm playlist\'leri temizleme isteği');
        const result = playlistService.clearAllPlaylists();
        res.json(result);
    } catch (error) {
        logger.error(`Tüm playlist\'leri temizleme hatası: ${error.message}`, { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Tüm playlist\'leri temizleme hatası',
            error: error.message
        });
    }
});

module.exports = router;
