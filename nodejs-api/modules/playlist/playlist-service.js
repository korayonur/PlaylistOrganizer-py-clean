'use strict';

const PlaylistScanner = require('./playlist-scanner');
const PlaylistRepository = require('./playlist-repository');
const { getLogger } = require('../../shared/logger');

class PlaylistService {
    constructor() {
        this.logger = getLogger().module('PlaylistService');
        this.scanner = new PlaylistScanner();
        this.repository = new PlaylistRepository();
    }

    /**
     * M3U dosyalarını tarar ve import eder
     * @param {string} directoryPath - Klasör yolu
     * @returns {Promise<Object>} Import sonucu
     */
    async scanAndImportM3U(directoryPath) {
        try {
            this.logger.info(`M3U import başlatılıyor: ${directoryPath}`);

            // M3U dosyalarını bul
            const m3uFiles = await this.scanner.findM3UFiles(directoryPath);
            
            let processedFiles = 0;
            let totalTracks = 0;
            let addedPlaylists = 0;
            let addedTracks = 0;
            let errors = 0;

            for (const m3uFile of m3uFiles) {
                try {
                    // Playlist zaten var mı kontrol et
                    const existingPlaylist = this.repository.getPlaylistByPath(m3uFile);
                    if (existingPlaylist) {
                        this.logger.info(`Playlist zaten mevcut: ${m3uFile}`);
                        continue;
                    }

                    // M3U dosyasını tara
                    const tracks = await this.scanner.scanM3UFile(m3uFile);
                    
                    if (tracks.length === 0) {
                        this.logger.warn(`M3U dosyası boş: ${m3uFile}`);
                        continue;
                    }

                    // Playlist adını çıkar
                    const playlistName = this.scanner.extractPlaylistName(m3uFile);

                    // Playlist'i ekle
                    const playlistId = this.repository.insertPlaylist({
                        name: playlistName,
                        path: m3uFile,
                        format: 'm3u',
                        source: 'history',
                        fileCount: tracks.length
                    });

                    // Track'leri ekle
                    this.repository.insertPlaylistTracks(playlistId, tracks);

                    addedPlaylists++;
                    addedTracks += tracks.length;
                    totalTracks += tracks.length;
                    processedFiles++;

                    this.logger.info(`M3U import edildi: ${playlistName} - ${tracks.length} track`);

                } catch (error) {
                    this.logger.error(`M3U import hatası: ${m3uFile}`, {
                        error: error.message,
                        stack: error.stack
                    });
                    errors++;
                }
            }

            const result = {
                success: true,
                processedFiles,
                totalTracks,
                addedPlaylists,
                addedTracks,
                errors,
                message: `M3U import tamamlandı. ${processedFiles} dosya, ${addedPlaylists} playlist, ${addedTracks} track işlendi. ${errors} hata.`
            };

            this.logger.info('M3U import tamamlandı', result);
            return result;

        } catch (error) {
            this.logger.error('M3U import genel hatası', {
                error: error.message,
                stack: error.stack,
                directoryPath
            });

            return {
                success: false,
                processedFiles: 0,
                totalTracks: 0,
                addedPlaylists: 0,
                addedTracks: 0,
                errors: 1,
                message: `M3U import hatası: ${error.message}`
            };
        }
    }

    /**
     * VDJ dosyalarını tarar ve import eder
     * @param {string} directoryPath - Klasör yolu
     * @param {string} source - Kaynak türü ('folders' | 'mylists')
     * @returns {Promise<Object>} Import sonucu
     */
    async scanAndImportVDJ(directoryPath, source) {
        try {
            this.logger.info(`VDJ import başlatılıyor: ${directoryPath} (${source})`);

            // VDJ dosyalarını bul
            const vdjFiles = await this.scanner.findVDJFiles(directoryPath);
            
            let processedFiles = 0;
            let totalTracks = 0;
            let addedPlaylists = 0;
            let addedTracks = 0;
            let errors = 0;

            for (const vdjFile of vdjFiles) {
                try {
                    // Playlist zaten var mı kontrol et
                    const existingPlaylist = this.repository.getPlaylistByPath(vdjFile);
                    if (existingPlaylist) {
                        this.logger.info(`Playlist zaten mevcut: ${vdjFile}`);
                        continue;
                    }

                    // VDJ dosyasını tara
                    const tracks = await this.scanner.scanVDJFolderFile(vdjFile);
                    
                    if (tracks.length === 0) {
                        this.logger.warn(`VDJ dosyası boş: ${vdjFile}`);
                        continue;
                    }

                    // Playlist adını çıkar
                    const playlistName = this.scanner.extractPlaylistName(vdjFile);

                    // Playlist'i ekle
                    const playlistId = this.repository.insertPlaylist({
                        name: playlistName,
                        path: vdjFile,
                        format: 'vdjfolder',
                        source: source,
                        fileCount: tracks.length
                    });

                    // Track'leri ekle
                    this.repository.insertPlaylistTracks(playlistId, tracks);

                    addedPlaylists++;
                    addedTracks += tracks.length;
                    totalTracks += tracks.length;
                    processedFiles++;

                    this.logger.info(`VDJ import edildi: ${playlistName} - ${tracks.length} track`);

                } catch (error) {
                    this.logger.error(`VDJ import hatası: ${vdjFile}`, {
                        error: error.message,
                        stack: error.stack
                    });
                    errors++;
                }
            }

            const result = {
                success: true,
                processedFiles,
                totalTracks,
                addedPlaylists,
                addedTracks,
                errors,
                message: `VDJ import tamamlandı. ${processedFiles} dosya, ${addedPlaylists} playlist, ${addedTracks} track işlendi. ${errors} hata.`
            };

            this.logger.info('VDJ import tamamlandı', result);
            return result;

        } catch (error) {
            this.logger.error('VDJ import genel hatası', {
                error: error.message,
                stack: error.stack,
                directoryPath,
                source
            });

            return {
                success: false,
                processedFiles: 0,
                totalTracks: 0,
                addedPlaylists: 0,
                addedTracks: 0,
                errors: 1,
                message: `VDJ import hatası: ${error.message}`
            };
        }
    }

    /**
     * Playlist'leri listeler
     * @param {Object} options - Filtreleme seçenekleri
     * @returns {Array} Playlist listesi
     */
    getPlaylists(options = {}) {
        return this.repository.getPlaylists(options);
    }

    /**
     * Playlist detayını getirir
     * @param {number} playlistId - Playlist ID
     * @returns {Object|null} Playlist detayı
     */
    getPlaylist(playlistId) {
        const playlist = this.repository.getPlaylistById(playlistId);
        if (!playlist) {
            return null;
        }

        const tracks = this.repository.getPlaylistTracks(playlistId);
        return {
            ...playlist,
            tracks: tracks
        };
    }

    /**
     * Playlist track'lerini getirir
     * @param {number} playlistId - Playlist ID
     * @param {Object} options - Filtreleme seçenekleri
     * @returns {Array} Track listesi
     */
    getPlaylistTracks(playlistId, options = {}) {
        return this.repository.getPlaylistTracks(playlistId, options);
    }

    /**
     * Playlist istatistiklerini getirir
     * @returns {Object} İstatistik verisi
     */
    getStats() {
        return this.repository.getStats();
    }

    /**
     * Playlist'i siler
     * @param {number} playlistId - Playlist ID
     * @returns {Object} Silme sonucu
     */
    deletePlaylist(playlistId) {
        try {
            const success = this.repository.deletePlaylist(playlistId);
            
            if (success) {
                return {
                    success: true,
                    message: 'Playlist başarıyla silindi'
                };
            } else {
                return {
                    success: false,
                    message: 'Playlist bulunamadı'
                };
            }

        } catch (error) {
            this.logger.error('Playlist silme hatası', {
                error: error.message,
                playlistId
            });

            return {
                success: false,
                message: `Playlist silme hatası: ${error.message}`
            };
        }
    }

    /**
     * Tüm playlist'leri siler
     * @returns {Object} Temizleme sonucu
     */
    clearAllPlaylists() {
        try {
            const deletedCount = this.repository.clearAllPlaylists();
            
            return {
                success: true,
                deletedCount,
                message: `${deletedCount} playlist silindi`
            };

        } catch (error) {
            this.logger.error('Playlist temizleme hatası', {
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                message: `Playlist temizleme hatası: ${error.message}`
            };
        }
    }
}

module.exports = PlaylistService;
