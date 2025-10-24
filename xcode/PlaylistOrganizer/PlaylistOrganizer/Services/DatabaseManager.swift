//
//  DatabaseManager.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation
import SQLite

class DatabaseManager {
    private var db: Connection?
    
    init() {
        DebugLogger.shared.logDatabase("🚀 DatabaseManager başlatılıyor...")
        setupDatabase()
        DebugLogger.shared.logDatabase("✅ DatabaseManager başlatıldı - SQLite.swift aktif")
    }
    
    private func setupDatabase() {
        do {
            // Documents klasörüne database oluştur (sandbox uyumlu)
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
            let dbPath = documentsPath.appendingPathComponent("playlist_organizer_swiftui.db")
            db = try Connection(dbPath.path)
            DebugLogger.shared.logDatabase("✅ SQLite veritabanı bağlantısı kuruldu: \(dbPath.path)")
            createTables()
        } catch {
            DebugLogger.shared.logError(error, context: "SQLite veritabanı bağlantı hatası", category: "Database")
        }
    }
    
    private func createTables() {
        guard let db = db else { return }
        
        do {
            // Import Sessions Tablosu
            let importSessions = Table("import_sessions")
            let sessionId = Expression<Int>("id")
            let sessionPath = Expression<String>("path")
            let sessionTotalFiles = Expression<Int>("total_files")
            let sessionProcessedFiles = Expression<Int>("processed_files")
            let sessionAddedFiles = Expression<Int>("added_files")
            let sessionSkippedFiles = Expression<Int>("skipped_files")
            let sessionErrorFiles = Expression<Int>("error_files")
            let sessionCreatedAt = Expression<String>("created_at")
            let sessionUpdatedAt = Expression<String>("updated_at")
            
            try db.run(importSessions.create(ifNotExists: true) { t in
                t.column(sessionId, primaryKey: .autoincrement)
                t.column(sessionPath, defaultValue: "")
                t.column(sessionTotalFiles, defaultValue: 0)
                t.column(sessionProcessedFiles, defaultValue: 0)
                t.column(sessionAddedFiles, defaultValue: 0)
                t.column(sessionSkippedFiles, defaultValue: 0)
                t.column(sessionErrorFiles, defaultValue: 0)
                t.column(sessionCreatedAt, defaultValue: "")
                t.column(sessionUpdatedAt, defaultValue: "")
            })
            
            // Music Files Tablosu
            let musicFiles = Table("music_files")
            let musicId = Expression<Int>("id")
            let musicPath = Expression<String>("path")
            let musicFileName = Expression<String>("file_name")
            let musicFileNameOnly = Expression<String>("file_name_only")
            let musicNormalizedFileName = Expression<String>("normalized_file_name")
            let musicFileExtension = Expression<String>("file_extension")
            let musicFileSize = Expression<Int>("file_size")
            let musicCreatedAt = Expression<String>("created_at")
            
            try db.run(musicFiles.create(ifNotExists: true) { t in
                t.column(musicId, primaryKey: .autoincrement)
                t.column(musicPath)
                t.column(musicFileName)
                t.column(musicFileNameOnly)
                t.column(musicNormalizedFileName)
                t.column(musicFileExtension)
                t.column(musicFileSize, defaultValue: 0)
                t.column(musicCreatedAt, defaultValue: "")
            })
            
            // Word Index Tablosu
            let wordIndex = Table("word_index")
            let wordId = Expression<Int>("id")
            let wordWord = Expression<String>("word")
            let wordFileId = Expression<Int>("file_id")
            let wordType = Expression<String>("type")
            let wordCreatedAt = Expression<String>("created_at")
            
            try db.run(wordIndex.create(ifNotExists: true) { t in
                t.column(wordId, primaryKey: .autoincrement)
                t.column(wordWord)
                t.column(wordFileId)
                t.column(wordType)
                t.column(wordCreatedAt, defaultValue: "")
                
                // Foreign key constraint: word_index -> music_files
                t.foreignKey(wordFileId, references: musicFiles, musicId, delete: .cascade)
            })
            
            // Playlists Tablosu
            let playlists = Table("playlists")
            let playlistId = Expression<Int>("id")
            let playlistPath = Expression<String>("path")
            let playlistName = Expression<String>("name")
            let playlistType = Expression<String>("type")
            let playlistTrackCount = Expression<Int>("track_count")
            let playlistCreatedAt = Expression<String>("created_at")
            let playlistUpdatedAt = Expression<String>("updated_at")
            
            try db.run(playlists.create(ifNotExists: true) { t in
                t.column(playlistId, primaryKey: .autoincrement)
                t.column(playlistPath)
                t.column(playlistName)
                t.column(playlistType)
                t.column(playlistTrackCount, defaultValue: 0)
                t.column(playlistCreatedAt, defaultValue: "")
                t.column(playlistUpdatedAt, defaultValue: "")
            })
            
            // Tracks Tablosu
            let tracks = Table("tracks")
            let trackId = Expression<Int>("id")
            let trackPath = Expression<String>("path")
            let trackFileName = Expression<String>("file_name")
            let trackFileNameOnly = Expression<String>("file_name_only")
            let trackNormalizedFileName = Expression<String>("normalized_file_name")
            let trackMusicFileId = Expression<Int?>("music_file_id")
            let trackCreatedAt = Expression<String>("created_at")
            
            try db.run(tracks.create(ifNotExists: true) { t in
                t.column(trackId, primaryKey: .autoincrement)
                t.column(trackPath)
                t.column(trackFileName)
                t.column(trackFileNameOnly)
                t.column(trackNormalizedFileName)
                t.column(trackMusicFileId)
                t.column(trackCreatedAt, defaultValue: "")
                
                // Foreign key constraint: tracks -> music_files
                t.foreignKey(trackMusicFileId, references: musicFiles, musicId, delete: .cascade)
            })
            
            // Playlist Tracks İlişki Tablosu
            let playlistTracks = Table("playlist_tracks")
            let ptId = Expression<Int>("id")
            let ptPlaylistId = Expression<Int>("playlist_id")
            let ptTrackId = Expression<Int>("track_id")
            let ptCreatedAt = Expression<String>("created_at")
            
            try db.run(playlistTracks.create(ifNotExists: true) { t in
                t.column(ptId, primaryKey: .autoincrement)
                t.column(ptPlaylistId)
                t.column(ptTrackId)
                t.column(ptCreatedAt, defaultValue: "")
                
                // Foreign key constraints
                t.foreignKey(ptPlaylistId, references: playlists, playlistId, delete: .cascade)
                t.foreignKey(ptTrackId, references: tracks, trackId, delete: .cascade)
            })
            
            // Music Words Tablosu (WordIndexingService için)
            let musicWords = Table("music_words")
            let mwId = Expression<Int>("id")
            let mwMusicPath = Expression<String>("music_path")
            let mwWord = Expression<String>("word")
            let mwCreatedAt = Expression<String>("created_at")
            
            try db.run(musicWords.create(ifNotExists: true) { t in
                t.column(mwId, primaryKey: .autoincrement)
                t.column(mwMusicPath)
                t.column(mwWord)
                t.column(mwCreatedAt, defaultValue: "")
            })
            
            // Index'ler ekle (Performance için)
            try db.run("CREATE INDEX IF NOT EXISTS idx_word_index_word ON word_index(word)")
            try db.run("CREATE INDEX IF NOT EXISTS idx_word_index_file_id ON word_index(file_id)")
            try db.run("CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path)")
            try db.run("CREATE INDEX IF NOT EXISTS idx_music_files_path ON music_files(path)")
            try db.run("CREATE INDEX IF NOT EXISTS idx_playlists_name ON playlists(name)")
            try db.run("CREATE INDEX IF NOT EXISTS idx_music_words_word ON music_words(word)")
            try db.run("CREATE INDEX IF NOT EXISTS idx_music_words_path ON music_words(music_path)")
            
            // Unique constraint'ler ekle (Data integrity için)
            try db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_music_files_path_unique ON music_files(path)")
            try db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_path_unique ON tracks(path)")
            try db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_playlists_path_unique ON playlists(path)")
            
            DebugLogger.shared.logDatabase("✅ SQLite tabloları oluşturuldu")
            DebugLogger.shared.logDatabase("✅ Foreign key constraint'ler eklendi")
            DebugLogger.shared.logDatabase("✅ Index'ler eklendi")
            DebugLogger.shared.logDatabase("✅ Unique constraint'ler eklendi")
        } catch {
            DebugLogger.shared.logError(error, context: "SQLite tablo oluşturma hatası", category: "Database")
        }
    }
    
    // MARK: - Public Methods
    
    func getConnection() -> Connection? {
        return db
    }
    
    func testConnection() -> Bool {
        guard let db = db else {
            DebugLogger.shared.logDatabase("❌ DatabaseManager test başarısız - bağlantı yok")
            return false
        }
        
        do {
            let count = try db.scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table'") as! Int64
            DebugLogger.shared.logDatabase("✅ DatabaseManager test başarılı - \(count) tablo bulundu")
            return true
        } catch {
            DebugLogger.shared.logError(error, context: "DatabaseManager test başarısız", category: "Database")
            return false
        }
    }
    
    func closeConnection() {
        db = nil
        DebugLogger.shared.logDatabase("🔄 DatabaseManager bağlantısı kapatıldı")
    }
}