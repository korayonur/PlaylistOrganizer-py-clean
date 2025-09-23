'use strict';

const express = require('express');
const SearchService = require('./search-service');
const { getLogger } = require('../../shared/logger');

const router = express.Router();
const searchService = new SearchService();
const logger = getLogger().module('SearchRoutes');

// Metin araması
router.post('/query', async (req, res) => {
    try {
        const { query, type = 'text', filters = {}, limit = 50, offset = 0 } = req.body;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Arama terimi gerekli'
            });
        }

        logger.info(`Arama isteği: ${query}`, { type, filters, limit, offset });

        let result;
        switch (type) {
            case 'text':
                result = await searchService.searchText(query, { limit, offset, filters });
                break;
            case 'playlist':
                result = await searchService.searchPlaylists(query, { limit, offset, filters });
                break;
            case 'history':
                result = await searchService.searchHistory(query, { limit, offset, filters });
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Geçersiz arama türü'
                });
        }

        // Arama geçmişini kaydet
        if (result.success) {
            await searchService.saveSearchHistory(query, type, result.total);
        }

        res.json(result);

    } catch (error) {
        logger.error('Arama route hatası', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });

        res.status(500).json({
            success: false,
            message: 'Arama hatası',
            error: error.message
        });
    }
});

// Arama önerileri
router.get('/suggestions', async (req, res) => {
    try {
        const { q: query, limit = 10 } = req.query;
        
        if (!query || query.trim().length < 2) {
            return res.json({
                success: true,
                suggestions: []
            });
        }

        logger.info(`Arama önerileri isteği: ${query}`, { limit });
        const suggestions = await searchService.getSuggestions(query, parseInt(limit));
        
        res.json({
            success: true,
            suggestions
        });

    } catch (error) {
        logger.error('Arama önerileri route hatası', {
            error: error.message,
            stack: error.stack,
            query: req.query
        });

        res.status(500).json({
            success: false,
            message: 'Arama önerileri hatası',
            error: error.message
        });
    }
});

// Search history kaldırıldı - basitlik için gereksiz

// Arama filtreleri
router.get('/filters', async (req, res) => {
    try {
        logger.info('Arama filtreleri isteği');
        
        // Mevcut filtreleri getir
        const filters = {
            music: {
                extensions: ['mp3', 'm4a', 'wav', 'flac', 'aac'],
                fileTypes: ['mp3', 'm4a', 'wav', 'flac', 'aac']
            },
            playlist: {
                formats: ['m3u', 'vdjfolder'],
                sources: ['history', 'folders', 'mylists']
            },
            history: {
                matched: [true, false]
            }
        };
        
        res.json({
            success: true,
            filters
        });

    } catch (error) {
        logger.error('Arama filtreleri route hatası', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Arama filtreleri hatası',
            error: error.message
        });
    }
});

// Gelişmiş arama
router.post('/advanced', async (req, res) => {
    try {
        const { 
            query, 
            type = 'text', 
            filters = {}, 
            sortBy = 'name', 
            sortOrder = 'asc',
            limit = 50, 
            offset = 0 
        } = req.body;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Arama terimi gerekli'
            });
        }

        logger.info(`Gelişmiş arama isteği: ${query}`, { 
            type, 
            filters, 
            sortBy, 
            sortOrder, 
            limit, 
            offset 
        });

        // Sıralama seçeneklerini ekle
        const options = { 
            limit, 
            offset, 
            filters,
            sortBy,
            sortOrder
        };

        let result;
        switch (type) {
            case 'text':
                result = await searchService.searchText(query, options);
                break;
            case 'playlist':
                result = await searchService.searchPlaylists(query, options);
                break;
            case 'history':
                result = await searchService.searchHistory(query, options);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Geçersiz arama türü'
                });
        }

        // Arama geçmişini kaydet
        if (result.success) {
            await searchService.saveSearchHistory(query, type, result.total);
        }

        res.json(result);

    } catch (error) {
        logger.error('Gelişmiş arama route hatası', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });

        res.status(500).json({
            success: false,
            message: 'Gelişmiş arama hatası',
            error: error.message
        });
    }
});

module.exports = router;
