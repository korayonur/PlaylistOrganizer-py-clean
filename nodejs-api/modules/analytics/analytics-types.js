'use strict';

/**
 * @typedef {Object} AnalyticsOverview
 * @property {number} totalMusicFiles - Toplam müzik dosyası sayısı
 * @property {number} totalPlaylists - Toplam playlist sayısı
 * @property {number} totalHistoryTracks - Toplam history track sayısı
 * @property {number} totalSize - Toplam dosya boyutu (bytes)
 * @property {number} averageFileSize - Ortalama dosya boyutu
 * @property {Object} fileTypeDistribution - Dosya türü dağılımı
 * @property {Object} playlistDistribution - Playlist dağılımı
 * @property {Object} historyDistribution - History dağılımı
 */

/**
 * @typedef {Object} CollectionAnalysis
 * @property {number} totalFiles - Toplam dosya sayısı
 * @property {number} totalSize - Toplam boyut
 * @property {Array} topExtensions - En çok kullanılan uzantılar
 * @property {Array} largestFiles - En büyük dosyalar
 * @property {Array} recentFiles - En son eklenen dosyalar
 * @property {Object} sizeDistribution - Boyut dağılımı
 */

/**
 * @typedef {Object} PlaylistAnalysis
 * @property {number} totalPlaylists - Toplam playlist sayısı
 * @property {number} totalTracks - Toplam track sayısı
 * @property {number} averageTracksPerPlaylist - Playlist başına ortalama track
 * @property {Array} largestPlaylists - En büyük playlist'ler
 * @property {Array} mostUsedTracks - En çok kullanılan track'ler
 * @property {Object} sourceDistribution - Kaynak dağılımı
 * @property {Object} formatDistribution - Format dağılımı
 */

/**
 * @typedef {Object} HistoryAnalysis
 * @property {number} totalTracks - Toplam history track sayısı
 * @property {number} matchedTracks - Eşleşen track sayısı
 * @property {number} unmatchedTracks - Eşleşmeyen track sayısı
 * @property {number} matchRate - Eşleşme oranı
 * @property {Array} mostPlayedTracks - En çok çalınan track'ler
 * @property {Array} recentTracks - En son çalınan track'ler
 * @property {Object} timeDistribution - Zaman dağılımı
 */

/**
 * @typedef {Object} TrendAnalysis
 * @property {Array} dailyStats - Günlük istatistikler
 * @property {Array} weeklyStats - Haftalık istatistikler
 * @property {Array} monthlyStats - Aylık istatistikler
 * @property {Object} growthRates - Büyüme oranları
 * @property {Array} topTrends - En popüler trendler
 */

module.exports = {
    // Types are exported for JSDoc usage
};
