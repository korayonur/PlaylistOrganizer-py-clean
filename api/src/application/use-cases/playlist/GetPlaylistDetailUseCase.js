'use strict';

const { getDatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');

/**
 * Get Playlist Detail Use Case
 * Playlist detayını track'leri ile birlikte getirir
 */
class GetPlaylistDetailUseCase {
    constructor() {
        const dbManager = getDatabaseManager();
        this.playlistRepository = dbManager.getRepositories().playlists;
    }

    /**
     * Playlist detayını al
     * @param {number} playlistId - Playlist ID
     * @returns {Promise<Object>} Playlist detayı
     */
    async execute(playlistId) {
        try {
            if (!playlistId || isNaN(playlistId)) {
                return {
                    success: false,
                    message: 'Geçersiz playlist ID'
                };
            }

            const result = await this.playlistRepository.findByIdWithTracks(playlistId);
            
            if (!result) {
                return {
                    success: false,
                    message: 'Playlist bulunamadı'
                };
            }

            return {
                success: true,
                data: {
                    playlist: result.playlist.toJSON(),
                    tracks: result.tracks.map(t => t.toJSON())
                }
            };
        } catch (error) {
            console.error(`❌ Get playlist detail use case hatası: ${error.message}`);
            return {
                success: false,
                message: 'Playlist detay alma hatası',
                error: error.message
            };
        }
    }
}

module.exports = GetPlaylistDetailUseCase;

