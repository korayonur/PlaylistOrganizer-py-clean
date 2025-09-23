'use strict';

const { getDatabase } = require('../../shared/database');
const { getLogger } = require('../../shared/logger');

/**
 * Import Repository - Database işlemleri
 */
class ImportRepository {
    constructor() {
        this.dbManager = getDatabase();
        this.db = this.dbManager.db;
        this.logger = getLogger().module('ImportRepository');
    }

    /**
     * Import session oluştur
     * @param {string} path - Klasör yolu
     * @param {number} totalFiles - Toplam dosya sayısı
     * @returns {number} Session ID
     */
    createSession(path, totalFiles = 0) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO import_sessions (path, status, total_files, processed_files, added_files, skipped_files, error_files)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(path, 'scanning', totalFiles, 0, 0, 0, 0);
            
            this.logger.info(`Import session oluşturuldu: ${result.lastInsertRowid}`, {
                path,
                totalFiles
            });

            return result.lastInsertRowid;
        } catch (error) {
            this.logger.error(`Import session oluşturma hatası: ${error.message}`, {
                path,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Import session güncelle
     * @param {number} sessionId - Session ID
     * @param {Object} updates - Güncellenecek alanlar
     */
    updateSession(sessionId, updates) {
        try {
            const {
                status = 'scanning',
                processedFiles = 0,
                addedFiles = 0,
                skippedFiles = 0,
                errorFiles = 0,
                completedAt = null
            } = updates;

            const stmt = this.db.prepare(`
                UPDATE import_sessions 
                SET status = ?, processed_files = ?, added_files = ?, skipped_files = ?, error_files = ?, completed_at = ?
                WHERE id = ?
            `);
            stmt.run(status, processedFiles, addedFiles, skippedFiles, errorFiles, completedAt || null, sessionId);

            this.logger.debug(`Import session güncellendi: ${sessionId}`, {
                sessionId,
                status,
                processedFiles,
                addedFiles,
                skippedFiles,
                errorFiles,
                completedAt
            });
        } catch (error) {
            this.logger.error(`Import session güncelleme hatası: ${error.message}`, {
                sessionId,
                status,
                processedFiles,
                addedFiles,
                skippedFiles,
                errorFiles,
                completedAt,
                sqlParams: [status, processedFiles, addedFiles, skippedFiles, errorFiles, completedAt || null, sessionId],
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Import session bilgilerini al
     * @param {number} sessionId - Session ID
     * @returns {Object|null} Session bilgileri
     */
    getSession(sessionId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM import_sessions WHERE id = ?');
            return stmt.get(sessionId);
        } catch (error) {
            this.logger.error(`Import session alma hatası: ${error.message}`, {
                sessionId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Klasör için son session'ı al
     * @param {string} path - Klasör yolu
     * @returns {Object|null} Session bilgileri
     */
    getLastSessionByPath(path) {
        try {
            const stmt = this.db.prepare('SELECT * FROM import_sessions WHERE path = ? ORDER BY created_at DESC LIMIT 1');
            return stmt.get(path);
        } catch (error) {
            this.logger.error(`Son session alma hatası: ${error.message}`, {
                path,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Dosya zaten var mı kontrol et
     * @param {string} filePath - Dosya yolu
     * @returns {boolean} Dosya var mı
     */
    fileExists(filePath) {
        try {
            const stmt = this.db.prepare('SELECT * FROM music_files WHERE path = ?');
            const result = stmt.get(filePath);
            return !!result;
        } catch (error) {
            this.logger.error(`Dosya varlık kontrolü hatası: ${error.message}`, {
                filePath,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Dosya ekle
     * @param {Object} fileData - Dosya verileri
     * @returns {boolean} Başarılı mı
     */
    addFile(fileData) {
        try {
            const {
                path: filePath,
                fileName,
                normalizedFileName,
                extension,
                size,
                modifiedTime
            } = fileData;

            const stmt = this.db.prepare(`
                INSERT INTO music_files (path, fileName, normalizedFileName, extension, size, modifiedTime)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run(filePath, fileName, normalizedFileName, extension, size, modifiedTime);

            this.logger.info(`Dosya eklendi: ${filePath}`, {
                path: filePath,
                fileName,
                normalizedFileName,
                extension,
                size,
                modifiedTime
            });
            return true;
        } catch (error) {
            this.logger.error(`Dosya ekleme hatası: ${error.message}`, {
                filePath: fileData?.path,
                fileName: fileData?.fileName,
                extension: fileData?.extension,
                fileData: JSON.stringify(fileData, null, 2),
                error: error.message
            });
            return false;
        }
    }

    /**
     * Toplu dosya ekleme
     * @param {Object[]} files - Dosya verileri dizisi
     * @returns {Object} Sonuç istatistikleri
     */
    addMultipleFiles(files) {
        const results = {
            added: 0,
            skipped: 0,
            errors: 0,
            errors: []
        };

        for (const fileData of files) {
            try {
                // Dosya zaten var mı kontrol et
                if (this.fileExists(fileData.path)) {
                    results.skipped++;
                    continue;
                }

                // Dosya ekle
                if (this.addFile(fileData)) {
                    results.added++;
                } else {
                    results.errors++;
                    results.errors.push({
                        path: fileData.path,
                        error: 'Dosya eklenemedi'
                    });
                }
            } catch (error) {
                results.errors++;
                results.errors.push({
                    path: fileData.path,
                    error: error.message
                });
            }
        }

        this.logger.info(`Toplu dosya ekleme tamamlandı`, {
            total: files.length,
            added: results.added,
            skipped: results.skipped,
            errors: results.errors
        });

        return results;
    }

    /**
     * Genel istatistikleri al
     * @returns {Object} İstatistikler
     */
    getStats() {
        try {
            const musicFilesCount = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
            const sessionsCount = this.db.prepare('SELECT COUNT(*) as count FROM import_sessions').get().count;
            
            return {
                musicFilesCount,
                sessionsCount,
                dbSize: this.db.prepare('PRAGMA page_count').get().page_count * this.db.prepare('PRAGMA page_size').get().page_size
            };
        } catch (error) {
            this.logger.error('Stats alma hatası:', error);
            throw error;
        }
    }

    /**
     * Import istatistiklerini al
     * @returns {Object} İstatistikler
     */
    getImportStats() {
        try {
            // Tüm session'ları al
            const sessions = this.db.query(`
                SELECT 
                    COUNT(*) as totalSessions,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedSessions,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedSessions,
                    SUM(total_files) as totalFiles,
                    SUM(added_files) as addedFiles,
                    SUM(skipped_files) as skippedFiles,
                    SUM(error_files) as errorFiles
                FROM import_sessions
            `);

            // Müzik dosyaları sayısı
            const musicFilesCount = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;

            return {
                ...sessions[0],
                musicFilesCount,
                success: true
            };
        } catch (error) {
            this.logger.error(`Import istatistik hatası: ${error.message}`, {
                error: error.message
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Son import session'larını al
     * @param {number} limit - Maksimum sayı
     * @returns {Object[]} Session listesi
     */
    getRecentSessions(limit = 10) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM import_sessions 
                ORDER BY created_at DESC 
                LIMIT ?
            `);
            const sessions = stmt.all(limit);

            return sessions;
        } catch (error) {
            this.logger.error(`Son session'lar alma hatası: ${error.message}`, {
                limit,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Import session'ı sil
     * @param {number} sessionId - Session ID
     * @returns {boolean} Başarılı mı
     */
    deleteSession(sessionId) {
        try {
            this.db.execute(`
                DELETE FROM import_sessions WHERE id = ?
            `, [sessionId]);

            this.logger.info(`Import session silindi: ${sessionId}`);
            return true;
        } catch (error) {
            this.logger.error(`Import session silme hatası: ${error.message}`, {
                sessionId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Tüm import session'larını temizle
     * @returns {boolean} Başarılı mı
     */
    clearAllSessions() {
        try {
            this.db.execute('DELETE FROM import_sessions');
            this.logger.info('Tüm import session\'lar temizlendi');
            return true;
        } catch (error) {
            this.logger.error(`Import session temizleme hatası: ${error.message}`, {
                error: error.message
            });
            return false;
        }
    }
}

module.exports = ImportRepository;
