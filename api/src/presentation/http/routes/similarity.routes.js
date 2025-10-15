const express = require('express');
const router = express.Router();

/**
 * Similarity Routes - Fix Önerileri
 */
module.exports = (similarityController) => {
    // GET /api/similarity/suggestions - Fix önerilerini getir
    router.get('/suggestions', similarityController.getSuggestions.bind(similarityController));
    
    // GET /api/similarity/statistics - İstatistikler
    router.get('/statistics', similarityController.getStatistics.bind(similarityController));
    
    // GET /api/similarity/unmatched-tracks - Eşleşmemiş tracklar
    router.get('/unmatched-tracks', similarityController.getUnmatchedTracks.bind(similarityController));
    
    // POST /api/similarity/apply - Fix önerilerini uygula
    router.post('/apply', similarityController.applySuggestions.bind(similarityController));
    
    // POST /api/similarity/cache/refresh - Cache'i yenile
    router.post('/cache/refresh', similarityController.refreshCache.bind(similarityController));
    
    return router;
};

