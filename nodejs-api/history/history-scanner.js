'use strict';

const fs = require('fs');
const path = require('path');
const { getDefaultHistoryRoot } = require('./history-types');

class HistoryScanner {
    /**
     * @param {Object} options
     * @param {string} [options.historyRoot]
     * @param {boolean} [options.includeCache]
     */
    constructor(options = {}) {
        this.historyRoot = options.historyRoot || getDefaultHistoryRoot();
        this.includeCache = Boolean(options.includeCache);
    }

    /**
     * @returns {Array<string>}
     */
    listHistoryFiles() {
        const files = [];
        const root = this.historyRoot;

        if (!fs.existsSync(root)) {
            return files;
        }

        const walk = (currentDir) => {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const absolutePath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    walk(absolutePath);
                } else if (entry.isFile() && this.isHistoryFile(absolutePath)) {
                    files.push(absolutePath);
                }
            }
        };

        walk(root);
        return files.sort();
    }

    /**
     * @returns {Array<Object>}
     */
    scan() {
        return this.listHistoryFiles().map(filePath => this.parseHistoryFile(filePath));
    }

    /**
     * @returns {string}
     */
    getHistoryRoot() {
        return this.historyRoot;
    }

    /**
     * @param {string} absolutePath
     * @returns {boolean}
     */
    isHistoryFile(absolutePath) {
        return absolutePath.endsWith('.m3u');
    }

    /**
     * @param {string} filePath
     * @returns {{ filePath: string, fileName: string, year: number|null, month: number|null, day: number|null, tracks: Array<Object> }}
     */
    parseHistoryFile(filePath) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split(/\r?\n/);

        const tracks = [];
        let currentMetadata = null;

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) {
                continue;
            }

            if (line.startsWith('#EXTVDJ')) {
                currentMetadata = this.#parseExtVDJ(line);
                continue;
            }

            if (!this.includeCache && line.toLowerCase().includes('.vdjcache')) {
                continue;
            }

            const normalizedName = this.#normalizeFileName(path.basename(line));
            tracks.push({
                originalPath: line,
                normalizedName,
                metadata: currentMetadata
            });
            currentMetadata = null;
        }

        const { year, month, day } = this.#extractDateFromFileName(filePath);

        return {
            filePath,
            fileName: path.basename(filePath),
            year,
            month,
            day,
            tracks
        };
    }

    #normalizeFileName(fileName) {
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

    #extractDateFromFileName(filePath) {
        const fileName = path.basename(filePath, path.extname(filePath));
        const dateMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!dateMatch) {
            return { year: null, month: null, day: null };
        }

        return {
            year: Number(dateMatch[1]),
            month: Number(dateMatch[2]),
            day: Number(dateMatch[3])
        };
    }

    #parseExtVDJ(line) {
        const metadata = {};
        const regex = /<([^>]+)>([^<]*)<\/[^>]+>/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            const key = match[1];
            metadata[key] = match[2];
        }

        return Object.keys(metadata).length > 0 ? metadata : null;
    }
}

module.exports = HistoryScanner;
