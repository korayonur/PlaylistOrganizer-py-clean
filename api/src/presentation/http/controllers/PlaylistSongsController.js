'use strict';

const GetPlaylistTracksUseCase = require('../../../application/use-cases/playlist/GetPlaylistTracksUseCase');

/**
 * PlaylistSongs Controller
 * Playlist içeriklerini database'den okur
 * Clean Architecture: Controller → Use Case → Repository
 */
class PlaylistSongsController {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.getPlaylistTracksUseCase = new GetPlaylistTracksUseCase();
    }

    /**
     * Playlist içeriğini oku - Database JOIN ile (SIFIR dosya I/O)
     * POST /api/playlistsongs/read?onlyMissing=false
     * Body: { playlistPath: string }
     * Response: { success: boolean, songs: Array<{file: string, isFileExists: boolean}>, stats: Object }
     */
    async readPlaylistSongs(req, res) {
        try {
            const { playlistPath } = req.body;
            const { onlyMissing = 'false' } = req.query;  // Checkbox state (query param)
            
            console.log(`[API] Playlist songs istendi: path=${playlistPath}, onlyMissing=${onlyMissing}`);
            
            if (!playlistPath) {
                return res.status(400).json({
                    success: false,
                    error: 'playlistPath gerekli'
                });
            }

            // Use Case'i çalıştır (Business Logic)
            const result = await this.getPlaylistTracksUseCase.execute(playlistPath, {
                onlyMissing: onlyMissing === 'true' || onlyMissing === true
            });

            if (!result.success) {
                const statusCode = result.message === 'Playlist bulunamadı' ? 404 : 400;
                return res.status(statusCode).json({
                    success: false,
                    error: result.message
                });
            }

            console.log(`[API] Response hazır: ${result.data.tracks.length} track (${result.data.stats.exists} var, ${result.data.stats.missing} eksik)`);

            res.json({
                success: true,
                songs: result.data.tracks,
                stats: result.data.stats  // Frontend için istatistik
            });

        } catch (error) {
            console.error('[API] Playlist songs okuma hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Playlist içeriği okunamadı',
                details: error.message
            });
        }
    }
}

module.exports = PlaylistSongsController;

