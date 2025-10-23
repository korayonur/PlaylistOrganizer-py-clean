//
//  Track.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation

struct Track: Identifiable, Equatable, Codable {
    let id: Int
    let path: String
    let fileName: String
    let fileNameOnly: String
    let normalizedFileName: String
    let createdAt: Date
    
    // MARK: - Computed Properties
    
    /// Track'in dosya adını al (uzantısız)
    var fileNameWithoutExtension: String {
        return fileNameOnly
    }
    
    /// Dosya var mı kontrol et
    var fileExists: Bool {
        return FileManager.default.fileExists(atPath: path)
    }
    
    /// Track durumu
    var status: TrackStatus {
        return fileExists ? .found : .missing
    }
    
    // MARK: - Validation
    
    /// Track geçerli mi?
    var isValid: Bool {
        return !path.isEmpty && !fileName.isEmpty && !normalizedFileName.isEmpty
    }
    
    // MARK: - Equatable
    
    static func == (lhs: Track, rhs: Track) -> Bool {
        return lhs.id == rhs.id
    }
    
    // MARK: - Factory Methods
    
    /// Playlist entry'den Track oluştur
    static func fromPlaylistEntry(_ entry: PlaylistEntry) -> Track {
        return Track(
            id: entry.id,
            path: entry.path,
            fileName: entry.fileName,
            fileNameOnly: entry.fileNameOnly,
            normalizedFileName: entry.normalizedFileName,
            createdAt: entry.createdAt
        )
    }
}

enum TrackStatus: String, Codable, CaseIterable {
    case found = "found"
    case missing = "missing"
}

// MARK: - Supporting Types

struct PlaylistEntry {
    let id: Int
    let path: String
    let fileName: String
    let fileNameOnly: String
    let normalizedFileName: String
    let createdAt: Date
}
