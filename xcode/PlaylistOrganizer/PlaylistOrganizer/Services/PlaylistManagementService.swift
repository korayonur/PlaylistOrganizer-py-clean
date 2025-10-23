//
//  PlaylistManagementService.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation
import Combine

class PlaylistManagementService: ObservableObject {
    @Published var playlists: [Playlist] = []
    @Published var selectedPlaylist: Playlist?
    @Published var isCreatingPlaylist: Bool = false
    @Published var isEditingPlaylist: Bool = false
    @Published var editingPlaylist: Playlist?
    
    private let playlistService: PlaylistService
    
    init(playlistService: PlaylistService) {
        self.playlistService = playlistService
        loadPlaylists()
    }
    
    // MARK: - Public Methods
    
    func loadPlaylists() {
        Task {
            do {
                let loadedPlaylists = try await playlistService.getAllPlaylists()
                await MainActor.run {
                    self.playlists = loadedPlaylists
                }
            } catch {
                print("❌ Playlist yükleme hatası: \(error)")
                // Fallback: Mock data kullan
                await MainActor.run {
                    self.playlists = MockDataService.getSamplePlaylists()
                }
            }
        }
    }
    
    func createPlaylist(name: String, parentId: Int? = nil) {
        Task {
            do {
                let newPlaylist = Playlist(
                    id: 0, // Will be set by database
                    path: "",
                    name: name,
                    type: .unknown,
                    trackCount: 0,
                    createdAt: Date(),
                    updatedAt: Date()
                )
                try await playlistService.createPlaylist(newPlaylist)
                await MainActor.run {
                    self.isCreatingPlaylist = false
                }
                loadPlaylists() // Refresh
            } catch {
                print("❌ Playlist oluşturma hatası: \(error)")
            }
        }
    }
    
    func updatePlaylist(_ playlist: Playlist) {
        Task {
            do {
                try await playlistService.updatePlaylist(playlist)
                await MainActor.run {
                    self.isEditingPlaylist = false
                    self.editingPlaylist = nil
                }
                loadPlaylists() // Refresh
            } catch {
                print("❌ Playlist güncelleme hatası: \(error)")
            }
        }
    }
    
    func deletePlaylist(_ playlist: Playlist) {
        Task {
            do {
                try await playlistService.deletePlaylist(id: playlist.id)
                await MainActor.run {
                    if self.selectedPlaylist?.id == playlist.id {
                        self.selectedPlaylist = nil
                    }
                }
                loadPlaylists() // Refresh
            } catch {
                print("❌ Playlist silme hatası: \(error)")
            }
        }
    }
    
    func selectPlaylist(_ playlist: Playlist) {
        selectedPlaylist = playlist
        
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
    }
    
    func togglePlaylistExpansion(_ playlist: Playlist) {
        for i in 0..<playlists.count {
            if playlists[i].id == playlist.id {
                playlists[i].isExpanded.toggle()
                break
            }
        }
    }
    
    func startCreatingPlaylist() {
        isCreatingPlaylist = true
    }
    
    func cancelCreatingPlaylist() {
        isCreatingPlaylist = false
    }
    
    func startEditingPlaylist(_ playlist: Playlist) {
        editingPlaylist = playlist
        isEditingPlaylist = true
    }
    
    func cancelEditingPlaylist() {
        editingPlaylist = nil
        isEditingPlaylist = false
    }
    
    // MARK: - Helper Methods
    
    func getPlaylistById(_ id: Int) -> Playlist? {
        for playlist in playlists {
            if playlist.id == id {
                return playlist
            }
            for child in playlist.children {
                if child.id == id {
                    return child
                }
            }
        }
        return nil
    }
    
    func getPlaylistHierarchy() -> [Playlist] {
        return playlists.filter { !$0.isChild }
    }
    
    func getChildPlaylists(for parentId: Int) -> [Playlist] {
        guard let parent = getPlaylistById(parentId) else { return [] }
        return parent.children
    }
}
