//
//  PlaylistService.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation
import Combine

class PlaylistService: ObservableObject {
    @Published var playlists: [Playlist] = []
    @Published var isLoading: Bool = false
    @Published var error: String?
    
    private let playlistRepository: PlaylistRepositoryProtocol
    private var cancellables = Set<AnyCancellable>()
    
    init(playlistRepository: PlaylistRepositoryProtocol) {
        self.playlistRepository = playlistRepository
        loadPlaylists()
    }
    
    func loadPlaylists() {
        isLoading = true
        error = nil
        
        Task {
            do {
                let playlists = try await playlistRepository.getAllPlaylists()
                await MainActor.run {
                    self.playlists = playlists
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    func getAllPlaylists() async throws -> [Playlist] {
        return try await playlistRepository.getAllPlaylists()
    }
    
    func createPlaylist(_ playlist: Playlist) async throws -> Playlist {
        return try await playlistRepository.createPlaylist(playlist)
    }
    
    func updatePlaylist(_ playlist: Playlist) {
        Task {
            do {
                let updatedPlaylist = try await playlistRepository.updatePlaylist(playlist)
                await MainActor.run {
                    if let index = self.playlists.firstIndex(where: { $0.id == updatedPlaylist.id }) {
                        self.playlists[index] = updatedPlaylist
                    }
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                }
            }
        }
    }
    
    func deletePlaylist(id: UUID) {
        Task {
            do {
                try await playlistRepository.deletePlaylist(id: id)
                await MainActor.run {
                    self.playlists.removeAll { $0.id == id }
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                }
            }
        }
    }
    
    func searchPlaylists(query: String) {
        Task {
            do {
                let searchResults = try await playlistRepository.searchPlaylists(query: query)
                await MainActor.run {
                    self.playlists = searchResults
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                }
            }
        }
    }
}
