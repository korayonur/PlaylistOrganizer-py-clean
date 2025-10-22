//
//  Track.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation

struct Track: Identifiable, Equatable {
    let id = UUID()
    let title: String
    let artist: String
    let filePath: String
    let status: TrackStatus
    
    static func == (lhs: Track, rhs: Track) -> Bool {
        lhs.id == rhs.id
    }
}

enum TrackStatus {
    case found
    case missing
}
