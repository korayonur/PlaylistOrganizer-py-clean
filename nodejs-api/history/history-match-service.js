'use strict';

const path = require('path');
const SimpleSQLiteDatabase = require('../simple_database');

class HistoryMatchService {
    constructor(database) {
        if (database) {
            this.database = database;
            this.ownsDatabase = false;
        } else {
            this.database = new SimpleSQLiteDatabase();
            this.ownsDatabase = true;
        }
        this.byNameStmt = this.database.db.prepare('SELECT * FROM music_files WHERE normalizedFileName = ?');
    }

    /**
     * @param {{ originalPath: string, normalizedName: string }} track
     * @returns {Object}
     */
    matchTrack(track) {
        if (!track || !track.originalPath) {
            throw new Error('Track bilgisi eksik');
        }

        const normalizedStem = track.normalizedName && track.normalizedName.length > 0
            ? track.normalizedName
            : this.database.normalizeText(path.parse(track.originalPath).name);

        const normalizedDir = this.#normalizeDirectory(path.dirname(track.originalPath));

        // 1) Tam yol eşleşmesi
        const exact = this.findExactPath(track.originalPath);
        if (exact) {
            return {
                status: 'matched',
                method: 'exact_path',
                similarity: 1,
                matchedPath: exact.path,
                candidates: []
            };
        }

        // 2) Aynı dosya adı (aynı klasör / farklı uzantı)
        const sameNameRows = this.byNameStmt.all(normalizedStem) || [];

        const sameDirRow = sameNameRows.find(row => this.#normalizeDirectory(path.dirname(row.path)) === normalizedDir);
        if (sameDirRow) {
            return {
                status: 'matched',
                method: 'same_directory_same_name',
                similarity: 0.95,
                matchedPath: sameDirRow.path,
                candidates: this.#mapCandidates(sameNameRows, 'same_name')
            };
        }

        if (sameNameRows.length > 0) {
            const best = sameNameRows[0];
            return {
                status: 'matched',
                method: 'different_directory_same_name',
                similarity: 0.9,
                matchedPath: best.path,
                candidates: this.#mapCandidates(sameNameRows, 'same_name')
            };
        }

        // 3) Benzer dosyalar (searchProgressive + Levenshtein)
        const similarCandidates = this.findCandidates(normalizedStem, 10);
        if (similarCandidates.length > 0) {
            const topCandidate = similarCandidates[0];
            return {
                status: topCandidate.similarity >= 0.85 ? 'matched' : 'pending',
                method: 'similarity_search',
                similarity: topCandidate.similarity,
                matchedPath: topCandidate.path,
                candidates: similarCandidates
            };
        }

        return {
            status: 'missing',
            method: null,
            similarity: 0,
            matchedPath: null,
            candidates: []
        };
    }

    /**
     * @param {string} normalizedName
     * @param {number} [limit]
     * @returns {Array<Object>}
     */
    findCandidates(normalizedName, limit = 20) {
        if (!normalizedName) {
            return [];
        }

        const searchResult = this.database.searchProgressive(normalizedName, limit);
        if (!searchResult || !searchResult.results) {
            return [];
        }

        return searchResult.results.map(result => ({
            path: result.path,
            similarity: typeof result.similarity_score === 'number' ? result.similarity_score : 0,
            method: 'similarity_search',
            matchedWords: result.matchedWords || result.matched_words || [],
            raw: result
        }));
    }

    /**
     * @param {string} originalPath
     * @returns {Object|null}
     */
    findExactPath(originalPath) {
        const stmt = this.database.db.prepare('SELECT * FROM music_files WHERE path = ?');
        const result = stmt.get(originalPath);
        return result || null;
    }

    dispose() {
        if (this.database && this.ownsDatabase) {
            this.database.close();
        }
    }

    #mapCandidates(rows, method) {
        return rows.map(row => ({
            path: row.path,
            similarity: method === 'same_name' ? 0.9 : 0,
            method,
            matchedWords: [],
            raw: row
        }));
    }

    #normalizeDirectory(dirPath) {
        return dirPath.replace(/\\/g, '/').toLowerCase();
    }
}

module.exports = HistoryMatchService;
