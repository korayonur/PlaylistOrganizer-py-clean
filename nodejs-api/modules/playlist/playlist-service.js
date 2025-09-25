'use strict';

const fs = require('fs');
const path = require('path');
const { getLogger } = require('../../shared/logger');
const { getDatabase } = require('../../shared/database');

/**
 * Playlist Service - Basitleştirilmiş
 */
class PlaylistService {
    constructor() {
        this.dbManager = getDatabase();
        this.db = this.dbManager.db;
        this.logger = getLogger().module('PlaylistService');
    }

    /**
     * Playlist dosyalarını tara ve import et
     * @param {string} playlistRoot - Playlist klasör yolu
     * @returns {Promise<Object>} Import sonucu
     */
    async scanAndImport(playlistRoot) {
        try {
            this.logger.info(`Playlist tarama başlatılıyor: ${playlistRoot}`);

            // 1. Playlist dosyalarını bul
            const playlistFiles = this.scanPlaylistFiles(playlistRoot);
            this.logger.info(`${playlistFiles.length} playlist dosyası bulundu`);

            let totalTracks = 0;
            let processedFiles = 0;

            // 2. Her dosyayı işle
            for (const playlistFile of playlistFiles) {
                try {
                    this.logger.info(`🔍 Processing playlist file: ${playlistFile.filePath}`);
                    const tracks = this.extractTracksFromFile(playlistFile.filePath);
                    this.logger.info(`📊 Extracted ${tracks ? tracks.length : 0} tracks from ${playlistFile.fileName}`);
                    
                    if (tracks && tracks.length > 0) {
                        this.insertTracks(tracks, playlistFile.filePath);
                        totalTracks += tracks.length;
                        this.logger.info(`✅ Inserted ${tracks.length} tracks into database`);
                    }
                    processedFiles++;
                } catch (error) {
                    this.logger.error(`Playlist dosyası işleme hatası: ${playlistFile.filePath}`, { error: error.message });
                }
            }

            return {
                success: true,
                data: {
                    processedFiles,
                    totalTracks,
                    playlistFiles: playlistFiles.length
                },
                message: 'Playlist import başarıyla tamamlandı'
            };

        } catch (error) {
            this.logger.error(`Playlist scan hatası: ${error.message}`, { error: error.message });
            return {
                success: false,
                message: 'Playlist scan hatası',
                error: error.message
            };
        }
    }

    /**
     * Playlist dosyalarını tara
     * @param {string} playlistRoot - Playlist klasör yolu
     * @returns {Array} Playlist dosya listesi
     */
    scanPlaylistFiles(playlistRoot) {
        const playlistFiles = [];
        
        try {
            const items = fs.readdirSync(playlistRoot);
            
            for (const item of items) {
                const itemPath = path.join(playlistRoot, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    // Alt klasörleri de tara
                    const subFiles = this.scanPlaylistFiles(itemPath);
                    playlistFiles.push(...subFiles);
                } else if (item.endsWith('.vdjfolder') || item.endsWith('.m3u')) {
                    playlistFiles.push({
                        filePath: itemPath,
                        fileName: item,
                        size: stats.size,
                        modified: stats.mtime
                    });
                }
            }
        } catch (error) {
            this.logger.error(`Playlist klasör tarama hatası: ${playlistRoot}`, { error: error.message });
        }
        
        return playlistFiles;
    }

    /**
     * Dosyadan track'leri çıkar
     * @param {string} filePath - Dosya yolu
     * @returns {Array} Track listesi
     */
    extractTracksFromFile(filePath) {
        const tracks = [];
        
        try {
            if (filePath.endsWith('.vdjfolder')) {
                tracks.push(...this.extractFromVDJFolder(filePath));
            } else if (filePath.endsWith('.m3u')) {
                tracks.push(...this.extractFromM3U(filePath));
            }
        } catch (error) {
            this.logger.error(`Dosya okuma hatası: ${filePath}`, { error: error.message });
        }
        
        return tracks;
    }

    /**
     * VDJ Folder dosyasından track'leri çıkar
     * @param {string} filePath - VDJ dosya yolu
     * @returns {Array} Track listesi
     */
    extractFromVDJFolder(filePath) {
        const tracks = [];
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Basit XML parsing - <song path="..."> elementlerini bul
            const songMatches = content.match(/<song\s+path="([^"]+)"/g);
            
            if (songMatches) {
                for (const match of songMatches) {
                    const pathMatch = match.match(/path="([^"]+)"/);
                    if (pathMatch) {
                        const fileName = path.basename(pathMatch[1]);
                        const fileNameOnly = path.parse(pathMatch[1]).name;
                        tracks.push({
                            path: pathMatch[1],
                            normalizedFileName: this.normalizeFileName(fileNameOnly) // fileNameOnly'yi normalize et
                        });
                    }
                }
            }
        } catch (error) {
            this.logger.error(`VDJ dosya okuma hatası: ${filePath}`, { error: error.message });
        }
        
        return tracks;
    }

    /**
     * M3U dosyasından track'leri çıkar
     * @param {string} filePath - M3U dosya yolu
     * @returns {Array} Track listesi
     */
    extractFromM3U(filePath) {
        const tracks = [];
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                
                // M3U dosyasında # ile başlamayan satırlar dosya yolu
                if (trimmedLine && !trimmedLine.startsWith('#')) {
                    const fileName = path.basename(trimmedLine);
                    const fileNameOnly = path.parse(trimmedLine).name;
                    tracks.push({
                        path: trimmedLine,
                        normalizedFileName: this.normalizeFileName(fileNameOnly) // fileNameOnly'yi normalize et
                    });
                }
            }
        } catch (error) {
            this.logger.error(`M3U dosya okuma hatası: ${filePath}`, { error: error.message });
        }
        
        return tracks;
    }

    /**
     * Dosya adını normalize et
     * @param {string} fileName - Dosya adı
     * @returns {string} Normalize edilmiş ad
     */
    normalizeFileName(fileName) {
        const { normalizeFileName } = require('../../shared/utils');
        return normalizeFileName(fileName);
    }

    /**
     * Track'leri veritabanına ekle
     * @param {Array} tracks - Track listesi
     * @param {string} sourceFile - Kaynak dosya yolu
     */
    insertTracks(tracks, sourceFile) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO tracks (path, fileName, fileNameOnly, normalizedFileName, source, source_file, is_matched, created_at)
                VALUES (?, ?, ?, ?, 'playlist', ?, 0, ?)
            `);

            for (const track of tracks) {
                // fileName ve fileNameOnly oluştur
                const fileName = path.basename(track.path);
                const fileNameOnly = path.parse(track.path).name;
                stmt.run(track.path, fileName, fileNameOnly, track.normalizedFileName, sourceFile, new Date().toISOString());
            }
        } catch (error) {
            this.logger.error(`Track ekleme hatası: ${error.message}`, { error: error.message });
        }
    }

    /**
     * Playlist istatistikleri
     * @returns {Object} İstatistikler
     */
    getStats() {
        try {
            const totalPlaylists = this.db.prepare('SELECT COUNT(DISTINCT source_file) as count FROM tracks WHERE source = ?').get('playlist').count;
            const totalTracks = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE source = ?').get('playlist').count;

            return {
                success: true,
                data: {
                    totalPlaylists,
                    totalTracks,
                    averageTracksPerPlaylist: totalPlaylists > 0 ? (totalTracks / totalPlaylists).toFixed(2) : 0
                }
            };
        } catch (error) {
            this.logger.error(`Playlist istatistik hatası: ${error.message}`, { error: error.message });
            return {
                success: false,
                message: 'Playlist istatistik hatası',
                error: error.message
            };
        }
    }

    /**
     * Belirli bir playlist'in track'lerini listele
     * @param {string} playlistPath - Playlist dosya yolu
     * @param {Object} options - Sorgu seçenekleri
     * @returns {Object} Track listesi
     */
    getPlaylistTracks(playlistPath, options = {}) {
        const { limit = 50, offset = 0 } = options;
        try {
            const tracks = this.db.prepare(`
                SELECT id, path, normalizedFileName, created_at
                FROM tracks
                WHERE source = ? AND source_file = ?
                ORDER BY created_at ASC
                LIMIT ? OFFSET ?
            `).all('playlist', playlistPath, limit, offset);

            const total = this.db.prepare(`
                SELECT COUNT(*) as count FROM tracks
                WHERE source = ? AND source_file = ?
            `).get('playlist', playlistPath).count;

            return {
                success: true,
                data: {
                    tracks,
                    total,
                    limit,
                    offset
                }
            };
        } catch (error) {
            this.logger.error(`Playlist track listeleme hatası (${playlistPath}):`, error);
            return {
                success: false,
                message: 'Playlist track listeleme hatası',
                error: error.message
            };
        }
    }

    /**
     * Belirli bir playlist'i siler
     * @param {string} playlistPath - Playlist dosya yolu
     * @returns {Object} Silme sonucu
     */
    deletePlaylist(playlistPath) {
        try {
            this.logger.info(`Playlist siliniyor: ${playlistPath}`);
            const deleteStmt = this.db.prepare('DELETE FROM tracks WHERE source = ? AND source_file = ?');
            const result = deleteStmt.run('playlist', playlistPath);

            if (result.changes > 0) {
                this.logger.info(`Playlist başarıyla silindi: ${playlistPath} (${result.changes} track)`);
                return { success: true, message: 'Playlist başarıyla silindi' };
            } else {
                return { success: false, message: 'Playlist silinemedi veya bulunamadı' };
            }
        } catch (error) {
            this.logger.error('Playlist silme hatası:', error);
            return { success: false, message: 'Playlist silme hatası', error: error.message };
        }
    }

    /**
     * Tüm playlist'leri temizler
     * @returns {Object} Temizleme sonucu
     */
    clearAllPlaylists() {
        try {
            this.logger.warn('TÜM playlist track\'leri siliniyor!');
            const deleteStmt = this.db.prepare('DELETE FROM tracks WHERE source = ?');
            const result = deleteStmt.run('playlist');

            this.logger.info(`${result.changes} playlist track silindi.`);
            return { success: true, message: `${result.changes} playlist track başarıyla silindi` };
        } catch (error) {
            this.logger.error('Tüm playlist track\'lerini temizleme hatası:', error);
            return { success: false, message: 'Tüm playlist track\'lerini temizleme hatası', error: error.message };
        }
    }
}

module.exports = new PlaylistService();