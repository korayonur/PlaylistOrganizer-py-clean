//
//  DatabaseTests.swift
//  PlaylistOrganizerTests
//
//  Created by Koray Önür on 22.10.2025.
//

import XCTest
@testable import PlaylistOrganizer

final class DatabaseTests: XCTestCase {
    
    var databaseManager: DatabaseManager!
    
    override func setUpWithError() throws {
        databaseManager = DatabaseManager()
    }
    
    override func tearDownWithError() throws {
        databaseManager = nil
    }
    
    // MARK: - Database Connection Tests
    
    func testDatabaseManagerInitialization() throws {
        XCTAssertNotNil(databaseManager)
    }
    
    func testDatabaseConnection() throws {
        // SQLite.swift dependency olmadan mock test
        let connectionResult = databaseManager.testConnection()
        XCTAssertTrue(connectionResult)
    }
    
    func testGetConnection() throws {
        // SQLite.swift dependency olmadan mock test
        let connection = databaseManager.getConnection()
        XCTAssertNil(connection) // Mock implementation returns nil
    }
    
    // MARK: - Repository Tests (SQLite.swift dependency bekleniyor)
    
    func testPlaylistRepositoryProtocol() throws {
        // Repository protocol'ları test et
        // Şimdilik basit test yapalım
        
        // Mock repository oluştur
        let mockRepository = MockPlaylistRepository()
        
        // Protocol methods'ları test et
        XCTAssertNoThrow(try await mockRepository.fetchAllPlaylists())
        XCTAssertNoThrow(try await mockRepository.addPlaylist(createTestPlaylist()))
    }
    
    func testTrackRepositoryProtocol() throws {
        // Repository protocol'ları test et
        // Şimdilik basit test yapalım
        
        // Mock repository oluştur
        let mockRepository = MockTrackRepository()
        
        // Protocol methods'ları test et
        XCTAssertNoThrow(try await mockRepository.fetchTracks(forPlaylistId: nil))
        XCTAssertNoThrow(try await mockRepository.addTrack(createTestTrack()))
    }
    
    // MARK: - Service Tests
    
    func testPlaylistService() throws {
        let mockRepository = MockPlaylistRepository()
        let playlistService = PlaylistService(playlistRepository: mockRepository)
        
        // Service methods'ları test et
        XCTAssertNoThrow(try await playlistService.getAllPlaylists())
        XCTAssertNoThrow(try await playlistService.createPlaylist(name: "Test Playlist"))
    }
    
    // MARK: - Helper Methods
    
    private func createTestPlaylist() -> Playlist {
        return Playlist(name: "Test Playlist", trackCount: 5)
    }
    
    private func createTestTrack() -> Track {
        return Track(
            title: "Test Track",
            artist: "Test Artist",
            filePath: "/path/to/track.mp3",
            status: .found
        )
    }
}

// MARK: - Mock Implementations

class MockPlaylistRepository: PlaylistRepositoryProtocol {
    func fetchAllPlaylists() async throws -> [Playlist] {
        return MockDataService.getSamplePlaylists()
    }
    
    func addPlaylist(_ playlist: Playlist) async throws {
        // Mock implementation - hiçbir şey yapma
    }
    
    func updatePlaylist(_ playlist: Playlist) async throws {
        // Mock implementation - hiçbir şey yapma
    }
    
    func deletePlaylist(id: UUID) async throws {
        // Mock implementation - hiçbir şey yapma
    }
}

class MockTrackRepository: TrackRepositoryProtocol {
    func fetchTracks(forPlaylistId playlistId: UUID?) async throws -> [Track] {
        return MockDataService.getSampleTracks()
    }
    
    func addTrack(_ track: Track) async throws {
        // Mock implementation - hiçbir şey yapma
    }
    
    func updateTrack(_ track: Track) async throws {
        // Mock implementation - hiçbir şey yapma
    }
    
    func deleteTrack(id: UUID) async throws {
        // Mock implementation - hiçbir şey yapma
    }
}

