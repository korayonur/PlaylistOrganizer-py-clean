'use strict';

const fs = require('fs');
const HistoryRepository = require('./history-repository');

class HistoryFixService {
    constructor(options = {}) {
        this.repository = options.repository || new HistoryRepository(options.databasePath);
    }

    /**
     * @param {Object} fixRequest
     * @param {number} fixRequest.trackId
     * @param {string} fixRequest.originalPath
     * @param {string} fixRequest.newPath
     * @param {number} [fixRequest.similarity]
     * @param {string} [fixRequest.method]
     * @returns {void}
     */
    applyFix(fixRequest) {
        if (!fixRequest || !fixRequest.trackId || !fixRequest.newPath) {
            throw new Error('Fix request must include trackId and newPath');
        }

        const track = this.repository.db.prepare('SELECT * FROM history_tracks WHERE id = ?').get(fixRequest.trackId);
        if (!track) {
            throw new Error(`Track not found for id ${fixRequest.trackId}`);
        }

        this.#rewriteHistoryFile(track.history_file_id, track.original_path, fixRequest.newPath);

        this.repository.db.prepare(`
            UPDATE history_tracks
            SET matched_path = ?,
                match_method = ?,
                similarity = ?,
                status = 'fixed',
                updated_at = datetime('now')
            WHERE id = ?
        `).run(fixRequest.newPath, fixRequest.method || 'manual', fixRequest.similarity || null, fixRequest.trackId);

        if (fixRequest.missingId) {
            this.repository.updateMissingSelection(fixRequest.missingId, {
                selectedPath: fixRequest.newPath,
                status: 'fixed'
            });
        } else {
            this.repository.removeMissing(fixRequest.trackId);
        }

        this.repository.db.prepare(`
            INSERT INTO history_fix_log (track_id, previous_path, new_path, similarity, method)
            VALUES (?, ?, ?, ?, ?)
        `).run(fixRequest.trackId, track.original_path, fixRequest.newPath, fixRequest.similarity || null, fixRequest.method || 'manual');
    }

    #rewriteHistoryFile(historyFileId, oldPath, newPath) {
        const historyFile = this.repository.db.prepare('SELECT * FROM virtualdj_history WHERE id = ?').get(historyFileId);
        if (!historyFile) {
            throw new Error(`History file not found for id ${historyFileId}`);
        }

        const absolutePath = historyFile.file_path;
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`History file does not exist: ${absolutePath}`);
        }

        const originalContent = fs.readFileSync(absolutePath, 'utf8');
        const backupPath = `${absolutePath}.bak`;
        if (!fs.existsSync(backupPath)) {
            fs.writeFileSync(backupPath, originalContent, 'utf8');
        }

        const updatedContent = originalContent.replace(oldPath, newPath);
        fs.writeFileSync(absolutePath, updatedContent, 'utf8');
    }
}

module.exports = HistoryFixService;
