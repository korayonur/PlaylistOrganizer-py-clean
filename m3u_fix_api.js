'use strict';

const express = require('express');
const M3UPathFixerOptimized = require('./m3u_path_fixer_optimized');
const { getOptimizedDatabase } = require('./optimized_database_manager');

const router = express.Router();
const pathFixer = new M3UPathFixerOptimized();
const db = getOptimizedDatabase();

/**
 * M3U Path Fix API Endpoints
 */

// Ana fix endpoint'i
router.post('/fix', async (req, res) => {
    try {
        const {
            batchSize = 100,
            threshold = 0.7,
            maxRetries = 3,
            dryRun = false
        } = req.body;

        console.log('🔧 M3U Path Fix API çağrısı:', { batchSize, threshold, dryRun });

        const result = await pathFixer.fixMissingPaths({
            batchSize,
            threshold,
            maxRetries,
            dryRun
        });

        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ M3U Path Fix API hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Analiz endpoint'i
router.get('/analyze', async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        
        console.log('🔍 M3U Path analiz API çağrısı:', { limit });

        const result = await pathFixer.analyzeMissingPaths(parseInt(limit));

        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ M3U Path analiz API hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// İstatistikler endpoint'i
router.get('/stats', async (req, res) => {
    try {
        console.log('📊 M3U Path istatistik API çağrısı');

        const counts = db.getCounts();
        const summary = db.getMatchSummary();
        const performance = db.getPerformanceStats();

        res.json({
            success: true,
            data: {
                counts,
                summary,
                performance
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ M3U Path istatistik API hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Invalid path'li kayıtları getir
router.get('/invalid-paths', async (req, res) => {
    try {
        const { 
            limit = 50, 
            offset = 0, 
            reason = null,
            source = null 
        } = req.query;

        console.log('📋 Invalid path kayıtları API çağrısı:', { limit, offset, reason, source });

        let tracks;
        if (source) {
            tracks = db.getUnmatchedTracksBySource(source, parseInt(limit), parseInt(offset));
        } else {
            tracks = db.getUnmatchedTracks(parseInt(limit), parseInt(offset), reason);
        }

        res.json({
            success: true,
            data: {
                tracks,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: db.getCounts().invalidPathTracks
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Invalid path kayıtları API hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Belirli M3U dosyasını düzelt
router.post('/fix-m3u-file', async (req, res) => {
    try {
        const { m3uFilePath, ...options } = req.body;

        if (!m3uFilePath) {
            return res.status(400).json({
                success: false,
                error: 'M3U dosya yolu gerekli',
                timestamp: new Date().toISOString()
            });
        }

        console.log('🎵 M3U dosya fix API çağrısı:', { m3uFilePath, options });

        const result = await pathFixer.fixM3UFile(m3uFilePath, options);

        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ M3U dosya fix API hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Eşleşme türlerini getir
router.get('/match-types', async (req, res) => {
    try {
        const { limit = 50, offset = 0, type = 'exact_path' } = req.query;

        console.log('🎯 Eşleşme türü API çağrısı:', { type, limit, offset });

        let tracks;
        switch (type) {
            case 'exact_path':
                tracks = db.getExactMatches(parseInt(limit), parseInt(offset));
                break;
            case 'filename':
                tracks = db.getFilenameMatches(parseInt(limit), parseInt(offset));
                break;
            case 'filename_only':
                tracks = db.getFilenameOnlyMatches(parseInt(limit), parseInt(offset));
                break;
            case 'normalized':
                tracks = db.getNormalizedMatches(parseInt(limit), parseInt(offset));
                break;
            case 'non_exact':
                tracks = db.getNonExactMatches(parseInt(limit), parseInt(offset));
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Geçersiz eşleşme türü',
                    timestamp: new Date().toISOString()
                });
        }

        res.json({
            success: true,
            data: {
                tracks,
                type,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Eşleşme türü API hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Test endpoint'i
router.get('/test', async (req, res) => {
    try {
        console.log('🧪 M3U Path Fix test API çağrısı');

        const testResult = await pathFixer.analyzeMissingPaths(10);
        const stats = db.getCounts();

        res.json({
            success: true,
            data: {
                test: testResult,
                stats: stats,
                message: 'Test başarılı - sistem çalışıyor'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ M3U Path Fix test API hatası:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;



