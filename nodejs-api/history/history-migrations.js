'use strict';

const path = require('path');
const Database = require('better-sqlite3');

class HistoryDatabaseMigrations {
    /**
     * @param {string} databasePath
     */
    constructor(databasePath) {
        this.databasePath = databasePath || path.join(__dirname, '../../musicfiles.db');
    }

    run() {
        const db = new Database(this.databasePath);
        try {
            db.exec(`
                CREATE TABLE IF NOT EXISTS virtualdj_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_path TEXT UNIQUE NOT NULL,
                    file_name TEXT NOT NULL,
                    year INTEGER,
                    month INTEGER,
                    day INTEGER,
                    total_tracks INTEGER DEFAULT 0,
                    missing_tracks INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'pending',
                    last_scanned_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            db.exec(`
                CREATE TABLE IF NOT EXISTS history_tracks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    history_file_id INTEGER NOT NULL,
                    original_path TEXT NOT NULL,
                    normalized_name TEXT NOT NULL,
                    metadata_json TEXT,
                    status TEXT DEFAULT 'pending',
                    matched_path TEXT,
                    match_method TEXT,
                    similarity REAL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(history_file_id) REFERENCES virtualdj_history(id) ON DELETE CASCADE
                );
            `);

            db.exec(`
                CREATE TABLE IF NOT EXISTS history_missing (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    track_id INTEGER NOT NULL,
                    original_path TEXT NOT NULL,
                    candidate_paths TEXT,
                    selected_path TEXT,
                    similarity REAL,
                    status TEXT DEFAULT 'pending',
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(track_id) REFERENCES history_tracks(id) ON DELETE CASCADE
                );
            `);

            db.exec(`
                CREATE UNIQUE INDEX IF NOT EXISTS idx_history_missing_track_id
                ON history_missing(track_id);
            `);

            db.exec(`
                CREATE TABLE IF NOT EXISTS history_fix_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    track_id INTEGER NOT NULL,
                    previous_path TEXT,
                    new_path TEXT,
                    similarity REAL,
                    method TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(track_id) REFERENCES history_tracks(id)
                );
            `);
        } finally {
            db.close();
        }
    }
}

module.exports = HistoryDatabaseMigrations;
