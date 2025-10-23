//
//  DatabaseImportServiceTests.swift
//  PlaylistOrganizerTests
//
//  Created by Koray Önür on 23.10.2025.
//

import XCTest
import SQLite
@testable import PlaylistOrganizer

final class DatabaseImportServiceTests: XCTestCase {
    
    // MARK: - Properties
    
    private var databaseManager: DatabaseManager!
    private var databaseImportService: DatabaseImportService!
    private var testDbPath: String!
    
    // MARK: - Setup & Teardown
    
    override func setUpWithError() throws {
        // Test database oluştur
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        testDbPath = documentsPath.appendingPathComponent("test_playlist_organizer.db").path
        
        // Eski test database'i sil
        try? FileManager.default.removeItem(atPath: testDbPath)
        
        // DatabaseManager oluştur
        databaseManager = DatabaseManager()
        
        // Test database'e bağlan
        if let db = databaseManager.getConnection() {
            // Test tabloları oluştur
            try createTestTables(db: db)
            
            // Test data ekle
            try addTestData(db: db)
        }
        
        // DatabaseImportService oluştur
        databaseImportService = DatabaseImportService(databaseManager: databaseManager)
    }
    
    override func tearDownWithError() throws {
        // Test database'i temizle
        try? FileManager.default.removeItem(atPath: testDbPath)
        
        databaseManager = nil
        databaseImportService = nil
        testDbPath = nil
    }
    
    // MARK: - Test Methods
    
    func testClearImportTables() async throws {
        // Given: Test data ile dolu database
        
        // When: clearImportTables() çağır
        try await databaseImportService.clearImportTables()
        
        // Then: Tüm tablolar temizlenmiş olmalı
        guard let db = databaseManager.getConnection() else {
            XCTFail("Database connection failed")
            return
        }
        
        // Tabloların boş olduğunu kontrol et
        let playlistsCount = try db.scalar("SELECT COUNT(*) FROM playlists") as! Int64
        let tracksCount = try db.scalar("SELECT COUNT(*) FROM tracks") as! Int64
        let musicFilesCount = try db.scalar("SELECT COUNT(*) FROM music_files") as! Int64
        let playlistTracksCount = try db.scalar("SELECT COUNT(*) FROM playlist_tracks") as! Int64
        let trackWordsCount = try db.scalar("SELECT COUNT(*) FROM track_words") as! Int64
        let musicWordsCount = try db.scalar("SELECT COUNT(*) FROM music_words") as! Int64
        let importSessionsCount = try db.scalar("SELECT COUNT(*) FROM import_sessions") as! Int64
        
        XCTAssertEqual(playlistsCount, 0, "Playlists table should be empty")
        XCTAssertEqual(tracksCount, 0, "Tracks table should be empty")
        XCTAssertEqual(musicFilesCount, 0, "Music files table should be empty")
        XCTAssertEqual(playlistTracksCount, 0, "Playlist tracks table should be empty")
        XCTAssertEqual(trackWordsCount, 0, "Track words table should be empty")
        XCTAssertEqual(musicWordsCount, 0, "Music words table should be empty")
        XCTAssertEqual(importSessionsCount, 0, "Import sessions table should be empty")
    }
    
    func testClearImportTablesWithForeignKeys() async throws {
        // Given: Foreign key constraint'leri olan test data
        
        // When: clearImportTables() çağır
        try await databaseImportService.clearImportTables()
        
        // Then: Foreign key constraint'leri çalışmalı
        guard let db = databaseManager.getConnection() else {
            XCTFail("Database connection failed")
            return
        }
        
        // Foreign key durumunu kontrol et
        let foreignKeysStatus = try db.scalar("PRAGMA foreign_keys") as! Int64
        XCTAssertEqual(foreignKeysStatus, 1, "Foreign keys should be enabled after clearImportTables")
    }
    
    func testClearImportTablesErrorHandling() async throws {
        // Given: Geçersiz database connection
        let invalidDatabaseManager = DatabaseManager()
        let invalidService = DatabaseImportService(databaseManager: invalidDatabaseManager)
        
        // When & Then: Error fırlatmalı
        do {
            try await invalidService.clearImportTables()
            XCTFail("Should throw error for invalid database connection")
        } catch {
            XCTAssertTrue(error is DatabaseError)
        }
    }
    
    // MARK: - Helper Methods
    
    private func createTestTables(db: Connection) throws {
        // Playlists tablosu
        let playlists = Table("playlists")
        let playlistId = Expression<Int>("id")
        let playlistPath = Expression<String>("path")
        let playlistName = Expression<String>("name")
        let playlistType = Expression<String>("type")
        let playlistTrackCount = Expression<Int>("track_count")
        let playlistCreatedAt = Expression<String>("created_at")
        let playlistUpdatedAt = Expression<String>("updated_at")
        
        try db.run(playlists.create(ifNotExists: true) { t in
            t.column(playlistId, primaryKey: true)
            t.column(playlistPath)
            t.column(playlistName)
            t.column(playlistType)
            t.column(playlistTrackCount, defaultValue: 0)
            t.column(playlistCreatedAt)
            t.column(playlistUpdatedAt)
        })
        
        // Tracks tablosu
        let tracks = Table("tracks")
        let trackId = Expression<Int>("id")
        let trackPath = Expression<String>("path")
        let trackFileName = Expression<String>("fileName")
        let trackFileNameOnly = Expression<String>("fileNameOnly")
        let trackNormalizedFileName = Expression<String>("normalizedFileName")
        let trackCreatedAt = Expression<String>("createdAt")
        
        try db.run(tracks.create(ifNotExists: true) { t in
            t.column(trackId, primaryKey: true)
            t.column(trackPath, unique: true)
            t.column(trackFileName)
            t.column(trackFileNameOnly)
            t.column(trackNormalizedFileName)
            t.column(trackCreatedAt)
        })
        
        // Music files tablosu
        let musicFiles = Table("music_files")
        let musicFileId = Expression<Int>("id")
        let musicFilePath = Expression<String>("path")
        let musicFileName = Expression<String>("fileName")
        let musicFileNameOnly = Expression<String>("fileNameOnly")
        let musicNormalizedFileName = Expression<String>("normalizedFileName")
        let musicExtension = Expression<String?>("extension")
        let musicSize = Expression<Int64?>("size")
        let musicModifiedTime = Expression<Int64?>("modifiedTime")
        let musicCreatedAt = Expression<String>("created_at")
        
        try db.run(musicFiles.create(ifNotExists: true) { t in
            t.column(musicFileId, primaryKey: true)
            t.column(musicFilePath, unique: true)
            t.column(musicFileName)
            t.column(musicFileNameOnly)
            t.column(musicNormalizedFileName)
            t.column(musicExtension)
            t.column(musicSize)
            t.column(musicModifiedTime)
            t.column(musicCreatedAt)
        })
        
        // Playlist tracks tablosu
        let playlistTracks = Table("playlist_tracks")
        let playlistTrackId = Expression<Int>("id")
        let playlistTrackPlaylistId = Expression<Int>("playlist_id")
        let playlistTrackTrackId = Expression<Int>("track_id")
        let playlistTrackOrder = Expression<Int>("track_order")
        let playlistTrackCreatedAt = Expression<String>("created_at")
        
        try db.run(playlistTracks.create(ifNotExists: true) { t in
            t.column(playlistTrackId, primaryKey: true)
            t.column(playlistTrackPlaylistId)
            t.column(playlistTrackTrackId)
            t.column(playlistTrackOrder)
            t.column(playlistTrackCreatedAt)
            
            t.foreignKey(playlistTrackPlaylistId, references: playlists, playlistId)
            t.foreignKey(playlistTrackTrackId, references: tracks, trackId)
        })
        
        // Track words tablosu
        let trackWords = Table("track_words")
        let trackWordId = Expression<Int>("id")
        let trackWordTrackPath = Expression<String>("track_path")
        let trackWordWord = Expression<String>("word")
        let trackWordSource = Expression<String>("source")
        let trackWordSourceFile = Expression<String>("source_file")
        let trackWordCreatedAt = Expression<String>("created_at")
        
        try db.run(trackWords.create(ifNotExists: true) { t in
            t.column(trackWordId, primaryKey: true)
            t.column(trackWordTrackPath)
            t.column(trackWordWord)
            t.column(trackWordSource)
            t.column(trackWordSourceFile)
            t.column(trackWordCreatedAt)
        })
        
        // Music words tablosu
        let musicWords = Table("music_words")
        let musicWordId = Expression<Int>("id")
        let musicWordMusicPath = Expression<String>("music_path")
        let musicWordWord = Expression<String>("word")
        let musicWordCreatedAt = Expression<String>("created_at")
        
        try db.run(musicWords.create(ifNotExists: true) { t in
            t.column(musicWordId, primaryKey: true)
            t.column(musicWordMusicPath)
            t.column(musicWordWord)
            t.column(musicWordCreatedAt)
        })
        
        // Import sessions tablosu
        let importSessions = Table("import_sessions")
        let importSessionId = Expression<Int>("id")
        let importSessionPath = Expression<String>("path")
        let importSessionTotalFiles = Expression<Int>("total_files")
        let importSessionProcessedFiles = Expression<Int>("processed_files")
        let importSessionAddedFiles = Expression<Int>("added_files")
        let importSessionSkippedFiles = Expression<Int>("skipped_files")
        let importSessionErrorFiles = Expression<Int>("error_files")
        let importSessionCreatedAt = Expression<String>("created_at")
        let importSessionUpdatedAt = Expression<String>("updated_at")
        
        try db.run(importSessions.create(ifNotExists: true) { t in
            t.column(importSessionId, primaryKey: true)
            t.column(importSessionPath)
            t.column(importSessionTotalFiles)
            t.column(importSessionProcessedFiles, defaultValue: 0)
            t.column(importSessionAddedFiles, defaultValue: 0)
            t.column(importSessionSkippedFiles, defaultValue: 0)
            t.column(importSessionErrorFiles, defaultValue: 0)
            t.column(importSessionCreatedAt)
            t.column(importSessionUpdatedAt)
        })
    }
    
    private func addTestData(db: Connection) throws {
        let now = ISO8601DateFormatter().string(from: Date())
        
        // Test playlists ekle
        try db.run("""
            INSERT INTO playlists (path, name, type, track_count, created_at, updated_at)
            VALUES ('/test/playlist1.m3u', 'Test Playlist 1', 'm3u', 2, '\(now)', '\(now)')
        """)
        
        try db.run("""
            INSERT INTO playlists (path, name, type, track_count, created_at, updated_at)
            VALUES ('/test/playlist2.vdjfolder', 'Test Playlist 2', 'vdjfolder', 1, '\(now)', '\(now)')
        """)
        
        // Test tracks ekle
        try db.run("""
            INSERT INTO tracks (path, fileName, fileNameOnly, normalizedFileName, createdAt)
            VALUES ('/test/track1.mp3', 'track1.mp3', 'track1', 'track1', '\(now)')
        """)
        
        try db.run("""
            INSERT INTO tracks (path, fileName, fileNameOnly, normalizedFileName, createdAt)
            VALUES ('/test/track2.mp3', 'track2.mp3', 'track2', 'track2', '\(now)')
        """)
        
        // Test music files ekle
        try db.run("""
            INSERT INTO music_files (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime, created_at)
            VALUES ('/test/music1.mp3', 'music1.mp3', 'music1', 'music1', 'mp3', 1024, 1234567890, '\(now)')
        """)
        
        // Test playlist tracks ekle
        try db.run("""
            INSERT INTO playlist_tracks (playlist_id, track_id, track_order, created_at)
            VALUES (1, 1, 1, '\(now)')
        """)
        
        try db.run("""
            INSERT INTO playlist_tracks (playlist_id, track_id, track_order, created_at)
            VALUES (1, 2, 2, '\(now)')
        """)
        
        // Test track words ekle
        try db.run("""
            INSERT INTO track_words (track_path, word, source, source_file, created_at)
            VALUES ('/test/track1.mp3', 'track1', 'm3u', '/test/playlist1.m3u', '\(now)')
        """)
        
        // Test music words ekle
        try db.run("""
            INSERT INTO music_words (music_path, word, created_at)
            VALUES ('/test/music1.mp3', 'music1', '\(now)')
        """)
        
        // Test import sessions ekle
        try db.run("""
            INSERT INTO import_sessions (path, total_files, processed_files, added_files, skipped_files, error_files, created_at, updated_at)
            VALUES ('import:/test', 10, 8, 6, 2, 0, '\(now)', '\(now)')
        """)
    }
}
