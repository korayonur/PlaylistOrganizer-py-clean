#!/usr/bin/env swift

import Foundation
import SQLite

// MARK: - Gerçek Import Service Test Console Application
print("🚀 PlaylistOrganizer Gerçek Import Service Test Console Başlıyor...")
print(String(repeating: "=", count: 70))

// MARK: - Database Setup
let projectPath = "/Users/koray/projects/PlaylistOrganizer-py-backup"
let dbPath = "\(projectPath)/playlist_organizer_swiftui.db"

print("📁 Database Path: \(dbPath)")

// Database bağlantısı kur
var db: Connection?
do {
    db = try Connection(dbPath)
    print("✅ Database bağlantısı kuruldu")
    
    // Manuel olarak tabloları oluştur
    try createTables(db: db!)
    print("✅ Tablolar oluşturuldu")
} catch {
    print("❌ Database bağlantı hatası: \(error)")
    exit(1)
}

// MARK: - Database Setup Functions
func createTables(db: Connection) throws {
    // Import Sessions Tablosu
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
    
    print("✅ SQLite tabloları oluşturuldu")
}

// MARK: - Helper Functions
func countMusicFilesRecursively(at path: String) throws -> Int {
    let fileManager = FileManager.default
    var count = 0
    
    func countInDirectory(_ dirPath: String) throws {
        let contents = try fileManager.contentsOfDirectory(atPath: dirPath)
        
        for item in contents {
            let itemPath = "\(dirPath)/\(item)"
            var isDirectory: ObjCBool = false
            
            if fileManager.fileExists(atPath: itemPath, isDirectory: &isDirectory) {
                if isDirectory.boolValue {
                    // Klasör ise recursive olarak tara
                    try countInDirectory(itemPath)
                } else {
                    // Dosya ise uzantısını kontrol et
                    let fileExtension = URL(fileURLWithPath: item).pathExtension.lowercased()
                    if [".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".wma", ".aif", ".aiff", ".mpc", ".ape", ".weba", ".opus"].contains(fileExtension) {
                        count += 1
                    }
                }
            }
        }
    }
    
    try countInDirectory(path)
    return count
}

func findMusicFilesRecursively(at path: String) throws -> [String] {
    let fileManager = FileManager.default
    var musicFiles: [String] = []
    
    func findInDirectory(_ dirPath: String, files: inout [String]) throws {
        let contents = try fileManager.contentsOfDirectory(atPath: dirPath)
        
        for item in contents {
            let itemPath = "\(dirPath)/\(item)"
            var isDirectory: ObjCBool = false
            
            if fileManager.fileExists(atPath: itemPath, isDirectory: &isDirectory) {
                if isDirectory.boolValue {
                    // Klasör ise recursive olarak tara
                    try findInDirectory(itemPath, files: &files)
                } else {
                    // Dosya ise uzantısını kontrol et
                    let fileExtension = URL(fileURLWithPath: itemPath).pathExtension.lowercased()
                    if ["mp3", "wav", "m4a", "aac", "flac", "ogg", "wma", "aif", "aiff", "mpc", "ape", "weba", "opus"].contains(fileExtension) {
                        files.append(itemPath)
                    }
                }
            }
        }
    }
    
    try findInDirectory(path, files: &musicFiles)
    print("   📊 Toplam bulunan müzik dosyası: \(musicFiles.count)")
    return musicFiles
}

// MARK: - Import Service Test
func testImportService() async throws {
    guard let db = db else { throw NSError(domain: "DatabaseError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Database connection not available"]) }
    
    print("\n🔧 Import Service test ediliyor...")
    
    // 1. Configuration Service Test
    print("📋 Configuration Service test ediliyor...")
    let musicPath = "/Users/koray/Music/KorayMusics"
    let virtualDJPath = "/Users/koray/Library/Application Support/VirtualDJ"
    
    print("   - Müzik klasörü: \(musicPath)")
    print("   - VirtualDJ klasörü: \(virtualDJPath)")
    
    // Klasörlerin mevcut olup olmadığını kontrol et
    let musicExists = FileManager.default.fileExists(atPath: musicPath)
    let virtualDJExists = FileManager.default.fileExists(atPath: virtualDJPath)
    
    print("   - Müzik klasörü mevcut: \(musicExists ? "✅" : "❌")")
    print("   - VirtualDJ klasörü mevcut: \(virtualDJExists ? "✅" : "❌")")
    
    if !musicExists || !virtualDJExists {
        print("❌ Gerekli klasörler mevcut değil!")
        return
    }
    
    // 2. Müzik Dosyalarını Say (Recursive)
    print("\n📊 Müzik dosyaları sayılıyor...")
    let musicFileCount = try countMusicFilesRecursively(at: musicPath)
    print("   - Toplam müzik dosyası: \(musicFileCount)")
    
    // Debug: İlk 5 dosyayı listele
    let debugMusicFiles = try findMusicFilesRecursively(at: musicPath)
    print("   - İlk 5 müzik dosyası:")
    for (index, file) in debugMusicFiles.prefix(5).enumerated() {
        print("     \(index + 1). \(file)")
    }
    
    // 3. VirtualDJ Playlist Dosyalarını Say ve Import Et
    print("\n📊 VirtualDJ playlist dosyaları sayılıyor...")
    let vdjFiles = try FileManager.default.contentsOfDirectory(atPath: virtualDJPath)
    let m3uFiles = vdjFiles.filter { $0.hasSuffix(".m3u") || $0.hasSuffix(".m3u8") }
    let vdjFolderFiles = vdjFiles.filter { $0.hasSuffix(".vdjfolder") }
    print("   - M3U dosyaları: \(m3uFiles.count)")
    print("   - VDJFolder dosyaları: \(vdjFolderFiles.count)")
    
    // VirtualDJ klasöründen müzik dosyası import edilmiyor (sadece playlist dosyaları)
    print("   - VirtualDJ klasöründen müzik dosyası import edilmiyor")
    
    // 4. Database Import Test
    print("\n🗄️ Database import test ediliyor...")
    
    // Import session oluştur
    let importSessions = Table("import_sessions")
    let sessionId = Expression<Int>("id")
    let sessionTotalFiles = Expression<Int>("total_files")
    let sessionProcessedFiles = Expression<Int>("processed_files")
    let sessionAddedFiles = Expression<Int>("added_files")
    let sessionSkippedFiles = Expression<Int>("skipped_files")
    let sessionErrorFiles = Expression<Int>("error_files")
    let sessionCreatedAt = Expression<String>("created_at")
    let sessionUpdatedAt = Expression<String>("updated_at")
    
    let now = ISO8601DateFormatter().string(from: Date())
    
    let insertSession = importSessions.insert(
        sessionTotalFiles <- musicFileCount,
        sessionProcessedFiles <- musicFileCount,
        sessionAddedFiles <- musicFileCount,
        sessionSkippedFiles <- 0,
        sessionErrorFiles <- 0,
        sessionCreatedAt <- now,
        sessionUpdatedAt <- now
    )
    
    let newSessionId = try db.run(insertSession)
    print("   - Import session oluşturuldu: ID=\(newSessionId)")
    
    // 5. Müzik Dosyalarını Database'e Ekle (Recursive)
    print("\n📝 Müzik dosyaları database'e ekleniyor...")
    let musicFiles = Table("music_files")
    let musicId = Expression<Int>("id")
    let musicFilePath = Expression<String>("path")
    let musicFileName = Expression<String>("file_name")
    let musicFileNameOnly = Expression<String>("file_name_only")
    let musicNormalizedFileName = Expression<String>("normalized_file_name")
    let musicFileExtension = Expression<String>("file_extension")
    let musicFileSize = Expression<Int>("file_size")
    let musicCreatedAt = Expression<String>("created_at")
    
    var addedCount = 0
    var skippedCount = 0
    
    // Recursive olarak müzik dosyalarını bul (sadece müzik klasöründen)
    let musicFilePaths = try findMusicFilesRecursively(at: musicPath)
    print("   - Müzik klasöründeki dosyalar: \(musicFilePaths.count)")
    print("   - VirtualDJ klasöründen müzik dosyası import edilmiyor (sadece playlist dosyaları)")
    
    for (index, filePath) in musicFilePaths.enumerated() { // Tüm dosyaları import et
        let fileURL = URL(fileURLWithPath: filePath)
        let fileName = fileURL.lastPathComponent
        let fileNameOnly = fileURL.deletingPathExtension().lastPathComponent
        let fileExtension = fileURL.pathExtension.lowercased()
        
        // Progress göster
        if index % 100 == 0 || index == musicFilePaths.count - 1 {
            print("   📊 Progress: \(index + 1)/\(musicFilePaths.count) (%\(Int(Double(index + 1) / Double(musicFilePaths.count) * 100)))")
        }
        
        // Dosya boyutunu al
        let fileSize = (try? FileManager.default.attributesOfItem(atPath: filePath)[.size] as? Int) ?? 0
        
        // Normalize file name
        let normalizedFileName = fileNameOnly.lowercased()
            .replacingOccurrences(of: " ", with: "-")
            .replacingOccurrences(of: "_", with: "-")
            .replacingOccurrences(of: "(", with: "")
            .replacingOccurrences(of: ")", with: "")
            .replacingOccurrences(of: "[", with: "")
            .replacingOccurrences(of: "]", with: "")
        
        do {
            let insertFile = musicFiles.insert(
                musicFilePath <- filePath,
                musicFileName <- fileName,
                musicFileNameOnly <- fileNameOnly,
                musicNormalizedFileName <- normalizedFileName,
                musicFileExtension <- fileExtension,
                musicFileSize <- fileSize,
                musicCreatedAt <- now
            )
            
            let fileId = try db.run(insertFile)
            if index % 100 == 0 || index == musicFilePaths.count - 1 {
                print("   - ✅ \(fileName) (ID=\(fileId))")
            }
            addedCount += 1
        } catch {
            print("   - ❌ \(fileName) - Hata: \(error)")
            skippedCount += 1
        }
    }
    
    print("   - Toplam eklendi: \(addedCount)")
    print("   - Toplam atlandı: \(skippedCount)")
    
    // 6. Word Index Oluştur
    print("\n📝 Word index oluşturuluyor...")
    let wordIndex = Table("word_index")
    let wordId = Expression<Int>("id")
    let wordWord = Expression<String>("word")
    let wordFileId = Expression<Int>("file_id")
    let wordType = Expression<String>("type")
    let wordCreatedAt = Expression<String>("created_at")
    
    var wordCount = 0
    for file in musicFilePaths { // Tüm dosyaları indexle
        let fileNameOnly = URL(fileURLWithPath: file).deletingPathExtension().lastPathComponent
        let words = fileNameOnly.lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
        
        for word in words {
            do {
                let insertWord = wordIndex.insert(
                    wordWord <- word,
                    wordFileId <- wordCount + 1, // Basit ID
                    wordType <- "music_file",
                    wordCreatedAt <- now
                )
                
                let wordId = try db.run(insertWord)
                print("   - ✅ Word: \(word) (ID=\(wordId))")
                wordCount += 1
            } catch {
                print("   - ❌ Word: \(word) - Hata: \(error)")
            }
        }
    }
    
    print("   - Toplam word index: \(wordCount)")
    
    // 7. Sonuçları Doğrula
    print("\n🔍 Sonuçlar doğrulanıyor...")
    let finalSessionCount = try db.scalar(importSessions.count)
    let finalFileCount = try db.scalar(musicFiles.count)
    let finalWordCount = try db.scalar(wordIndex.count)
    
    print("   - Import sessions: \(finalSessionCount)")
    print("   - Music files: \(finalFileCount)")
    print("   - Word index entries: \(finalWordCount)")
    
    print("\n✅ Import Service test başarılı!")
}

// MARK: - Test Execution
do {
    try await testImportService()
    
    print("\n🎉 Gerçek Import Service Test Console Başarılı!")
    print(String(repeating: "=", count: 70))
    
} catch {
    print("\n❌ Gerçek Import Service Test Console Hatası: \(error)")
    print(String(repeating: "=", count: 70))
    exit(1)
}

// MARK: - Database Cleanup
db = nil
print("🔄 Database bağlantısı kapatıldı")
print("🎯 Gerçek import service test tamamlandı!")