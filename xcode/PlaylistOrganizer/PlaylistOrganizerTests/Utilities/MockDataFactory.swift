//
//  MockDataFactory.swift
//  PlaylistOrganizerTests
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation
@testable import PlaylistOrganizer

/// Test veri fabrikası - Mock data oluşturma
class MockDataFactory {
    
    // MARK: - Playlist Mock Data
    
    /// Mock playlist'ler oluşturur
    static func createMockPlaylists() -> [Playlist] {
        return [
            Playlist(
                name: "Electronic Music",
                trackCount: 25,
                isSelected: false,
                isExpanded: false,
                children: [
                    Playlist(
                        name: "House",
                        trackCount: 12,
                        isSelected: false,
                        isExpanded: false,
                        isChild: true
                    ),
                    Playlist(
                        name: "Techno",
                        trackCount: 13,
                        isSelected: false,
                        isExpanded: false,
                        isChild: true
                    )
                ]
            ),
            Playlist(
                name: "Rock Classics",
                trackCount: 18,
                isSelected: false,
                isExpanded: false,
                children: [
                    Playlist(
                        name: "80s Rock",
                        trackCount: 8,
                        isSelected: false,
                        isExpanded: false,
                        isChild: true
                    ),
                    Playlist(
                        name: "90s Rock",
                        trackCount: 10,
                        isSelected: false,
                        isExpanded: false,
                        isChild: true
                    )
                ]
            ),
            Playlist(
                name: "Jazz Collection",
                trackCount: 32,
                isSelected: false,
                isExpanded: false,
                children: []
            )
        ]
    }
    
    /// Mock track'ler oluşturur
    static func createMockTracks() -> [Track] {
        return [
            Track(
                title: "Midnight City",
                artist: "M83",
                filePath: "/Music/Electronic/M83 - Midnight City.mp3",
                status: .found
            ),
            Track(
                title: "Strobe",
                artist: "Deadmau5",
                filePath: "/Music/Electronic/Deadmau5 - Strobe.mp3",
                status: .found
            ),
            Track(
                title: "Bohemian Rhapsody",
                artist: "Queen",
                filePath: "/Music/Rock/Queen - Bohemian Rhapsody.mp3",
                status: .missing
            ),
            Track(
                title: "Hotel California",
                artist: "Eagles",
                filePath: "/Music/Rock/Eagles - Hotel California.mp3",
                status: .found
            ),
            Track(
                title: "Take Five",
                artist: "Dave Brubeck",
                filePath: "/Music/Jazz/Dave Brubeck - Take Five.mp3",
                status: .found
            ),
            Track(
                title: "Blue in Green",
                artist: "Miles Davis",
                filePath: "/Music/Jazz/Miles Davis - Blue in Green.mp3",
                status: .missing
            ),
            Track(
                title: "Time",
                artist: "Pink Floyd",
                filePath: "/Music/Rock/Pink Floyd - Time.mp3",
                status: .found
            ),
            Track(
                title: "Strobe (Extended Mix)",
                artist: "Deadmau5",
                filePath: "/Music/Electronic/Deadmau5 - Strobe Extended.mp3",
                status: .found
            )
        ]
    }
    
    /// Mock artist'ler oluşturur
    static func createMockArtists() -> [Artist] {
        return [
            Artist(name: "M83", trackCount: 1),
            Artist(name: "Deadmau5", trackCount: 2),
            Artist(name: "Queen", trackCount: 1),
            Artist(name: "Eagles", trackCount: 1),
            Artist(name: "Dave Brubeck", trackCount: 1),
            Artist(name: "Miles Davis", trackCount: 1),
            Artist(name: "Pink Floyd", trackCount: 1)
        ]
    }
    
    // MARK: - Edge Case Data
    
    /// Edge case playlist'ler oluşturur
    static func createEdgeCasePlaylists() -> [Playlist] {
        return [
            // Boş playlist
            Playlist(
                name: "Empty Playlist",
                trackCount: 0,
                isSelected: false,
                isExpanded: false,
                children: []
            ),
            // Çok uzun isimli playlist
            Playlist(
                name: "Very Long Playlist Name That Should Test UI Layout And Text Wrapping Capabilities",
                trackCount: 1,
                isSelected: false,
                isExpanded: false,
                children: []
            ),
            // Özel karakterli playlist
            Playlist(
                name: "Playlist with Special Chars: !@#$%^&*()",
                trackCount: 5,
                isSelected: false,
                isExpanded: false,
                children: []
            )
        ]
    }
    
    /// Edge case track'ler oluşturur
    static func createEdgeCaseTracks() -> [Track] {
        return [
            // Boş title
            Track(
                title: "",
                artist: "Unknown Artist",
                filePath: "/Music/Unknown.mp3",
                status: .missing
            ),
            // Çok uzun title
            Track(
                title: "Very Long Track Title That Should Test UI Layout And Text Wrapping Capabilities In The Track List View",
                artist: "Test Artist",
                filePath: "/Music/Test.mp3",
                status: .found
            ),
            // Özel karakterli track
            Track(
                title: "Track with Special Chars: !@#$%^&*()",
                artist: "Artist with Special Chars: !@#$%^&*()",
                filePath: "/Music/Special/Chars.mp3",
                status: .found
            ),
            // Unicode karakterli track
            Track(
                title: "Track with Unicode: 中文 日本語 한국어",
                artist: "Unicode Artist: 中文 日本語 한국어",
                filePath: "/Music/Unicode/Test.mp3",
                status: .found
            )
        ]
    }
    
    // MARK: - Performance Test Data
    
    /// Performance test için büyük veri seti oluşturur
    static func createLargeDataset() -> (playlists: [Playlist], tracks: [Track]) {
        let playlists = createMockPlaylists()
        let tracks = createMockTracks()
        
        // Büyük veri seti oluştur
        var largePlaylists: [Playlist] = []
        var largeTracks: [Track] = []
        
        // 100 playlist oluştur
        for i in 0..<100 {
            let playlist = Playlist(
                name: "Performance Test Playlist \(i)",
                trackCount: i + 1,
                isSelected: false,
                isExpanded: false,
                children: []
            )
            largePlaylists.append(playlist)
        }
        
        // 1000 track oluştur
        for i in 0..<1000 {
            let track = Track(
                title: "Performance Test Track \(i)",
                artist: "Performance Test Artist \(i % 50)",
                filePath: "/Music/Performance/Test\(i).mp3",
                status: i % 3 == 0 ? .missing : .found
            )
            largeTracks.append(track)
        }
        
        return (playlists: largePlaylists, tracks: largeTracks)
    }
    
    // MARK: - Search Test Data
    
    /// Arama testleri için veri oluşturur
    static func createSearchTestData() -> [Track] {
        return [
            Track(title: "Search Test Track 1", artist: "Search Artist 1", filePath: "/test1.mp3", status: .found),
            Track(title: "Search Test Track 2", artist: "Search Artist 2", filePath: "/test2.mp3", status: .found),
            Track(title: "Different Track", artist: "Different Artist", filePath: "/test3.mp3", status: .found),
            Track(title: "Track with Search", artist: "Artist with Search", filePath: "/test4.mp3", status: .found),
            Track(title: "Another Track", artist: "Another Artist", filePath: "/test5.mp3", status: .missing)
        ]
    }
    
    // MARK: - Import Test Data
    
    /// Import testleri için veri oluşturur
    static func createImportTestData() -> [URL] {
        let tempDir = NSTemporaryDirectory()
        var urls: [URL] = []
        
        let fileExtensions = ["mp3", "wav", "aiff", "m4a"]
        
        for i in 0..<10 {
            let extension = fileExtensions[i % fileExtensions.count]
            let fileName = "import_test_\(i).\(extension)"
            let filePath = tempDir + fileName
            let url = URL(fileURLWithPath: filePath)
            urls.append(url)
        }
        
        return urls
    }
    
    // MARK: - Statistics Test Data
    
    /// İstatistik testleri için veri oluşturur
    static func createStatisticsTestData() -> (playlists: [Playlist], tracks: [Track]) {
        let playlists = createMockPlaylists()
        let tracks = createMockTracks()
        
        // İstatistik hesaplamaları için ek veri
        var additionalTracks: [Track] = []
        
        // Farklı status'larda track'ler
        for i in 0..<20 {
            let status: TrackStatus = i % 4 == 0 ? .missing : .found
            let track = Track(
                title: "Stats Test Track \(i)",
                artist: "Stats Test Artist \(i % 10)",
                filePath: "/Music/Stats/Test\(i).mp3",
                status: status
            )
            additionalTracks.append(track)
        }
        
        let allTracks = tracks + additionalTracks
        
        return (playlists: playlists, tracks: allTracks)
    }
    
    // MARK: - Database Test Data
    
    /// Database testleri için veri oluşturur
    static func createDatabaseTestData() -> (playlists: [Playlist], tracks: [Track]) {
        return createMockPlaylists().reduce(into: (playlists: [Playlist](), tracks: [Track]())) { result, playlist in
            result.playlists.append(playlist)
            
            // Her playlist için track'ler oluştur
            for i in 0..<playlist.trackCount {
                let track = Track(
                    title: "\(playlist.name) Track \(i + 1)",
                    artist: "\(playlist.name) Artist \(i + 1)",
                    filePath: "/Music/\(playlist.name)/Track\(i + 1).mp3",
                    status: i % 3 == 0 ? .missing : .found
                )
                result.tracks.append(track)
            }
        }
    }
    
    // MARK: - Cleanup
    
    /// Mock verilerini temizler
    static func cleanupMockData() {
        // Geçici dosyaları temizle
        let tempDir = NSTemporaryDirectory()
        let fileManager = FileManager.default
        
        do {
            let tempFiles = try fileManager.contentsOfDirectory(atPath: tempDir)
            for file in tempFiles {
                if file.hasPrefix("import_test_") || file.hasPrefix("test_") {
                    let filePath = tempDir + file
                    try fileManager.removeItem(atPath: filePath)
                }
            }
        } catch {
            print("Mock data cleanup error: \(error)")
        }
    }
}
