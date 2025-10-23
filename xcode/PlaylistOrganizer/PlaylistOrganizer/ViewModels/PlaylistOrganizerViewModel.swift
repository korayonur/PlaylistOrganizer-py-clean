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
    @Published var searchText: String = ""
    @Published var showMissingTracksOnly: Bool = false
    
    private let dataService = DataService()
    private let databaseManager = DatabaseManager()
    
    // DataService'den veri al
    var playlists: [Playlist] { dataService.playlists }
    var tracks: [Track] { dataService.tracks }
    var isLoading: Bool { dataService.isLoading }
    var errorMessage: String? { dataService.errorMessage }
    
    // Computed properties
    var totalTracks: Int { dataService.totalTracks }
    var foundTracks: Int { dataService.foundTracks }
    var missingTracks: Int { dataService.missingTracks }
    var totalPlaylists: Int { dataService.totalPlaylists }
    var selectedPlaylist: Playlist? { dataService.selectedPlaylist }
    
    init() {
        // DatabaseManager instance'ı oluştur (database dosyası oluşturulur)
        _ = DatabaseManager()
        testDatabaseConnection()
    }
    
    private func testDatabaseConnection() {
        if databaseManager.testConnection() {
            print("✅ DatabaseManager başarıyla bağlandı")
        } else {
            print("❌ DatabaseManager bağlantı hatası")
        }
    }
    
    func refreshData() {
        dataService.refreshData()
    }
    
    func selectPlaylist(_ playlist: Playlist) {
        // DataService'de playlist seçimini güncelle
        var updatedPlaylists = playlists
        
        // Tüm playlist'lerin seçimini kaldır
        for i in 0..<updatedPlaylists.count {
            updatedPlaylists[i].isSelected = false
            for j in 0..<updatedPlaylists[i].children.count {
                updatedPlaylists[i].children[j].isSelected = false
            }
        }
        
        // Seçilen playlist'i bul ve seç
        for i in 0..<updatedPlaylists.count {
            if updatedPlaylists[i].id == playlist.id {
                updatedPlaylists[i].isSelected = true
                updatedPlaylists[i].isExpanded = !updatedPlaylists[i].isExpanded
            } else {
                for j in 0..<updatedPlaylists[i].children.count {
                    if updatedPlaylists[i].children[j].id == playlist.id {
                        updatedPlaylists[i].children[j].isSelected = true
                        updatedPlaylists[i].isExpanded = true
                    }
                }
            }
        }
        
        // DataService'i güncelle
        for playlist in updatedPlaylists {
            dataService.updatePlaylist(playlist)
        }
        
        // Track'leri filtrele (şimdilik tüm track'leri göster)
        // TODO: Seçilen playlist'e göre track'leri filtrele
    }
    
    // MARK: - Search Methods
    
    func searchPlaylists(query: String) -> [Playlist] {
        return dataService.searchPlaylists(query: query)
    }
    
    func searchTracks(query: String) -> [Track] {
        return dataService.searchTracks(query: query)
    }
    
    // MARK: - CRUD Operations
    
    func addPlaylist(_ playlist: Playlist) {
        dataService.addPlaylist(playlist)
    }
    
    func updatePlaylist(_ playlist: Playlist) {
        dataService.updatePlaylist(playlist)
    }
    
    func deletePlaylist(_ playlist: Playlist) {
        dataService.deletePlaylist(playlist)
    }
    
    func addTrack(_ track: Track) {
        dataService.addTrack(track)
    }
    
    func updateTrack(_ track: Track) {
        dataService.updateTrack(track)
    }
    
    func deleteTrack(_ track: Track) {
        dataService.deleteTrack(track)
    }
}
