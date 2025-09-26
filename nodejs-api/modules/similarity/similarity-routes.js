'use strict';

const express = require('express');
const IntegratedSimilaritySystem = require('../../shared/integrated_similarity_system');
const router = express.Router();

/**
 * Benzerlik Fix API Routes
 * Yeni entegre edilmiş benzerlik sistemi için API endpoint'leri
 */

// Benzerlik sistemi instance'ı
let similaritySystem = null;

// Middleware - benzerlik sistemini başlat
router.use((req, res, next) => {
    if (!similaritySystem) {
        try {
            similaritySystem = new IntegratedSimilaritySystem();
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: 'Benzerlik sistemi başlatılamadı',
                details: error.message
            });
        }
    }
    next();
});

/**
 * GET /api/similarity/suggestions
 * Fix önerilerini getir
 */
router.get('/suggestions', async (req, res) => {
    try {
        const filters = {
            fix_type: req.query.fix_type,
            confidence_level: req.query.confidence_level,
            min_similarity: req.query.min_similarity ? parseFloat(req.query.min_similarity) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : 50
        };

        const suggestions = similaritySystem.getFixSuggestions(filters);
        
        res.json({
            success: true,
            data: suggestions,
            count: suggestions.length,
            filters: filters
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Fix önerileri alınamadı',
            details: error.message
        });
    }
});

/**
 * POST /api/similarity/generate
 * Yeni fix önerileri oluştur
 */
router.post('/generate', async (req, res) => {
    try {
        const limit = req.body.limit || 100;
        
        const suggestions = await similaritySystem.generateFixSuggestions(limit);
        await similaritySystem.saveSuggestions(suggestions);
        
        res.json({
            success: true,
            message: `${suggestions.length} fix önerisi oluşturuldu`,
            count: suggestions.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Fix önerileri oluşturulamadı',
            details: error.message
        });
    }
});

/**
 * POST /api/similarity/apply/:id
 * Fix önerisini uygula
 */
router.post('/apply/:id', async (req, res) => {
    try {
        const suggestionId = parseInt(req.params.id);
        
        await similaritySystem.applyFix(suggestionId);
        
        res.json({
            success: true,
            message: 'Fix önerisi başarıyla uygulandı',
            suggestion_id: suggestionId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Fix önerisi uygulanamadı',
            details: error.message
        });
    }
});

/**
 * GET /api/similarity/statistics
 * İstatistikleri getir
 */
router.get('/statistics', async (req, res) => {
    try {
        const stats = similaritySystem.getStatistics();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'İstatistikler alınamadı',
            details: error.message
        });
    }
});

/**
 * GET /api/similarity/unmatched-tracks
 * Eşleşmemiş track'ları getir
 */
router.get('/unmatched-tracks', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const tracks = similaritySystem.getUnmatchedTracks(limit);
        
        res.json({
            success: true,
            data: tracks,
            count: tracks.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Eşleşmemiş track\'lar alınamadı',
            details: error.message
        });
    }
});

/**
 * DELETE /api/similarity/suggestions
 * Tüm fix önerilerini temizle
 */
router.delete('/suggestions', async (req, res) => {
    try {
        similaritySystem.db.exec('DELETE FROM similarity_fix_suggestions');
        
        res.json({
            success: true,
            message: 'Tüm fix önerileri temizlendi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Fix önerileri temizlenemedi',
            details: error.message
        });
    }
});

// Cleanup middleware
router.use((req, res, next) => {
    // Her request sonrası cleanup yapabilirsin
    next();
});

module.exports = router;
