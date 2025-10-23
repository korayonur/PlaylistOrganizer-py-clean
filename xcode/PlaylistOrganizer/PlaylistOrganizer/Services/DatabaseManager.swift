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
        setupDatabase()
        print("✅ DatabaseManager başlatıldı - SQLite.swift aktif")
    }
    
    private func setupDatabase() {
        do {
            // Documents klasörüne database oluştur (sandbox uyumlu)
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
            let dbPath = documentsPath.appendingPathComponent("playlist_organizer_swiftui.db")
            db = try Connection(dbPath.path)
            print("✅ SQLite veritabanı bağlantısı kuruldu: \(dbPath.path)")
            createTables()
        } catch {
            print("❌ SQLite veritabanı bağlantı hatası: \(error)")
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
            let trackPlaylistId = Expression<Int?>("playlist_id")
            let trackCreatedAt = Expression<String>("created_at")
            
            try db.run(tracks.create(ifNotExists: true) { t in
                t.column(trackId, primaryKey: .autoincrement)
                t.column(trackPath)
                t.column(trackFileName)
                t.column(trackFileNameOnly)
                t.column(trackNormalizedFileName)
                t.column(trackPlaylistId)
                t.column(trackCreatedAt, defaultValue: "")
            })
            
            print("✅ SQLite tabloları oluşturuldu")
        } catch {
            print("❌ SQLite tablo oluşturma hatası: \(error)")
        }
    }
    
    // MARK: - Public Methods
    
    func getConnection() -> Connection? {
        return db
    }
    
    func testConnection() -> Bool {
        guard let db = db else {
            print("❌ DatabaseManager test başarısız - bağlantı yok")
            return false
        }
        
        do {
            let count = try db.scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table'") as! Int64
            print("✅ DatabaseManager test başarılı - \(count) tablo bulundu")
            return true
        } catch {
            print("❌ DatabaseManager test başarısız: \(error)")
            return false
        }
    }
    
    func closeConnection() {
        db = nil
        print("🔄 DatabaseManager bağlantısı kapatıldı")
    }
}