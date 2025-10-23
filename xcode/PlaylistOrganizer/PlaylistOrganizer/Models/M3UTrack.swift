//
//  M3UTrack.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 23.10.2025.
//

import Foundation

/// M3U dosyasından parse edilen track
struct M3UTrack {
    let originalPath: String
    let normalizedName: String
    let metadata: M3UMetadata?
}

/// M3U metadata bilgileri
struct M3UMetadata {
    let title: String?
    let artist: String?
    let duration: TimeInterval?
    let bpm: Double?
    let key: String?
}
