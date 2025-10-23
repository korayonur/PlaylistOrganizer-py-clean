//
//  Artist.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation

struct Artist: Identifiable, Equatable {
    let id = UUID()
    let name: String
    let trackCount: Int
    
    static func == (lhs: Artist, rhs: Artist) -> Bool {
        lhs.id == rhs.id
    }
}
