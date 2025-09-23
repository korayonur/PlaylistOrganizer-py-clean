'use strict';

const fs = require('fs-extra');
const path = require('path');
const { isMediaFile, getFileInfo } = require('../../shared/utils');
const { getLogger } = require('../../shared/logger');

/**
 * Import Scanner - Dosya tarama mantığı
 */
class ImportScanner {
    constructor() {
        this.logger = getLogger().module('ImportScanner');
    }

    /**
     * Klasörü recursive olarak tara
     * @param {string} dirPath - Taranacak klasör yolu
     * @param {Object} options - Tarama seçenekleri
     * @param {number} currentDepth - Mevcut derinlik
     * @returns {Promise<Object>} Tarama sonucu
     */
    async scanDirectoryRecursive(dirPath, options = {}, currentDepth = 0) {
        const {
            includeAudio = true,
            includeVideo = false,
            recursive = true,
            maxDepth = 10
        } = options;

        const files = [];
        const errors = [];

        try {
            const items = await fs.readdir(dirPath);
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                
                try {
                    const stat = await fs.stat(itemPath);
                    
                    if (stat.isDirectory()) {
                        // Alt klasörü tara (recursive)
                        if (recursive && currentDepth < maxDepth) {
                            const subResult = await this.scanDirectoryRecursive(itemPath, options, currentDepth + 1);
                            files.push(...subResult.files);
                            errors.push(...subResult.errors);
                        }
                    } else if (stat.isFile()) {
                        // Dosya kontrolü
                        if (isMediaFile(itemPath, { includeAudio, includeVideo })) {
                            const fileInfo = await getFileInfo(itemPath);
                            const fileName = path.basename(itemPath);
                            const extension = path.extname(itemPath).toLowerCase();
                            
                            files.push({
                                success: true,
                                path: itemPath,
                                fileName,
                                extension,
                                isMedia: true,
                                size: fileInfo.size,
                                modified: fileInfo.modified,
                                created: fileInfo.created
                            });
                        }
                    }
                } catch (error) {
                    errors.push({
                        path: itemPath,
                        error: error.message
                    });
                }
            }
        } catch (error) {
            errors.push({
                path: dirPath,
                error: error.message
            });
        }

        return { files, errors };
    }

    /**
     * Klasörü tara ve dosyaları bul
     * @param {string} dirPath - Taranacak klasör yolu
     * @param {Object} options - Tarama seçenekleri
     * @returns {Promise<Object>} Tarama sonucu
     */
    async scanDirectory(dirPath, options = {}) {
        const {
            includeAudio = true,
            includeVideo = false,
            recursive = true,
            maxDepth = 10
        } = options;

        this.logger.info(`Klasör taranıyor: ${dirPath}`, { options });

        try {
            // Klasör varlığını kontrol et
            if (!await fs.pathExists(dirPath)) {
                throw new Error(`Klasör bulunamadı: ${dirPath}`);
            }

            const stat = await fs.stat(dirPath);
            if (!stat.isDirectory()) {
                throw new Error(`Yol bir klasör değil: ${dirPath}`);
            }

            // Klasörü tara
            const { files, errors } = await this.scanDirectoryRecursive(dirPath, {
                includeAudio,
                includeVideo,
                recursive,
                maxDepth
            });

            this.logger.info(`Tarama tamamlandı: ${files.length} dosya bulundu`, {
                path: dirPath,
                fileCount: files.length,
                errorCount: errors.length
            });

            return {
                success: true,
                files,
                errors,
                totalFiles: files.length,
                errorCount: errors.length
            };

        } catch (error) {
            this.logger.error(`Klasör tarama hatası: ${error.message}`, {
                path: dirPath,
                error: error.message
            });

            return {
                success: false,
                files: [],
                errors: [{ path: dirPath, error: error.message }],
                totalFiles: 0,
                errorCount: 1
            };
        }
    }

    /**
     * Dosya bilgilerini detaylı olarak al
     * @param {string} filePath - Dosya yolu
     * @returns {Promise<Object>} Dosya bilgileri
     */
    async getFileDetails(filePath) {
        try {
            const fileInfo = await getFileInfo(filePath);
            
            if (!fileInfo.exists) {
                return {
                    success: false,
                    error: 'Dosya bulunamadı',
                    path: filePath
                };
            }

            const fileName = path.basename(filePath);
            const extension = path.extname(filePath).toLowerCase();
            const isMedia = isMediaFile(filePath);

            return {
                success: true,
                path: filePath,
                fileName,
                extension,
                isMedia,
                size: fileInfo.size,
                modified: fileInfo.modified,
                created: fileInfo.created
            };

        } catch (error) {
            this.logger.error(`Dosya bilgisi alma hatası: ${error.message}`, {
                path: filePath,
                error: error.message
            });

            return {
                success: false,
                error: error.message,
                path: filePath
            };
        }
    }

    /**
     * Çoklu dosya bilgilerini al
     * @param {string[]} filePaths - Dosya yolları
     * @returns {Promise<Object[]>} Dosya bilgileri dizisi
     */
    async getMultipleFileDetails(filePaths) {
        const results = [];
        const errors = [];

        for (const filePath of filePaths) {
            try {
                const result = await this.getFileDetails(filePath);
                if (result.success) {
                    results.push(result);
                } else {
                    errors.push(result);
                }
            } catch (error) {
                errors.push({
                    success: false,
                    error: error.message,
                    path: filePath
                });
            }
        }

        return {
            success: true,
            files: results,
            errors,
            totalFiles: filePaths.length,
            successCount: results.length,
            errorCount: errors.length
        };
    }

    /**
     * Klasör istatistiklerini al
     * @param {string} dirPath - Klasör yolu
     * @returns {Promise<Object>} Klasör istatistikleri
     */
    async getDirectoryStats(dirPath) {
        try {
            const scanResult = await this.scanDirectory(dirPath);
            
            if (!scanResult.success) {
                return {
                    success: false,
                    error: 'Klasör taranamadı',
                    path: dirPath
                };
            }

            const { files } = scanResult;
            
            // Dosya türlerine göre grupla
            const audioFiles = files.filter(f => f.extension && ['mp3', 'wav', 'm4a', 'flac', 'aac'].includes(f.extension));
            const videoFiles = files.filter(f => f.extension && ['mp4', 'avi', 'mkv', 'mov'].includes(f.extension));
            
            // Toplam boyut hesapla
            const totalSize = files.reduce((sum, file) => sum + file.size, 0);
            
            // En büyük dosyalar
            const largestFiles = files
                .sort((a, b) => b.size - a.size)
                .slice(0, 10);

            return {
                success: true,
                path: dirPath,
                totalFiles: files.length,
                audioFiles: audioFiles.length,
                videoFiles: videoFiles.length,
                totalSize,
                largestFiles: largestFiles.map(f => ({
                    name: f.name,
                    size: f.size,
                    path: f.path
                }))
            };

        } catch (error) {
            this.logger.error(`Klasör istatistik hatası: ${error.message}`, {
                path: dirPath,
                error: error.message
            });

            return {
                success: false,
                error: error.message,
                path: dirPath
            };
        }
    }
}

module.exports = ImportScanner;
