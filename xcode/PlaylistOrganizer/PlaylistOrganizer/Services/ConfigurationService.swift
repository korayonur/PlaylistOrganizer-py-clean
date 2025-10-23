//
//  ConfigurationService.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 23.10.2025.
//

import Foundation
import Combine

/// Merkezi konfigürasyon servisi
/// Eski projeden alınan ayarları SwiftUI projesine entegre eder
class ConfigurationService: ObservableObject {
    static let shared = ConfigurationService()
    
    // MARK: - Import Paths
    
    /// Müzik dosyaları klasörü
    let musicPath: String = "/Users/koray/Music/KorayMusics"
    
    /// VirtualDJ klasörü (M3U ve VDJFOLDER dosyaları sadece burada taranır)
    let virtualDJPath: String = "/Users/koray/Library/Application Support/VirtualDJ"
    
    /// Dışlanacak klasörler
    let excludePaths: [String] = [
        "/Users/koray/Library/Application Support/VirtualDJ/Folders/My Library.subfolders"
    ]
    
    // MARK: - File Extensions
    
    /// Playlist dosya uzantıları (M3U, VDJFOLDER)
    let playlistExtensions: [String] = [".m3u", ".m3u8", ".vdjfolder"]
    
    /// Müzik ve medya dosyası uzantıları (VirtualDJ destekli formatlar)
    let musicExtensions: [String] = [
        // Audio formatları
        ".mp3", ".wav", ".cda", ".wma", ".asf", ".ogg", ".m4a", ".aac",
        ".aif", ".aiff", ".flac", ".mpc", ".ape", ".weba", ".opus",
        
        // VirtualDJ özel formatları
        ".vdj", ".vdjcache", ".vdjedit", ".vdjsample", ".vdjcachev",
        
        // Video formatları
        ".mp4", ".ogm", ".ogv", ".avi", ".mpg", ".mpeg", ".wmv",
        ".vob", ".mov", ".divx", ".m4v", ".mkv", ".flv", ".webm",
        
        // Diğer
        ".apng"
    ]
    
    // MARK: - Database Settings
    
    /// Veritabanı dosya adı
    let databaseFileName: String = "playlist_organizer_swiftui.db"
    
    /// Eski veritabanı dosya yolu (karşılaştırma için)
    let legacyDatabasePath: String = "/Users/koray/projects/PlaylistOrganizer-py-backup/musicfiles.db"
    
    // MARK: - Default Import Settings
    
    /// Varsayılan import ayarları
    @Published var defaultImportSettings: ImportSettings
    
    private init() {
        self.defaultImportSettings = ImportSettings(
            musicPath: musicPath,
            virtualDJPath: virtualDJPath,
            includeMusicFiles: true,
            includePlaylistFiles: true,
            scanSubdirectories: true,
            excludePaths: excludePaths
        )
    }
    
    // MARK: - Helper Methods
    
    /// Playlist dosyası uzantısı mı kontrol et
    func isPlaylistExtension(_ fileExtension: String) -> Bool {
        return playlistExtensions.contains(fileExtension.lowercased())
    }
    
    /// Müzik dosyası uzantısı mı kontrol et
    func isMusicExtension(_ fileExtension: String) -> Bool {
        return musicExtensions.contains(fileExtension.lowercased())
    }
    
    /// Bir path'in dışlanacak klasörlerde olup olmadığını kontrol et
    func isExcludedPath(_ filePath: String) -> Bool {
        return excludePaths.contains { excludePath in
            filePath.contains(excludePath)
        }
    }
    
    /// VirtualDJ klasöründe mi kontrol et
    func isVirtualDJPath(_ filePath: String) -> Bool {
        return filePath.contains(virtualDJPath)
    }
    
    /// Dosya tipini belirle (music, playlist, unknown)
    func getFileType(for filePath: String) -> FileType {
        let fileExtension = URL(fileURLWithPath: filePath).pathExtension.lowercased()
        
        if isPlaylistExtension(fileExtension) {
            return .playlist
        } else if isMusicExtension(fileExtension) {
            return .music
        } else {
            return .unknown
        }
    }
    
    /// Playlist tipini belirle (m3u, vdjfolder, unknown)
    func getPlaylistType(for filePath: String) -> PlaylistType {
        let fileExtension = URL(fileURLWithPath: filePath).pathExtension.lowercased()
        
        switch fileExtension {
        case ".m3u", ".m3u8":
            return .m3u
        case ".vdjfolder":
            return .vdjfolder
        default:
            return .unknown
        }
    }
}

// MARK: - Supporting Types

struct ImportSettings {
    let musicPath: String
    let virtualDJPath: String
    let includeMusicFiles: Bool
    let includePlaylistFiles: Bool
    let scanSubdirectories: Bool
    let excludePaths: [String]
}

enum FileType {
    case music
    case playlist
    case unknown
}
