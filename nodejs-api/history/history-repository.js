'use strict';

const path = require('path');
const Database = require('better-sqlite3');

class HistoryRepository {
    /**
     * @param {string} databasePath
     */
    constructor(databasePath) {
        this.dbPath = databasePath || path.join(__dirname, '../../musicfiles.db');
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL');
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }

    /**
     * @param {Object} history
     * @returns {number}
     */
    upsertHistoryFile(history) {
        const stmt = this.db.prepare(`
            INSERT INTO virtualdj_history (file_path, file_name, year, month, day, total_tracks, missing_tracks, status, last_scanned_at)
            VALUES (@file_path, @file_name, @year, @month, @day, @total_tracks, @missing_tracks, @status, datetime('now'))
            ON CONFLICT(file_path)
            DO UPDATE SET
                file_name = excluded.file_name,
                year = excluded.year,
                month = excluded.month,
                day = excluded.day,
                total_tracks = excluded.total_tracks,
                missing_tracks = excluded.missing_tracks,
                status = excluded.status,
                last_scanned_at = datetime('now'),
                updated_at = datetime('now')
            RETURNING id;
        `);

        const result = stmt.get({
            file_path: history.filePath,
            file_name: history.fileName,
            year: history.year,
            month: history.month,
            day: history.day,
            total_tracks: history.totalTracks || 0,
            missing_tracks: history.missingTracks || 0,
            status: history.status || 'scanned'
        });

        return result.id;
    }

    /**
     * @param {number} historyFileId
     */
    deleteTracksForHistory(historyFileId) {
        this.db.prepare('DELETE FROM history_tracks WHERE history_file_id = ?').run(historyFileId);
    }

    updateHistoryStatus(historyFileId, status) {
        this.db.prepare(`
            UPDATE virtualdj_history
            SET status = @status,
                updated_at = datetime('now')
            WHERE id = @id
        `).run({
            id: historyFileId,
            status: status || 'pending'
        });
    }

    clearMissingForHistory(historyFileId) {
        this.db.prepare(`
            DELETE FROM history_missing
            WHERE track_id IN (
                SELECT id FROM history_tracks WHERE history_file_id = ?
            )
        `).run(historyFileId);
    }

    /**
     * @param {number} historyFileId
     * @param {Array<Object>} tracks
     */
    insertTracks(historyFileId, tracks) {
        if (!tracks || tracks.length === 0) {
            return;
        }

        const insert = this.db.prepare(`
            INSERT INTO history_tracks (history_file_id, original_path, normalized_name, metadata_json)
            VALUES (@history_file_id, @original_path, @normalized_name, @metadata_json)
        `);

        const insertMany = this.db.transaction((trackList) => {
            for (const track of trackList) {
                insert.run({
                    history_file_id: historyFileId,
                    original_path: track.originalPath,
                    normalized_name: track.normalizedName,
                    metadata_json: track.metadata ? JSON.stringify(track.metadata) : null
                });
            }
        });

        insertMany(tracks);
    }

    /**
     * @param {number} historyFileId
     * @param {{ total: number, missing: number }} stats
     */
    updateHistoryStats(historyFileId, stats) {
        const stmt = this.db.prepare(`
            UPDATE virtualdj_history
            SET total_tracks = @total,
                missing_tracks = @missing,
                updated_at = datetime('now')
            WHERE id = @id
        `);

        stmt.run({
            id: historyFileId,
            total: stats.total,
            missing: stats.missing
        });
    }

    /**
     * @param {number} historyFileId
     * @returns {Array<Object>}
     */
    getTracks(historyFileId) {
        const stmt = this.db.prepare(`
            SELECT * FROM history_tracks WHERE history_file_id = ?
        `);
        return stmt.all(historyFileId);
    }

    listHistoryFiles(options = {}) {
        const limit = options.limit && options.limit > 0 ? options.limit : 100;
        const offset = options.offset || 0;
        const query = options.search ? `%${options.search.toLowerCase()}%` : null;

        let sql = `
            SELECT * FROM virtualdj_history
        `;

        if (query) {
            sql += ` WHERE LOWER(file_name) LIKE @query OR LOWER(file_path) LIKE @query`;
        }

        sql += ' ORDER BY (last_scanned_at IS NULL), last_scanned_at DESC LIMIT @limit OFFSET @offset';

        return this.db.prepare(sql).all({
            query,
            limit,
            offset
        });
    }

    listMissing(options = {}) {
        const limit = options.limit && options.limit > 0 ? options.limit : 100;
        const offset = options.offset || 0;
        const status = options.status || null;

        let sql = `
            SELECT hm.*, ht.history_file_id, ht.original_path AS track_original_path, ht.normalized_name
            FROM history_missing hm
            INNER JOIN history_tracks ht ON hm.track_id = ht.id
        `;

        if (status) {
            sql += ' WHERE hm.status = @status';
        }

        sql += ' ORDER BY hm.created_at DESC LIMIT @limit OFFSET @offset';

        return this.db.prepare(sql).all({
            status,
            limit,
            offset
        });
    }

    getMissingById(id) {
        const stmt = this.db.prepare(`
            SELECT hm.*, ht.history_file_id, ht.original_path AS track_original_path, ht.normalized_name,
                   vh.file_path AS history_file_path, vh.file_name AS history_file_name
            FROM history_missing hm
            INNER JOIN history_tracks ht ON hm.track_id = ht.id
            INNER JOIN virtualdj_history vh ON ht.history_file_id = vh.id
            WHERE hm.id = ?
        `);
        return stmt.get(id);
    }

    /**
     * @param {Object} data
     */
    updateTrackMatch(data) {
        const stmt = this.db.prepare(`
            UPDATE history_tracks
            SET status = @status,
                matched_path = @matched_path,
                match_method = @match_method,
                similarity = @similarity,
                updated_at = datetime('now')
            WHERE id = @id
        `);

        stmt.run({
            id: data.id,
            status: data.status || 'matched',
            matched_path: data.matchedPath || null,
            match_method: data.matchMethod || null,
            similarity: typeof data.similarity === 'number' ? data.similarity : null
        });
    }

    /**
     * @param {Object} missing
     */
    upsertMissing(missing) {
        const stmt = this.db.prepare(`
            INSERT INTO history_missing (track_id, original_path, candidate_paths, similarity, status, selected_path)
            VALUES (@track_id, @original_path, @candidate_paths, @similarity, @status, @selected_path)
            ON CONFLICT(track_id)
            DO UPDATE SET
                candidate_paths = excluded.candidate_paths,
                similarity = excluded.similarity,
                status = excluded.status,
                selected_path = excluded.selected_path,
                updated_at = datetime('now')
        `);

        stmt.run({
            track_id: missing.trackId,
            original_path: missing.originalPath,
            candidate_paths: missing.candidatePaths ? JSON.stringify(missing.candidatePaths) : null,
            similarity: missing.similarity || null,
            status: missing.status || 'pending',
            selected_path: missing.selectedPath || null
        });
    }

    removeMissing(trackId) {
        this.db.prepare('DELETE FROM history_missing WHERE track_id = ?').run(trackId);
    }

    updateMissingSelection(id, payload) {
        const stmt = this.db.prepare(`
            UPDATE history_missing
            SET selected_path = @selected_path,
                status = @status,
                updated_at = datetime('now')
            WHERE id = @id
        `);

        stmt.run({
            id,
            selected_path: payload.selectedPath || null,
            status: payload.status || 'pending'
        });
    }
}

module.exports = HistoryRepository;
