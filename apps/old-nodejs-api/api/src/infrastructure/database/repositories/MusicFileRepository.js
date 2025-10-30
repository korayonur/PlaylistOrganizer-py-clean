'use strict';

const IMusicFileRepository = require('../../../domain/repositories/IMusicFileRepository');
const MusicFile = require('../../../domain/entities/MusicFile');

/**
 * MusicFile Repository Implementation
 */
class MusicFileRepository extends IMusicFileRepository {
    constructor(db) {
        super();
        this.db = db;
        this.tableName = 'music_files';
    }

    async findById(id) {
        // ⚠️ UYARI: music_files tablosunda id kolonu YOK (path PRIMARY KEY)
        // id yerine path kullanılmalı
        return this.findByPath(id);
    }

    async findByPath(path) {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE path = ?`);
        const row = stmt.get(path);
        return row ? new MusicFile(row) : null;
    }

    async findByNormalizedName(normalizedName) {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE normalizedFileName = ?`);
        const rows = stmt.all(normalizedName);
        return rows.map(row => new MusicFile(row));
    }

    async findAll(options = {}) {
        const { limit = 100, offset = 0, orderBy = 'id', order = 'ASC' } = options;
        const stmt = this.db.prepare(
            `SELECT * FROM ${this.tableName} ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`
        );
        const rows = stmt.all(limit, offset);
        return rows.map(row => new MusicFile(row));
    }

    async create(entity) {
        const data = entity.toDatabase();
        const stmt = this.db.prepare(`
            INSERT INTO ${this.tableName} 
            (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        try {
            stmt.run(
                data.path,
                data.fileName,
                data.fileNameOnly,
                data.normalizedFileName,
                data.extension,
                data.size,
                data.modifiedTime,
                data.created_at
            );
            // ⚠️ UYARI: music_files'da id yok, path PRIMARY KEY
            // entity.id = path olarak set edilmeli
            entity.id = data.path;
            return entity;
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
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
            (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
                        data.extension,
                        data.size,
                        data.modifiedTime,
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
        // ⚠️ UYARI: music_files tablosunda id kolonu YOK (path PRIMARY KEY)
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName} 
            SET fileName = ?, fileNameOnly = ?, normalizedFileName = ?, 
                extension = ?, size = ?, modifiedTime = ?
            WHERE path = ?
        `);

        stmt.run(
            data.fileName,
            data.fileNameOnly,
            data.normalizedFileName,
            data.extension,
            data.size,
            data.modifiedTime,
            data.path
        );

        return entity;
    }

    async delete(id) {
        // ⚠️ UYARI: music_files tablosunda id kolonu YOK (path PRIMARY KEY)
        // id parametresi aslında path
        const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE path = ?`);
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
        // ⚠️ UYARI: music_files tablosunda id kolonu YOK (path PRIMARY KEY)
        const stmt = this.db.prepare(`SELECT 1 FROM ${this.tableName} WHERE path = ? LIMIT 1`);
        return stmt.get(id) !== undefined;
    }

    async findByExtension(extension) {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE extension = ?`);
        const rows = stmt.all(extension);
        return rows.map(row => new MusicFile(row));
    }
}

module.exports = MusicFileRepository;

