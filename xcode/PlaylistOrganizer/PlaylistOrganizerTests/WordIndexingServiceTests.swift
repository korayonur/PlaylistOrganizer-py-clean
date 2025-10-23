import XCTest
import SQLite
@testable import PlaylistOrganizer

final class WordIndexingServiceTests: XCTestCase {
    
    // MARK: - Properties
    
    private var databaseManager: DatabaseManager!
    private var wordIndexingService: WordIndexingService!
    
    // MARK: - Setup & Teardown
    
    override func setUpWithError() throws {
        // In-memory database for testing
        databaseManager = DatabaseManager(databaseFileName: ":memory:")
        wordIndexingService = WordIndexingService(databaseManager: databaseManager)
        
        // Ensure connection is established
        _ = databaseManager.getConnection()
    }
    
    override func tearDownWithError() throws {
        wordIndexingService = nil
        databaseManager = nil
    }
    
    // MARK: - Test Methods
    
    func testCreateWordIndexForTracks() async throws {
        // Given
        let testTracks = [
            ScannedTrack(
                path: "/test/track1.mp3",
                fileName: "track1.mp3",
                fileNameOnly: "track1",
                normalizedFileName: "track1",
                fileExtension: "mp3",
                source: "M3U",
                sourceFile: "/test/playlist.m3u",
                metadata: nil
            ),
            ScannedTrack(
                path: "/test/track2.mp3",
                fileName: "track2.mp3",
                fileNameOnly: "track2",
                normalizedFileName: "track2",
                fileExtension: "mp3",
                source: "VDJFolder",
                sourceFile: "/test/playlist.vdjfolder",
                metadata: nil
            )
        ]
        
        // When
        try await wordIndexingService.createWordIndex(tracks: testTracks, source: "M3U", sourceFile: "/test/playlist.m3u")
        
        // Then
        let stats = try await wordIndexingService.getWordIndexStats()
        XCTAssertGreaterThan(stats.trackWordsCount, 0, "Should have track words")
        XCTAssertEqual(stats.musicWordsCount, 0, "Should not have music words")
    }
    
    func testCreateWordIndexForMusicFiles() async throws {
        // Given
        let testFiles = [
            ScannedFile(
                path: "/test/music1.mp3",
                fileName: "music1.mp3",
                fileNameOnly: "music1",
                normalizedFileName: "music1",
                fileExtension: "mp3",
                size: 1024,
                modified: Date(),
                created: Date()
            ),
            ScannedFile(
                path: "/test/music2.wav",
                fileName: "music2.wav",
                fileNameOnly: "music2",
                normalizedFileName: "music2",
                fileExtension: "wav",
                size: 2048,
                modified: Date(),
                created: Date()
            )
        ]
        
        // When
        try await wordIndexingService.createWordIndex(files: testFiles)
        
        // Then
        let stats = try await wordIndexingService.getWordIndexStats()
        XCTAssertGreaterThan(stats.musicWordsCount, 0, "Should have music words")
        XCTAssertEqual(stats.trackWordsCount, 0, "Should not have track words")
    }
    
    func testSearchWordIndex() async throws {
        // Given
        let testTracks = [
            ScannedTrack(
                path: "/test/rock_song.mp3",
                fileName: "rock_song.mp3",
                fileNameOnly: "rock_song",
                normalizedFileName: "rock_song",
                fileExtension: "mp3",
                source: "M3U",
                sourceFile: "/test/playlist.m3u",
                metadata: nil
            ),
            ScannedTrack(
                path: "/test/jazz_music.mp3",
                fileName: "jazz_music.mp3",
                fileNameOnly: "jazz_music",
                normalizedFileName: "jazz_music",
                fileExtension: "mp3",
                source: "M3U",
                sourceFile: "/test/playlist.m3u",
                metadata: nil
            )
        ]
        
        try await wordIndexingService.createWordIndex(tracks: testTracks, source: "M3U", sourceFile: "/test/playlist.m3u")
        
        // When
        let rockResults = try await wordIndexingService.searchWordIndex(query: "rock")
        let jazzResults = try await wordIndexingService.searchWordIndex(query: "jazz")
        let noResults = try await wordIndexingService.searchWordIndex(query: "classical")
        
        // Then
        XCTAssertEqual(rockResults.count, 1, "Should find 1 rock song")
        XCTAssertTrue(rockResults.contains("/test/rock_song.mp3"), "Should contain rock song")
        
        XCTAssertEqual(jazzResults.count, 1, "Should find 1 jazz song")
        XCTAssertTrue(jazzResults.contains("/test/jazz_music.mp3"), "Should contain jazz song")
        
        XCTAssertEqual(noResults.count, 0, "Should find no classical songs")
    }
    
    func testSearchWordIndexWithMultipleWords() async throws {
        // Given
        let testTracks = [
            ScannedTrack(
                path: "/test/rock_ballad.mp3",
                fileName: "rock_ballad.mp3",
                fileNameOnly: "rock_ballad",
                normalizedFileName: "rock_ballad",
                fileExtension: "mp3",
                source: "M3U",
                sourceFile: "/test/playlist.m3u",
                metadata: nil
            ),
            ScannedTrack(
                path: "/test/rock_anthem.mp3",
                fileName: "rock_anthem.mp3",
                fileNameOnly: "rock_anthem",
                normalizedFileName: "rock_anthem",
                fileExtension: "mp3",
                source: "M3U",
                sourceFile: "/test/playlist.m3u",
                metadata: nil
            ),
            ScannedTrack(
                path: "/test/jazz_ballad.mp3",
                fileName: "jazz_ballad.mp3",
                fileNameOnly: "jazz_ballad",
                normalizedFileName: "jazz_ballad",
                fileExtension: "mp3",
                source: "M3U",
                sourceFile: "/test/playlist.m3u",
                metadata: nil
            )
        ]
        
        try await wordIndexingService.createWordIndex(tracks: testTracks, source: "M3U", sourceFile: "/test/playlist.m3u")
        
        // When
        let rockBalladResults = try await wordIndexingService.searchWordIndex(query: "rock ballad")
        let balladResults = try await wordIndexingService.searchWordIndex(query: "ballad")
        
        // Then
        XCTAssertEqual(rockBalladResults.count, 1, "Should find 1 rock ballad")
        XCTAssertTrue(rockBalladResults.contains("/test/rock_ballad.mp3"), "Should contain rock ballad")
        
        XCTAssertEqual(balladResults.count, 2, "Should find 2 ballads")
        XCTAssertTrue(balladResults.contains("/test/rock_ballad.mp3"), "Should contain rock ballad")
        XCTAssertTrue(balladResults.contains("/test/jazz_ballad.mp3"), "Should contain jazz ballad")
    }
    
    func testSearchWordIndexWithSpecialCharacters() async throws {
        // Given
        let testTracks = [
            ScannedTrack(
                path: "/test/song_with-dashes.mp3",
                fileName: "song_with-dashes.mp3",
                fileNameOnly: "song_with-dashes",
                normalizedFileName: "song_with-dashes",
                fileExtension: "mp3",
                source: "M3U",
                sourceFile: "/test/playlist.m3u",
                metadata: nil
            ),
            ScannedTrack(
                path: "/test/song_with_underscores.mp3",
                fileName: "song_with_underscores.mp3",
                fileNameOnly: "song_with_underscores",
                normalizedFileName: "song_with_underscores",
                fileExtension: "mp3",
                source: "M3U",
                sourceFile: "/test/playlist.m3u",
                metadata: nil
            )
        ]
        
        try await wordIndexingService.createWordIndex(tracks: testTracks, source: "M3U", sourceFile: "/test/playlist.m3u")
        
        // When
        let dashResults = try await wordIndexingService.searchWordIndex(query: "dashes")
        let underscoreResults = try await wordIndexingService.searchWordIndex(query: "underscores")
        
        // Then
        XCTAssertEqual(dashResults.count, 1, "Should find 1 song with dashes")
        XCTAssertTrue(dashResults.contains("/test/song_with-dashes.mp3"), "Should contain song with dashes")
        
        XCTAssertEqual(underscoreResults.count, 1, "Should find 1 song with underscores")
        XCTAssertTrue(underscoreResults.contains("/test/song_with_underscores.mp3"), "Should contain song with underscores")
    }
    
    func testSearchWordIndexEmptyQuery() async throws {
        // Given
        let testTracks = [
            ScannedTrack(
                path: "/test/song.mp3",
                fileName: "song.mp3",
                fileNameOnly: "song",
                normalizedFileName: "song",
                fileExtension: "mp3",
                source: "M3U",
                sourceFile: "/test/playlist.m3u",
                metadata: nil
            )
        ]
        
        try await wordIndexingService.createWordIndex(tracks: testTracks, source: "M3U", sourceFile: "/test/playlist.m3u")
        
        // When & Then
        do {
            _ = try await wordIndexingService.searchWordIndex(query: "")
            XCTFail("Should throw invalidInput error for empty query")
        } catch let error as WordIndexError {
            XCTAssertEqual(error, .invalidInput)
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }
    
    func testSearchWordIndexWhitespaceQuery() async throws {
        // Given
        let testTracks = [
            ScannedTrack(
                path: "/test/song.mp3",
                fileName: "song.mp3",
                fileNameOnly: "song",
                normalizedFileName: "song",
                fileExtension: "mp3",
                source: "M3U",
                sourceFile: "/test/playlist.m3u",
                metadata: nil
            )
        ]
        
        try await wordIndexingService.createWordIndex(tracks: testTracks, source: "M3U", sourceFile: "/test/playlist.m3u")
        
        // When & Then
        do {
            _ = try await wordIndexingService.searchWordIndex(query: "   ")
            XCTFail("Should throw invalidInput error for whitespace-only query")
        } catch let error as WordIndexError {
            XCTAssertEqual(error, .invalidInput)
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }
    
    func testGetWordIndexStats() async throws {
        // Given
        let testTracks = [
            ScannedTrack(
                path: "/test/track1.mp3",
                fileName: "track1.mp3",
                fileNameOnly: "track1",
                normalizedFileName: "track1",
                fileExtension: "mp3",
                source: "M3U",
                sourceFile: "/test/playlist.m3u",
                metadata: nil
            )
        ]
        
        let testFiles = [
            ScannedFile(
                path: "/test/music1.mp3",
                fileName: "music1.mp3",
                fileNameOnly: "music1",
                normalizedFileName: "music1",
                fileExtension: "mp3",
                size: 1024,
                modified: Date(),
                created: Date()
            )
        ]
        
        // When
        try await wordIndexingService.createWordIndex(tracks: testTracks, source: "M3U", sourceFile: "/test/playlist.m3u")
        try await wordIndexingService.createWordIndex(files: testFiles)
        
        let stats = try await wordIndexingService.getWordIndexStats()
        
        // Then
        XCTAssertGreaterThan(stats.trackWordsCount, 0, "Should have track words")
        XCTAssertGreaterThan(stats.musicWordsCount, 0, "Should have music words")
        XCTAssertGreaterThan(stats.uniqueTrackWordsCount, 0, "Should have unique track words")
        XCTAssertGreaterThan(stats.uniqueMusicWordsCount, 0, "Should have unique music words")
        XCTAssertEqual(stats.totalWordsCount, stats.trackWordsCount + stats.musicWordsCount, "Total should be sum of track and music words")
    }
}
