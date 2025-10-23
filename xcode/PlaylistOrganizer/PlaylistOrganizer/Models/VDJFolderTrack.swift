//
//  VDJFolderTrack.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 23.10.2025.
//

import Foundation

/// VDJFolder dosyasından parse edilen track
struct VDJFolderTrack {
    let originalPath: String
    let normalizedName: String
    let metadata: M3UMetadata?
}
