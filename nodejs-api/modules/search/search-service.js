'use strict';

const { getLogger } = require('../../shared/logger');
const { getDatabase } = require('../../shared/database');
const { WordSimilaritySearch } = require('../../shared/utils');

class SearchService {
    constructor() {
        this.logger = getLogger().module('SearchService');
        this.dbManager = getDatabase();
        this.db = this.dbManager.db;
    }

    /**
     * Metin araması yapar
     * @param {string} query - Arama terimi
     * @param {Object} options - Arama seçenekleri
     * @returns {Promise<Object>} Arama sonucu
     */
    async searchText(query, options = {}) {
        try {
            const { limit = 50, offset = 0, filters = {} } = options;
            
            this.logger.info(`Metin araması: ${query}`, { limit, offset, filters });

            let sql = `
                SELECT 
                    mf.id,
                    mf.path,
                    mf.fileName,
                    mf.normalizedFileName,
                    mf.extension,
                    mf.size,
                    mf.modifiedTime,
                    mf.created_at
                FROM music_files mf
                WHERE mf.normalizedFileName LIKE @query
            `;

            const params = {
                query: `%${query.toLowerCase()}%`,
                limit,
                offset
            };

            // Filtreleri uygula
            if (filters.extension) {
                sql += ' AND mf.extension = @extension';
                params.extension = filters.extension;
            }

            if (filters.minSize) {
                sql += ' AND mf.size >= @minSize';
                params.minSize = filters.minSize;
            }

            if (filters.maxSize) {
                sql += ' AND mf.size <= @maxSize';
                params.maxSize = filters.maxSize;
            }

            sql += ' ORDER BY mf.fileName LIMIT @limit OFFSET @offset';

            const stmt = this.db.prepare(sql);
            const results = stmt.all(params);

            // Toplam sayıyı al
            let countSql = `
                SELECT COUNT(*) as total
                FROM music_files mf
                WHERE mf.normalizedFileName LIKE @query
            `;

            if (filters.extension) {
                countSql += ' AND mf.extension = @extension';
            }
            if (filters.minSize) {
                countSql += ' AND mf.size >= @minSize';
            }
            if (filters.maxSize) {
                countSql += ' AND mf.size <= @maxSize';
            }

            const countStmt = this.db.prepare(countSql);
            const total = countStmt.get(params).total;

            return {
                success: true,
                results,
                total,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(total / limit),
                query,
                filters
            };

        } catch (error) {
            this.logger.error('Metin araması hatası', {
                error: error.message,
                stack: error.stack,
                query,
                options
            });

            return {
                success: false,
                results: [],
                total: 0,
                page: 1,
                totalPages: 0,
                query,
                filters: {},
                error: error.message
            };
        }
    }

    /**
     * Playlist araması yapar
     * @param {string} query - Arama terimi
     * @param {Object} options - Arama seçenekleri
     * @returns {Promise<Object>} Arama sonucu
     */
    async searchPlaylists(query, options = {}) {
        try {
            const { limit = 50, offset = 0, filters = {} } = options;
            
            this.logger.info(`Playlist araması: ${query}`, { limit, offset, filters });

            let sql = `
                SELECT 
                    p.id,
                    p.name,
                    p.path,
                    p.format,
                    p.source,
                    p.file_count,
                    p.created_at,
                    p.updated_at
                FROM tracks t
                WHERE t.source = 'playlist'
                WHERE p.name LIKE @query
            `;

            const params = {
                query: `%${query.toLowerCase()}%`,
                limit,
                offset
            };

            // Filtreleri uygula
            if (filters.format) {
                sql += ' AND p.format = @format';
                params.format = filters.format;
            }

            if (filters.source) {
                sql += ' AND p.source = @source';
                params.source = filters.source;
            }

            if (filters.minFileCount) {
                sql += ' AND p.file_count >= @minFileCount';
                params.minFileCount = filters.minFileCount;
            }

            if (filters.maxFileCount) {
                sql += ' AND p.file_count <= @maxFileCount';
                params.maxFileCount = filters.maxFileCount;
            }

            sql += ' ORDER BY p.name LIMIT @limit OFFSET @offset';

            const stmt = this.db.prepare(sql);
            const results = stmt.all(params);

            // Toplam sayıyı al
            let countSql = `
                SELECT COUNT(*) as total
                FROM tracks t
                WHERE t.source = 'playlist'
                WHERE p.name LIKE @query
            `;

            if (filters.format) {
                countSql += ' AND p.format = @format';
            }
            if (filters.source) {
                countSql += ' AND p.source = @source';
            }
            if (filters.minFileCount) {
                countSql += ' AND p.file_count >= @minFileCount';
            }
            if (filters.maxFileCount) {
                countSql += ' AND p.file_count <= @maxFileCount';
            }

            const countStmt = this.db.prepare(countSql);
            const total = countStmt.get(params).total;

            return {
                success: true,
                results,
                total,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(total / limit),
                query,
                filters
            };

        } catch (error) {
            this.logger.error('Playlist araması hatası', {
                error: error.message,
                stack: error.stack,
                query,
                options
            });

            return {
                success: false,
                results: [],
                total: 0,
                page: 1,
                totalPages: 0,
                query,
                filters: {},
                error: error.message
            };
        }
    }

    /**
     * History araması yapar
     * @param {string} query - Arama terimi
     * @param {Object} options - Arama seçenekleri
     * @returns {Promise<Object>} Arama sonucu
     */
    async searchHistory(query, options = {}) {
        try {
            const { limit = 50, offset = 0, filters = {} } = options;
            
            this.logger.info(`History araması: ${query}`, { limit, offset, filters });

            let sql = `
                SELECT 
                    t.id,
                    t.path as original_path,
                    t.normalizedFileName,
                    t.source_file as m3u_file_path,
                    t.is_matched,
                    t.matched_music_file_id,
                    t.created_at,
                    t.updated_at,
                    mf.path as music_file_path,
                    mf.fileName as music_file_name
                FROM tracks t
                LEFT JOIN music_files mf ON t.matched_music_file_id = mf.id
                WHERE t.source = 'history' AND t.normalized_name LIKE @query
            `;

            const params = {
                query: `%${query.toLowerCase()}%`,
                limit,
                offset
            };

            // Filtreleri uygula
            if (filters.isMatched !== undefined) {
                sql += ' AND ht.is_matched = @isMatched';
                params.isMatched = filters.isMatched ? 1 : 0;
            }

            if (filters.m3uFilePath) {
                sql += ' AND ht.m3u_file_path LIKE @m3uFilePath';
                params.m3uFilePath = `%${filters.m3uFilePath}%`;
            }

            sql += ' ORDER BY ht.created_at DESC LIMIT @limit OFFSET @offset';

            const stmt = this.db.prepare(sql);
            const results = stmt.all(params);

            // Toplam sayıyı al
            let countSql = `
                SELECT COUNT(*) as total
                FROM tracks t
                WHERE t.source = 'history' AND t.normalized_name LIKE @query
            `;

            if (filters.isMatched !== undefined) {
                countSql += ' AND t.is_matched = @isMatched';
            }
            if (filters.m3uFilePath) {
                countSql += ' AND t.source_file LIKE @m3uFilePath';
            }

            const countStmt = this.db.prepare(countSql);
            const total = countStmt.get(params).total;

            return {
                success: true,
                results,
                total,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(total / limit),
                query,
                filters
            };

        } catch (error) {
            this.logger.error('History araması hatası', {
                error: error.message,
                stack: error.stack,
                query,
                options
            });

            return {
                success: false,
                results: [],
                total: 0,
                page: 1,
                totalPages: 0,
                query,
                filters: {},
                error: error.message
            };
        }
    }

    /**
     * Arama önerileri getirir
     * @param {string} query - Arama terimi
     * @param {number} limit - Öneri limiti
     * @returns {Promise<Array>} Öneri listesi
     */
    async getSuggestions(query, limit = 10) {
        try {
            if (!query || query.length < 2) {
                return [];
            }

            this.logger.info(`Arama önerileri: ${query}`, { limit });

            // Music files'dan öneriler
            const musicStmt = this.db.prepare(`
                SELECT DISTINCT fileName as text, 'music' as type, 1.0 as score
                FROM music_files 
                WHERE normalizedFileName LIKE @query
                ORDER BY fileName
                LIMIT @limit
            `);

            const musicSuggestions = musicStmt.all({
                query: `%${query.toLowerCase()}%`,
                limit: Math.ceil(limit / 2)
            });

            // Playlists'ten öneriler
            const playlistStmt = this.db.prepare(`
                SELECT DISTINCT name as text, 'playlist' as type, 1.0 as score
                FROM tracks WHERE source = 'playlist' 
                WHERE name LIKE @query
                ORDER BY name
                LIMIT @limit
            `);

            const playlistSuggestions = playlistStmt.all({
                query: `%${query.toLowerCase()}%`,
                limit: Math.ceil(limit / 2)
            });

            const suggestions = [...musicSuggestions, ...playlistSuggestions]
                .sort((a, b) => a.text.localeCompare(b.text))
                .slice(0, limit);

            return suggestions;

        } catch (error) {
            this.logger.error('Arama önerileri hatası', {
                error: error.message,
                stack: error.stack,
                query,
                limit
            });
            return [];
        }
    }

    /**
     * Test edilebilir kelime çıkartmalı arama (genel arama için)
     * @param {string} searchQuery - Aranacak kelime
     * @param {number} threshold - Minimum benzerlik oranı (0.0-1.0)
     * @param {number} limit - Maksimum sonuç sayısı
     * @returns {Object} Arama sonucu
     */
    async performTestWordSimilaritySearch(searchQuery, threshold = 0.3, limit = 50) {
        try {
            this.logger.info(`Test kelime çıkartmalı arama başlatılıyor: "${searchQuery}" (threshold: ${threshold}, limit: ${limit})`);

            // Shared utils'den WordSimilaritySearch sınıfını kullan
            const wordSimilaritySearch = new WordSimilaritySearch(this.db);
            const result = await wordSimilaritySearch.performTestWordSimilaritySearch(searchQuery);

            return {
                success: true,
                data: result
            };

        } catch (error) {
            this.logger.error('Test kelime çıkartmalı arama hatası:', error);
            return {
                success: false,
                message: 'Test kelime çıkartmalı arama hatası',
                error: error.message
            };
        }
    }


    /**
     * İki string arasındaki benzerliği hesapla (Levenshtein distance)
     * @param {string} str1 - İlk string
     * @param {string} str2 - İkinci string
     * @returns {number} Benzerlik oranı (0.0-1.0)
     */
    calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        const maxLength = Math.max(str1.length, str2.length);
        
        return maxLength === 0 ? 1 : 1 - (distance / maxLength);
    }

    /**
     * Levenshtein distance hesapla
     * @param {string} str1 - İlk string
     * @param {string} str2 - İkinci string
     * @returns {number} Distance değeri
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,  // substitution
                        matrix[i][j - 1] + 1,      // insertion
                        matrix[i - 1][j] + 1       // deletion
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    // Search history kaldırıldı - basitlik için gereksiz
}

module.exports = SearchService;
