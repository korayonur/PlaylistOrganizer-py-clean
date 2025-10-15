'use strict';

const ITrackRepository = require('../../../domain/repositories/ITrackRepository');
const Track = require('../../../domain/entities/Track');

/**
 * Track Repository Implementation
 */
class TrackRepository extends ITrackRepository {
    constructor(db) {
        super();
        this.db = db;
        this.tableName = 'tracks';
    }

    async findById(id) {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
        const row = stmt.get(id);
        return row ? new Track(row) : null;
    }

    async findByPath(path) {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE path = ?`);
        const row = stmt.get(path);
        return row ? new Track(row) : null;
    }

    async findByNormalizedName(normalizedName) {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE normalizedFileName = ?`);
        const rows = stmt.all(normalizedName);
        return rows.map(row => new Track(row));
    }

    async findAll(options = {}) {
        const { limit = 100, offset = 0, orderBy = 'id', order = 'ASC' } = options;
        const stmt = this.db.prepare(
            `SELECT * FROM ${this.tableName} ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`
        );
        const rows = stmt.all(limit, offset);
        return rows.map(row => new Track(row));
    }

    async create(entity) {
        const data = entity.toDatabase();
        const stmt = this.db.prepare(`
            INSERT INTO ${this.tableName} 
            (path, fileName, fileNameOnly, normalizedFileName, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);

        try {
            const result = stmt.run(
                data.path,
                data.fileName,
                data.fileNameOnly,
                data.normalizedFileName,
                data.created_at
            );
            entity.id = result.lastInsertRowid;
            return entity;
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return null; // Already exists
            }
            throw error;
        }
    }

    async bulkCreate(entities) {
        let added = 0;
        let skipped = 0;
        let errors = 0;

        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO ${this.tableName} 
            (path, fileName, fileNameOnly, normalizedFileName, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);

        const transaction = this.db.transaction((items) => {
            for (const entity of items) {
                try {
                    const data = entity.toDatabase();
                    const result = stmt.run(
                        data.path,
                        data.fileName,
                        data.fileNameOnly,
                        data.normalizedFileName,
                        data.created_at
                    );
                    if (result.changes > 0) {
                        added++;
                    } else {
                        skipped++;
                    }
                } catch (error) {
                    errors++;
                    console.error(`❌ Bulk insert hatası: ${error.message}`);
                }
            }
        });

        transaction(entities);
        return { added, skipped, errors };
    }

    async update(entity) {
        const data = entity.toDatabase();
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName} 
            SET fileName = ?, fileNameOnly = ?, normalizedFileName = ?
            WHERE id = ?
        `);

        stmt.run(
            data.fileName,
            data.fileNameOnly,
            data.normalizedFileName,
            entity.id
        );

        return entity;
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

    async findByPlaylistId(playlistId) {
        const stmt = this.db.prepare(`
            SELECT t.* FROM ${this.tableName} t
            INNER JOIN playlist_tracks pt ON t.id = pt.track_id
            WHERE pt.playlist_id = ?
            ORDER BY pt.track_order
        `);
        const rows = stmt.all(playlistId);
        return rows.map(row => new Track(row));
    }
}

module.exports = TrackRepository;

