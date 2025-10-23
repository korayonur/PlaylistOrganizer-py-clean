//
//  ImportResult.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 23.10.2025.
//

import Foundation

/// Import sonucu
struct ImportResult {
    let musicFiles: [ScannedFile]
    let tracks: [ScannedTrack]
    let playlistFiles: [ScannedPlaylistFile]
    let m3uCount: Int
    let vdjfolderCount: Int
    let totalFiles: Int
    let duration: TimeInterval
    let success: Bool
}

/// Import progress bilgisi
struct ImportProgress {
    let stage: String
    let current: Int
    let total: Int
    let percentage: Int
    let message: String
}
