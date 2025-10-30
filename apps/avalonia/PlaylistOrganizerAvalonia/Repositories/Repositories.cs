using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.Repositories;

/// <summary>
/// Playlist repository implementation - Repository Pattern
/// </summary>
public class PlaylistRepository : IPlaylistRepository
{
    private readonly IDatabaseManager _databaseManager;

    public PlaylistRepository(IDatabaseManager databaseManager)
    {
        _databaseManager = databaseManager;
    }

    public async Task<List<Playlist>> GetAllAsync()
    {
        return await _databaseManager.GetPlaylistsAsync();
    }

    public async Task<Playlist?> GetByIdAsync(int id)
    {
        var playlists = await GetAllAsync();
        return playlists.FirstOrDefault(p => p.Id == id);
    }

    public async Task<List<Track>> GetTracksAsync(int playlistId)
    {
        return await _databaseManager.GetTracksForPlaylistAsync(playlistId);
    }
}

/// <summary>
/// Track repository implementation - Repository Pattern
/// </summary>
public class TrackRepository : ITrackRepository
{
    private readonly IDatabaseManager _databaseManager;

    public TrackRepository(IDatabaseManager databaseManager)
    {
        _databaseManager = databaseManager;
    }

    public async Task<List<Track>> GetByPlaylistIdAsync(int playlistId)
    {
        return await _databaseManager.GetTracksForPlaylistAsync(playlistId);
    }

    public async Task<Track?> GetByIdAsync(int id)
    {
        // Bu implementasyon için tüm track'leri getirip filtrele
        // Gerçek uygulamada ID'ye göre direkt sorgu yapılmalı
        var allPlaylists = await _databaseManager.GetPlaylistsAsync();
        foreach (var playlist in allPlaylists)
        {
            var tracks = await _databaseManager.GetTracksForPlaylistAsync(playlist.Id);
            var track = tracks.FirstOrDefault(t => t.Id == id);
            if (track != null) return track;
        }
        return null;
    }

    public async Task<bool> CheckFileExistsAsync(string filePath)
    {
        return await Task.FromResult(File.Exists(filePath));
    }
}
