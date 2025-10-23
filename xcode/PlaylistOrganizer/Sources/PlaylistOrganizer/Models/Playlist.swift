//
//  Playlist.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation

struct Playlist: Identifiable, Equatable {
    let id = UUID()
    let name: String
    let trackCount: Int
    var isSelected: Bool = false
    var isExpanded: Bool = false
    var children: [Playlist] = []
    var isChild: Bool = false
    
    static func == (lhs: Playlist, rhs: Playlist) -> Bool {
        lhs.id == rhs.id
    }
}
