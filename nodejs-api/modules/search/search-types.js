'use strict';

/**
 * @typedef {Object} SearchQuery
 * @property {string} query - Arama terimi
 * @property {string} type - Arama türü ('text', 'metadata', 'playlist', 'history', 'fuzzy')
 * @property {Object} filters - Filtreler
 * @property {number} limit - Sonuç limiti
 * @property {number} offset - Sayfa offset'i
 */

/**
 * @typedef {Object} SearchResult
 * @property {boolean} success
 * @property {Array} results - Arama sonuçları
 * @property {number} total - Toplam sonuç sayısı
 * @property {number} page - Mevcut sayfa
 * @property {number} totalPages - Toplam sayfa sayısı
 * @property {string} query - Orijinal sorgu
 * @property {Object} filters - Uygulanan filtreler
 */

/**
 * @typedef {Object} SearchSuggestion
 * @property {string} text - Öneri metni
 * @property {string} type - Öneri türü
 * @property {number} score - Benzerlik skoru
 */

/**
 * @typedef {Object} SearchFilter
 * @property {string} field - Filtre alanı
 * @property {string} operator - Operatör ('eq', 'ne', 'gt', 'lt', 'like', 'in')
 * @property {any} value - Filtre değeri
 */

module.exports = {
    // Types are exported for JSDoc usage
};
