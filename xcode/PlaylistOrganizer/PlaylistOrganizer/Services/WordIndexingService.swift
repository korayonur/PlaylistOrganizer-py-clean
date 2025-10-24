import Foundation
import SQLite

enum WordIndexError: Error {
    case connectionFailed
    case createWordIndexFailed(Error)
    case searchWordIndexFailed(Error)
    case invalidInput
}

/// Word indexing service for search functionality
class WordIndexingService {
    private let databaseManager: DatabaseManager
    
    init(databaseManager: DatabaseManager) {
        self.databaseManager = databaseManager
    }
    
    /// Create word index for tracks
    /// - Parameters:
    ///   - tracks: Array of tracks to index
    ///   - source: Source type (M3U, VDJFolder, etc.)
    ///   - sourceFile: Source file path
    /// - Throws: Word indexing errors
    func createWordIndex(tracks: [ScannedTrack], source: String, sourceFile: String) async throws {
        guard let db = databaseManager.getConnection() else {
            throw WordIndexError.connectionFailed
        }
        
        do {
            // Create track_words table if not exists
            try db.run("""
                CREATE TABLE IF NOT EXISTS track_words (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    track_path TEXT NOT NULL,
                    word TEXT NOT NULL,
                    source TEXT NOT NULL,
                    source_file TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            
            // music_words tablosu DatabaseManager'da oluşturuluyor, burada oluşturmaya gerek yok
            // Sadece batch processing yap
            
            // Batch processing (1000 tracks per batch)
            let batchSize = 1000
            let batches = tracks.chunked(into: batchSize)
            
            for batch in batches {
                try await processBatch(batch: batch, source: source, sourceFile: sourceFile, db: db)
            }
            
            print("📝 Word index created for \(tracks.count) tracks")
            
        } catch {
            throw WordIndexError.createWordIndexFailed(error)
        }
    }
    
    /// Create word index for music files
    /// - Parameters:
    ///   - files: Array of music files to index
    /// - Throws: Word indexing errors
    func createWordIndex(files: [ScannedFile]) async throws {
        guard let db = databaseManager.getConnection() else {
            throw WordIndexError.connectionFailed
        }
        
        do {
            // music_words tablosu DatabaseManager'da oluşturuluyor, burada oluşturmaya gerek yok
            // Sadece batch processing yap
            
            // Batch processing (1000 files per batch)
            let batchSize = 1000
            let batches = files.chunked(into: batchSize)
            
            for batch in batches {
                try await processMusicBatch(batch: batch, db: db)
            }
            
            print("📝 Word index created for \(files.count) music files")
            
        } catch {
            throw WordIndexError.createWordIndexFailed(error)
        }
    }
    
    /// Search word index
    /// - Parameter query: Search query
    /// - Returns: Array of matching track paths
    /// - Throws: Word indexing errors
    func searchWordIndex(query: String) async throws -> [String] {
        guard let db = databaseManager.getConnection() else {
            throw WordIndexError.connectionFailed
        }
        
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw WordIndexError.invalidInput
        }
        
        do {
            let normalizedQuery = normalizeQuery(query)
            let words = extractWords(from: normalizedQuery)
            
            guard !words.isEmpty else {
                return []
            }
            
            // Search in track_words table
            let trackQuery = words.map { _ in "word LIKE ?" }.joined(separator: " AND ")
            let trackParams = words.map { "%\($0)%" }
            
            let trackStmt = try db.prepare("""
                SELECT DISTINCT track_path FROM track_words 
                WHERE \(trackQuery)
            """)
            
            var trackPaths: Set<String> = []
            for row in try trackStmt.run(trackParams) {
                if let path = row[0] as? String {
                    trackPaths.insert(path)
                }
            }
            
            // Search in music_words table
            let musicStmt = try db.prepare("""
                SELECT DISTINCT music_path FROM music_words 
                WHERE \(trackQuery)
            """)
            
            for row in try musicStmt.run(trackParams) {
                if let path = row[0] as? String {
                    trackPaths.insert(path)
                }
            }
            
            let results = Array(trackPaths)
            print("🔍 Found \(results.count) matches for query: '\(query)'")
            return results
            
        } catch {
            throw WordIndexError.searchWordIndexFailed(error)
        }
    }
    
    /// Get word index statistics
    /// - Returns: Word index statistics
    /// - Throws: Word indexing errors
    func getWordIndexStats() async throws -> WordIndexStats {
        guard let db = databaseManager.getConnection() else {
            throw WordIndexError.connectionFailed
        }
        
        do {
            let trackWordsCount = try db.scalar("SELECT COUNT(*) FROM track_words") as? Int64 ?? 0
            let musicWordsCount = try db.scalar("SELECT COUNT(*) FROM music_words") as? Int64 ?? 0
            let uniqueTrackWordsCount = try db.scalar("SELECT COUNT(DISTINCT word) FROM track_words") as? Int64 ?? 0
            let uniqueMusicWordsCount = try db.scalar("SELECT COUNT(DISTINCT word) FROM music_words") as? Int64 ?? 0
            
            return WordIndexStats(
                trackWordsCount: Int(trackWordsCount),
                musicWordsCount: Int(musicWordsCount),
                uniqueTrackWordsCount: Int(uniqueTrackWordsCount),
                uniqueMusicWordsCount: Int(uniqueMusicWordsCount)
            )
            
        } catch {
            throw WordIndexError.searchWordIndexFailed(error)
        }
    }
    
    // MARK: - Private Methods
    
    private func processBatch(batch: [ScannedTrack], source: String, sourceFile: String, db: Connection) async throws {
        try db.transaction {
            let insertStmt = try db.prepare("""
                INSERT OR IGNORE INTO track_words (track_path, word, source, source_file, created_at)
                VALUES (?, ?, ?, ?, ?)
            """)
            
            let now = ISO8601DateFormatter().string(from: Date())
            
            for track in batch {
                let words = extractWords(from: track.normalizedFileName)
                for word in words {
                    try insertStmt.run(track.path, word, source, sourceFile, now)
                }
            }
        }
    }
    
    private func processMusicBatch(batch: [ScannedFile], db: Connection) async throws {
        try db.transaction {
            let insertStmt = try db.prepare("""
                INSERT OR IGNORE INTO music_words (music_path, word, created_at)
                VALUES (?, ?, ?)
            """)
            
            let now = ISO8601DateFormatter().string(from: Date())
            
            for file in batch {
                let words = extractWords(from: file.normalizedFileName)
                for word in words {
                    try insertStmt.run(file.path, word, now)
                }
            }
        }
    }
    
    private func extractWords(from text: String) -> [String] {
        let normalized = normalizeQuery(text)
        let words = normalized.components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .filter { $0.count >= 2 } // Minimum 2 characters
            .filter { !isStopWord($0) } // Remove stop words
        
        return words
    }
    
    private func normalizeQuery(_ query: String) -> String {
        return query.lowercased()
            .replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: "-", with: " ")
            .replacingOccurrences(of: ".", with: " ")
            .replacingOccurrences(of: "(", with: " ")
            .replacingOccurrences(of: ")", with: " ")
            .replacingOccurrences(of: "[", with: " ")
            .replacingOccurrences(of: "]", with: " ")
            .replacingOccurrences(of: "{", with: " ")
            .replacingOccurrences(of: "}", with: " ")
            .replacingOccurrences(of: "&", with: " ")
            .replacingOccurrences(of: "+", with: " ")
            .replacingOccurrences(of: "=", with: " ")
            .replacingOccurrences(of: "!", with: " ")
            .replacingOccurrences(of: "@", with: " ")
            .replacingOccurrences(of: "#", with: " ")
            .replacingOccurrences(of: "$", with: " ")
            .replacingOccurrences(of: "%", with: " ")
            .replacingOccurrences(of: "^", with: " ")
            .replacingOccurrences(of: "*", with: " ")
            .replacingOccurrences(of: "|", with: " ")
            .replacingOccurrences(of: "\\", with: " ")
            .replacingOccurrences(of: "/", with: " ")
            .replacingOccurrences(of: ":", with: " ")
            .replacingOccurrences(of: ";", with: " ")
            .replacingOccurrences(of: "\"", with: " ")
            .replacingOccurrences(of: "'", with: " ")
            .replacingOccurrences(of: "<", with: " ")
            .replacingOccurrences(of: ">", with: " ")
            .replacingOccurrences(of: ",", with: " ")
            .replacingOccurrences(of: "?", with: " ")
            .replacingOccurrences(of: "~", with: " ")
            .replacingOccurrences(of: "`", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    private func isStopWord(_ word: String) -> Bool {
        let stopWords = Set([
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
            "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
            "will", "would", "could", "should", "may", "might", "must", "can", "this", "that", "these", "those",
            "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "her", "its", "our", "their"
        ])
        return stopWords.contains(word.lowercased())
    }
}

/// Word index statistics
struct WordIndexStats {
    let trackWordsCount: Int
    let musicWordsCount: Int
    let uniqueTrackWordsCount: Int
    let uniqueMusicWordsCount: Int
    
    var totalWordsCount: Int {
        return trackWordsCount + musicWordsCount
    }
    
    var totalUniqueWordsCount: Int {
        return uniqueTrackWordsCount + uniqueMusicWordsCount
    }
}
