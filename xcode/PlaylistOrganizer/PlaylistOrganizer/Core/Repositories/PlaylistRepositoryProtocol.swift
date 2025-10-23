//
//  PlaylistRepositoryProtocol.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation

protocol PlaylistRepositoryProtocol {
    func getAllPlaylists() async throws -> [Playlist]
    func getPlaylist(by id: Int) async throws -> Playlist?
    func createPlaylist(_ playlist: Playlist) async throws -> Playlist
    func updatePlaylist(_ playlist: Playlist) async throws -> Playlist
    func deletePlaylist(id: Int) async throws
    func searchPlaylists(query: String) async throws -> [Playlist]
}

