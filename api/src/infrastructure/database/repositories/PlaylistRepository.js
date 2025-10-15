'use strict';

const IPlaylistRepository = require('../../../domain/repositories/IPlaylistRepository');
const Playlist = require('../../../domain/entities/Playlist');
const Track = require('../../../domain/entities/Track');

/**
 * Playlist Repository Implementation
 */
class PlaylistRepository extends IPlaylistRepository {
    constructor(db) {
        super();
        this.db = db;
        this.tableName = 'playlists';
    }

    async findById(id) {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
        const row = stmt.get(id);
        return row ? new Playlist(row) : null;
    }

    async findByPath(path) {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE path = ?`);
        const row = stmt.get(path);
        return row ? new Playlist(row) : null;
    }

    async findByType(type) {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE type = ?`);
        const rows = stmt.all(type);
        return rows.map(row => new Playlist(row));
    }

    async findAll(options = {}) {
        const { limit = 100, offset = 0, orderBy = 'id', order = 'ASC' } = options;
        const stmt = this.db.prepare(
            `SELECT * FROM ${this.tableName} ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`
        );
        const rows = stmt.all(limit, offset);
        return rows.map(row => new Playlist(row));
    }

    async create(entity) {
        const data = entity.toDatabase();
        const stmt = this.db.prepare(`
            INSERT INTO ${this.tableName} 
            (path, name, type, track_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        try {
            const result = stmt.run(
                data.path,
                data.name,
                data.type,
                data.track_count,
                data.created_at,
                data.updated_at
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
        const results = [];
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO ${this.tableName} 
            (path, name, type, track_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const transaction = this.db.transaction((items) => {
            for (const entity of items) {
                try {
                    const data = entity.toDatabase();
                    const result = stmt.run(
                        data.path,
                        data.name,
                        data.type,
                        data.track_count,
                        data.created_at,
                        data.updated_at
                    );
                    entity.id = result.lastInsertRowid;
                    results.push(entity);
                } catch (error) {
                    console.error(`❌ Bulk insert hatası: ${error.message}`);
                }
            }
        });

        transaction(entities);
        return results;
    }

    async update(entity) {
        const data = entity.toDatabase();
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName} 
            SET name = ?, type = ?, track_count = ?, updated_at = ?
            WHERE id = ?
        `);

        stmt.run(
            data.name,
            data.type,
            data.track_count,
            data.updated_at,
            entity.id
        );

        return entity;
    }

    async updateTrackCount(playlistId, count) {
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName} 
            SET track_count = ?, updated_at = ?
            WHERE id = ?
        `);

        const result = stmt.run(count, new Date().toISOString(), playlistId);
        return result.changes > 0;
    }

    async delete(id) {
        const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
        const result = stmt.run(id);
        return result.changes > 0;
    }

    async deleteAll() {
        // Önce playlist_tracks'i temizle (foreign key cascade)
        this.db.prepare('DELETE FROM playlist_tracks').run();
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

    async findByIdWithTracks(playlistId) {
        // Playlist'i al
        const playlist = await this.findById(playlistId);
        if (!playlist) {
            return null;
        }

        // Track'leri al
        const stmt = this.db.prepare(`
            SELECT t.* FROM tracks t
            INNER JOIN playlist_tracks pt ON t.id = pt.track_id
            WHERE pt.playlist_id = ?
            ORDER BY pt.track_order
        `);
        const rows = stmt.all(playlistId);
        const tracks = rows.map(row => new Track(row));

        return {
            playlist,
            tracks
        };
    }
}

module.exports = PlaylistRepository;

