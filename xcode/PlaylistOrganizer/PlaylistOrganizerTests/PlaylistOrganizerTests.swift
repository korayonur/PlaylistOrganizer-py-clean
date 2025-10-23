//
//  PlaylistOrganizerTests.swift
//  PlaylistOrganizerTests
//
//  Created by Koray Önür on 22.10.2025.
//

import XCTest
@testable import PlaylistOrganizer

final class PlaylistOrganizerTests: XCTestCase {
    
    override func setUpWithError() throws {
        // Test öncesi hazırlık
    }
    
    override func tearDownWithError() throws {
        // Test sonrası temizlik
    }
    
    // MARK: - Model Tests
    
    func testPlaylistCreation() throws {
        let playlist = Playlist(name: "Test Playlist", trackCount: 5)
        
        XCTAssertEqual(playlist.name, "Test Playlist")
        XCTAssertEqual(playlist.trackCount, 5)
        XCTAssertFalse(playlist.isSelected)
        XCTAssertFalse(playlist.isExpanded)
        XCTAssertTrue(playlist.children.isEmpty)
        XCTAssertFalse(playlist.isChild)
    }
    
    func testTrackCreation() throws {
        let track = Track(
            title: "Test Track",
            artist: "Test Artist",
            filePath: "/path/to/track.mp3",
            status: .found
        )
        
        XCTAssertEqual(track.title, "Test Track")
        XCTAssertEqual(track.artist, "Test Artist")
        XCTAssertEqual(track.filePath, "/path/to/track.mp3")
        XCTAssertEqual(track.status, .found)
    }
    
    func testTrackStatusEnum() throws {
        XCTAssertEqual(TrackStatus.found, .found)
        XCTAssertEqual(TrackStatus.missing, .missing)
    }
    
    // MARK: - Service Tests
    
    func testMockDataService() throws {
        let playlists = MockDataService.getSamplePlaylists()
        let tracks = MockDataService.getSampleTracks()
        
        XCTAssertFalse(playlists.isEmpty)
        XCTAssertFalse(tracks.isEmpty)
        
        // İlk playlist'i kontrol et
        let firstPlaylist = playlists.first!
        XCTAssertFalse(firstPlaylist.name.isEmpty)
        XCTAssertGreaterThanOrEqual(firstPlaylist.trackCount, 0)
        
        // İlk track'i kontrol et
        let firstTrack = tracks.first!
        XCTAssertFalse(firstTrack.title.isEmpty)
        XCTAssertFalse(firstTrack.artist.isEmpty)
    }
    
    func testSearchServiceInitialization() throws {
        let searchService = SearchService()
        
        XCTAssertEqual(searchService.searchText, "")
        XCTAssertTrue(searchService.searchResults.isEmpty)
        XCTAssertFalse(searchService.isSearching)
        XCTAssertTrue(searchService.searchHistory.isEmpty)
    }
    
    func testSearchServiceSearchHistory() throws {
        let searchService = SearchService()
        
        // Search history'ye ekle
        searchService.addToSearchHistory("test query")
        
        XCTAssertEqual(searchService.searchHistory.count, 1)
        XCTAssertEqual(searchService.searchHistory.first, "test query")
        
        // Duplicate ekleme testi
        searchService.addToSearchHistory("test query")
        XCTAssertEqual(searchService.searchHistory.count, 1)
        
        // Farklı query ekle
        searchService.addToSearchHistory("another query")
        XCTAssertEqual(searchService.searchHistory.count, 2)
        XCTAssertEqual(searchService.searchHistory.first, "another query")
    }
    
    func testImportServiceInitialization() throws {
        let importService = ImportService()
        
        XCTAssertFalse(importService.isImporting)
        XCTAssertEqual(importService.importProgress, 0.0)
        XCTAssertTrue(importService.importedFiles.isEmpty)
        XCTAssertTrue(importService.importErrors.isEmpty)
    }
    
    // MARK: - Database Tests (SQLite.swift dependency bekleniyor)
    
    func testDatabaseManagerInitialization() throws {
        let dbManager = DatabaseManager()
        
        // SQLite.swift dependency olmadan test
        XCTAssertTrue(dbManager.testConnection()) // Mock implementation
    }
    
    // MARK: - Performance Tests
    
    func testSearchPerformance() throws {
        let searchService = SearchService()
        
        measure {
            for i in 1...100 {
                searchService.addToSearchHistory("test query \(i)")
            }
        }
    }
    
    func testMockDataPerformance() throws {
        measure {
            let _ = MockDataService.getSamplePlaylists()
            let _ = MockDataService.getSampleTracks()
        }
    }
}

