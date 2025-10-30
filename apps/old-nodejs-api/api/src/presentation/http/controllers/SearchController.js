const SearchTracksUseCase = require('../../../application/use-cases/search/SearchTracksUseCase');
const RebuildIndexUseCase = require('../../../application/use-cases/search/RebuildIndexUseCase');

class SearchController {
    constructor(dbManager, wordIndexService) {
        this.dbManager = dbManager;
        this.searchUseCase = new SearchTracksUseCase(dbManager.db, wordIndexService);
        this.rebuildUseCase = new RebuildIndexUseCase(dbManager.db, wordIndexService);
    }

    async search(req, res) {
        try {
            // POST (JSON body) veya GET (query params) destekle
            const isPost = req.method === 'POST';
            const { q: queryFromQuery, query: queryFromBody, limit: limitFromQuery, offset: offsetFromQuery = 0 } = isPost ? req.body : req.query;
            const query = queryFromBody || queryFromQuery;
            const limit = isPost ? (req.body.limit || null) : (limitFromQuery ? parseInt(limitFromQuery) : null);
            const offset = isPost ? (req.body.offset || 0) : parseInt(offsetFromQuery);
            
            if (!query || query.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Arama sorgusu boş olamaz'
                });
            }
            
            console.log(`[API] Arama yapılıyor (${req.method}): "${query}", limit: ${limit}`);
            
            const result = await this.searchUseCase.execute(query.trim(), parseInt(limit), parseInt(offset));
            
            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        searchProcess: result.searchProcess,
                        query: query.trim(),
                        results: result.results,
                        total: result.results.length,
                        limit: parseInt(limit)
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.message || 'Arama yapılamadı'
                });
            }
        } catch (error) {
            console.error('[API] Arama hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Arama sırasında hata oluştu'
            });
        }
    }

    async rebuildIndex(req, res) {
        try {
            console.log('[API] Index rebuild başlatılıyor...');
            
            const result = await this.rebuildUseCase.execute();
            
            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        message: 'Index başarıyla yeniden oluşturuldu',
                        sessionId: result.data.sessionId,
                        stats: result.data.stats
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.message || 'Index yeniden oluşturulamadı'
                });
            }
        } catch (error) {
            console.error('[API] Index rebuild hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Index yeniden oluşturulurken hata oluştu'
            });
        }
    }

    async getStats(req, res) {
        try {
            console.log('[API] Database istatistikleri alınıyor...');
            
            const stats = {
                music_files: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count,
                tracks: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM tracks').get().count,
                playlists: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM playlists').get().count,
                playlist_tracks: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM playlist_tracks').get().count,
                track_words: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM track_words').get().count,
                music_words: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM music_words').get().count,
                import_sessions: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM import_sessions').get().count
            };
            
            res.json({
                success: true,
                data: {
                    stats,
                    total_index: stats.track_words + stats.music_words + stats.playlist_tracks
                }
            });
        } catch (error) {
            console.error('[API] Stats alma hatası:', error);
            res.status(500).json({
                success: false,
                error: 'İstatistikler alınırken hata oluştu'
            });
        }
    }
}

module.exports = SearchController;
