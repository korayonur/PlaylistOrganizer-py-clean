//
//  PlaylistOrganizerViewModel.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import SwiftUI
import Foundation
import Combine

// MARK: - ViewModel
class PlaylistOrganizerViewModel: ObservableObject {
    @Published var playlists: [Playlist] = []
    @Published var tracks: [Track] = []
    @Published var searchText: String = ""
    @Published var showMissingTracksOnly: Bool = false
    
    var totalTracks: Int { tracks.count }
    var foundTracks: Int { tracks.filter { $0.status == .found }.count }
    var missingTracks: Int { tracks.filter { $0.status == .missing }.count }
    
    init() {
        loadMockData()
    }
    
    func loadMockData() {
        playlists = MockDataService.getSamplePlaylists()
        tracks = MockDataService.getSampleTracks()
    }
    
    func selectPlaylist(_ playlist: Playlist) {
        // Tüm playlist'lerin seçimini kaldır
        for i in 0..<playlists.count {
            playlists[i].isSelected = false
            for j in 0..<playlists[i].children.count {
                playlists[i].children[j].isSelected = false
            }
        }
        
        // Seçilen playlist'i bul ve seç
        for i in 0..<playlists.count {
            if playlists[i].id == playlist.id {
                playlists[i].isSelected = true
                playlists[i].isExpanded = !playlists[i].isExpanded
            } else {
                for j in 0..<playlists[i].children.count {
                    if playlists[i].children[j].id == playlist.id {
                        playlists[i].children[j].isSelected = true
                        playlists[i].isExpanded = true
                    }
                }
            }
        }
        
        // Track'leri filtrele (şimdilik tüm track'leri göster)
        // TODO: Seçilen playlist'e göre track'leri filtrele
    }
}
