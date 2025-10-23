import Foundation
import SQLite

enum SessionError: Error {
    case connectionFailed
    case createSessionFailed(Error)
    case updateSessionFailed(Error)
    case sessionNotFound
    case invalidSessionData
}

/// Import session tracking service
class SessionTrackingService {
    private let databaseManager: DatabaseManager
    
    init(databaseManager: DatabaseManager) {
        self.databaseManager = databaseManager
    }
    
    /// Create a new import session
    /// - Parameter path: Import path
    /// - Returns: Session ID
    /// - Throws: Session operation errors
    func createSession(path: String) async throws -> Int {
        guard let db = databaseManager.getConnection() else {
            throw SessionError.connectionFailed
        }
        
        do {
            let now = ISO8601DateFormatter().string(from: Date())
            
            // Create import_sessions table if not exists
            try db.run("""
                CREATE TABLE IF NOT EXISTS import_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    path TEXT NOT NULL,
                    total_files INTEGER NOT NULL DEFAULT 0,
                    processed_files INTEGER NOT NULL DEFAULT 0,
                    added_files INTEGER NOT NULL DEFAULT 0,
                    skipped_files INTEGER NOT NULL DEFAULT 0,
                    error_files INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            
            let insertStmt = try db.prepare("""
                INSERT INTO import_sessions (path, total_files, processed_files, added_files, skipped_files, error_files, created_at, updated_at)
                VALUES (?, 0, 0, 0, 0, 0, ?, ?)
            """)
            
            _ = try insertStmt.run(path, now, now)
            let sessionId = Int(db.lastInsertRowid)
            
            print("📊 Session created: ID=\(sessionId), Path=\(path)")
            return sessionId
            
        } catch {
            throw SessionError.createSessionFailed(error)
        }
    }
    
    /// Update session statistics
    /// - Parameters:
    ///   - sessionId: Session ID
    ///   - totalFiles: Total files processed
    ///   - processedFiles: Files processed
    ///   - addedFiles: Files added
    ///   - skippedFiles: Files skipped
    ///   - errorFiles: Files with errors
    /// - Throws: Session operation errors
    func updateSession(
        sessionId: Int,
        totalFiles: Int,
        processedFiles: Int,
        addedFiles: Int,
        skippedFiles: Int,
        errorFiles: Int
    ) async throws {
        guard let db = databaseManager.getConnection() else {
            throw SessionError.connectionFailed
        }
        
        do {
            let now = ISO8601DateFormatter().string(from: Date())
            
            let updateStmt = try db.prepare("""
                UPDATE import_sessions 
                SET total_files = ?, processed_files = ?, added_files = ?, skipped_files = ?, error_files = ?, updated_at = ?
                WHERE id = ?
            """)
            
            _ = try updateStmt.run(totalFiles, processedFiles, addedFiles, skippedFiles, errorFiles, now, sessionId)
            
            print("📊 Session updated: ID=\(sessionId), Processed=\(processedFiles)/\(totalFiles)")
            
        } catch {
            throw SessionError.updateSessionFailed(error)
        }
    }
    
    /// Get session statistics
    /// - Parameter sessionId: Session ID
    /// - Returns: Session statistics
    /// - Throws: Session operation errors
    func getSessionStats(sessionId: Int) async throws -> SessionStats {
        guard let db = databaseManager.getConnection() else {
            throw SessionError.connectionFailed
        }
        
        do {
            let query = try db.prepare("""
                SELECT path, total_files, processed_files, added_files, skipped_files, error_files, created_at, updated_at
                FROM import_sessions WHERE id = ?
            """)
            
            guard let row = query.first(where: { $0[0] as? Int == sessionId }) else {
                throw SessionError.sessionNotFound
            }
            
            return SessionStats(
                id: sessionId,
                path: row[0] as? String ?? "",
                totalFiles: row[1] as? Int ?? 0,
                processedFiles: row[2] as? Int ?? 0,
                addedFiles: row[3] as? Int ?? 0,
                skippedFiles: row[4] as? Int ?? 0,
                errorFiles: row[5] as? Int ?? 0,
                createdAt: row[6] as? String ?? "",
                updatedAt: row[7] as? String ?? ""
            )
            
        } catch {
            throw SessionError.updateSessionFailed(error)
        }
    }
    
    /// Get all sessions
    /// - Returns: Array of session statistics
    /// - Throws: Session operation errors
    func getAllSessions() async throws -> [SessionStats] {
        guard let db = databaseManager.getConnection() else {
            throw SessionError.connectionFailed
        }
        
        do {
            let query = try db.prepare("""
                SELECT id, path, total_files, processed_files, added_files, skipped_files, error_files, created_at, updated_at
                FROM import_sessions ORDER BY created_at DESC
            """)
            
            var sessions: [SessionStats] = []
            for row in query {
                sessions.append(SessionStats(
                    id: row[0] as? Int ?? 0,
                    path: row[1] as? String ?? "",
                    totalFiles: row[2] as? Int ?? 0,
                    processedFiles: row[3] as? Int ?? 0,
                    addedFiles: row[4] as? Int ?? 0,
                    skippedFiles: row[5] as? Int ?? 0,
                    errorFiles: row[6] as? Int ?? 0,
                    createdAt: row[7] as? String ?? "",
                    updatedAt: row[8] as? String ?? ""
                ))
            }
            
            return sessions
            
        } catch {
            throw SessionError.updateSessionFailed(error)
        }
    }
}

/// Session statistics data structure
struct SessionStats {
    let id: Int
    let path: String
    let totalFiles: Int
    let processedFiles: Int
    let addedFiles: Int
    let skippedFiles: Int
    let errorFiles: Int
    let createdAt: String
    let updatedAt: String
    
    var progressPercentage: Int {
        guard totalFiles > 0 else { return 0 }
        return Int((Double(processedFiles) / Double(totalFiles)) * 100)
    }
    
    var successRate: Int {
        guard processedFiles > 0 else { return 0 }
        return Int((Double(addedFiles) / Double(processedFiles)) * 100)
    }
}
