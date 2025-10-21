'use strict';

const FuzzySearchService = require('../../services/FuzzySearchService');

/**
 * Search by Filename Use Case
 * Dosya adı ile track arama - FuzzySearchService kullanır
 */
class SearchByFilenameUseCase {
    constructor(db, wordIndexService) {
        this.db = db;
        this.wordIndexService = wordIndexService;
        this.fuzzySearchService = new FuzzySearchService(db, wordIndexService);
    }

    /**
     * Dosya adı ile track ara
     * @param {string} fileName - Dosya adı (örn: "Dale Don Dale.m4a")
     * @param {number} limit - Sonuç limiti (default: 1)
     * @returns {Promise<Array>} Arama sonuçları
     */
    async execute(fileName, limit = 1) {
        try {
            if (!fileName || fileName.trim().length === 0) {
                return [];
            }

            console.log(`🔍 Dosya adı ile arama: "${fileName}"`);
            
            // Dosya adından extension'ı temizle
            // Örn: "Dale Don Dale.m4a" → "dale don dale"
            const cleanFileName = fileName.replace(/\.(mp3|m4a|wav|flac|aac|ogg|wma)$/i, '').trim();
            
            if (cleanFileName.length === 0) {
                console.log('⚠️ Temizlenmiş dosya adı boş');
                return [];
            }
            
            console.log(`📝 Temizlenmiş dosya adı: "${cleanFileName}"`);
            
            // music_words tablosundan ara (gerçek müzik dosyaları)
            const results = await this.fuzzySearchService.searchTracks(cleanFileName, {
                limit,
                tableType: 'music_words', // Gerçek müzik dosyalarını ara
                enableFuzzy: true, // Fuzzy matching AKTIF
                fuzzyThreshold: 0.5, // Threshold 0.5 (daha agresif)
                includeScoreDetails: true
            });
            
            console.log(`✅ ${results.length} sonuç bulundu`);
            
            return results;
            
        } catch (error) {
            console.error(`❌ SearchByFilenameUseCase hatası: ${error.message}`);
            return [];
        }
    }
}

module.exports = SearchByFilenameUseCase;
