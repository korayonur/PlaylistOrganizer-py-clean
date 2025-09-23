'use strict';

const { getLogger } = require('../../shared/logger');
const { getDatabase } = require('../../shared/database');

class AnalyticsService {
    constructor() {
        this.logger = getLogger().module('AnalyticsService');
        this.dbManager = getDatabase();
        this.db = this.dbManager.db;
    }

    /**
     * Genel analiz özetini getirir (yeni endpoint)
     * @returns {Promise<Object>} Analiz özeti
     */
    async getSummary() {
        try {
            this.logger.info('Genel analiz özeti isteği');

            // Temel sayılar
            const musicFilesCount = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
            const playlistsCount = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE source = \'playlist\'').get().count;
            const tracksCount = this.db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;

            // Toplam boyut
            const totalSizeResult = this.db.prepare('SELECT SUM(size) as total FROM music_files WHERE size IS NOT NULL').get();
            const totalSize = totalSizeResult.total || 0;
            const averageFileSize = musicFilesCount > 0 ? Math.round(totalSize / musicFilesCount) : 0;

            // Dosya türü dağılımı
            const fileTypeDistribution = this.db.prepare(`
                SELECT extension, COUNT(*) as count 
                FROM music_files 
                WHERE extension IS NOT NULL 
                GROUP BY extension 
                ORDER BY count DESC
            `).all();

            // Playlist dağılımı (tracks tablosundan)
            const playlistDistribution = this.db.prepare(`
                SELECT source, COUNT(*) as count 
                FROM tracks 
                WHERE source = 'playlist'
                GROUP BY source 
                ORDER BY count DESC
            `).all();

            // History dağılımı
            const historyDistribution = this.db.prepare(`
                SELECT 
                    source,
                    COUNT(*) as total,
                    SUM(CASE WHEN is_matched = 1 THEN 1 ELSE 0 END) as matched,
                    SUM(CASE WHEN is_matched = 0 THEN 1 ELSE 0 END) as unmatched
                FROM tracks 
                GROUP BY source 
                ORDER BY total DESC
            `).all();

            return {
                success: true,
                data: {
                    summary: {
                        musicFiles: musicFilesCount,
                        playlists: playlistsCount,
                        tracks: tracksCount,
                        totalSize: totalSize,
                        averageFileSize: averageFileSize
                    },
                    fileTypeDistribution,
                    playlistDistribution,
                    historyDistribution
                }
            };

        } catch (error) {
            this.logger.error('Genel analiz özeti hatası:', error);
            return {
                success: false,
                message: 'Genel analiz özeti alınamadı',
                error: error.message
            };
        }
    }

    /**
     * Genel analiz özetini getirir (eski endpoint)
     * @returns {Promise<Object>} Analiz özeti
     */
    async getOverview() {
        try {
            this.logger.info('Analiz özeti isteği');

            // Temel sayılar
            const musicFilesCount = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
            const playlistsCount = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE source = \'playlist\'').get().count;
            const tracksCount = this.db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;

            // Toplam boyut
            const totalSizeResult = this.db.prepare('SELECT SUM(size) as total FROM music_files WHERE size IS NOT NULL').get();
            const totalSize = totalSizeResult.total || 0;
            const averageFileSize = musicFilesCount > 0 ? Math.round(totalSize / musicFilesCount) : 0;

            // Dosya türü dağılımı
            const fileTypeDistribution = this.db.prepare(`
                SELECT fileType, COUNT(*) as count 
                FROM music_files 
                WHERE fileType IS NOT NULL 
                GROUP BY fileType 
                ORDER BY count DESC
            `).all();

            // Playlist dağılımı (tracks tablosundan)
            const playlistDistribution = this.db.prepare(`
                SELECT source, COUNT(*) as count 
                FROM tracks 
                WHERE source = 'playlist'
                GROUP BY source 
                ORDER BY count DESC
            `).all();

            // History dağılımı
            const historyDistribution = this.db.prepare(`
                SELECT 
                    CASE 
                        WHEN is_matched = 1 THEN 'matched'
                        ELSE 'unmatched'
                    END as status,
                    COUNT(*) as count
                FROM tracks 
                WHERE source = 'history'
                GROUP BY is_matched
            `).all();

            return {
                success: true,
                overview: {
                    totalMusicFiles: musicFilesCount,
                    totalPlaylists: playlistsCount,
                    totalHistoryTracks: historyTracksCount,
                    totalSize,
                    averageFileSize,
                    fileTypeDistribution,
                    playlistDistribution,
                    historyDistribution
                }
            };

        } catch (error) {
            this.logger.error('Analiz özeti hatası', {
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Koleksiyon analizini getirir
     * @returns {Promise<Object>} Koleksiyon analizi
     */
    async getCollectionAnalysis() {
        try {
            this.logger.info('Koleksiyon analizi isteği');

            // Temel bilgiler
            const totalFiles = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
            const totalSizeResult = this.db.prepare('SELECT SUM(size) as total FROM music_files WHERE size IS NOT NULL').get();
            const totalSize = totalSizeResult.total || 0;

            // En çok kullanılan uzantılar
            const topExtensions = this.db.prepare(`
                SELECT extension, COUNT(*) as count 
                FROM music_files 
                WHERE extension IS NOT NULL 
                GROUP BY extension 
                ORDER BY count DESC 
                LIMIT 10
            `).all();

            // En büyük dosyalar
            const largestFiles = this.db.prepare(`
                SELECT fileName, path, size, extension 
                FROM music_files 
                WHERE size IS NOT NULL 
                ORDER BY size DESC 
                LIMIT 10
            `).all();

            // En son eklenen dosyalar
            const recentFiles = this.db.prepare(`
                SELECT fileName, path, size, extension, created_at 
                FROM music_files 
                ORDER BY created_at DESC 
                LIMIT 10
            `).all();

            // Boyut dağılımı
            const sizeDistribution = this.db.prepare(`
                SELECT 
                    CASE 
                        WHEN size < 1024*1024 THEN '0-1MB'
                        WHEN size < 5*1024*1024 THEN '1-5MB'
                        WHEN size < 10*1024*1024 THEN '5-10MB'
                        WHEN size < 20*1024*1024 THEN '10-20MB'
                        ELSE '20MB+'
                    END as sizeRange,
                    COUNT(*) as count
                FROM music_files 
                WHERE size IS NOT NULL 
                GROUP BY 
                    CASE 
                        WHEN size < 1024*1024 THEN '0-1MB'
                        WHEN size < 5*1024*1024 THEN '1-5MB'
                        WHEN size < 10*1024*1024 THEN '5-10MB'
                        WHEN size < 20*1024*1024 THEN '10-20MB'
                        ELSE '20MB+'
                    END
                ORDER BY count DESC
            `).all();

            return {
                success: true,
                analysis: {
                    totalFiles,
                    totalSize,
                    topExtensions,
                    largestFiles,
                    recentFiles,
                    sizeDistribution
                }
            };

        } catch (error) {
            this.logger.error('Koleksiyon analizi hatası', {
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Playlist analizini getirir
     * @returns {Promise<Object>} Playlist analizi
     */
    async getPlaylistAnalysis() {
        try {
            this.logger.info('Playlist analizi isteği');

            // Temel bilgiler
            const totalPlaylists = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE source = \'playlist\'').get().count;
            const totalTracks = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE source = \'playlist\'').get().count;
            const averageTracksPerPlaylist = totalPlaylists > 0 ? Math.round(totalTracks / totalPlaylists) : 0;

            // En büyük playlist'ler
            const largestPlaylists = this.db.prepare(`
                SELECT t.normalized_name as name, t.source, t.path, t.created_at
                FROM tracks t
                WHERE t.source = 'playlist'
                ORDER BY t.created_at DESC
                LIMIT 10
            `).all();

            // En çok kullanılan track'ler
            const mostUsedTracks = this.db.prepare(`
                SELECT t.path as track_path, COUNT(*) as usage_count
                FROM tracks t
                WHERE t.source = 'playlist'
                GROUP BY t.path
                ORDER BY usage_count DESC
                LIMIT 10
            `).all();

            // Kaynak dağılımı
            const sourceDistribution = this.db.prepare(`
                SELECT source, COUNT(*) as count 
                FROM tracks WHERE source = 'playlist'
                GROUP BY source 
                ORDER BY count DESC
            `).all();

            // Format dağılımı
            const formatDistribution = this.db.prepare(`
                SELECT format, COUNT(*) as count 
                FROM tracks WHERE source = 'playlist'
                GROUP BY format 
                ORDER BY count DESC
            `).all();

            return {
                success: true,
                analysis: {
                    totalPlaylists,
                    totalTracks,
                    averageTracksPerPlaylist,
                    largestPlaylists,
                    mostUsedTracks,
                    sourceDistribution,
                    formatDistribution
                }
            };

        } catch (error) {
            this.logger.error('Playlist analizi hatası', {
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * History analizini getirir
     * @returns {Promise<Object>} History analizi
     */
    async getHistoryAnalysis() {
        try {
            this.logger.info('History analizi isteği');

            // Temel bilgiler
            const totalTracks = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE source = \'history\'').get().count;
            const matchedTracks = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE source = \'history\' AND is_matched = 1').get().count;
            const unmatchedTracks = totalTracks - matchedTracks;
            const matchRate = totalTracks > 0 ? Math.round((matchedTracks / totalTracks) * 100) : 0;

            // En çok çalınan track'ler (eşleşen olanlar)
            const mostPlayedTracks = this.db.prepare(`
                SELECT 
                    t.path as original_path,
                    t.normalized_name,
                    mf.fileName as music_file_name,
                    COUNT(*) as play_count
                FROM tracks t
                LEFT JOIN music_files mf ON t.matched_music_file_id = mf.id
                WHERE t.source = 'history' AND t.is_matched = 1
                GROUP BY t.path, t.normalized_name
                ORDER BY play_count DESC
                LIMIT 10
            `).all();

            // En son çalınan track'ler
            const recentTracks = this.db.prepare(`
                SELECT 
                    t.path as original_path,
                    t.normalized_name,
                    t.source_file as m3u_file_path,
                    t.is_matched,
                    mf.fileName as music_file_name,
                    t.created_at
                FROM tracks t
                LEFT JOIN music_files mf ON t.matched_music_file_id = mf.id
                WHERE t.source = 'history'
                ORDER BY t.created_at DESC
                LIMIT 10
            `).all();

            // Zaman dağılımı (günlük)
            const timeDistribution = this.db.prepare(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                FROM tracks 
                WHERE source = 'history'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            `).all();

            return {
                success: true,
                analysis: {
                    totalTracks,
                    matchedTracks,
                    unmatchedTracks,
                    matchRate,
                    mostPlayedTracks,
                    recentTracks,
                    timeDistribution
                }
            };

        } catch (error) {
            this.logger.error('History analizi hatası', {
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Trend analizini getirir
     * @returns {Promise<Object>} Trend analizi
     */
    async getTrendAnalysis() {
        try {
            this.logger.info('Trend analizi isteği');

            // Günlük istatistikler (son 30 gün)
            const dailyStats = this.db.prepare(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as music_files_added
                FROM music_files 
                WHERE created_at >= date('now', '-30 days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `).all();

            // Haftalık istatistikler (son 12 hafta)
            const weeklyStats = this.db.prepare(`
                SELECT 
                    strftime('%Y-%W', created_at) as week,
                    COUNT(*) as music_files_added
                FROM music_files 
                WHERE created_at >= date('now', '-84 days')
                GROUP BY strftime('%Y-%W', created_at)
                ORDER BY week DESC
            `).all();

            // Aylık istatistikler (son 12 ay)
            const monthlyStats = this.db.prepare(`
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    COUNT(*) as music_files_added
                FROM music_files 
                WHERE created_at >= date('now', '-365 days')
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
            `).all();

            // Büyüme oranları hesapla
            const currentMonth = monthlyStats[0]?.music_files_added || 0;
            const previousMonth = monthlyStats[1]?.music_files_added || 0;
            const monthlyGrowthRate = previousMonth > 0 ? 
                Math.round(((currentMonth - previousMonth) / previousMonth) * 100) : 0;

            return {
                success: true,
                analysis: {
                    dailyStats,
                    weeklyStats,
                    monthlyStats,
                    growthRates: {
                        monthly: monthlyGrowthRate
                    }
                }
            };

        } catch (error) {
            this.logger.error('Trend analizi hatası', {
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Özel rapor oluşturur
     * @param {Object} options - Rapor seçenekleri
     * @returns {Promise<Object>} Rapor
     */
    async generateReport(options = {}) {
        try {
            const { 
                type = 'comprehensive', 
                dateRange = '30days',
                includeCharts = true 
            } = options;

            this.logger.info('Rapor oluşturma isteği', { type, dateRange, includeCharts });

            const report = {
                type,
                dateRange,
                generatedAt: new Date().toISOString(),
                data: {}
            };

            // Rapor türüne göre veri topla
            if (type === 'comprehensive' || type === 'overview') {
                const overview = await this.getOverview();
                if (overview.success) {
                    report.data.overview = overview.overview;
                }
            }

            if (type === 'comprehensive' || type === 'collection') {
                const collection = await this.getCollectionAnalysis();
                if (collection.success) {
                    report.data.collection = collection.analysis;
                }
            }

            if (type === 'comprehensive' || type === 'playlist') {
                const playlist = await this.getPlaylistAnalysis();
                if (playlist.success) {
                    report.data.playlist = playlist.analysis;
                }
            }

            if (type === 'comprehensive' || type === 'history') {
                const history = await this.getHistoryAnalysis();
                if (history.success) {
                    report.data.history = history.analysis;
                }
            }

            if (type === 'comprehensive' || type === 'trends') {
                const trends = await this.getTrendAnalysis();
                if (trends.success) {
                    report.data.trends = trends.analysis;
                }
            }

            return {
                success: true,
                report
            };

        } catch (error) {
            this.logger.error('Rapor oluşturma hatası', {
                error: error.message,
                stack: error.stack,
                options
            });

            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = AnalyticsService;
