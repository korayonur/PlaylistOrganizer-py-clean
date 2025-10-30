using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Common;
using PlaylistOrganizerAvalonia.Shared.Services;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.Domain.Enums;
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// Track management service
    /// API'dan migration edilen track yönetim servisi
    /// </summary>
    public class TrackService : BaseDatabaseService
    {
        public TrackService(ILogger<TrackService> logger, IDatabaseManager databaseManager) 
            : base(logger, databaseManager) { }

        /// <summary>
        /// Tüm track'leri getir
        /// </summary>
        public async Task<List<Track>> GetAllTracksAsync()
        {
            try
            {
                _logger.LogDebug("Getting all tracks");
                
                using var connection = DatabaseManager.GetConnection();
                using var command = new Microsoft.Data.Sqlite.SqliteCommand(@"
                    SELECT id, path, fileName, fileNameOnly, normalizedFileName, status, 
                           playlist_file_path, track_order, created_at, updated_at
                    FROM tracks 
                    ORDER BY fileName", connection);

                var tracks = new List<Track>();
                using var reader = await command.ExecuteReaderAsync();
                
                while (await reader.ReadAsync())
                {
                    var track = new Track
                    {
                        Id = reader.GetInt32(0),
                        Path = reader.GetString(1),
                        FileName = reader.GetString(2),
                        FileNameOnly = reader.GetString(3),
                        NormalizedFileName = reader.GetString(4),
                        Status = reader.GetString(5).ToLowerInvariant() switch
                        {
                            "found" => TrackStatus.Found,
                            "missing" => TrackStatus.Missing,
                            "error" => TrackStatus.Error,
                            "processing" => TrackStatus.Processing,
                            _ => TrackStatus.Missing
                        },
                        PlaylistFilePath = reader.IsDBNull(6) ? null : reader.GetString(6),
                        TrackOrder = reader.IsDBNull(7) ? 0 : reader.GetInt32(7),
                        CreatedAt = reader.GetDateTime(8),
                        UpdatedAt = reader.GetDateTime(9)
                    };
                    tracks.Add(track);
                }

                _logger.LogDebug($"Retrieved {tracks.Count} tracks");
                return tracks;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all tracks");
                throw;
            }
        }

        /// <summary>
        /// ID'ye göre track getir
        /// </summary>
        public async Task<Track?> GetTrackByIdAsync(int id)
        {
            try
            {
                _logger.LogDebug($"Getting track by ID: {id}");
                
                using var connection = DatabaseManager.GetConnection();
                using var command = new Microsoft.Data.Sqlite.SqliteCommand(@"
                    SELECT id, path, fileName, fileNameOnly, normalizedFileName, status, 
                           playlist_file_path, track_order, created_at, updated_at
                    FROM tracks 
                    WHERE id = @id", connection);

                command.Parameters.AddWithValue("@id", id);

                using var reader = await command.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    return new Track
                    {
                        Id = reader.GetInt32(0),
                        Path = reader.GetString(1),
                        FileName = reader.GetString(2),
                        FileNameOnly = reader.GetString(3),
                        NormalizedFileName = reader.GetString(4),
                        Status = reader.GetString(5).ToLowerInvariant() switch
                        {
                            "found" => TrackStatus.Found,
                            "missing" => TrackStatus.Missing,
                            "error" => TrackStatus.Error,
                            "processing" => TrackStatus.Processing,
                            _ => TrackStatus.Missing
                        },
                        PlaylistFilePath = reader.IsDBNull(6) ? null : reader.GetString(6),
                        TrackOrder = reader.IsDBNull(7) ? 0 : reader.GetInt32(7),
                        CreatedAt = reader.GetDateTime(8),
                        UpdatedAt = reader.GetDateTime(9)
                    };
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting track by ID: {id}");
                throw;
            }
        }

        /// <summary>
        /// Path'e göre track getir
        /// </summary>
        public async Task<Track?> GetTrackByPathAsync(string path)
        {
            try
            {
                _logger.LogDebug($"Getting track by path: {path}");
                
                using var connection = DatabaseManager.GetConnection();
                using var command = new Microsoft.Data.Sqlite.SqliteCommand(@"
                    SELECT id, path, fileName, fileNameOnly, normalizedFileName, status, 
                           playlist_file_path, track_order, created_at, updated_at
                    FROM tracks 
                    WHERE path = @path", connection);

                command.Parameters.AddWithValue("@path", path);

                using var reader = await command.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    return new Track
                    {
                        Id = reader.GetInt32(0),
                        Path = reader.GetString(1),
                        FileName = reader.GetString(2),
                        FileNameOnly = reader.GetString(3),
                        NormalizedFileName = reader.GetString(4),
                        Status = reader.GetString(5).ToLowerInvariant() switch
                        {
                            "found" => TrackStatus.Found,
                            "missing" => TrackStatus.Missing,
                            "error" => TrackStatus.Error,
                            "processing" => TrackStatus.Processing,
                            _ => TrackStatus.Missing
                        },
                        PlaylistFilePath = reader.IsDBNull(6) ? null : reader.GetString(6),
                        TrackOrder = reader.IsDBNull(7) ? 0 : reader.GetInt32(7),
                        CreatedAt = reader.GetDateTime(8),
                        UpdatedAt = reader.GetDateTime(9)
                    };
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting track by path: {path}");
                throw;
            }
        }

        /// <summary>
        /// Yeni track oluştur
        /// </summary>
        public async Task<Track> CreateTrackAsync(string path, string fileName, string? playlistFilePath = null, int trackOrder = 0)
        {
            try
            {
                _logger.LogInformation($"Creating new track: {fileName} at {path}");

                var track = new Track
                {
                    Path = path,
                    FileName = fileName,
                    FileNameOnly = System.IO.Path.GetFileNameWithoutExtension(fileName),
                    NormalizedFileName = StringNormalizationService.NormalizeFileName(fileName),
                    Status = TrackStatus.Missing,
                    PlaylistFilePath = playlistFilePath,
                    TrackOrder = trackOrder,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await DatabaseManager.InsertTrackAsync(track);
                
                _logger.LogInformation($"Track created successfully: {fileName}");
                return track;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error creating track: {fileName}");
                throw;
            }
        }

        /// <summary>
        /// Track'i güncelle
        /// </summary>
        public async Task UpdateTrackAsync(Track track)
        {
            try
            {
                _logger.LogDebug($"Updating track: {track.FileName}");
                
                track.UpdatedAt = DateTime.UtcNow;
                
                using var connection = DatabaseManager.GetConnection();
                using var command = new Microsoft.Data.Sqlite.SqliteCommand(@"
                    UPDATE tracks 
                    SET path = @path, fileName = @fileName, fileNameOnly = @fileNameOnly, 
                        normalizedFileName = @normalizedFileName, status = @status, 
                        playlist_file_path = @playlistFilePath, track_order = @trackOrder, 
                        updated_at = @updatedAt 
                    WHERE id = @id", connection);

                command.Parameters.AddWithValue("@id", track.Id);
                command.Parameters.AddWithValue("@path", track.Path);
                command.Parameters.AddWithValue("@fileName", track.FileName);
                command.Parameters.AddWithValue("@fileNameOnly", track.FileNameOnly);
                command.Parameters.AddWithValue("@normalizedFileName", track.NormalizedFileName);
                command.Parameters.AddWithValue("@status", track.Status.ToString().ToLowerInvariant());
                command.Parameters.AddWithValue("@playlistFilePath", track.PlaylistFilePath ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("@trackOrder", track.TrackOrder);
                command.Parameters.AddWithValue("@updatedAt", track.UpdatedAt);

                await command.ExecuteNonQueryAsync();
                
                _logger.LogDebug($"Track updated successfully: {track.FileName}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating track: {track.FileName}");
                throw;
            }
        }

        /// <summary>
        /// Track'i sil
        /// </summary>
        public async Task DeleteTrackAsync(int id)
        {
            try
            {
                _logger.LogInformation($"Deleting track with ID: {id}");
                
                using var connection = DatabaseManager.GetConnection();
                using var command = new Microsoft.Data.Sqlite.SqliteCommand(@"
                    DELETE FROM tracks WHERE id = @id", connection);

                command.Parameters.AddWithValue("@id", id);

                var rowsAffected = await command.ExecuteNonQueryAsync();
                
                if (rowsAffected > 0)
                {
                    _logger.LogInformation($"Track deleted successfully: ID {id}");
                }
                else
                {
                    _logger.LogWarning($"No track found with ID: {id}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting track: ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Track status'unu güncelle
        /// </summary>
        public async Task UpdateTrackStatusAsync(int trackId, TrackStatus status)
        {
            try
            {
                _logger.LogDebug($"Updating track status for {trackId}: {status}");
                
                using var connection = DatabaseManager.GetConnection();
                using var command = new Microsoft.Data.Sqlite.SqliteCommand(@"
                    UPDATE tracks 
                    SET status = @status, updated_at = @updatedAt 
                    WHERE id = @trackId", connection);

                command.Parameters.AddWithValue("@status", status.ToString().ToLowerInvariant());
                command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
                command.Parameters.AddWithValue("@trackId", trackId);

                await command.ExecuteNonQueryAsync();
                
                _logger.LogDebug($"Track status updated successfully: {trackId} -> {status}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating track status for {trackId}");
                throw;
            }
        }

        /// <summary>
        /// Missing track'leri getir
        /// </summary>
        public async Task<List<Track>> GetMissingTracksAsync()
        {
            try
            {
                _logger.LogDebug("Getting missing tracks");
                
                using var connection = DatabaseManager.GetConnection();
                using var command = new Microsoft.Data.Sqlite.SqliteCommand(@"
                    SELECT id, path, fileName, fileNameOnly, normalizedFileName, status, 
                           playlist_file_path, track_order, created_at, updated_at
                    FROM tracks 
                    WHERE status = 'missing'
                    ORDER BY fileName", connection);

                var tracks = new List<Track>();
                using var reader = await command.ExecuteReaderAsync();
                
                while (await reader.ReadAsync())
                {
                    var track = new Track
                    {
                        Id = reader.GetInt32(0),
                        Path = reader.GetString(1),
                        FileName = reader.GetString(2),
                        FileNameOnly = reader.GetString(3),
                        NormalizedFileName = reader.GetString(4),
                        Status = TrackStatus.Missing,
                        PlaylistFilePath = reader.IsDBNull(6) ? null : reader.GetString(6),
                        TrackOrder = reader.IsDBNull(7) ? 0 : reader.GetInt32(7),
                        CreatedAt = reader.GetDateTime(8),
                        UpdatedAt = reader.GetDateTime(9)
                    };
                    tracks.Add(track);
                }

                _logger.LogDebug($"Retrieved {tracks.Count} missing tracks");
                return tracks;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting missing tracks");
                throw;
            }
        }

        /// <summary>
        /// Track istatistiklerini getir
        /// </summary>
        public async Task<TrackStats> GetTrackStatsAsync()
        {
            try
            {
                _logger.LogDebug("Getting track statistics");
                
                using var connection = DatabaseManager.GetConnection();
                using var command = new Microsoft.Data.Sqlite.SqliteCommand(@"
                    SELECT 
                        COUNT(*) as total_tracks,
                        SUM(CASE WHEN status = 'found' THEN 1 ELSE 0 END) as found_tracks,
                        SUM(CASE WHEN status = 'missing' THEN 1 ELSE 0 END) as missing_tracks,
                        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_tracks,
                        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_tracks
                    FROM tracks", connection);

                using var reader = await command.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    var stats = new TrackStats
                    {
                        TotalTracks = reader.GetInt32(0),
                        FoundTracks = reader.GetInt32(1),
                        MissingTracks = reader.GetInt32(2),
                        ErrorTracks = reader.GetInt32(3),
                        ProcessingTracks = reader.GetInt32(4)
                    };
                    
                    _logger.LogDebug($"Track stats: {stats.TotalTracks} total, {stats.FoundTracks} found, {stats.MissingTracks} missing");
                    return stats;
                }

                return new TrackStats();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting track statistics");
                throw;
            }
        }
    }

    public class TrackStats
    {
        public int TotalTracks { get; set; }
        public int FoundTracks { get; set; }
        public int MissingTracks { get; set; }
        public int ErrorTracks { get; set; }
        public int ProcessingTracks { get; set; }
    }
}
