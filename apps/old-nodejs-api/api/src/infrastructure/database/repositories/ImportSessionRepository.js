'use strict';

const IImportSessionRepository = require('../../../domain/repositories/IImportSessionRepository');
const ImportSession = require('../../../domain/entities/ImportSession');

/**
 * ImportSession Repository Implementation
 */
class ImportSessionRepository extends IImportSessionRepository {
    constructor(db) {
        super();
        this.db = db;
        this.tableName = 'import_sessions';
    }

    async findById(id) {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
        const row = stmt.get(id);
        return row ? new ImportSession(row) : null;
    }

    async findLastByPath(path) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName} 
            WHERE path = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        const row = stmt.get(path);
        return row ? new ImportSession(row) : null;
    }

    async findRecent(limit = 10) {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName} 
            ORDER BY created_at DESC 
            LIMIT ?
        `);
        const rows = stmt.all(limit);
        return rows.map(row => new ImportSession(row));
    }

    async findAll(options = {}) {
        const { limit = 100, offset = 0, orderBy = 'created_at', order = 'DESC' } = options;
        const stmt = this.db.prepare(
            `SELECT * FROM ${this.tableName} ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`
        );
        const rows = stmt.all(limit, offset);
        return rows.map(row => new ImportSession(row));
    }

    async create(entity) {
        const data = entity.toDatabase();
        const stmt = this.db.prepare(`
            INSERT INTO ${this.tableName} 
            (path, total_files, processed_files, added_files, skipped_files, error_files, created_at,
             operation_type, music_files_count, tracks_count, playlists_count, index_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            data.path,
            data.total_files,
            data.processed_files,
            data.added_files,
            data.skipped_files,
            data.error_files,
            data.created_at,
            data.operation_type || 'import',
            data.music_files_count || 0,
            data.tracks_count || 0,
            data.playlists_count || 0,
            data.index_count || 0
        );
        
        entity.id = result.lastInsertRowid;
        return entity;
    }

    async update(entity) {
        const data = entity.toDatabase();
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName} 
            SET total_files = ?, processed_files = ?, added_files = ?, 
                skipped_files = ?, error_files = ?,
                operation_type = ?, music_files_count = ?, tracks_count = ?,
                playlists_count = ?, index_count = ?
            WHERE id = ?
        `);

        stmt.run(
            data.total_files,
            data.processed_files,
            data.added_files,
            data.skipped_files,
            data.error_files,
            data.operation_type,
            data.music_files_count,
            data.tracks_count,
            data.playlists_count,
            data.index_count,
            entity.id
        );

        return entity;
    }

    async updateStats(sessionId, stats) {
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName} 
            SET processed_files = ?, added_files = ?, skipped_files = ?, error_files = ?
            WHERE id = ?
        `);

        const result = stmt.run(
            stats.processed_files || 0,
            stats.added_files || 0,
            stats.skipped_files || 0,
            stats.error_files || 0,
            sessionId
        );

        return result.changes > 0;
    }

    async delete(id) {
        const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
        const result = stmt.run(id);
        return result.changes > 0;
    }

    async deleteAll() {
        const stmt = this.db.prepare(`DELETE FROM ${this.tableName}`);
        const result = stmt.run();
        return result.changes;
    }

    async count(criteria = {}) {
        const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`);
        const row = stmt.get();
        return row.count;
    }

    async exists(id) {
        const stmt = this.db.prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`);
        return stmt.get(id) !== undefined;
    }

    async findCompleted() {
        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName} 
            WHERE processed_files >= total_files 
            ORDER BY created_at DESC
        `);
        const rows = stmt.all();
        return rows.map(row => new ImportSession(row));
    }
}

module.exports = ImportSessionRepository;

