'use strict';

const HistoryRepository = require('./history-repository');
const HistoryScanner = require('./history-scanner');
const versionManager = require('../../shared/version');
const { getLogger } = require('../../shared/logger');

// Modül versiyonu
const MODULE_VERSION = '2.0.0';

class HistoryService {
    constructor() {
        this.repository = new HistoryRepository();
        this.scanner = new HistoryScanner();
        this.logger = getLogger().module('HistoryService');
        
        // Versiyonu kaydet
        versionManager.updateVersion('history', MODULE_VERSION);
    }

    /**
     * VirtualDJ history dosyalarını tara ve veritabanına aktar
     * @param {string} historyRoot
     * @returns {Promise<Object>}
     */
    async scanAndImport(historyRoot) {
        try {
            this.logger.info(`History tarama başlatılıyor: ${historyRoot}`);
            
            // History dosyalarını tara
            const historyFiles = await this.scanner.scanHistoryFiles(historyRoot);
            this.logger.info(`${historyFiles.length} history dosyası bulundu`);

            let totalTracks = 0;
            let processedFiles = 0;

            // Her history dosyasını işle
            for (const historyFile of historyFiles) {
                try {
                    // Duplicate kontrolü - bu dosya daha önce işlenmiş mi?
                    const isAlreadyProcessed = await this.repository.isFileProcessed(historyFile.filePath);
                    if (isAlreadyProcessed) {
                        this.logger.info(`⏭️ Skipping already processed file: ${historyFile.fileName}`);
                        processedFiles++;
                        continue;
                    }

                    this.logger.info(`🔍 Processing history file: ${historyFile.filePath}`);
                    const tracks = await this.scanner.extractTracksFromFile(historyFile.filePath);
                    this.logger.info(`📊 Extracted ${tracks ? tracks.length : 0} tracks from ${historyFile.fileName}`);
                    
                    if (tracks && tracks.length > 0) {
                        this.logger.info(`💾 Calling insertTracks with ${tracks.length} tracks`);
                        this.repository.insertTracks(tracks, historyFile.filePath);
                        totalTracks += tracks.length;
                        this.logger.info(`✅ Inserted ${tracks.length} tracks into database`);
                    }
                    processedFiles++;
                } catch (error) {
                    this.logger.error(`History dosyası işleme hatası: ${historyFile.filePath}`, { error: error.message });
                }
            }

            // Sadece tam yol eşleştirmesi yap
            const exactMatches = this.repository.performExactMatching();

            this.logger.info(`History import tamamlandı: ${processedFiles} dosya, ${totalTracks} track, ${exactMatches} eşleşme`);

            return {
                success: true,
                processedFiles,
                totalTracks,
                exactMatches,
                message: `İşlem tamamlandı. ${processedFiles} dosya, ${totalTracks} track işlendi.`
            };
        } catch (error) {
            this.logger.error(`History import hatası: ${error.message}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Otomatik eşleştirme yap
     * @returns {Promise<Object>}
     */
    async performAutoMatch() {
        try {
            this.logger.info('Otomatik eşleştirme başlatılıyor');
            
            const matchedCount = this.repository.performBulkMatching();
            
            this.logger.info(`${matchedCount} track eşleştirildi`);

            return {
                success: true,
                matchedTracks: matchedCount,
                message: `${matchedCount} track eşleştirildi`
            };
        } catch (error) {
            this.logger.error(`Otomatik eşleştirme hatası: ${error.message}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Tüm track'leri getir
     * @param {number} limit
     * @param {number} offset
     * @param {boolean} matched
     * @returns {Promise<Object>}
     */
    async getAllTracks(limit = 100, offset = 0, matched = null) {
        try {
            const tracks = this.repository.getAllTracks(limit, offset, matched);
            
            return {
                success: true,
                data: tracks,
                message: `${tracks.length} track getirildi`
            };
        } catch (error) {
            this.logger.error(`Track listeleme hatası: ${error.message}`, { error: error.message });
            return {
                success: false,
                message: 'History track listesi hatası',
                error: error.message
            };
        }
    }

    /**
     * Eşleşmemiş track'leri getir
     * @param {number} limit
     * @param {number} offset
     * @returns {Promise<Object>}
     */
    async getUnmatchedTracks(limit = 100, offset = 0) {
        try {
            const tracks = this.repository.getUnmatchedTracks(limit, offset);
            
            return {
                success: true,
                data: tracks,
                message: `${tracks.length} eşleşmemiş track getirildi`
            };
        } catch (error) {
            this.logger.error(`Eşleşmemiş track listeleme hatası: ${error.message}`, { error: error.message });
            return {
                success: false,
                message: 'Eşleşmemiş track listesi hatası',
                error: error.message
            };
        }
    }

    /**
     * İstatistikleri getir
     * @returns {Promise<Object>}
     */
    async getStats() {
        try {
            const stats = this.repository.getStats();
            
            return {
                success: true,
                data: stats,
                message: 'İstatistikler getirildi'
            };
        } catch (error) {
            this.logger.error(`İstatistik alma hatası: ${error.message}`, { error: error.message });
            return {
                success: false,
                message: 'İstatistik alma hatası',
                error: error.message
            };
        }
    }

    /**
     * Track'i ID ile getir
     * @param {number} trackId
     * @returns {Promise<Object>}
     */
    async getTrackById(trackId) {
        try {
            const track = this.repository.getTrackById(trackId);
            
            if (!track) {
                return {
                    success: false,
                    message: 'Track bulunamadı'
                };
            }

            return {
                success: true,
                data: track,
                message: 'Track getirildi'
            };
        } catch (error) {
            this.logger.error(`Track getirme hatası: ${error.message}`, { trackId, error: error.message });
            return {
                success: false,
                message: 'Track getirme hatası',
                error: error.message
            };
        }
    }

    /**
     * Track'in yolunu güncelle
     * @param {number} trackId
     * @param {string} newPath
     * @returns {Promise<Object>}
     */
    async updateTrackPath(trackId, newPath) {
        try {
            const success = this.repository.updateTrackPath(trackId, newPath);
            
            if (!success) {
                return {
                    success: false,
                    message: 'Track bulunamadı veya güncellenemedi'
                };
            }

            return {
                success: true,
                message: 'Track yolu güncellendi'
            };
        } catch (error) {
            this.logger.error(`Track yolu güncelleme hatası: ${error.message}`, { trackId, newPath, error: error.message });
            return {
                success: false,
                message: 'Track yolu güncelleme hatası',
                error: error.message
            };
        }
    }

    /**
     * Track'i sil
     * @param {number} trackId
     * @returns {Promise<Object>}
     */
    async deleteTrack(trackId) {
        try {
            const success = this.repository.deleteTrack(trackId);
            
            if (!success) {
                return {
                    success: false,
                    message: 'Track bulunamadı veya silinemedi'
                };
            }

            return {
                success: true,
                message: 'Track silindi'
            };
        } catch (error) {
            this.logger.error(`Track silme hatası: ${error.message}`, { trackId, error: error.message });
            return {
                success: false,
                message: 'Track silme hatası',
                error: error.message
            };
        }
    }

    /**
     * Tüm history track'lerini temizle
     * @returns {Promise<Object>}
     */
    async clearAllTracks() {
        try {
            const deletedCount = this.repository.clearAllTracks();
            
            return {
                success: true,
                data: { deletedCount },
                message: `${deletedCount} track temizlendi`
            };
        } catch (error) {
            this.logger.error(`Track temizleme hatası: ${error.message}`, { error: error.message });
            return {
                success: false,
                message: 'Track temizleme hatası',
                error: error.message
            };
        }
    }
}

module.exports = HistoryService;