'use strict';

const express = require('express');
const AnalyticsService = require('./analytics-service');
const { getLogger } = require('../../shared/logger');

const router = express.Router();
const analyticsService = new AnalyticsService();
const logger = getLogger().module('AnalyticsRoutes');

// Genel analiz özeti
router.get('/summary', async (req, res) => {
    try {
        logger.info('Genel analiz özeti isteği');
        const result = await analyticsService.getSummary();
        
        res.json(result);

    } catch (error) {
        logger.error('Genel analiz özeti route hatası', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Genel analiz özeti hatası',
            error: error.message
        });
    }
});

// Genel analiz özeti (eski endpoint)
router.get('/overview', async (req, res) => {
    try {
        logger.info('Analiz özeti isteği');
        const result = await analyticsService.getOverview();
        
        res.json(result);

    } catch (error) {
        logger.error('Analiz özeti route hatası', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Analiz özeti hatası',
            error: error.message
        });
    }
});

// Koleksiyon analizi
router.get('/collection', async (req, res) => {
    try {
        logger.info('Koleksiyon analizi isteği');
        const result = await analyticsService.getCollectionAnalysis();
        
        res.json(result);

    } catch (error) {
        logger.error('Koleksiyon analizi route hatası', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Koleksiyon analizi hatası',
            error: error.message
        });
    }
});

// Playlist analizi
router.get('/playlists', async (req, res) => {
    try {
        logger.info('Playlist analizi isteği');
        const result = await analyticsService.getPlaylistAnalysis();
        
        res.json(result);

    } catch (error) {
        logger.error('Playlist analizi route hatası', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Playlist analizi hatası',
            error: error.message
        });
    }
});

// History analizi
router.get('/history', async (req, res) => {
    try {
        logger.info('History analizi isteği');
        const result = await analyticsService.getHistoryAnalysis();
        
        res.json(result);

    } catch (error) {
        logger.error('History analizi route hatası', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'History analizi hatası',
            error: error.message
        });
    }
});

// Trend analizi
router.get('/trends', async (req, res) => {
    try {
        logger.info('Trend analizi isteği');
        const result = await analyticsService.getTrendAnalysis();
        
        res.json(result);

    } catch (error) {
        logger.error('Trend analizi route hatası', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Trend analizi hatası',
            error: error.message
        });
    }
});

// Özel rapor oluştur
router.post('/report', async (req, res) => {
    try {
        const { 
            type = 'comprehensive', 
            dateRange = '30days',
            includeCharts = true 
        } = req.body;

        logger.info('Rapor oluşturma isteği', { type, dateRange, includeCharts });
        const result = await analyticsService.generateReport({
            type,
            dateRange,
            includeCharts
        });
        
        res.json(result);

    } catch (error) {
        logger.error('Rapor oluşturma route hatası', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });

        res.status(500).json({
            success: false,
            message: 'Rapor oluşturma hatası',
            error: error.message
        });
    }
});

module.exports = router;
