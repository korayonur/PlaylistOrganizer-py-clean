//
//  DataService.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 23.10.2025.
//

import Foundation
import Combine

// MARK: - DataService
class DataService: ObservableObject {
    @Published var playlists: [Playlist] = []
    @Published var tracks: [Track] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let databaseManager = DatabaseManager()
    
    init() {
        // Otomatik veri yükleme devre dışı
        // loadData() // Manuel olarak çağrılacak
    }
    
    // MARK: - Public Methods
    
    func loadData() {
        isLoading = true
        errorMessage = nil
        
        // Sadece gerçek database'den veri yükle
        loadFromDatabase()
    }
    
    private func loadFromDatabase() {
        // Gerçek database'den veri yükle
        Task {
            do {
                print("📝 Database'den veri yükleniyor...")
                
                // DatabaseManager'dan connection al
                guard let db = databaseManager.getConnection() else {
                    print("❌ Database bağlantısı yok")
                    return
                }
                
                // PlaylistRepository oluştur
                let playlistRepository = SQLitePlaylistRepository(db: db)
                
                // Playlist'leri yükle
                let playlists = try await playlistRepository.getAllPlaylists()
                
                await MainActor.run {
                    self.playlists = playlists
                    print("✅ Database'den \(playlists.count) playlist yüklendi")
                }
            } catch {
                print("❌ Database yükleme hatası: \(error)")
                await MainActor.run {
                    self.errorMessage = "Database yükleme hatası: \(error.localizedDescription)"
                }
            }
        }
    }
    
    func refreshData() {
        loadData()
    }
    
    func addPlaylist(_ playlist: Playlist) {
        playlists.append(playlist)
        // TODO: Database'e kaydet
    }
    
    func updatePlaylist(_ playlist: Playlist) {
        if let index = playlists.firstIndex(where: { $0.id == playlist.id }) {
            playlists[index] = playlist
            // TODO: Database'i güncelle
        }
    }
    
    func deletePlaylist(_ playlist: Playlist) {
        playlists.removeAll { $0.id == playlist.id }
        // TODO: Database'den sil
    }
    
    func addTrack(_ track: Track) {
        tracks.append(track)
        // TODO: Database'e kaydet
    }
    
    func updateTrack(_ track: Track) {
        if let index = tracks.firstIndex(where: { $0.id == track.id }) {
            tracks[index] = track
            // TODO: Database'i güncelle
        }
    }
    
    func deleteTrack(_ track: Track) {
        tracks.removeAll { $0.id == track.id }
        // TODO: Database'den sil
    }
    
    // MARK: - Private Methods
    // Mock data yükleme fonksiyonları kaldırıldı
    
    // MARK: - Search Methods
    
    func searchPlaylists(query: String) -> [Playlist] {
        if query.isEmpty {
            return playlists
        }
        return playlists.filter { $0.name.localizedCaseInsensitiveContains(query) }
    }
    
    func searchTracks(query: String) -> [Track] {
        if query.isEmpty {
            return tracks
        }
        return tracks.filter { 
            $0.fileName.localizedCaseInsensitiveContains(query) ||
            $0.fileNameOnly.localizedCaseInsensitiveContains(query)
        }
    }
    
    // MARK: - Statistics
    
    var totalTracks: Int {
        tracks.count
    }
    
    var foundTracks: Int {
        tracks.filter { $0.status == .found }.count
    }
    
    var missingTracks: Int {
        tracks.filter { $0.status == .missing }.count
    }
    
    var totalPlaylists: Int {
        playlists.count
    }
    
    var selectedPlaylist: Playlist? {
        playlists.first { $0.isSelected }
    }
}
