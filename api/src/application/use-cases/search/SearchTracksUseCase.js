'use strict';

const FuzzySearchService = require('../../services/FuzzySearchService');

/**
 * Search Tracks Use Case
 * Kelime bazlı track arama - FuzzySearchService kullanır
 */
class SearchTracksUseCase {
    constructor(db, wordIndexService) {
        this.db = db;
        this.wordIndexService = wordIndexService;
        this.fuzzySearchService = new FuzzySearchService(db, wordIndexService);
    }

    /**
     * Track'leri ara - FuzzySearchService kullanır
     * @param {string} query - Arama sorgusu
     * @param {number} limit - Sonuç limiti
     * @param {number} offset - Başlangıç offset
     * @returns {Promise<Object>} Arama sonuçları
     */
    async execute(query, limit = null, offset = 0) {
        try {
            if (!query || query.trim().length === 0) {
                return {
                    success: false,
                    message: 'Arama sorgusu boş olamaz',
                    results: []
                };
            }

            console.log(`🔍 Arama yapılıyor: "${query}"`);
            
            // Input query'yi normalize et
            const normalizedQuery = this.wordIndexService.normalize(query);
            const words = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
            
            console.log(`📝 Normalize edilmiş query: "${normalizedQuery}"`);
            console.log(`🔤 Kelimeler: [${words.join(', ')}]`);
            
            // FuzzySearchService kullan - MUSIC_WORDS tablosunu kullan (gerçek müzik dosyaları)
            const results = await this.fuzzySearchService.searchTracks(query, {
                limit,
                offset,
                includeScoreDetails: true,
                tableType: 'music_words', // Gerçek müzik dosyalarını ara
                enableFuzzy: true, // Fuzzy matching AKTIF (yeni sistem)
                fuzzyThreshold: 0.5 // Threshold 0.5 (daha agresif)
            });
            
            console.log(`✅ ${results.length} sonuç bulundu`);
            
            return {
                success: true,
                query,
                results,
                count: results.length,
                searchProcess: {
                    originalQuery: query,
                    normalizedQuery: normalizedQuery,
                    words: words,
                    wordCount: words.length,
                    tableUsed: 'music_words'
                }
            };
            
        } catch (error) {
            console.error(`❌ Search use case hatası: ${error.message}`);
            return {
                success: false,
                message: 'Arama hatası',
                error: error.message,
                results: []
            };
        }
    }
}

module.exports = SearchTracksUseCase;

