#!/usr/bin/env swift

import Foundation
import SQLite

// MARK: - Import Test Console Application
print("🚀 PlaylistOrganizer Import Test Console Başlıyor...")
print("=" * 60)

// MARK: - Database Setup
let projectPath = "/Users/koray/projects/PlaylistOrganizer-py-backup"
let dbPath = "\(projectPath)/playlist_organizer_swiftui.db"

print("📁 Database Path: \(dbPath)")

// Database bağlantısı kur
var db: Connection?
do {
    db = try Connection(dbPath)
    print("✅ Database bağlantısı kuruldu")
} catch {
    print("❌ Database bağlantı hatası: \(error)")
    exit(1)
}

// MARK: - Test Tables Creation
func createTestTables() throws {
    guard let db = db else { throw NSError(domain: "DatabaseError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Database connection not available"]) }
    
    // Import sessions tablosu
    let importSessions = Table("import_sessions")
    let sessionId = Expression<Int>("id")
    let sessionTotalFiles = Expression<Int>("total_files")
    let sessionProcessedFiles = Expression<Int>("processed_files")
    let sessionAddedFiles = Expression<Int>("added_files")
    let sessionSkippedFiles = Expression<Int>("skipped_files")
    let sessionErrorFiles = Expression<Int>("error_files")
    let sessionCreatedAt = Expression<String>("created_at")
    let sessionUpdatedAt = Expression<String>("updated_at")
    
    try db.run(importSessions.create(ifNotExists: true) { t in
        t.column(sessionId, primaryKey: .autoincrement)
        t.column(sessionTotalFiles, defaultValue: 0)
        t.column(sessionProcessedFiles, defaultValue: 0)
        t.column(sessionAddedFiles, defaultValue: 0)
        t.column(sessionSkippedFiles, defaultValue: 0)
        t.column(sessionErrorFiles, defaultValue: 0)
        t.column(sessionCreatedAt, defaultValue: "")
        t.column(sessionUpdatedAt, defaultValue: "")
    })
    
    // Temp music files tablosu
    let tempMusicFiles = Table("temp_music_files")
    let tempId = Expression<Int>("id")
    let tempPath = Expression<String>("path")
    let tempFileName = Expression<String>("file_name")
    let tempFileNameOnly = Expression<String>("file_name_only")
    let tempNormalizedFileName = Expression<String>("normalized_file_name")
    let tempFileExtension = Expression<String>("file_extension")
    let tempFileSize = Expression<Int64>("file_size")
    let tempCreatedAt = Expression<String>("created_at")
    
    try db.run(tempMusicFiles.create(ifNotExists: true) { t in
        t.column(tempId, primaryKey: .autoincrement)
        t.column(tempPath)
        t.column(tempFileName)
        t.column(tempFileNameOnly)
        t.column(tempNormalizedFileName)
        t.column(tempFileExtension)
        t.column(tempFileSize, defaultValue: 0)
        t.column(tempCreatedAt, defaultValue: "")
    })
    
    // Word index tablosu
    let wordIndex = Table("word_index")
    let wordId = Expression<Int>("id")
    let wordWord = Expression<String>("word")
    let wordFileId = Expression<Int>("file_id")
    let wordType = Expression<String>("type") // "music_file" or "track"
    let wordCreatedAt = Expression<String>("created_at")
    
    try db.run(wordIndex.create(ifNotExists: true) { t in
        t.column(wordId, primaryKey: .autoincrement)
        t.column(wordWord)
        t.column(wordFileId)
        t.column(wordType)
        t.column(wordCreatedAt, defaultValue: "")
    })
    
    print("✅ Test tabloları oluşturuldu")
}

// MARK: - Test Data Creation
func createTestData() throws {
    guard let db = db else { throw NSError(domain: "DatabaseError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Database connection not available"]) }
    
    let now = ISO8601DateFormatter().string(from: Date())
    
    // Test session oluştur
    let importSessions = Table("import_sessions")
    let sessionId = Expression<Int>("id")
    let sessionTotalFiles = Expression<Int>("total_files")
    let sessionProcessedFiles = Expression<Int>("processed_files")
    let sessionAddedFiles = Expression<Int>("added_files")
    let sessionSkippedFiles = Expression<Int>("skipped_files")
    let sessionErrorFiles = Expression<Int>("error_files")
    let sessionCreatedAt = Expression<String>("created_at")
    let sessionUpdatedAt = Expression<String>("updated_at")
    
    let insertSession = importSessions.insert(
        sessionTotalFiles <- 0,
        sessionProcessedFiles <- 0,
        sessionAddedFiles <- 0,
        sessionSkippedFiles <- 0,
        sessionErrorFiles <- 0,
        sessionCreatedAt <- now,
        sessionUpdatedAt <- now
    )
    
    let sessionIdResult = try db.run(insertSession)
    print("✅ Test session oluşturuldu: ID=\(sessionIdResult)")
    
    // Test music files oluştur
    let tempMusicFiles = Table("temp_music_files")
    let tempPath = Expression<String>("path")
    let tempFileName = Expression<String>("file_name")
    let tempFileNameOnly = Expression<String>("file_name_only")
    let tempNormalizedFileName = Expression<String>("normalized_file_name")
    let tempFileExtension = Expression<String>("file_extension")
    let tempFileSize = Expression<Int64>("file_size")
    let tempCreatedAt = Expression<String>("created_at")
    
    let testFiles = [
        ("/Users/koray/Music/test1.mp3", "test1.mp3", "test1", "test1", "mp3", 1024000),
        ("/Users/koray/Music/test2.m4a", "test2.m4a", "test2", "test2", "m4a", 2048000),
        ("/Users/koray/Music/test3.wav", "test3.wav", "test3", "test3", "wav", 3072000)
    ]
    
    for (path, fileName, fileNameOnly, normalizedFileName, fileExtension, fileSize) in testFiles {
        let insertFile = tempMusicFiles.insert(
            tempPath <- path,
            tempFileName <- fileName,
            tempFileNameOnly <- fileNameOnly,
            tempNormalizedFileName <- normalizedFileName,
            tempFileExtension <- fileExtension,
            tempFileSize <- fileSize,
            tempCreatedAt <- now
        )
        
        let fileId = try db.run(insertFile)
        print("✅ Test dosya oluşturuldu: \(fileName) (ID=\(fileId))")
    }
}

// MARK: - Test Data Verification
func verifyTestData() throws {
    guard let db = db else { throw NSError(domain: "DatabaseError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Database connection not available"]) }
    
    // Session sayısını kontrol et
    let importSessions = Table("import_sessions")
    let sessionCount = try db.scalar(importSessions.count)
    print("📊 Import sessions: \(sessionCount)")
    
    // Music files sayısını kontrol et
    let tempMusicFiles = Table("temp_music_files")
    let filesCount = try db.scalar(tempMusicFiles.count)
    print("📊 Temp music files: \(filesCount)")
    
    // Word index sayısını kontrol et
    let wordIndex = Table("word_index")
    let wordsCount = try db.scalar(wordIndex.count)
    print("📊 Word index entries: \(wordsCount)")
}

// MARK: - Test Execution
do {
    print("\n🔧 Test tabloları oluşturuluyor...")
    try createTestTables()
    
    print("\n📝 Test verisi oluşturuluyor...")
    try createTestData()
    
    print("\n🔍 Test verisi doğrulanıyor...")
    try verifyTestData()
    
    print("\n✅ Import Test Console Başarılı!")
    print("=" * 60)
    
} catch {
    print("\n❌ Import Test Console Hatası: \(error)")
    print("=" * 60)
    exit(1)
}

// MARK: - Database Cleanup
db = nil
print("🔄 Database bağlantısı kapatıldı")
print("🎯 Test tamamlandı!")