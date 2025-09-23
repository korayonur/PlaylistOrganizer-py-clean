'use strict';

const fs = require('fs');
const path = require('path');
const { getDefaultHistoryRoot } = require('./history-types');
const { getLogger } = require('../../shared/logger');
const versionManager = require('../../shared/version');

class HistoryScanner {
    /**
     * @param {Object} options
     * @param {string} [options.historyRoot]
     */
    constructor(options = {}) {
        this.historyRoot = options.historyRoot || getDefaultHistoryRoot();
        this.logger = getLogger().module('HistoryScanner');
        
        // Otomatik versiyon artırma
        const newVersion = versionManager.autoIncrementByFileChange('history', __filename);
        this.logger.info(`HistoryScanner version updated to: ${newVersion}`);
    }

    /**
     * History dosyalarını tara
     * @returns {Promise<Array<Object>>}
     */
    async scanHistoryFiles(historyRoot = null) {
        const root = historyRoot || this.historyRoot;
        const files = [];

        this.logger.info(`Scanning history directory: ${root}`);

        if (!fs.existsSync(root)) {
            this.logger.warn(`History klasörü bulunamadı: ${root}`);
            return files;
        }

        const walk = (currentDir) => {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            this.logger.info(`Walking directory: ${currentDir}, entries: ${entries.length}`);
            
            for (const entry of entries) {
                const absolutePath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    walk(absolutePath);
                } else if (entry.isFile() && this.isHistoryFile(absolutePath)) {
                    this.logger.info(`Found M3U file: ${absolutePath}`);
                    files.push({
                        filePath: absolutePath,
                        fileName: path.basename(absolutePath)
                    });
                }
            }
        };

        walk(root);
        this.logger.info(`Total M3U files found: ${files.length}`);
        return files.sort((a, b) => a.fileName.localeCompare(b.fileName));
    }

    /**
     * History dosyasından track'leri çıkar
     * @param {string} filePath
     * @returns {Promise<Array<Object>>}
     */
    async extractTracksFromFile(filePath) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const lines = fileContent.split(/\r?\n/);
            const tracks = [];

            this.logger.info(`Processing file: ${filePath}, lines: ${lines.length}`);

            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line || line.startsWith('#')) {
                    continue;
                }

                // Cache dosyalarını atla
                if (line.toLowerCase().includes('.vdjcache')) {
                    continue;
                }

                const normalizedName = this.normalizeFileName(path.basename(line));
                tracks.push({
                    originalPath: line,
                    normalizedName
                });
                this.logger.info(`Found track: ${line} -> ${normalizedName}`);
            }

            this.logger.info(`Total tracks found: ${tracks.length}`);
            return tracks;
        } catch (error) {
            console.error(`Dosya okuma hatası ${filePath}:`, error.message);
            return [];
        }
    }

    /**
     * History dosyası mı kontrol et
     * @param {string} absolutePath
     * @returns {boolean}
     */
    isHistoryFile(absolutePath) {
        return absolutePath.endsWith('.m3u');
    }

    /**
     * Dosya adını normalize et
     * @param {string} fileName
     * @returns {string}
     */
    normalizeFileName(fileName) {
        const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
        return nameWithoutExt
            .normalize('NFKC')
            .replace(/[ğĞ]/g, 'g')
            .replace(/[ıİI]/g, 'i')
            .replace(/[şŞ]/g, 's')
            .replace(/[çÇ]/g, 'c')
            .replace(/[üÜ]/g, 'u')
            .replace(/[öÖ]/g, 'o')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

module.exports = HistoryScanner;