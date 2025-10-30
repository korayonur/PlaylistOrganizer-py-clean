const SimilarityService = require('../../../application/services/SimilarityService');

/**
 * Similarity Controller - Fix Önerileri API
 */
class SimilarityController {
    constructor(db, wordIndexService) {
        this.similarityService = new SimilarityService(db, wordIndexService);
    }

    /**
     * GET /api/similarity/suggestions
     * Fix önerilerini getir
     */
    async getSuggestions(req, res) {
        try {
            console.log('[API] Fix önerileri alınıyor...');
            
            const filters = {
                type: req.query.type,
                min_similarity: req.query.min_similarity ? parseFloat(req.query.min_similarity) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit) : null,
                offset: req.query.offset ? parseInt(req.query.offset) : 0
            };

            const result = await this.similarityService.generateSuggestions(filters);

            res.json({
                success: true,
                data: result.suggestions,
                total: result.total,
                count: result.count,
                hasMore: result.hasMore,
                stats: result.stats,
                filters: result.filters,
                cache: {
                    cached: result.cached || false,
                    cached_at: result.cached_at || null,
                    cache_age_minutes: result.cached ? Math.round((Date.now() - new Date(result.cached_at).getTime()) / 60000) : null
                }
            });
        } catch (error) {
            console.error('[API] Fix önerileri hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Fix önerileri alınamadı',
                details: error.message
            });
        }
    }

    /**
     * GET /api/similarity/statistics
     * İstatistikler
     */
    async getStatistics(req, res) {
        try {
            console.log('[API] Similarity istatistikleri alınıyor...');
            
            const stats = this.similarityService.getStatistics();

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('[API] İstatistik hatası:', error);
            res.status(500).json({
                success: false,
                error: 'İstatistikler alınamadı',
                details: error.message
            });
        }
    }

    /**
     * GET /api/similarity/unmatched-tracks
     * Eşleşmemiş track'ları getir
     */
    async getUnmatchedTracks(req, res) {
        try {
            console.log('[API] Eşleşmemiş tracklar alınıyor...');
            
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const tracks = this.similarityService.getUnmatchedTracks(limit);

            res.json({
                success: true,
                data: tracks,
                count: tracks.length
            });
        } catch (error) {
            console.error('[API] Eşleşmemiş track hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Eşleşmemiş tracklar alınamadı',
                details: error.message
            });
        }
    }

    /**
     * POST /api/similarity/cache/refresh
     * Cache'i yenile
     */
    async refreshCache(req, res) {
        try {
            console.log('[API] Cache yenileniyor...');
            
            // Eski cache'i sil
            await this.similarityService.cacheService.invalidate('fix-suggestions');
            
            // Yeni cache oluştur (tum veri)
            const result = await this.similarityService.generateSuggestions({ limit: null, offset: 0 });
            
            res.json({
                success: true,
                message: 'Cache basariyla yenilendi',
                stats: result.stats,
                total: result.total,
                cached_at: result.cached_at
            });
        } catch (error) {
            console.error('[API] Cache yenileme hatasi:', error);
            res.status(500).json({
                success: false,
                error: 'Cache yenileme basarisiz',
                details: error.message
            });
        }
    }

    /**
     * POST /api/similarity/apply
     * Fix önerilerini uygula
     */
    async applySuggestions(req, res) {
        try {
            console.log('[API] Fix önerileri uygulanıyor...');
            
            const { suggestions } = req.body;
            
            if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'suggestions array gerekli'
                });
            }

            const results = await this.similarityService.applySuggestions(suggestions);

            res.json({
                success: true,
                message: `${results.applied} fix başarıyla uygulandı`,
                ...results
            });
        } catch (error) {
            console.error('[API] Fix uygulama hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Fix önerileri uygulanamadı',
                details: error.message
            });
        }
    }
}

module.exports = SimilarityController;

