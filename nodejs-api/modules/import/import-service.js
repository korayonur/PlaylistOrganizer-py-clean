'use strict';

const ImportScanner = require('./import-scanner');
const ImportRepository = require('./import-repository');
const { normalizeFileName } = require('../../shared/utils');
const { getLogger } = require('../../shared/logger');

/**
 * Import Service - İş mantığı
 */
class ImportService {
    constructor() {
        this.scanner = new ImportScanner();
        this.repository = new ImportRepository();
        this.logger = getLogger().module('ImportService');
    }

    /**
     * Klasörü import et
     * @param {string} dirPath - Klasör yolu
     * @param {Object} options - Import seçenekleri
     * @returns {Promise<Object>} Import sonucu
     */
    async importDirectory(dirPath, options = {}) {
        const {
            includeAudio = true,
            includeVideo = false,
            recursive = true,
            maxDepth = 10,
            skipExisting = true,
            verifyFiles = true
        } = options;

        this.logger.info(`Import başlatılıyor: ${dirPath}`, { options });

        try {
            // 1. Klasörü tara
            const scanResult = await this.scanner.scanDirectory(dirPath, {
                includeAudio,
                includeVideo,
                recursive,
                maxDepth
            });

            if (!scanResult.success) {
                return {
                    success: false,
                    message: 'Klasör taranamadı',
                    errors: scanResult.errors
                };
            }

            // 2. Import session oluştur
            const sessionId = this.repository.createSession(dirPath, scanResult.totalFiles);
            
            // 3. Dosyaları işle
            const processResult = await this.processFiles(scanResult.files, {
                skipExisting,
                verifyFiles,
                sessionId
            });

            // 4. Session'ı güncelle
            this.repository.updateSession(sessionId, {
                status: 'completed',
                processedFiles: scanResult.totalFiles,
                addedFiles: processResult.added,
                skippedFiles: processResult.skipped,
                errorFiles: processResult.errors
            });

            return {
                success: true,
                data: {
                    sessionId,
                    path: dirPath,
                    totalFiles: scanResult.totalFiles,
                    added: processResult.added,
                    skipped: processResult.skipped,
                    errors: processResult.errors,
                    isComplete: processResult.errors === 0
                },
                message: 'Import başarıyla tamamlandı'
            };

        } catch (error) {
            this.logger.error(`Import hatası: ${error.message}`, {
                path: dirPath,
                error: error.message
            });

            return {
                success: false,
                message: 'Import hatası',
                error: error.message
            };
        }
    }

    /**
     * Dosyaları işle
     * @param {Array} files - Dosya listesi
     * @param {Object} options - İşlem seçenekleri
     * @returns {Promise<Object>} İşlem sonucu
     */
    async processFiles(files, options = {}) {
        const { skipExisting = true, verifyFiles = true, sessionId } = options;
        
        let added = 0;
        let skipped = 0;
        let errors = 0;

        this.logger.info(`${files.length} dosya işleniyor...`);

        for (const file of files) {
            try {
                // Dosya zaten var mı kontrol et
                if (skipExisting && this.repository.fileExists(file.path)) {
                    skipped++;
                    continue;
                }

                // Dosya bilgilerini hazırla
                const fileData = {
                    path: file.path,
                    fileName: file.fileName,
                    normalizedFileName: normalizeFileName(file.fileName),
                    extension: file.extension,
                    size: file.size,
                    modifiedTime: file.modifiedTime
                };

                this.logger.info(`Dosya verisi hazırlandı:`, {
                    path: fileData.path,
                    fileName: fileData.fileName,
                    extension: fileData.extension,
                    size: fileData.size
                });

                // Dosyayı database'e ekle
                this.repository.addFile(fileData);
                added++;

            } catch (error) {
                this.logger.error(`Dosya işleme hatası: ${file.path}`, {
                    error: error.message,
                    file: file.path
                });
                errors++;
            }
        }

        return { added, skipped, errors };
    }

    /**
     * Import session'ını getir
     * @param {number} sessionId - Session ID
     * @returns {Object} Session bilgileri
     */
    getSession(sessionId) {
        try {
            const session = this.repository.getSession(sessionId);
            if (!session) {
                return {
                    success: false,
                    message: 'Import session bulunamadı'
                };
            }

            return {
                success: true,
                data: session
            };

        } catch (error) {
            this.logger.error(`Session alma hatası: ${error.message}`, {
                sessionId,
                error: error.message
            });

            return {
                success: false,
                message: 'Import durum kontrolü hatası',
                error: error.message
            };
        }
    }

    /**
     * Import istatistiklerini getir
     * @returns {Object} İstatistikler
     */
    getStats() {
        try {
            const stats = this.repository.getStats();
            if (!stats.success) {
                return {
                    success: false,
                    message: 'İstatistikler alınamadı',
                    error: stats.error
                };
            }

            return {
                success: true,
                data: stats
            };

        } catch (error) {
            this.logger.error(`İstatistik hatası: ${error.message}`, {
                error: error.message
            });

            return {
                success: false,
                message: 'İstatistik hatası',
                error: error.message
            };
        }
    }

    /**
     * Import istatistiklerini al
     * @returns {Object} İstatistikler
     */
    getImportStats() {
        try {
            this.logger.info('Import istatistikleri isteniyor');
            const stats = this.repository.getStats();
            return {
                success: true,
                data: stats
            };
        } catch (error) {
            this.logger.error('Import istatistik hatası:', error);
            return {
                success: false,
                message: 'Import istatistik hatası',
                error: error.message
            };
        }
    }

    /**
     * Son import oturumlarını al
     * @param {number} limit - Maksimum oturum sayısı
     * @returns {Object} Oturum listesi
     */
    getRecentSessions(limit = 10) {
        try {
            this.logger.info(`Son ${limit} import oturumu isteniyor`);
            const sessions = this.repository.getRecentSessions(limit);
            return {
                success: true,
                data: sessions
            };
        } catch (error) {
            this.logger.error('Import oturum listesi hatası:', error);
            return {
                success: false,
                message: 'Import oturum listesi hatası',
                error: error.message
            };
        }
    }

    /**
     * Klasör kontrolü yap
     * @param {string} dirPath - Klasör yolu
     * @returns {Object} Kontrol sonucu
     */
    async checkDirectory(dirPath) {
        try {
            const dirStats = await this.scanner.getDirectoryStats(dirPath);
            if (!dirStats.success) {
                return {
                    success: false,
                    message: 'Klasör taranamadı',
                    error: dirStats.error
                };
            }

            const dbStats = this.repository.getStats();
            const missingFiles = dirStats.totalFiles - dbStats.musicFilesCount;

            return {
                success: true,
                data: {
                    folder: {
                        path: dirPath,
                        totalFiles: dirStats.totalFiles
                    },
                    database: {
                        totalFiles: dbStats.musicFilesCount
                    },
                    summary: {
                        missingFiles: missingFiles,
                        isComplete: missingFiles === 0
                    }
                }
            };

        } catch (error) {
            this.logger.error(`Import doğrulama hatası: ${error.message}`, {
                dirPath,
                error: error.message
            });

            return {
                success: false,
                message: 'Import doğrulama hatası',
                error: error.message
            };
        }
    }
}

module.exports = ImportService;