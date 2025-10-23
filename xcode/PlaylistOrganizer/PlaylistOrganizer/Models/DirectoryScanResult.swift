//
//  DirectoryScanResult.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 23.10.2025.
//

import Foundation

/// Klasör tarama sonucu
class DirectoryScanResult {
    var musicFiles: [ScannedFile] = []
    var tracks: [ScannedTrack] = []
    var playlistFiles: [ScannedPlaylistFile] = []
}

/// Taranan dosya
struct ScannedFile {
    let path: String
    let fileName: String
    let fileNameOnly: String
    let normalizedFileName: String
    let fileExtension: String
    let size: Int64
    let modified: Date
    let created: Date
}

/// Taranan track (M3U/VDJFolder'dan)
struct ScannedTrack {
    let path: String
    let fileName: String
    let fileNameOnly: String
    let normalizedFileName: String
    let fileExtension: String
    let source: String
    let sourceFile: String
    let metadata: M3UMetadata?
}

/// Taranan playlist dosyası
struct ScannedPlaylistFile {
    let path: String
    let fileName: String
    let type: PlaylistType
}
