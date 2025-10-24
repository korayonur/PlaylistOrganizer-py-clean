//
//  DatabaseImportService.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 23.10.2025.
//

import Foundation
import SQLite

/// Database import operations service
/// Handles all database operations for import process
class DatabaseImportService {
    
    // MARK: - Properties
    
    private let databaseManager: DatabaseManager
    
    // MARK: - Initialization
    
    init(databaseManager: DatabaseManager) {
        self.databaseManager = databaseManager
    }
    
    // MARK: - Public Methods
    
    /// Clear all import-related tables before import
    /// - Throws: Database operation errors
    func clearImportTables() async throws {
        guard let db = databaseManager.getConnection() else {
            throw DatabaseError.connectionFailed
        }
        
        do {
            // Foreign keys kapat
            try db.run("PRAGMA foreign_keys = OFF")
            DebugLogger.shared.logDatabase("🔓 Foreign keys kapatıldı")
            
            // İlişki tablosunu temizle
            try db.run("DELETE FROM playlist_tracks")
            DebugLogger.shared.logDatabase("✅ playlist_tracks temizlendi")
            
            // Ana tabloları temizle
            try db.run("DELETE FROM playlists")
            DebugLogger.shared.logDatabase("✅ playlists temizlendi")
            
            try db.run("DELETE FROM tracks")
            DebugLogger.shared.logDatabase("✅ tracks temizlendi")
            
            try db.run("DELETE FROM music_files")
            DebugLogger.shared.logDatabase("✅ music_files temizlendi")
            
            // Word index'leri temizle
            try db.run("DELETE FROM word_index")
            DebugLogger.shared.logDatabase("✅ word_index temizlendi")
            
            // Sessions temizle
            try db.run("DELETE FROM import_sessions")
            DebugLogger.shared.logDatabase("✅ import_sessions temizlendi")
            
            // Foreign keys aç
            try db.run("PRAGMA foreign_keys = ON")
            DebugLogger.shared.logDatabase("🔒 Foreign keys açıldı")
            
        } catch {
            // Foreign keys'i tekrar aç
            _ = try? db.run("PRAGMA foreign_keys = ON")
            throw DatabaseError.clearTablesFailed(error)
        }
    }
    
    /// Bulk add music files to database
    /// - Parameter files: Array of scanned music files
    /// - Returns: Bulk add result with statistics
    /// - Throws: Database operation errors
    func bulkAddFiles(_ files: [ScannedFile]) async throws -> BulkAddResult {
        guard let db = databaseManager.getConnection() else {
            throw DatabaseError.connectionFailed
        }
        
        var added = 0
        let skipped = 0
        
        do {
            // Ana music_files tablosuna direkt yaz
            let musicFiles = Table("music_files")
            let musicPath = Expression<String>("path")
            let musicFileName = Expression<String>("file_name")
            let musicFileNameOnly = Expression<String>("file_name_only")
            let musicNormalizedFileName = Expression<String>("normalized_file_name")
            let musicFileExtension = Expression<String>("file_extension")
            let musicFileSize = Expression<Int64?>("file_size")
            let musicCreatedAt = Expression<String>("created_at")
            
            // Batch processing (5000 dosya/batch)
            let batchSize = 5000
            let batches = files.chunked(into: batchSize)
            
            print("📦 \(batches.count) batch oluşturuldu (\(batchSize) dosya/batch)")
            
            for (batchIndex, batch) in batches.enumerated() {
                print("📦 Batch \(batchIndex + 1)/\(batches.count) işleniyor (\(batch.count) dosya)")
                
                try db.transaction {
                    for file in batch {
                        let insertFile = musicFiles.insert(
                            musicPath <- file.path,
                            musicFileName <- file.fileName,
                            musicFileNameOnly <- file.fileNameOnly,
                            musicNormalizedFileName <- file.normalizedFileName,
                            musicFileExtension <- file.fileExtension,
                            musicFileSize <- Int64(file.size),
                            musicCreatedAt <- ISO8601DateFormatter().string(from: file.created)
                        )
                        try db.run(insertFile)
                    }
                }
                
                added += batch.count
            }
            
            print("✅ Bulk add tamamlandı: \(added) dosya eklendi")
            
        } catch {
            throw DatabaseError.bulkAddFailed(error)
        }
        
        return BulkAddResult(added: added, skipped: skipped)
    }
    
    /// Create playlist in database
    /// - Parameters:
    ///   - path: Playlist file path
    ///   - name: Playlist name
    ///   - type: Playlist type
    ///   - trackCount: Number of tracks
    /// - Returns: Created playlist ID
    /// - Throws: Database operation errors
    func createPlaylist(path: String, name: String, type: PlaylistType, trackCount: Int) async throws -> Int {
        guard let db = databaseManager.getConnection() else {
            throw DatabaseError.connectionFailed
        }
        
        do {
            let insertStmt = try db.prepare("""
                INSERT INTO playlists (path, name, type, trackCount, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?)
            """)
            
            let now = ISO8601DateFormatter().string(from: Date())
            let typeString = type == .m3u ? "m3u" : "vdjfolder"
            
            _ = try insertStmt.run(path, name, typeString, trackCount, now, now)
            
            // Son eklenen ID'yi al
            let lastId = db.lastInsertRowid
            return Int(lastId)
            
        } catch {
            throw DatabaseError.savePlaylistTracksFailed(error)
        }
    }
    
    /// Save playlist tracks to database
    /// - Parameters:
    ///   - playlistId: Playlist ID
    ///   - tracks: Array of scanned tracks
    /// - Returns: Save result with statistics
    /// - Throws: Database operation errors
    func savePlaylistTracks(playlistId: Int, tracks: [ScannedTrack]) async throws -> SaveResult {
        guard let db = databaseManager.getConnection() else {
            throw DatabaseError.connectionFailed
        }
        
        var saved = 0
        var skipped = 0
        
        do {
            try db.transaction {
                for (index, track) in tracks.enumerated() {
                    // Track'i bul veya oluştur
                    let trackId = try findOrCreateTrack(track, db: db)
                    
                    if trackId > 0 {
                        // Playlist-track ilişkisini kaydet
                        try db.run("""
                            INSERT INTO playlist_tracks (playlist_id, track_id, track_order, created_at)
                            VALUES (?, ?, ?, ?)
                        """, playlistId, trackId, index + 1, 
                        ISO8601DateFormatter().string(from: Date()))
                        
                        saved += 1
                    } else {
                        skipped += 1
                    }
                }
            }
            
            print("✅ Playlist tracks kaydedildi: \(saved) track, \(skipped) atlandı")
            
        } catch {
            throw DatabaseError.savePlaylistTracksFailed(error)
        }
        
        return SaveResult(saved: saved, skipped: skipped)
    }
    
    // MARK: - Private Methods
    
    /// Find or create track in database
    /// - Parameters:
    ///   - track: Scanned track
    ///   - db: Database connection
    /// - Returns: Track ID
    /// - Throws: Database operation errors
    private func findOrCreateTrack(_ track: ScannedTrack, db: Connection) throws -> Int {
        // Track'i bul - Parametreyi bind et
        let findStmt = try db.prepare("SELECT id FROM tracks WHERE path = ?")
        let bindedStmt = findStmt.bind(track.path)
        
        for row in bindedStmt {
            if let trackId = row[0] as? Int64 {
                DebugLogger.shared.logDatabase("✅ Track bulundu: \(track.path) - ID: \(trackId)")
                return Int(trackId)
            }
        }
        
        // Track yoksa oluştur
        DebugLogger.shared.logDatabase("📝 Track oluşturuluyor: \(track.path)")
        let insertStmt = try db.prepare("""
            INSERT OR IGNORE INTO tracks (path, fileName, fileNameOnly, normalizedFileName, createdAt)
            VALUES (?, ?, ?, ?, ?)
        """)
        
        try insertStmt.run(track.path, track.fileName, track.fileNameOnly, 
                                     track.normalizedFileName, 
                                     ISO8601DateFormatter().string(from: Date()))
        
        // Yeni oluşturulan track'in ID'sini al
        let trackId = db.lastInsertRowid
        DebugLogger.shared.logDatabase("✅ Track oluşturuldu: \(track.path) - ID: \(trackId)")
        return Int(trackId)
    }
}

// MARK: - Supporting Types

/// Bulk add result
struct BulkAddResult {
    let added: Int
    let skipped: Int
}

/// Save result
struct SaveResult {
    let saved: Int
    let skipped: Int
}

/// Database errors
enum DatabaseError: Error {
    case connectionFailed
    case clearTablesFailed(Error)
    case bulkAddFailed(Error)
    case savePlaylistTracksFailed(Error)
    
    var localizedDescription: String {
        switch self {
        case .connectionFailed:
            return "Database connection failed"
        case .clearTablesFailed(let error):
            return "Clear tables failed: \(error.localizedDescription)"
        case .bulkAddFailed(let error):
            return "Bulk add failed: \(error.localizedDescription)"
        case .savePlaylistTracksFailed(let error):
            return "Save playlist tracks failed: \(error.localizedDescription)"
        }
    }
}

// MARK: - Array Extension

