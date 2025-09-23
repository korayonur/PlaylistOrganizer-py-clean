'use strict';

const fs = require('fs-extra');
const path = require('path');
const { getLogger } = require('../../shared/logger');

class PlaylistScanner {
    constructor() {
        this.logger = getLogger().module('PlaylistScanner');
    }

    /**
     * M3U dosyasını tarar ve track'leri çıkarır
     * @param {string} m3uFilePath - M3U dosya yolu
     * @returns {Promise<Array>} Track listesi
     */
    async scanM3UFile(m3uFilePath) {
        try {
            if (!await fs.pathExists(m3uFilePath)) {
                this.logger.warn(`M3U dosyası bulunamadı: ${m3uFilePath}`);
                return [];
            }

            const content = await fs.readFile(m3uFilePath, 'utf8');
            const lines = content.split('\n').map(line => line.trim()).filter(line => line);
            
            const tracks = [];
            let order = 0;

            for (const line of lines) {
                // M3U formatında # ile başlayan satırları atla
                if (line.startsWith('#')) {
                    continue;
                }

                // Dosya yolu varsa ekle
                if (line && !line.startsWith('#')) {
                    tracks.push({
                        trackPath: line,
                        trackOrder: order++
                    });
                }
            }

            this.logger.info(`M3U dosyası taranıyor: ${m3uFilePath} - ${tracks.length} track bulundu`);
            return tracks;

        } catch (error) {
            this.logger.error(`M3U dosyası tarama hatası: ${m3uFilePath}`, {
                error: error.message,
                stack: error.stack
            });
            return [];
        }
    }

    /**
     * VDJ Folder dosyasını tarar ve track'leri çıkarır
     * @param {string} vdjFilePath - VDJ dosya yolu
     * @returns {Promise<Array>} Track listesi
     */
    async scanVDJFolderFile(vdjFilePath) {
        try {
            if (!await fs.pathExists(vdjFilePath)) {
                this.logger.warn(`VDJ dosyası bulunamadı: ${vdjFilePath}`);
                return [];
            }

            const content = await fs.readFile(vdjFilePath, 'utf8');
            const xml2js = require('xml2js');
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(content);

            const tracks = [];
            let order = 0;

            if (result.VirtualFolder && result.VirtualFolder.song) {
                const songs = Array.isArray(result.VirtualFolder.song) 
                    ? result.VirtualFolder.song 
                    : [result.VirtualFolder.song];

                for (const song of songs) {
                    if (song.$ && song.$.path) {
                        tracks.push({
                            trackPath: song.$.path,
                            trackOrder: order++
                        });
                    }
                }
            }

            this.logger.info(`VDJ dosyası taranıyor: ${vdjFilePath} - ${tracks.length} track bulundu`);
            return tracks;

        } catch (error) {
            this.logger.error(`VDJ dosyası tarama hatası: ${vdjFilePath}`, {
                error: error.message,
                stack: error.stack
            });
            return [];
        }
    }

    /**
     * Klasördeki tüm M3U dosyalarını bulur
     * @param {string} directoryPath - Klasör yolu
     * @returns {Promise<Array>} M3U dosya listesi
     */
    async findM3UFiles(directoryPath) {
        try {
            const m3uFiles = [];
            
            const scanDirectory = async (dir) => {
                const items = await fs.readdir(dir);
                
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else if (item.toLowerCase().endsWith('.m3u')) {
                        m3uFiles.push(fullPath);
                    }
                }
            };

            await scanDirectory(directoryPath);
            this.logger.info(`${directoryPath} klasöründe ${m3uFiles.length} M3U dosyası bulundu`);
            return m3uFiles;

        } catch (error) {
            this.logger.error(`M3U dosya tarama hatası: ${directoryPath}`, {
                error: error.message,
                stack: error.stack
            });
            return [];
        }
    }

    /**
     * Klasördeki tüm VDJ dosyalarını bulur
     * @param {string} directoryPath - Klasör yolu
     * @returns {Promise<Array>} VDJ dosya listesi
     */
    async findVDJFiles(directoryPath) {
        try {
            const vdjFiles = [];
            
            const scanDirectory = async (dir) => {
                const items = await fs.readdir(dir);
                
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else if (item.toLowerCase().endsWith('.vdjfolder')) {
                        vdjFiles.push(fullPath);
                    }
                }
            };

            await scanDirectory(directoryPath);
            this.logger.info(`${directoryPath} klasöründe ${vdjFiles.length} VDJ dosyası bulundu`);
            return vdjFiles;

        } catch (error) {
            this.logger.error(`VDJ dosya tarama hatası: ${directoryPath}`, {
                error: error.message,
                stack: error.stack
            });
            return [];
        }
    }

    /**
     * Playlist adını dosya yolundan çıkarır
     * @param {string} filePath - Dosya yolu
     * @returns {string} Playlist adı
     */
    extractPlaylistName(filePath) {
        const fileName = path.basename(filePath);
        const nameWithoutExt = path.parse(fileName).name;
        return nameWithoutExt;
    }
}

module.exports = PlaylistScanner;
