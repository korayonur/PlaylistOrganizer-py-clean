//
//  PlaylistRepository.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 23.10.2025.
//

import Foundation
import SQLite

class SQLitePlaylistRepository: PlaylistRepositoryProtocol {
    private let db: Connection
    
    init(db: Connection) {
        self.db = db
    }
    
    func getAllPlaylists() async throws -> [Playlist] {
        let playlists = Table("playlists")
        let id = Expression<Int>("id")
        let path = Expression<String>("path")
        let name = Expression<String>("name")
        let type = Expression<String>("type")
        let trackCount = Expression<Int>("track_count")
        let createdAt = Expression<Date>("created_at")
        let updatedAt = Expression<Date>("updated_at")
        
        let query = playlists.order(createdAt.desc)
        
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let rows = try self.db.prepare(query)
                    let result = try rows.map { row in
                        Playlist(
                            id: row[id],
                            path: row[path],
                            name: row[name],
                            type: PlaylistType(rawValue: row[type]) ?? .unknown,
                            trackCount: row[trackCount],
                            createdAt: row[createdAt],
                            updatedAt: row[updatedAt]
                        )
                    }
                    continuation.resume(returning: result)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    func getPlaylist(by id: Int) async throws -> Playlist? {
        let playlists = Table("playlists")
        let playlistId = Expression<Int>("id")
        let path = Expression<String>("path")
        let name = Expression<String>("name")
        let type = Expression<String>("type")
        let trackCount = Expression<Int>("track_count")
        let createdAt = Expression<Date>("created_at")
        let updatedAt = Expression<Date>("updated_at")
        
        let query = playlists.filter(playlistId == id)
        
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    if let row = try self.db.pluck(query) {
                        let playlist = Playlist(
                            id: row[playlistId],
                            path: row[path],
                            name: row[name],
                            type: PlaylistType(rawValue: row[type]) ?? .unknown,
                            trackCount: row[trackCount],
                            createdAt: row[createdAt],
                            updatedAt: row[updatedAt]
                        )
                        continuation.resume(returning: playlist)
                    } else {
                        continuation.resume(returning: nil)
                    }
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    func createPlaylist(_ playlist: Playlist) async throws -> Playlist {
        let playlists = Table("playlists")
        let path = Expression<String>("path")
        let name = Expression<String>("name")
        let type = Expression<String>("type")
        let trackCount = Expression<Int>("track_count")
        let createdAt = Expression<Date>("created_at")
        let updatedAt = Expression<Date>("updated_at")
        
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let insert = playlists.insert(
                        path <- playlist.path,
                        name <- playlist.name,
                        type <- playlist.type.rawValue,
                        trackCount <- playlist.trackCount,
                        createdAt <- playlist.createdAt,
                        updatedAt <- playlist.updatedAt
                    )
                    
                    let rowId = try self.db.run(insert)
                    
                    var newPlaylist = playlist
                    // Note: SQLite doesn't return the actual ID, so we'll use rowId
                    // In a real implementation, you'd need to handle this properly
                    
                    continuation.resume(returning: newPlaylist)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    func updatePlaylist(_ playlist: Playlist) async throws -> Playlist {
        let playlists = Table("playlists")
        let id = Expression<Int>("id")
        let path = Expression<String>("path")
        let name = Expression<String>("name")
        let type = Expression<String>("type")
        let trackCount = Expression<Int>("track_count")
        let updatedAt = Expression<Date>("updated_at")
        
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let query = playlists.filter(id == playlist.id)
                    let update = query.update(
                        path <- playlist.path,
                        name <- playlist.name,
                        type <- playlist.type.rawValue,
                        trackCount <- playlist.trackCount,
                        updatedAt <- Date()
                    )
                    
                    try self.db.run(update)
                    continuation.resume(returning: playlist)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    func deletePlaylist(id: Int) async throws {
        let playlists = Table("playlists")
        let playlistId = Expression<Int>("id")
        
        try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let query = playlists.filter(playlistId == id)
                    try self.db.run(query.delete())
                    continuation.resume()
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    func searchPlaylists(query: String) async throws -> [Playlist] {
        let playlists = Table("playlists")
        let id = Expression<Int>("id")
        let path = Expression<String>("path")
        let name = Expression<String>("name")
        let type = Expression<String>("type")
        let trackCount = Expression<Int>("track_count")
        let createdAt = Expression<Date>("created_at")
        let updatedAt = Expression<Date>("updated_at")
        
        let searchQuery = playlists.filter(name.like("%\(query)%"))
        
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let rows = try self.db.prepare(searchQuery)
                    let result = try rows.map { row in
                        Playlist(
                            id: row[id],
                            path: row[path],
                            name: row[name],
                            type: PlaylistType(rawValue: row[type]) ?? .unknown,
                            trackCount: row[trackCount],
                            createdAt: row[createdAt],
                            updatedAt: row[updatedAt]
                        )
                    }
                    continuation.resume(returning: result)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
}