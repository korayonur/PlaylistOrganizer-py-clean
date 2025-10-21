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
        const { limit = 100, offset = 0, orderBy = 'id', order = 'ASC', excludeEmpty = false } = options;
        
        // FavoriteFolder'ları filtrele (track_count = 0 olanlar)
        const whereClause = excludeEmpty ? 'WHERE track_count > 0' : '';
        
        const stmt = this.db.prepare(
            `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`
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

    /**
     * Playlist track'lerini file existence kontrolü ile al
     * LEFT JOIN music_files ile dosya varlığını database'den kontrol eder (SIFIR dosya I/O)
     * @param {number} playlistId - Playlist ID
     * @param {boolean} onlyMissing - Sadece eksik dosyaları getir
     * @returns {Promise<Array>} Track listesi (path, file_exists)
     */
    async findTracksWithFileStatus(playlistId, onlyMissing = false) {
        const missingFilter = onlyMissing ? 'AND m_exact.path IS NULL AND m_norm.path IS NULL' : '';
        
        const stmt = this.db.prepare(`
            SELECT 
                t.id,
                t.path,
                t.fileName,
                CASE 
                    WHEN m_exact.path IS NOT NULL THEN 1  -- Exact path match (en iyi)
                    WHEN m_norm.path IS NOT NULL THEN 1   -- Normalized match (iyi)
                    ELSE 0                                 -- Eşleşme yok
                END as file_exists
            FROM playlist_tracks pt
            INNER JOIN tracks t ON pt.track_id = t.id
            LEFT JOIN music_files m_exact ON t.path = m_exact.path
            LEFT JOIN music_files m_norm ON t.normalizedFileName = m_norm.normalizedFileName AND m_exact.path IS NULL
            WHERE pt.playlist_id = ?
            ${missingFilter}
            GROUP BY t.id  -- Duplicate music_files'ı önle
            ORDER BY pt.track_order
        `);
        
        const rows = stmt.all(playlistId);
        return rows.map(row => ({
            id: row.id,
            path: row.path,
            fileName: row.fileName,
            fileExists: Boolean(row.file_exists)
        }));
    }

    /**
     * Eksik track içeren playlist'leri al
     * LEFT JOIN music_files ile eksik track'leri tespit eder (SIFIR dosya I/O)
     * @param {Object} options - Filtreleme seçenekleri
     * @returns {Promise<Array>} Eksik track'li playlist'ler
     */
    async findPlaylistsWithMissingTracks(options = {}) {
        const { limit = 10000, offset = 0 } = options;
        
        const stmt = this.db.prepare(`
            SELECT 
                p.*,
                COUNT(DISTINCT t.id) as total_tracks,
                COUNT(DISTINCT CASE 
                    WHEN m_exact.path IS NULL AND m_norm.path IS NULL THEN t.id 
                END) as missing_tracks,
                COUNT(DISTINCT CASE 
                    WHEN m_exact.path IS NOT NULL OR m_norm.path IS NOT NULL THEN t.id 
                END) as existing_tracks
            FROM playlists p
            LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
            LEFT JOIN tracks t ON pt.track_id = t.id
            LEFT JOIN music_files m_exact ON t.path = m_exact.path
            LEFT JOIN music_files m_norm ON t.normalizedFileName = m_norm.normalizedFileName AND m_exact.path IS NULL
            WHERE p.track_count > 0
            GROUP BY p.id
            HAVING missing_tracks > 0
            ORDER BY p.name ASC
            LIMIT ? OFFSET ?
        `);
        
        const rows = stmt.all(limit, offset);
        return rows.map(row => new Playlist(row));
    }
}

module.exports = PlaylistRepository;

