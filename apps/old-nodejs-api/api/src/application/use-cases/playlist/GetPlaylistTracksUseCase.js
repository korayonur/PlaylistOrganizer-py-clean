'use strict';

const { getDatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');

/**
 * Get Playlist Tracks Use Case
 * Playlist track'lerini file status ile birlikte getirir
 * Database JOIN kullanarak SIFIR dosya I/O ile çalışır
 */
class GetPlaylistTracksUseCase {
    constructor() {
        const dbManager = getDatabaseManager();
        this.playlistRepository = dbManager.getRepositories().playlists;
    }

    /**
     * Playlist track'lerini al
     * @param {string} playlistPath - Playlist dosya yolu
     * @param {Object} options - Filtreleme seçenekleri
     * @param {boolean} options.onlyMissing - Sadece eksik dosyaları getir
     * @returns {Promise<Object>} Playlist tracks
     */
    async execute(playlistPath, options = {}) {
        try {
            const { onlyMissing = false } = options;
            
            console.log(`[USE_CASE] GetPlaylistTracks: path=${playlistPath}, onlyMissing=${onlyMissing}`);
            
            if (!playlistPath) {
                return {
                    success: false,
                    message: 'Playlist path gerekli'
                };
            }

            // 1. Playlist bul (path'e göre)
            const playlist = await this.playlistRepository.findByPath(playlistPath);
            
            if (!playlist) {
                console.log(`[USE_CASE] Playlist bulunamadı: ${playlistPath}`);
                return {
                    success: false,
                    message: 'Playlist bulunamadı'
                };
            }

            console.log(`[USE_CASE] Playlist bulundu: ID=${playlist.id}, Name=${playlist.name}`);

            // 2. Track'leri file status ile al (DATABASE JOIN - SIFIR dosya I/O)
            const tracks = await this.playlistRepository.findTracksWithFileStatus(
                playlist.id, 
                onlyMissing
            );

            console.log(`[USE_CASE] ${tracks.length} track bulundu`);

            // 3. İstatistikleri hesapla
            const stats = {
                total: tracks.length,
                exists: tracks.filter(t => t.fileExists).length,
                missing: tracks.filter(t => !t.fileExists).length
            };

            console.log(`[USE_CASE] İstatistikler: total=${stats.total}, exists=${stats.exists}, missing=${stats.missing}`);

            return {
                success: true,
                data: {
                    playlistId: playlist.id,
                    playlistName: playlist.name,
                    playlistType: playlist.type,
                    tracks: tracks.map(t => ({
                        file: t.path,
                        isFileExists: t.fileExists
                    })),
                    stats
                }
            };

        } catch (error) {
            console.error(`[USE_CASE] GetPlaylistTracks hatası: ${error.message}`);
            return {
                success: false,
                message: 'Playlist tracks alma hatası',
                error: error.message
            };
        }
    }
}

module.exports = GetPlaylistTracksUseCase;


