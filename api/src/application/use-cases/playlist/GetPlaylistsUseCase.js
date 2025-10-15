'use strict';

const { getDatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');

/**
 * Get Playlists Use Case
 * Tüm playlist'leri listeler
 */
class GetPlaylistsUseCase {
    constructor() {
        const dbManager = getDatabaseManager();
        this.playlistRepository = dbManager.getRepositories().playlists;
    }

    /**
     * Playlist'leri al
     * @param {Object} options - Filtreleme ve sıralama seçenekleri
     * @returns {Promise<Object>} Playlist listesi
     */
    async execute(options = {}) {
        try {
            const { limit = 100, offset = 0, type = null } = options;
            
            let playlists;
            if (type) {
                playlists = await this.playlistRepository.findByType(type);
            } else {
                playlists = await this.playlistRepository.findAll({ 
                    limit, 
                    offset, 
                    orderBy: 'name', 
                    order: 'ASC' 
                });
            }

            const total = await this.playlistRepository.count();
            
            return {
                success: true,
                data: playlists.map(p => p.toJSON()),
                total,
                limit,
                offset
            };
        } catch (error) {
            console.error(`❌ Get playlists use case hatası: ${error.message}`);
            return {
                success: false,
                message: 'Playlist listesi alma hatası',
                error: error.message
            };
        }
    }
}

module.exports = GetPlaylistsUseCase;

