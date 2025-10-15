const GetPlaylistsUseCase = require('../../../application/use-cases/playlist/GetPlaylistsUseCase');
const GetPlaylistDetailUseCase = require('../../../application/use-cases/playlist/GetPlaylistDetailUseCase');

class PlaylistController {
    constructor(dbManager) {
        this.getPlaylistsUseCase = new GetPlaylistsUseCase(dbManager.db);
        this.getDetailUseCase = new GetPlaylistDetailUseCase(dbManager.db);
    }

    async getPlaylists(req, res) {
        try {
            const { limit = 50, offset = 0 } = req.query;
            
            console.log(`[API] Playlists alınıyor: limit=${limit}, offset=${offset}`);
            
            const result = await this.getPlaylistsUseCase.execute(parseInt(limit), parseInt(offset));
            
            if (result.success) {
                // Frontend'in beklediği format: tree structure
                const treeData = this.buildPlaylistTree(result.data);
                
                res.json({
                    success: true,
                    data: treeData, // Tree structure
                    stats: {
                        total: result.data.length,
                        limit: parseInt(limit),
                        offset: parseInt(offset)
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.message || 'Playlists alınamadı'
                });
            }
        } catch (error) {
            console.error('[API] Playlists alma hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Playlists alınırken hata oluştu'
            });
        }
    }

    async getPlaylistDetail(req, res) {
        try {
            const { id } = req.params;
            
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    error: 'Geçerli bir playlist ID gerekli'
                });
            }
            
            console.log(`[API] Playlist detayı alınıyor: ID=${id}`);
            
            const result = await this.getDetailUseCase.execute(parseInt(id));
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: result.message || 'Playlist bulunamadı'
                });
            }
        } catch (error) {
            console.error('[API] Playlist detay alma hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Playlist detayı alınırken hata oluştu'
            });
        }
    }

    buildPlaylistTree(playlists) {
        // Frontend'in beklediği TreeNode formatına çevir
        return playlists.map(playlist => ({
            id: playlist.id,
            name: playlist.name,
            path: playlist.path,
            type: 'playlist', // Tüm tipleri normalize et (vdjfolder, m3u -> playlist)
            track_count: playlist.track_count,
            created_at: playlist.created_at,
            updated_at: playlist.updated_at,
            children: [] // Şimdilik boş, daha sonra hierarchy eklenebilir
        }));
    }
}

module.exports = PlaylistController;
