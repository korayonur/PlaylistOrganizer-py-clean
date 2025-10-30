using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Common;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.Domain.Enums;
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// Playlist CRUD operations service
    /// API'dan migration edilen playlist yönetim servisi
    /// </summary>
    public class PlaylistService : BaseDatabaseService
    {
        public PlaylistService(ILogger<PlaylistService> logger, IDatabaseManager databaseManager) 
            : base(logger, databaseManager) { }

        /// <summary>
        /// Tüm playlist'leri getir
        /// </summary>
        public async Task<List<Playlist>> GetAllPlaylistsAsync()
        {
            try
            {
                LogDebug("Getting all playlists");
                return await DatabaseManager.GetPlaylistsAsync();
            }
            catch (Exception ex)
            {
                LogError(ex, "Error getting all playlists");
                throw;
            }
        }

        /// <summary>
        /// ID'ye göre playlist getir
        /// </summary>
        public async Task<Playlist?> GetPlaylistByIdAsync(int id)
        {
            try
            {
                LogDebug($"Getting playlist by ID: {id}");
                var playlists = await DatabaseManager.GetPlaylistsAsync();
                return playlists.FirstOrDefault(p => p.Id == id);
            }
            catch (Exception ex)
            {
                LogError(ex, $"Error getting playlist by ID: {id}");
                throw;
            }
        }

        /// <summary>
        /// Path'e göre playlist getir
        /// </summary>
        public async Task<Playlist?> GetPlaylistByPathAsync(string path)
        {
            try
            {
                LogDebug($"Getting playlist by path: {path}");
                var playlists = await DatabaseManager.GetPlaylistsAsync();
                return playlists.FirstOrDefault(p => p.Path.Equals(path, StringComparison.OrdinalIgnoreCase));
            }
            catch (Exception ex)
            {
                LogError(ex, $"Error getting playlist by path: {path}");
                throw;
            }
        }

        /// <summary>
        /// Yeni playlist oluştur
        /// </summary>
        public async Task<Playlist> CreatePlaylistAsync(string name, string path, PlaylistType type, int parentId = 0)
        {
            try
            {
                LogInformation($"Creating new playlist: {name} at {path}");

                var playlist = new Playlist
                {
                    // Name computed from Path
                    Path = path,
                    Type = type,
                    TrackCount = 0,
                    ParentId = parentId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await DatabaseManager.InsertPlaylistAsync(playlist);
                
                LogInformation($"Playlist created successfully: {name}");
                return playlist;
            }
            catch (Exception ex)
            {
                LogError(ex, $"Error creating playlist: {name}");
                throw;
            }
        }

        /// <summary>
        /// Playlist'i güncelle
        /// </summary>
        public async Task UpdatePlaylistAsync(Playlist playlist)
        {
            try
            {
                LogDebug($"Updating playlist: {playlist.Name}");
                
                playlist.UpdatedAt = DateTime.UtcNow;
                
                using var connection = DatabaseManager.GetConnection();
                using var command = new Microsoft.Data.Sqlite.SqliteCommand(@"
                    UPDATE playlists 
                    SET name = @name, path = @path, type = @type, track_count = @trackCount, 
                        parent_id = @parentId, updated_at = @updatedAt 
                    WHERE id = @id", connection);

                command.Parameters.AddWithValue("@id", playlist.Id);
                command.Parameters.AddWithValue("@name", playlist.Name);
                command.Parameters.AddWithValue("@path", playlist.Path);
                command.Parameters.AddWithValue("@type", playlist.Type.ToString().ToLowerInvariant());
                command.Parameters.AddWithValue("@trackCount", playlist.TrackCount);
                command.Parameters.AddWithValue("@parentId", playlist.ParentId);
                command.Parameters.AddWithValue("@updatedAt", playlist.UpdatedAt);

                await command.ExecuteNonQueryAsync();
                
                LogDebug($"Playlist updated successfully: {playlist.Name}");
            }
            catch (Exception ex)
            {
                LogError(ex, $"Error updating playlist: {playlist.Name}");
                throw;
            }
        }

        /// <summary>
        /// Playlist'i sil
        /// </summary>
        public async Task DeletePlaylistAsync(int id)
        {
            try
            {
                LogInformation($"Deleting playlist with ID: {id}");
                
                using var connection = DatabaseManager.GetConnection();
                using var command = new Microsoft.Data.Sqlite.SqliteCommand(@"
                    DELETE FROM playlists WHERE id = @id", connection);

                command.Parameters.AddWithValue("@id", id);

                var rowsAffected = await command.ExecuteNonQueryAsync();
                
                if (rowsAffected > 0)
                {
                    LogInformation($"Playlist deleted successfully: ID {id}");
                }
                else
                {
                    LogWarning($"No playlist found with ID: {id}");
                }
            }
            catch (Exception ex)
            {
                LogError(ex, $"Error deleting playlist: ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Playlist track sayısını güncelle
        /// </summary>
        public async Task UpdateTrackCountAsync(int playlistId, int trackCount)
        {
            try
            {
                LogDebug($"Updating track count for playlist {playlistId}: {trackCount}");
                await DatabaseManager.UpdatePlaylistTrackCountAsync(playlistId, trackCount);
            }
            catch (Exception ex)
            {
                LogError(ex, $"Error updating track count for playlist {playlistId}");
                throw;
            }
        }

        /// <summary>
        /// Playlist hierarchy'sini oluştur
        /// </summary>
        public async Task<List<Playlist>> BuildHierarchyAsync()
        {
            try
            {
                LogDebug("Building playlist hierarchy");
                var allPlaylists = await DatabaseManager.GetPlaylistsAsync();
                
                // Root playlist'leri bul (parent_id = 0)
                var rootPlaylists = allPlaylists.Where(p => p.ParentId == 0).ToList();
                
                // Her root playlist için children'ları ekle
                foreach (var root in rootPlaylists)
                {
                    BuildChildren(root, allPlaylists);
                }
                
                LogDebug($"Hierarchy built: {rootPlaylists.Count} root playlists");
                return rootPlaylists;
            }
            catch (Exception ex)
            {
                LogError(ex, "Error building playlist hierarchy");
                throw;
            }
        }

        /// <summary>
        /// Playlist'in children'larını recursive olarak ekle
        /// </summary>
        private void BuildChildren(Playlist parent, List<Playlist> allPlaylists)
        {
            var children = allPlaylists.Where(p => p.ParentId == parent.Id).ToList();
            
            foreach (var child in children)
            {
                parent.Children.Add(child);
                BuildChildren(child, allPlaylists); // Recursive
            }
        }

        /// <summary>
        /// Playlist istatistiklerini getir
        /// </summary>
        public async Task<PlaylistStats> GetPlaylistStatsAsync()
        {
            try
            {
                LogDebug("Getting playlist statistics");
                
                var playlists = await DatabaseManager.GetPlaylistsAsync();
                
                var stats = new PlaylistStats
                {
                    TotalPlaylists = playlists.Count,
                    TotalTracks = playlists.Sum(p => p.TrackCount),
                    PlaylistsByType = playlists.GroupBy(p => p.Type)
                        .ToDictionary(g => g.Key.ToString(), g => g.Count()),
                    RootPlaylists = playlists.Count(p => p.ParentId == 0),
                    ChildPlaylists = playlists.Count(p => p.ParentId > 0)
                };
                
                LogDebug($"Playlist stats: {stats.TotalPlaylists} playlists, {stats.TotalTracks} tracks");
                return stats;
            }
            catch (Exception ex)
            {
                LogError(ex, "Error getting playlist statistics");
                throw;
            }
        }
    }

    public class PlaylistStats
    {
        public int TotalPlaylists { get; set; }
        public int TotalTracks { get; set; }
        public Dictionary<string, int> PlaylistsByType { get; set; } = new Dictionary<string, int>();
        public int RootPlaylists { get; set; }
        public int ChildPlaylists { get; set; }
    }
}
