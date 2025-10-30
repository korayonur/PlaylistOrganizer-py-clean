using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Data;
using Microsoft.Data.Sqlite;
using PlaylistOrganizerAvalonia.Domain.Entities;

namespace PlaylistOrganizerAvalonia.Infrastructure.Services;

/// <summary>
/// Database işlemleri için interface - Clean Architecture prensipleri
/// </summary>
public interface IDatabaseManager : IDisposable
{
    /// <summary>
    /// Tüm playlist'leri getir
    /// </summary>
    Task<List<Playlist>> GetPlaylistsAsync();
    
    /// <summary>
    /// Belirli bir playlist'in track'lerini getir
    /// </summary>
    Task<List<Track>> GetTracksForPlaylistAsync(int playlistId);
    
    /// <summary>
    /// Playlist ekle
    /// </summary>
    Task InsertPlaylistAsync(Playlist playlist);
    
    /// <summary>
    /// Track ekle
    /// </summary>
    Task InsertTrackAsync(Track track);
    
    /// <summary>
    /// Music file ekle
    /// </summary>
    Task InsertMusicFileAsync(MusicFile musicFile);
    
        /// <summary>
        /// Playlist track sayısını güncelle
        /// </summary>
        Task UpdatePlaylistTrackCountAsync(int playlistId, int trackCount);
        
        /// <summary>
        /// Transaction ile playlist track sayısını güncelle
        /// </summary>
        Task UpdatePlaylistTrackCountAsync(int playlistId, int trackCount, SqliteTransaction transaction);
    
        /// <summary>
        /// Database'i initialize et ve schema'yı uygula
        /// </summary>
        Task InitializeDatabaseAsync();
        
        /// <summary>
        /// Music files sayısını al
        /// </summary>
        Task<int> GetMusicFilesCountAsync();
        
        /// <summary>
        /// Playlists sayısını al
        /// </summary>
        Task<int> GetPlaylistsCountAsync();
        
        /// <summary>
        /// Tracks sayısını al
        /// </summary>
        Task<int> GetTracksCountAsync();
    
    /// <summary>
    /// Transaction başlat
    /// </summary>
    Task<SqliteTransaction> BeginTransactionAsync();
    
    /// <summary>
    /// Transaction ile playlist ekle
    /// </summary>
    Task InsertPlaylistAsync(Playlist playlist, SqliteTransaction transaction);
    
    /// <summary>
    /// Transaction ile track ekle
    /// </summary>
    Task InsertTrackAsync(Track track, SqliteTransaction transaction);
    
    /// <summary>
    /// Transaction ile music file ekle
    /// </summary>
    Task InsertMusicFileAsync(MusicFile musicFile, SqliteTransaction transaction);
    
    /// <summary>
    /// Database bağlantısını test et
    /// </summary>
    Task<bool> TestConnectionAsync();
    
    /// <summary>
    /// Import session ekle
    /// </summary>
    Task<int> InsertImportSessionAsync(ImportSession importSession);
    
    /// <summary>
    /// Import session güncelle
    /// </summary>
    Task UpdateImportSessionAsync(ImportSession importSession);
    
    /// <summary>
    /// Import session'ları getir
    /// </summary>
    Task<List<ImportSession>> GetImportSessionsAsync();
    
    /// <summary>
    /// Database bağlantısını al
    /// </summary>
    Microsoft.Data.Sqlite.SqliteConnection GetConnection();
    
    // Dapper Bulk Operations
    /// <summary>
    /// Dapper ile bulk insert music files
    /// </summary>
    Task BulkInsertMusicFilesAsync(List<MusicFile> musicFiles);
    
    /// <summary>
    /// Dapper ile bulk insert playlists
    /// </summary>
    Task BulkInsertPlaylistsAsync(List<Playlist> playlists);
    
    /// <summary>
    /// Dapper ile bulk insert tracks
    /// </summary>
    Task BulkInsertTracksAsync(List<Track> tracks);
    
    /// <summary>
    /// Import öncesi tabloları temizle (import_sessions hariç)
    /// </summary>
    Task CleanTablesBeforeImportAsync();
    
    /// <summary>
    /// Gereksiz trigger ve view'ları kaldır
    /// </summary>
    Task DropUnnecessaryTriggersAndViewsAsync();
    
    /// <summary>
    /// Track status'larını toplu güncelle (Available/Missing)
    /// </summary>
    Task UpdateTrackStatusesAsync();
    
    /// <summary>
    /// Tracks'ten playlists tablosunu doldur (GROUP BY ile)
    /// </summary>
    Task InsertPlaylistsFromTracksAsync();
    
    /// <summary>
    /// Track words bulk insert
    /// </summary>
    Task BulkInsertTrackWordsAsync(List<TrackWord> trackWords);
    
    /// <summary>
    /// Music words bulk insert
    /// </summary>
    Task BulkInsertMusicWordsAsync(List<MusicWord> musicWords);
    
    /// <summary>
    /// Generic query method for WordIndexService
    /// </summary>
    Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null);
}
