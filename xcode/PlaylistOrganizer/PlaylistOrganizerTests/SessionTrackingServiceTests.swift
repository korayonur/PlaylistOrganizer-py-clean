import XCTest
import SQLite
@testable import PlaylistOrganizer

final class SessionTrackingServiceTests: XCTestCase {
    
    // MARK: - Properties
    
    private var databaseManager: DatabaseManager!
    private var sessionTrackingService: SessionTrackingService!
    
    // MARK: - Setup & Teardown
    
    override func setUpWithError() throws {
        // In-memory database for testing
        databaseManager = DatabaseManager(databaseFileName: ":memory:")
        sessionTrackingService = SessionTrackingService(databaseManager: databaseManager)
        
        // Ensure connection is established
        _ = databaseManager.getConnection()
    }
    
    override func tearDownWithError() throws {
        sessionTrackingService = nil
        databaseManager = nil
    }
    
    // MARK: - Test Methods
    
    func testCreateSession() async throws {
        // Given
        let testPath = "/test/music/folder"
        
        // When
        let sessionId = try await sessionTrackingService.createSession(path: testPath)
        
        // Then
        XCTAssertGreaterThan(sessionId, 0, "Session ID should be greater than 0")
        
        let stats = try await sessionTrackingService.getSessionStats(sessionId: sessionId)
        XCTAssertEqual(stats.path, testPath, "Session path should match")
        XCTAssertEqual(stats.totalFiles, 0, "Initial total files should be 0")
        XCTAssertEqual(stats.processedFiles, 0, "Initial processed files should be 0")
        XCTAssertEqual(stats.addedFiles, 0, "Initial added files should be 0")
        XCTAssertEqual(stats.skippedFiles, 0, "Initial skipped files should be 0")
        XCTAssertEqual(stats.errorFiles, 0, "Initial error files should be 0")
    }
    
    func testUpdateSession() async throws {
        // Given
        let testPath = "/test/music/folder"
        let sessionId = try await sessionTrackingService.createSession(path: testPath)
        
        // When
        try await sessionTrackingService.updateSession(
            sessionId: sessionId,
            totalFiles: 100,
            processedFiles: 80,
            addedFiles: 70,
            skippedFiles: 5,
            errorFiles: 5
        )
        
        // Then
        let stats = try await sessionTrackingService.getSessionStats(sessionId: sessionId)
        XCTAssertEqual(stats.totalFiles, 100, "Total files should be updated")
        XCTAssertEqual(stats.processedFiles, 80, "Processed files should be updated")
        XCTAssertEqual(stats.addedFiles, 70, "Added files should be updated")
        XCTAssertEqual(stats.skippedFiles, 5, "Skipped files should be updated")
        XCTAssertEqual(stats.errorFiles, 5, "Error files should be updated")
        XCTAssertEqual(stats.progressPercentage, 80, "Progress percentage should be 80%")
        XCTAssertEqual(stats.successRate, 87, "Success rate should be 87%")
    }
    
    func testGetAllSessions() async throws {
        // Given
        let session1 = try await sessionTrackingService.createSession(path: "/test/path1")
        let session2 = try await sessionTrackingService.createSession(path: "/test/path2")
        
        // When
        let sessions = try await sessionTrackingService.getAllSessions()
        
        // Then
        XCTAssertEqual(sessions.count, 2, "Should have 2 sessions")
        XCTAssertTrue(sessions.contains { $0.id == session1 }, "Should contain session 1")
        XCTAssertTrue(sessions.contains { $0.id == session2 }, "Should contain session 2")
    }
    
    func testSessionNotFound() async throws {
        // Given
        let nonExistentSessionId = 999
        
        // When & Then
        do {
            _ = try await sessionTrackingService.getSessionStats(sessionId: nonExistentSessionId)
            XCTFail("Should throw sessionNotFound error")
        } catch let error as SessionError {
            XCTAssertEqual(error, .sessionNotFound)
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }
    
    func testUpdateNonExistentSession() async throws {
        // Given
        let nonExistentSessionId = 999
        
        // When & Then
        do {
            try await sessionTrackingService.updateSession(
                sessionId: nonExistentSessionId,
                totalFiles: 10,
                processedFiles: 5,
                addedFiles: 4,
                skippedFiles: 1,
                errorFiles: 0
            )
            XCTFail("Should throw sessionNotFound error")
        } catch let error as SessionError {
            XCTAssertEqual(error, .sessionNotFound)
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }
    
    func testSessionStatsCalculations() async throws {
        // Given
        let sessionId = try await sessionTrackingService.createSession(path: "/test/path")
        
        // When
        try await sessionTrackingService.updateSession(
            sessionId: sessionId,
            totalFiles: 200,
            processedFiles: 150,
            addedFiles: 120,
            skippedFiles: 20,
            errorFiles: 10
        )
        
        // Then
        let stats = try await sessionTrackingService.getSessionStats(sessionId: sessionId)
        XCTAssertEqual(stats.progressPercentage, 75, "Progress should be 75%")
        XCTAssertEqual(stats.successRate, 80, "Success rate should be 80%")
    }
    
    func testSessionStatsEdgeCases() async throws {
        // Given
        let sessionId = try await sessionTrackingService.createSession(path: "/test/path")
        
        // When - Zero values
        try await sessionTrackingService.updateSession(
            sessionId: sessionId,
            totalFiles: 0,
            processedFiles: 0,
            addedFiles: 0,
            skippedFiles: 0,
            errorFiles: 0
        )
        
        // Then
        let stats = try await sessionTrackingService.getSessionStats(sessionId: sessionId)
        XCTAssertEqual(stats.progressPercentage, 0, "Progress should be 0% when total files is 0")
        XCTAssertEqual(stats.successRate, 0, "Success rate should be 0% when processed files is 0")
    }
}
