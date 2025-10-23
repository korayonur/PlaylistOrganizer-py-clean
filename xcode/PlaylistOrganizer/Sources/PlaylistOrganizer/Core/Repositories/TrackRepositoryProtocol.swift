//
//  TrackRepositoryProtocol.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation

protocol TrackRepositoryProtocol {
    func getAllTracks() async throws -> [Track]
    func getTracks(by playlistId: UUID) async throws -> [Track]
    func getTrack(by id: UUID) async throws -> Track?
    func createTrack(_ track: Track) async throws -> Track
    func updateTrack(_ track: Track) async throws -> Track
    func deleteTrack(id: UUID) async throws
    func searchTracks(query: String) async throws -> [Track]
    func getTracksByStatus(_ status: TrackStatus) async throws -> [Track]
}

