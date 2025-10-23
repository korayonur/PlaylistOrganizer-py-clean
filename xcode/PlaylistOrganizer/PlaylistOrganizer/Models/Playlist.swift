//
//  Playlist.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation

struct Playlist: Identifiable, Equatable, Codable {
    let id: Int
    let path: String
    let name: String
    let type: PlaylistType
    let trackCount: Int
    let createdAt: Date
    let updatedAt: Date
    
    // MARK: - UI Properties (temporary)
    var isSelected: Bool = false
    var isExpanded: Bool = false
    var children: [Playlist] = []
    var isChild: Bool = false
    
    // MARK: - Computed Properties
    
    /// M3U playlist mi?
    var isM3U: Bool {
        return type == .m3u
    }
    
    /// VDJ Folder playlist mi?
    var isVDJFolder: Bool {
        return type == .vdjfolder
    }
    
    /// Playlist boş mu?
    var isEmpty: Bool {
        return trackCount == 0
    }
    
    // MARK: - Validation
    
    /// Playlist geçerli mi?
    var isValid: Bool {
        return !path.isEmpty && !name.isEmpty && type != .unknown
    }
    
    // MARK: - Equatable
    
    static func == (lhs: Playlist, rhs: Playlist) -> Bool {
        return lhs.id == rhs.id
    }
    
    // MARK: - Factory Methods
    
    /// Dosyadan Playlist oluştur
    static func fromFile(_ filePath: String, playlistType: PlaylistType) -> Playlist {
        let fileName = URL(fileURLWithPath: filePath).lastPathComponent
        let name = URL(fileURLWithPath: filePath).deletingPathExtension().lastPathComponent
        
        return Playlist(
            id: 0, // Will be set by database
            path: filePath,
            name: name,
            type: playlistType,
            trackCount: 0,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
}

enum PlaylistType: String, Codable, CaseIterable {
    case m3u = "m3u"
    case vdjfolder = "vdjfolder"
    case unknown = "unknown"
}
