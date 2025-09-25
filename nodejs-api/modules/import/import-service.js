'use strict';

const fs = require('fs');
const path = require('path');
const { normalizeFileName } = require('../../shared/utils');
const { getLogger } = require('../../shared/logger');
const { getDatabase } = require('../../shared/database');

/**
 * Import Service - Basitleştirilmiş
 */
class ImportService {
    constructor() {
        this.dbManager = getDatabase();
        this.db = this.dbManager.db;
        this.logger = getLogger().module('ImportService');
    }

    /**
     * Klasörü tara ve import et
     * @param {string} dirPath - Klasör yolu
     * @returns {Promise<Object>} Import sonucu
     */
    async scanAndImport(dirPath) {
        try {
            this.logger.info(`Import başlatılıyor: ${dirPath}`);

            // 1. Klasörü tara
            const files = this.scanDirectory(dirPath);
            this.logger.info(`${files.length} dosya bulundu`);

            // 2. Import session oluştur
            const sessionId = this.createSession(dirPath, files.length);

            let added = 0;
            let skipped = 0;
            let errors = 0;

            // 3. Dosyaları import et
            for (const file of files) {
                try {
                    const fileData = {
                        path: file.path,
                        fileName: file.fileName,
                        extension: file.extension,
                        size: file.size,
                        modified: file.modified,
                        created: file.created
                    };

                    const result = this.addFile(fileData);
                    if (result.success) {
                        added++;
                    } else {
                        skipped++;
                    }
                } catch (error) {
                    this.logger.error(`Dosya import hatası: ${file.path}`, { error: error.message });
                    errors++;
                }
            }

            // 4. Session'ı güncelle
            this.updateSession(sessionId, {
                status: 'completed',
                processedFiles: files.length,
                addedFiles: added,
                skippedFiles: skipped,
                errorFiles: errors,
                completedAt: new Date().toISOString()
            });

            return {
                success: true,
                data: {
                    sessionId,
                    path: dirPath,
                    totalFiles: files.length,
                    added,
                    skipped,
                    errors,
                    isComplete: true
                },
                message: 'Import başarıyla tamamlandı'
            };

        } catch (error) {
            this.logger.error(`Import hatası: ${error.message}`, { error: error.message });
            return {
                success: false,
                message: 'Import hatası',
                error: error.message
            };
        }
    }

    /**
     * Klasörü tara
     * @param {string} dirPath - Klasör yolu
     * @returns {Array} Dosya listesi
     */
    scanDirectory(dirPath) {
        const files = [];
        
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    // Alt klasörleri de tara
                    const subFiles = this.scanDirectory(itemPath);
                    files.push(...subFiles);
                } else if (this.isMediaFile(itemPath)) {
                    files.push({
                        path: itemPath,
                        fileName: item,
                        extension: path.extname(item).toLowerCase(),
                        size: stats.size,
                        modified: stats.mtime,
                        created: stats.birthtime
                    });
                }
            }
        } catch (error) {
            this.logger.error(`Klasör tarama hatası: ${dirPath}`, { error: error.message });
        }
        
        return files;
    }

    /**
     * Medya dosyası mı kontrol et
     * @param {string} filePath - Dosya yolu
     * @returns {boolean}
     */
    isMediaFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mediaExtensions = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.wma', '.mp4', '.avi', '.mkv', '.mov'];
        return mediaExtensions.includes(ext);
    }

    /**
     * Import session oluştur
     * @param {string} path - Klasör yolu
     * @param {number} totalFiles - Toplam dosya sayısı
     * @returns {number} Session ID
     */
    createSession(path, totalFiles) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO import_sessions (path, status, total_files, processed_files, added_files, skipped_files, error_files, created_at)
                VALUES (?, 'scanning', ?, 0, 0, 0, 0, ?)
            `);
            
            const result = stmt.run(path, totalFiles, new Date().toISOString());
            return result.lastInsertRowid;
        } catch (error) {
            this.logger.error(`Session oluşturma hatası: ${error.message}`, { path, totalFiles });
            throw error;
        }
    }

    /**
     * Session güncelle
     * @param {number} sessionId - Session ID
     * @param {Object} updates - Güncelleme verileri
     */
    updateSession(sessionId, updates) {
        try {
            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);
            values.push(sessionId);

            const stmt = this.db.prepare(`
                UPDATE import_sessions 
                SET ${fields}
                WHERE id = ?
            `);
            
            stmt.run(...values);
        } catch (error) {
            this.logger.error(`Session güncelleme hatası: ${error.message}`, { sessionId, updates });
        }
    }

    /**
     * Dosya ekle
     * @param {Object} fileData - Dosya verisi
     * @returns {Object} Sonuç
     */
    addFile(fileData) {
        try {
            this.logger.info(`Dosya ekleniyor: ${fileData.path}`);
            
            // Duplicate kontrolü
            const existingFile = this.db.prepare(`
                SELECT id FROM music_files WHERE path = ?
            `).get(fileData.path);

            if (existingFile) {
                this.logger.info(`Dosya zaten mevcut: ${fileData.path}`);
                return { success: false, message: 'Dosya zaten mevcut' };
            }

            // fileNameOnly oluştur (uzantısız dosya adı)
            const fileNameOnly = path.parse(fileData.fileName).name;
            
            // Normalize edilmiş dosya adı oluştur
            const normalizedFileName = this.normalizeFileName(fileData.fileName);
            this.logger.info(`fileNameOnly: ${fileNameOnly}, Normalize edilmiş ad: ${normalizedFileName}`);

            // Dosya ekle - Database schema'ya uygun
            const stmt = this.db.prepare(`
                INSERT INTO music_files (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                fileData.path,
                fileData.fileName,
                fileNameOnly,
                normalizedFileName,
                fileData.extension,
                fileData.size,
                fileData.modified.getTime() // Unix timestamp
            );

            this.logger.info(`Dosya başarıyla eklendi: ID=${result.lastInsertRowid}`);
            return { success: true, message: 'Dosya eklendi' };
        } catch (error) {
            this.logger.error(`Dosya ekleme hatası: ${error.message}`, { 
                fileData: {
                    path: fileData.path,
                    fileName: fileData.fileName,
                    extension: fileData.extension,
                    size: fileData.size
                },
                error: error.message,
                stack: error.stack
            });
            return { success: false, message: error.message };
        }
    }

    /**
     * Dosya adını normalize et - Shared utils kullan
     * @param {string} fileName - Dosya adı
     * @returns {string} Normalize edilmiş ad
     */
    normalizeFileName(fileName) {
        return normalizeFileName(fileName);
    }

    /**
     * Import istatistikleri
     * @returns {Object} İstatistikler
     */
    getImportStats() {
        try {
            const musicFilesCount = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
            const sessionsCount = this.db.prepare('SELECT COUNT(*) as count FROM import_sessions').get().count;
            const dbSize = fs.statSync(this.dbManager.dbPath).size;

            return {
                success: true,
                data: {
                    musicFiles: musicFilesCount,
                    sessions: sessionsCount,
                    dbSize
                }
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
     * Son import oturumları
     * @param {number} limit - Maksimum sayı
     * @returns {Object} Oturum listesi
     */
    getRecentSessions(limit = 10) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM import_sessions 
                ORDER BY created_at DESC 
                LIMIT ?
            `);
            const sessions = stmt.all(limit);

            return {
                success: true,
                data: sessions
            };
        } catch (error) {
            this.logger.error(`Oturum listesi alma hatası: ${error.message}`, { error: error.message });
            return {
                success: false,
                message: 'Oturum listesi alma hatası',
                error: error.message
            };
        }
    }

    /**
     * Klasör vs veritabanı kontrolü
     * @param {string} dirPath - Klasör yolu
     * @returns {Object} Karşılaştırma sonucu
     */
    checkDirectory(dirPath) {
        try {
            const files = this.scanDirectory(dirPath);
            const dbCount = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;

            return {
                success: true,
                data: {
                    directoryFiles: files.length,
                    databaseFiles: dbCount,
                    difference: files.length - dbCount,
                    isComplete: files.length === dbCount
                }
            };
        } catch (error) {
            this.logger.error(`Klasör kontrol hatası: ${error.message}`, { error: error.message });
            return {
                success: false,
                message: 'Klasör kontrol hatası',
                error: error.message
            };
        }
    }
}

module.exports = new ImportService();