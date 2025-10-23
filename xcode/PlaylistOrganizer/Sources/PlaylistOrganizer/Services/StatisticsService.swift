//
//  StatisticsService.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation
import Combine

class StatisticsService: ObservableObject {
    @Published var totalTracks: Int = 0
    @Published var foundTracks: Int = 0
    @Published var missingTracks: Int = 0
    @Published var totalPlaylists: Int = 0
    @Published var totalArtists: Int = 0
    @Published var totalGenres: Int = 0
    @Published var averageTrackDuration: TimeInterval = 0
    @Published var totalDuration: TimeInterval = 0
    @Published var mostPlayedTrack: Track?
    @Published var mostPlayedArtist: String = ""
    @Published var mostPlayedGenre: String = ""
    @Published var recentImports: [ImportRecord] = []
    @Published var searchHistory: [SearchRecord] = []
    @Published var playlistDistribution: [PlaylistStats] = []
    @Published var genreDistribution: [GenreStats] = []
    @Published var artistDistribution: [ArtistStats] = []
    @Published var isCalculating: Bool = false
    
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        loadStatistics()
    }
    
    // MARK: - Public Methods
    
    func loadStatistics() {
        isCalculating = true
        
        Task {
            await MainActor.run {
                self.calculateBasicStats()
                self.calculateAdvancedStats()
                self.calculateDistributionStats()
                self.isCalculating = false
            }
        }
    }
    
    func refreshStatistics() {
        loadStatistics()
    }
    
    func getTrackStatistics() -> TrackStatistics {
        return TrackStatistics(
            total: totalTracks,
            found: foundTracks,
            missing: missingTracks,
            averageDuration: averageTrackDuration,
            totalDuration: totalDuration
        )
    }
    
    func getPlaylistStatistics() -> PlaylistStatistics {
        return PlaylistStatistics(
            total: totalPlaylists,
            distribution: playlistDistribution
        )
    }
    
    func getArtistStatistics() -> ArtistStatistics {
        return ArtistStatistics(
            total: totalArtists,
            mostPlayed: mostPlayedArtist,
            distribution: artistDistribution
        )
    }
    
    func getGenreStatistics() -> GenreStatistics {
        return GenreStatistics(
            total: totalGenres,
            mostPlayed: mostPlayedGenre,
            distribution: genreDistribution
        )
    }
    
    func getRecentActivity() -> RecentActivity {
        return RecentActivity(
            imports: recentImports,
            searches: searchHistory
        )
    }
    
    // MARK: - Private Methods
    
    private func calculateBasicStats() {
        // Mock data'dan temel istatistikleri hesapla
        let mockTracks = MockDataService.getSampleTracks()
        let mockPlaylists = MockDataService.getSamplePlaylists()
        
        totalTracks = mockTracks.count
        foundTracks = mockTracks.filter { $0.status == .found }.count
        missingTracks = mockTracks.filter { $0.status == .missing }.count
        totalPlaylists = mockPlaylists.count
        
        // Artist ve genre sayıları
        let artists = Set(mockTracks.map { $0.artist })
        totalArtists = artists.count
        
        // En çok çalınan sanatçı
        let artistCounts = Dictionary(grouping: mockTracks, by: { $0.artist })
            .mapValues { $0.count }
        mostPlayedArtist = artistCounts.max(by: { $0.value < $1.value })?.key ?? ""
    }
    
    private func calculateAdvancedStats() {
        let mockTracks = MockDataService.getSampleTracks()
        
        // Süre hesaplamaları (mock data'da süre yok, varsayılan değerler)
        let totalDurationSeconds = mockTracks.count * 240 // 4 dakika ortalama
        totalDuration = TimeInterval(totalDurationSeconds)
        averageTrackDuration = totalDuration / Double(mockTracks.count)
        
        // En çok çalınan track
        mostPlayedTrack = mockTracks.first
    }
    
    private func calculateDistributionStats() {
        let mockTracks = MockDataService.getSampleTracks()
        let mockPlaylists = MockDataService.getSamplePlaylists()
        
        // Playlist dağılımı
        playlistDistribution = mockPlaylists.map { playlist in
            PlaylistStats(
                name: playlist.name,
                trackCount: playlist.trackCount,
                percentage: Double(playlist.trackCount) / Double(totalTracks) * 100
            )
        }
        
        // Artist dağılımı
        let artistCounts = Dictionary(grouping: mockTracks, by: { $0.artist })
            .mapValues { $0.count }
        
        artistDistribution = artistCounts.map { (artist, count) in
            ArtistStats(
                name: artist,
                trackCount: count,
                percentage: Double(count) / Double(totalTracks) * 100
            )
        }.sorted { $0.trackCount > $1.trackCount }
        
        // Genre dağılımı (mock data'da genre yok, varsayılan)
        genreDistribution = [
            GenreStats(name: "Electronic", trackCount: totalTracks / 3, percentage: 33.3),
            GenreStats(name: "House", trackCount: totalTracks / 3, percentage: 33.3),
            GenreStats(name: "Techno", trackCount: totalTracks / 3, percentage: 33.3)
        ]
    }
    
    func addImportRecord(_ record: ImportRecord) {
        recentImports.insert(record, at: 0)
        if recentImports.count > 10 {
            recentImports.removeLast()
        }
    }
    
    func addSearchRecord(_ record: SearchRecord) {
        searchHistory.insert(record, at: 0)
        if searchHistory.count > 20 {
            searchHistory.removeLast()
        }
    }
}

// MARK: - Data Models

struct TrackStatistics {
    let total: Int
    let found: Int
    let missing: Int
    let averageDuration: TimeInterval
    let totalDuration: TimeInterval
}

struct PlaylistStatistics {
    let total: Int
    let distribution: [PlaylistStats]
}

struct ArtistStatistics {
    let total: Int
    let mostPlayed: String
    let distribution: [ArtistStats]
}

struct GenreStatistics {
    let total: Int
    let mostPlayed: String
    let distribution: [GenreStats]
}

struct RecentActivity {
    let imports: [ImportRecord]
    let searches: [SearchRecord]
}

struct PlaylistStats {
    let name: String
    let trackCount: Int
    let percentage: Double
}

struct ArtistStats {
    let name: String
    let trackCount: Int
    let percentage: Double
}

struct GenreStats {
    let name: String
    let trackCount: Int
    let percentage: Double
}

struct ImportRecord {
    let id = UUID()
    let timestamp: Date
    let fileCount: Int
    let successCount: Int
    let errorCount: Int
}

struct SearchRecord {
    let id = UUID()
    let timestamp: Date
    let query: String
    let resultCount: Int
}

