using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PlaylistOrganizerAvalonia.Domain.Entities;

namespace PlaylistOrganizerAvalonia.Repositories;

/// <summary>
/// Playlist repository interface - Repository Pattern
/// </summary>
public interface IPlaylistRepository
{
    /// <summary>
    /// Tüm playlist'leri getir
    /// </summary>
    Task<List<Playlist>> GetAllAsync();
    
    /// <summary>
    /// ID'ye göre playlist getir
    /// </summary>
    Task<Playlist?> GetByIdAsync(int id);
    
    /// <summary>
    /// Playlist'in track'lerini getir
    /// </summary>
    Task<List<Track>> GetTracksAsync(int playlistId);
}

/// <summary>
/// Track repository interface - Repository Pattern
/// </summary>
public interface ITrackRepository
{
    /// <summary>
    /// Playlist'e ait track'leri getir
    /// </summary>
    Task<List<Track>> GetByPlaylistIdAsync(int playlistId);
    
    /// <summary>
    /// Track'i ID'ye göre getir
    /// </summary>
    Task<Track?> GetByIdAsync(int id);
    
    /// <summary>
    /// Track'in dosya varlığını kontrol et
    /// </summary>
    Task<bool> CheckFileExistsAsync(string filePath);
}
