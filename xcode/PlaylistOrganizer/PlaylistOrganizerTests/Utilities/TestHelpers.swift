//
//  TestHelpers.swift
//  PlaylistOrganizerTests
//
//  Created by Koray Önür on 22.10.2025.
//

import XCTest
import Foundation
@testable import PlaylistOrganizer

/// Test yardımcı fonksiyonları ve utilities
class TestHelpers {
    
    // MARK: - Test Data Creation
    
    /// Test playlist'i oluşturur
    static func createTestPlaylist(
        name: String = "Test Playlist",
        trackCount: Int = 5,
        isSelected: Bool = false,
        isExpanded: Bool = false
    ) -> Playlist {
        return Playlist(
            name: name,
            trackCount: trackCount,
            isSelected: isSelected,
            isExpanded: isExpanded
        )
    }
    
    /// Test track'i oluşturur
    static func createTestTrack(
        title: String = "Test Track",
        artist: String = "Test Artist",
        filePath: String = "/test/path.mp3",
        status: TrackStatus = .found
    ) -> Track {
        return Track(
            title: title,
            artist: artist,
            filePath: filePath,
            status: status
        )
    }
    
    /// Test artist'i oluşturur
    static func createTestArtist(
        name: String = "Test Artist",
        trackCount: Int = 3
    ) -> Artist {
        return Artist(
            name: name,
            trackCount: trackCount
        )
    }
    
    // MARK: - Test Data Arrays
    
    /// Test playlist'leri oluşturur
    static func createTestPlaylists(count: Int = 3) -> [Playlist] {
        return (0..<count).map { index in
            createTestPlaylist(
                name: "Test Playlist \(index + 1)",
                trackCount: index + 1
            )
        }
    }
    
    /// Test track'leri oluşturur
    static func createTestTracks(count: Int = 5) -> [Track] {
        return (0..<count).map { index in
            createTestTrack(
                title: "Test Track \(index + 1)",
                artist: "Test Artist \(index + 1)",
                filePath: "/test/path\(index + 1).mp3"
            )
        }
    }
    
    /// Test artist'leri oluşturur
    static func createTestArtists(count: Int = 3) -> [Artist] {
        return (0..<count).map { index in
            createTestArtist(
                name: "Test Artist \(index + 1)",
                trackCount: index + 2
            )
        }
    }
    
    // MARK: - Test Assertions
    
    /// Playlist'in doğru özelliklere sahip olduğunu kontrol eder
    static func assertPlaylistProperties(
        _ playlist: Playlist,
        expectedName: String,
        expectedTrackCount: Int,
        expectedIsSelected: Bool = false,
        expectedIsExpanded: Bool = false,
        file: StaticString = #file,
        line: UInt = #line
    ) {
        XCTAssertEqual(playlist.name, expectedName, "Playlist name should match", file: file, line: line)
        XCTAssertEqual(playlist.trackCount, expectedTrackCount, "Playlist track count should match", file: file, line: line)
        XCTAssertEqual(playlist.isSelected, expectedIsSelected, "Playlist selection state should match", file: file, line: line)
        XCTAssertEqual(playlist.isExpanded, expectedIsExpanded, "Playlist expansion state should match", file: file, line: line)
    }
    
    /// Track'in doğru özelliklere sahip olduğunu kontrol eder
    static func assertTrackProperties(
        _ track: Track,
        expectedTitle: String,
        expectedArtist: String,
        expectedFilePath: String,
        expectedStatus: TrackStatus,
        file: StaticString = #file,
        line: UInt = #line
    ) {
        XCTAssertEqual(track.title, expectedTitle, "Track title should match", file: file, line: line)
        XCTAssertEqual(track.artist, expectedArtist, "Track artist should match", file: file, line: line)
        XCTAssertEqual(track.filePath, expectedFilePath, "Track file path should match", file: file, line: line)
        XCTAssertEqual(track.status, expectedStatus, "Track status should match", file: file, line: line)
    }
    
    /// Artist'in doğru özelliklere sahip olduğunu kontrol eder
    static func assertArtistProperties(
        _ artist: Artist,
        expectedName: String,
        expectedTrackCount: Int,
        file: StaticString = #file,
        line: UInt = #line
    ) {
        XCTAssertEqual(artist.name, expectedName, "Artist name should match", file: file, line: line)
        XCTAssertEqual(artist.trackCount, expectedTrackCount, "Artist track count should match", file: file, line: line)
    }
    
    // MARK: - Test Utilities
    
    /// Test için geçici dosya yolu oluşturur
    static func createTempFilePath(extension: String = "mp3") -> String {
        let tempDir = NSTemporaryDirectory()
        let fileName = "test_\(UUID().uuidString).\(`extension`)"
        return tempDir + fileName
    }
    
    /// Test için geçici URL oluşturur
    static func createTempURL(extension: String = "mp3") -> URL {
        return URL(fileURLWithPath: createTempFilePath(extension: `extension`))
    }
    
    /// Test için bekleme fonksiyonu (async test'ler için)
    static func waitForAsync(
        timeout: TimeInterval = 1.0,
        file: StaticString = #file,
        line: UInt = #line
    ) async {
        try? await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
    }
    
    /// Test için expectation oluşturur
    static func createExpectation(
        description: String,
        timeout: TimeInterval = 1.0
    ) -> XCTestExpectation {
        return XCTestExpectation(description: description)
    }
    
    // MARK: - Test Data Cleanup
    
    /// Test verilerini temizler
    static func cleanupTestData() {
        // Geçici dosyaları temizle
        let tempDir = NSTemporaryDirectory()
        let fileManager = FileManager.default
        
        do {
            let tempFiles = try fileManager.contentsOfDirectory(atPath: tempDir)
            for file in tempFiles {
                if file.hasPrefix("test_") {
                    let filePath = tempDir + file
                    try fileManager.removeItem(atPath: filePath)
                }
            }
        } catch {
            print("Test cleanup error: \(error)")
        }
    }
    
    // MARK: - Test Validation
    
    /// Test sonuçlarını doğrular
    static func validateTestResults(
        passed: Int,
        failed: Int,
        total: Int,
        file: StaticString = #file,
        line: UInt = #line
    ) {
        XCTAssertEqual(passed + failed, total, "Total tests should equal passed + failed", file: file, line: line)
        XCTAssertEqual(failed, 0, "No tests should fail", file: file, line: line)
        XCTAssertGreaterThanOrEqual(passed, total * 8 / 10, "At least 80% of tests should pass", file: file, line: line)
    }
    
    /// Test coverage'ını doğrular
    static func validateTestCoverage(
        coverage: Double,
        minimumCoverage: Double = 0.8,
        file: StaticString = #file,
        line: UInt = #line
    ) {
        XCTAssertGreaterThanOrEqual(
            coverage,
            minimumCoverage,
            "Test coverage should be at least \(Int(minimumCoverage * 100))%",
            file: file,
            line: line
        )
    }
}

// MARK: - Test Extensions

extension XCTestCase {
    /// Test için geçici dosya oluşturur
    func createTempFile(extension: String = "mp3") -> URL {
        return TestHelpers.createTempURL(extension: `extension`)
    }
    
    /// Test için bekleme yapar
    func waitForAsync(timeout: TimeInterval = 1.0) async {
        await TestHelpers.waitForAsync(timeout: timeout)
    }
    
    /// Test sonuçlarını doğrular
    func validateTestResults(passed: Int, failed: Int, total: Int) {
        TestHelpers.validateTestResults(passed: passed, failed: failed, total: total)
    }
    
    /// Test coverage'ını doğrular
    func validateTestCoverage(coverage: Double, minimumCoverage: Double = 0.8) {
        TestHelpers.validateTestCoverage(coverage: coverage, minimumCoverage: minimumCoverage)
    }
}
