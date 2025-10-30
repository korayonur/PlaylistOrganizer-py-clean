using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.Domain.Enums;

namespace PlaylistOrganizerAvalonia.Infrastructure.Services
{
    public class DatabaseManager : IDatabaseManager
    {
        private SqliteConnection? _connection;
        private readonly string _databasePath;

        public DatabaseManager(IConfiguration configuration)
        {
            // Configuration'dan database path'i al
            _databasePath = configuration["Database:Path"]
                ?? throw new InvalidOperationException("Database:Path configuration not found");

            // Debug için path'i yazdır
            Console.WriteLine($"Database path: {_databasePath}");
            Console.WriteLine($"Database exists: {File.Exists(_databasePath)}");
        }

        public SqliteConnection GetConnection()
        {
            if (_connection == null)
            {
                string connectionString = $"Data Source={_databasePath}";
                _connection = new SqliteConnection(connectionString);
                _connection.Open();
            }
            return _connection;
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                using SqliteConnection connection = new SqliteConnection($"Data Source={_databasePath}");
                await connection.OpenAsync();

                // Basit bir sorgu ile test et
                using SqliteCommand command = new SqliteCommand("SELECT COUNT(*) FROM playlists", connection);
                object? result = await command.ExecuteScalarAsync();

                return result != null;
            }
            catch
            {
                return false;
            }
        }

        public async Task<List<Domain.Entities.Playlist>> GetPlaylistsAsync()
        {
            List<Domain.Entities.Playlist> playlists = new List<Domain.Entities.Playlist>();

            try
            {
                using var connection = GetConnection();
                if (connection.State != System.Data.ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }

                using SqliteCommand command = new SqliteCommand(
                    "SELECT id, path, type, track_count, created_at, updated_at FROM playlists ORDER BY path",
                    connection);

                using SqliteDataReader reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    Domain.Entities.Playlist playlist = new Domain.Entities.Playlist
                    {
                        Id = reader.GetInt32(0),
                        Path = reader.GetString(1),
                        // Name computed from Path in entity
                        Type = reader.GetString(2).ToLower() switch
                        {
                            "m3u" => PlaylistType.Playlist,
                            "playlist" => PlaylistType.Playlist,
                            "vdjfolder" => PlaylistType.VDJFolder,
                            "folder" => PlaylistType.VDJFolder,
                            "root" => PlaylistType.Root,
                            _ => PlaylistType.Folder
                        },
                        TrackCount = reader.GetInt32(3),
                        CreatedAt = reader.GetDateTime(4),
                        UpdatedAt = reader.GetDateTime(5)
                        // ParentId removed from DB, computed in C# if needed
                    };
                    playlists.Add(playlist);
                }
            }
            catch (Exception ex)
            {
                // Log error
                Console.WriteLine($"Error loading playlists: {ex.Message}");
            }

            return playlists;
        }

        // Not: EnsureParentIdColumnExists metodu artık kullanılmıyor
        // Schema.sql'de parent_id kolonu zaten tanımlı
        // Bu metod import sırasında çağrılmıyor, bu yüzden kaldırıldı

        public async Task<List<Domain.Entities.Track>> GetTracksForPlaylistAsync(int playlistId)
        {
            List<Domain.Entities.Track> tracks = new List<Domain.Entities.Track>();

            try
            {
                using SqliteConnection connection = new SqliteConnection($"Data Source={_databasePath}");
                await connection.OpenAsync();

                using SqliteCommand command = new SqliteCommand(@"
                SELECT t.id, t.path, t.fileName, t.fileNameOnly, t.normalizedFileName, t.status, t.created_at
                FROM tracks t
                INNER JOIN playlist_tracks pt ON t.id = pt.track_id
                WHERE pt.playlist_id = @playlistId
                ORDER BY pt.track_order", connection);

                _ = command.Parameters.AddWithValue("@playlistId", playlistId);

                using SqliteDataReader reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    Domain.Entities.Track track = new Domain.Entities.Track
                    {
                        Id = reader.GetInt32(0),
                        Path = reader.GetString(1),
                        FileName = reader.GetString(2),
                        FileNameOnly = reader.GetString(3),
                        NormalizedFileName = reader.GetString(4),
                        Status = reader.GetString(5).ToLower() switch
                        {
                            "found" => TrackStatus.Found,
                            "missing" => TrackStatus.Missing,
                            "updated" => TrackStatus.Found,
                            _ => TrackStatus.Missing
                        },
                        CreatedAt = reader.GetDateTime(6)
                    };
                    tracks.Add(track);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading tracks for playlist {playlistId}: {ex.Message}");
            }

            return tracks;
        }

        public async Task InsertMusicFileAsync(MusicFile musicFile)
        {
            using var connection = GetConnection();
            using var command = new SqliteCommand(@"
                INSERT INTO music_files (path, file_name, normalized_file_name, extension, size, modified_time, created_at, updated_at)
                VALUES (@path, @fileName, @normalizedFileName, @extension, @size, @modifiedTime, @createdAt, @updatedAt)", connection);

            command.Parameters.AddWithValue("@path", musicFile.Path);
            command.Parameters.AddWithValue("@fileName", musicFile.FileName);
            command.Parameters.AddWithValue("@normalizedFileName", musicFile.NormalizedFileName);
            command.Parameters.AddWithValue("@extension", musicFile.Extension);
            command.Parameters.AddWithValue("@size", musicFile.Size);
            command.Parameters.AddWithValue("@modifiedTime", musicFile.ModifiedTime);
            command.Parameters.AddWithValue("@createdAt", musicFile.CreatedAt);
            command.Parameters.AddWithValue("@updatedAt", musicFile.UpdatedAt);

            await command.ExecuteNonQueryAsync();
        }

        public async Task InsertMusicFileAsync(MusicFile musicFile, SqliteTransaction transaction)
        {
            using var command = new SqliteCommand(@"
                INSERT INTO music_files (path, file_name, normalized_file_name, extension, size, modified_time, created_at, updated_at)
                VALUES (@path, @fileName, @normalizedFileName, @extension, @size, @modifiedTime, @createdAt, @updatedAt)",
                transaction.Connection, transaction);

            command.Parameters.AddWithValue("@path", musicFile.Path);
            command.Parameters.AddWithValue("@fileName", musicFile.FileName);
            command.Parameters.AddWithValue("@normalizedFileName", musicFile.NormalizedFileName);
            command.Parameters.AddWithValue("@extension", musicFile.Extension);
            command.Parameters.AddWithValue("@size", musicFile.Size);
            command.Parameters.AddWithValue("@modifiedTime", musicFile.ModifiedTime);
            command.Parameters.AddWithValue("@createdAt", musicFile.CreatedAt);
            command.Parameters.AddWithValue("@updatedAt", musicFile.UpdatedAt);

            await command.ExecuteNonQueryAsync();
        }

        public async Task InsertPlaylistAsync(Playlist playlist)
        {
            using var connection = GetConnection();
            using var command = new SqliteCommand(@"
                INSERT INTO playlists (path, name, type, track_count, parent_id, created_at, updated_at)
                VALUES (@path, @name, @type, @trackCount, @parentId, @createdAt, @updatedAt)", connection);

            command.Parameters.AddWithValue("@path", playlist.Path);
            command.Parameters.AddWithValue("@name", playlist.Name);
            command.Parameters.AddWithValue("@type", playlist.Type.ToString().ToLowerInvariant());
            command.Parameters.AddWithValue("@trackCount", playlist.TrackCount);
            command.Parameters.AddWithValue("@parentId", playlist.ParentId);
            command.Parameters.AddWithValue("@createdAt", playlist.CreatedAt);
            command.Parameters.AddWithValue("@updatedAt", playlist.UpdatedAt);

            await command.ExecuteNonQueryAsync();
        }

        public async Task<SqliteTransaction> BeginTransactionAsync()
        {
            var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }
            return (SqliteTransaction)await connection.BeginTransactionAsync();
        }

        public async Task InsertPlaylistAsync(Playlist playlist, SqliteTransaction transaction)
        {
            using var command = new SqliteCommand(@"
                INSERT INTO playlists (path, name, type, track_count, parent_id, created_at, updated_at)
                VALUES (@path, @name, @type, @trackCount, @parentId, @createdAt, @updatedAt)",
                transaction.Connection, transaction);

            command.Parameters.AddWithValue("@path", playlist.Path);
            command.Parameters.AddWithValue("@name", playlist.Name);
            command.Parameters.AddWithValue("@type", playlist.Type.ToString().ToLowerInvariant());
            command.Parameters.AddWithValue("@trackCount", playlist.TrackCount);
            command.Parameters.AddWithValue("@parentId", playlist.ParentId ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@createdAt", playlist.CreatedAt);
            command.Parameters.AddWithValue("@updatedAt", playlist.UpdatedAt);

            await command.ExecuteNonQueryAsync();
        }

        public async Task InsertTrackAsync(Track track)
        {
            using var connection = GetConnection();
            using var command = new SqliteCommand(@"
                INSERT INTO tracks (path, file_name, normalized_file_name, status, playlist_file_path, track_order, created_at, updated_at)
                VALUES (@path, @fileName, @normalizedFileName, @status, @playlistFilePath, @trackOrder, @createdAt, @updatedAt)", connection);

            command.Parameters.AddWithValue("@path", track.Path);
            command.Parameters.AddWithValue("@fileName", track.FileName);
            command.Parameters.AddWithValue("@normalizedFileName", track.NormalizedFileName);
            command.Parameters.AddWithValue("@status", track.Status.ToString().ToLowerInvariant());
            command.Parameters.AddWithValue("@playlistFilePath", track.PlaylistFilePath ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@trackOrder", track.TrackOrder);
            command.Parameters.AddWithValue("@createdAt", track.CreatedAt);
            command.Parameters.AddWithValue("@updatedAt", track.UpdatedAt);

            await command.ExecuteNonQueryAsync();
        }

        public async Task InsertTrackAsync(Track track, SqliteTransaction transaction)
        {
            using var command = new SqliteCommand(@"
                INSERT INTO tracks (path, file_name, normalized_file_name, status, playlist_file_path, track_order, created_at, updated_at)
                VALUES (@path, @fileName, @normalizedFileName, @status, @playlistFilePath, @trackOrder, @createdAt, @updatedAt)",
                transaction.Connection, transaction);

            command.Parameters.AddWithValue("@path", track.Path);
            command.Parameters.AddWithValue("@fileName", track.FileName);
            command.Parameters.AddWithValue("@normalizedFileName", track.NormalizedFileName);
            command.Parameters.AddWithValue("@status", track.Status.ToString().ToLowerInvariant());
            command.Parameters.AddWithValue("@playlistFilePath", track.PlaylistFilePath ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@trackOrder", track.TrackOrder);
            command.Parameters.AddWithValue("@createdAt", track.CreatedAt);
            command.Parameters.AddWithValue("@updatedAt", track.UpdatedAt);

            await command.ExecuteNonQueryAsync();
        }

        public async Task UpdatePlaylistTrackCountAsync(int playlistId, int trackCount)
        {
            using var connection = GetConnection();
            using var command = new SqliteCommand(@"
                UPDATE playlists 
                SET track_count = @trackCount, updated_at = @updatedAt 
                WHERE id = @playlistId", connection);

            command.Parameters.AddWithValue("@trackCount", trackCount);
            command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
            command.Parameters.AddWithValue("@playlistId", playlistId);

            await command.ExecuteNonQueryAsync();
        }

        public async Task UpdatePlaylistTrackCountAsync(int playlistId, int trackCount, SqliteTransaction transaction)
        {
            using var command = new SqliteCommand(@"
                UPDATE playlists 
                SET track_count = @trackCount, updated_at = @updatedAt 
                WHERE id = @playlistId", transaction.Connection, transaction);

            command.Parameters.AddWithValue("@trackCount", trackCount);
            command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
            command.Parameters.AddWithValue("@playlistId", playlistId);

            await command.ExecuteNonQueryAsync();
        }

        public async Task<int> GetMusicFilesCountAsync()
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }
            using var command = new SqliteCommand("SELECT COUNT(*) FROM music_files", connection);
            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result);
        }

        public async Task<int> GetPlaylistsCountAsync()
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }
            using var command = new SqliteCommand("SELECT COUNT(*) FROM playlists", connection);
            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result);
        }

        public async Task<int> GetTracksCountAsync()
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }
            using var command = new SqliteCommand("SELECT COUNT(*) FROM tracks", connection);
            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result);
        }

        public async Task<List<ImportSession>> GetImportSessionsAsync()
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var command = new SqliteCommand(@"
                SELECT id, session_type, source_path, total_files, processed_files, added_files, 
                       skipped_files, error_files, music_files_count, tracks_count, playlists_count, 
                       index_count, status, started_at, completed_at, error_message
                FROM import_sessions 
                ORDER BY started_at DESC", connection);

            using var reader = await command.ExecuteReaderAsync();
            var sessions = new List<ImportSession>();

            while (await reader.ReadAsync())
            {
                sessions.Add(new ImportSession
                {
                    Id = reader.GetInt32(0),
                    SessionType = Enum.Parse<ImportSessionType>(reader.GetString(1)),
                    SourcePath = reader.IsDBNull(2) ? null : reader.GetString(2),
                    TotalFiles = reader.GetInt32(3),
                    ProcessedFiles = reader.GetInt32(4),
                    AddedFiles = reader.GetInt32(5),
                    SkippedFiles = reader.GetInt32(6),
                    ErrorFiles = reader.GetInt32(7),
                    MusicFilesCount = reader.GetInt32(8),
                    TracksCount = reader.GetInt32(9),
                    PlaylistsCount = reader.GetInt32(10),
                    IndexCount = reader.GetInt32(11),
                    Status = Enum.Parse<ImportSessionStatus>(reader.GetString(12)),
                    StartedAt = reader.GetDateTime(13),
                    CompletedAt = reader.IsDBNull(14) ? null : reader.GetDateTime(14),
                    ErrorMessage = reader.IsDBNull(15) ? null : reader.GetString(15),
                    CreatedAt = reader.GetDateTime(13), // started_at'i kullan
                    UpdatedAt = reader.IsDBNull(14) ? reader.GetDateTime(13) : reader.GetDateTime(14) // completed_at varsa onu, yoksa started_at'i kullan
                });
            }

            return sessions;
        }

        public async Task<int> InsertImportSessionAsync(ImportSession importSession)
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var command = new SqliteCommand(@"
                INSERT INTO import_sessions (session_type, source_path, total_files, processed_files, 
                                           added_files, skipped_files, error_files, music_files_count, 
                                           tracks_count, playlists_count, index_count, status, 
                                           started_at, completed_at, error_message)
                VALUES (@SessionType, @SourcePath, @TotalFiles, @ProcessedFiles, @AddedFiles, 
                       @SkippedFiles, @ErrorFiles, @MusicFilesCount, @TracksCount, @PlaylistsCount, 
                       @IndexCount, @Status, @StartedAt, @CompletedAt, @ErrorMessage);
                SELECT last_insert_rowid();", connection);

            command.Parameters.AddWithValue("@SessionType", importSession.SessionType.ToString().ToLowerInvariant());
            command.Parameters.AddWithValue("@SourcePath", importSession.SourcePath ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@TotalFiles", importSession.TotalFiles);
            command.Parameters.AddWithValue("@ProcessedFiles", importSession.ProcessedFiles);
            command.Parameters.AddWithValue("@AddedFiles", importSession.AddedFiles);
            command.Parameters.AddWithValue("@SkippedFiles", importSession.SkippedFiles);
            command.Parameters.AddWithValue("@ErrorFiles", importSession.ErrorFiles);
            command.Parameters.AddWithValue("@MusicFilesCount", importSession.MusicFilesCount);
            command.Parameters.AddWithValue("@TracksCount", importSession.TracksCount);
            command.Parameters.AddWithValue("@PlaylistsCount", importSession.PlaylistsCount);
            command.Parameters.AddWithValue("@IndexCount", importSession.IndexCount);
            command.Parameters.AddWithValue("@Status", importSession.Status.ToString().ToLowerInvariant());
            command.Parameters.AddWithValue("@StartedAt", importSession.StartedAt);
            command.Parameters.AddWithValue("@CompletedAt", importSession.CompletedAt ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@ErrorMessage", importSession.ErrorMessage ?? (object)DBNull.Value);

            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result);
        }

        public async Task UpdateImportSessionAsync(ImportSession importSession)
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var command = new SqliteCommand(@"
                UPDATE import_sessions SET 
                    session_type = @SessionType,
                    source_path = @SourcePath,
                    total_files = @TotalFiles,
                    processed_files = @ProcessedFiles,
                    added_files = @AddedFiles,
                    skipped_files = @SkippedFiles,
                    error_files = @ErrorFiles,
                    music_files_count = @MusicFilesCount,
                    tracks_count = @TracksCount,
                    playlists_count = @PlaylistsCount,
                    index_count = @IndexCount,
                    status = @Status,
                    started_at = @StartedAt,
                    completed_at = @CompletedAt,
                    error_message = @ErrorMessage
                WHERE id = @Id", connection);

            command.Parameters.AddWithValue("@Id", importSession.Id);
            command.Parameters.AddWithValue("@SessionType", importSession.SessionType.ToString().ToLowerInvariant());
            command.Parameters.AddWithValue("@SourcePath", importSession.SourcePath ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@TotalFiles", importSession.TotalFiles);
            command.Parameters.AddWithValue("@ProcessedFiles", importSession.ProcessedFiles);
            command.Parameters.AddWithValue("@AddedFiles", importSession.AddedFiles);
            command.Parameters.AddWithValue("@SkippedFiles", importSession.SkippedFiles);
            command.Parameters.AddWithValue("@ErrorFiles", importSession.ErrorFiles);
            command.Parameters.AddWithValue("@MusicFilesCount", importSession.MusicFilesCount);
            command.Parameters.AddWithValue("@TracksCount", importSession.TracksCount);
            command.Parameters.AddWithValue("@PlaylistsCount", importSession.PlaylistsCount);
            command.Parameters.AddWithValue("@IndexCount", importSession.IndexCount);
            command.Parameters.AddWithValue("@Status", importSession.Status.ToString().ToLowerInvariant());
            command.Parameters.AddWithValue("@StartedAt", importSession.StartedAt);
            command.Parameters.AddWithValue("@CompletedAt", importSession.CompletedAt ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@ErrorMessage", importSession.ErrorMessage ?? (object)DBNull.Value);

            await command.ExecuteNonQueryAsync();
        }

        public async Task InitializeDatabaseAsync()
        {
            try
            {
                using var connection = GetConnection();
                if (connection.State != System.Data.ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }

                // Schema'yı uygula
                await ApplySchemaAsync(connection);

                Console.WriteLine("✅ Database initialized successfully");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Database initialization failed: {ex.Message}");
                throw;
            }
        }

        private async Task ApplySchemaAsync(SqliteConnection connection)
        {
            // Schema.sql dosyasını oku ve uygula
            var schemaPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Database", "schema.sql");

            if (File.Exists(schemaPath))
            {
                var schema = await File.ReadAllTextAsync(schemaPath);
                using var command = new SqliteCommand(schema, connection);
                await command.ExecuteNonQueryAsync();
            }
            else
            {
                // Fallback: Temel tabloları oluştur
                await CreateBasicTablesAsync(connection);
            }
        }

        private async Task CreateBasicTablesAsync(SqliteConnection connection)
        {
            var basicSchema = @"
                CREATE TABLE IF NOT EXISTS music_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    path TEXT UNIQUE NOT NULL,
                    fileName TEXT NOT NULL,
                    fileNameOnly TEXT NOT NULL,
                    normalizedFileName TEXT NOT NULL,
                    extension TEXT,
                    size INTEGER,
                    modifiedTime INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS playlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    path TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('Folder', 'Playlist', 'Root', 'vdjfolder')),
                    track_count INTEGER DEFAULT 0 CHECK (track_count >= 0),
                    parent_id INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (parent_id) REFERENCES playlists(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS tracks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    path TEXT UNIQUE NOT NULL,
                    fileName TEXT NOT NULL,
                    fileNameOnly TEXT NOT NULL,
                    normalizedFileName TEXT NOT NULL,
                    status TEXT DEFAULT 'Missing' CHECK (status IN ('Found', 'Missing', 'Error', 'Processing')),
                    playlist_id INTEGER,
                    music_file_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL,
                    FOREIGN KEY (music_file_id) REFERENCES music_files(path) ON DELETE SET NULL
                );

                CREATE TABLE IF NOT EXISTS playlist_tracks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    playlist_id INTEGER NOT NULL,
                    track_id INTEGER NOT NULL,
                    track_order INTEGER,
                    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
                    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
                    UNIQUE(playlist_id, track_id)
                );
            ";

            using var command = new SqliteCommand(basicSchema, connection);
            await command.ExecuteNonQueryAsync();
        }

        // Dapper Bulk Operations
        public async Task BulkInsertMusicFilesAsync(List<MusicFile> musicFiles)
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            const int batchSize = 1000;
            var batches = musicFiles.Chunk(batchSize);

            foreach (var batch in batches)
            {
                var sql = @"
                    INSERT INTO music_files (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime, created_at, updated_at)
                    VALUES (@Path, @FileName, @FileNameOnly, @NormalizedFileName, @Extension, @Size, @ModifiedTime, @CreatedAt, @UpdatedAt)";

                await connection.ExecuteAsync(sql, batch);
            }
        }

        public async Task BulkInsertPlaylistsAsync(List<Playlist> playlists)
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            const int batchSize = 1000;
            var batches = playlists.Chunk(batchSize);

            foreach (var batch in batches)
            {
                var sql = @"
                    INSERT INTO playlists (path, name, type, track_count, parent_id, created_at, updated_at)
                    VALUES (@Path, @Name, @Type, @TrackCount, @ParentId, @CreatedAt, @UpdatedAt)";

                // Enum'u string'e çevir
                var playlistsWithStringType = batch.Select(p => new
                {
                    p.Path,
                    p.Name,
                    Type = p.Type switch
                    {
                        PlaylistType.Playlist => "Playlist",
                        PlaylistType.VDJFolder => "vdjfolder",
                        PlaylistType.Folder => "Folder",
                        PlaylistType.Root => "Root",
                        _ => "Folder"
                    },
                    p.TrackCount,
                    p.ParentId,
                    p.CreatedAt,
                    p.UpdatedAt
                }).ToList();

                await connection.ExecuteAsync(sql, playlistsWithStringType);
            }
        }

        public async Task BulkInsertTracksAsync(List<Track> tracks)
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            const int batchSize = 1000;
            var batches = tracks.Chunk(batchSize);

            foreach (var batch in batches)
            {
                var sql = @"
                    INSERT INTO tracks (path, fileName, fileNameOnly, normalizedFileName, status, playlist_file_path, track_order, created_at, updated_at)
                    VALUES (@Path, @FileName, @FileNameOnly, @NormalizedFileName, @Status, @PlaylistFilePath, @TrackOrder, @CreatedAt, @UpdatedAt)";

                // Enum'u string'e çevir
                var tracksWithStringStatus = batch.Select(t => new
                {
                    t.Path,
                    t.FileName,
                    t.FileNameOnly,
                    t.NormalizedFileName,
                    Status = t.Status switch
                    {
                        TrackStatus.Found => "Found",
                        TrackStatus.Missing => "Missing",
                        TrackStatus.Error => "Error",
                        TrackStatus.Processing => "Processing",
                        _ => "Missing"
                    },
                    PlaylistFilePath = t.PlaylistFilePath,
                    TrackOrder = t.TrackOrder,
                    t.CreatedAt,
                    t.UpdatedAt
                }).ToList();

                await connection.ExecuteAsync(sql, tracksWithStringStatus);
            }
        }

        // Import öncesi tablo temizliği
        public async Task CleanTablesBeforeImportAsync()
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            LogInfo("🧹 Import öncesi tablo temizliği başlıyor...");

            // import_sessions HARİÇ tüm tabloları temizle
            var tablesToClean = new[] { "music_files", "playlists", "tracks", "track_words", "music_words" };

            foreach (var table in tablesToClean)
            {
                await connection.ExecuteAsync($"DELETE FROM {table}");
                LogInfo($"  ✅ {table} temizlendi");
            }

            // VACUUM çalıştır (performans için)
            await connection.ExecuteAsync("VACUUM");
            LogInfo("✅ Tablo temizliği tamamlandı (VACUUM çalıştırıldı)");
        }

        // Gereksiz trigger ve view'ları kaldır
        public async Task DropUnnecessaryTriggersAndViewsAsync()
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            LogInfo("🗑️ Gereksiz trigger ve view'lar kaldırılıyor...");

            // Gereksiz trigger'ı kaldır
            await connection.ExecuteAsync("DROP TRIGGER IF EXISTS tr_tracks_music_file_update");
            LogInfo("  ✅ tr_tracks_music_file_update trigger kaldırıldı");

            // Gereksiz view'ları kaldır
            var viewsToDrop = new[] { "v_database_stats", "v_playlist_hierarchy", "v_unmatched_tracks", "v_unmatched_tracks_indexed", "v_search_stats" };

            foreach (var view in viewsToDrop)
            {
                await connection.ExecuteAsync($"DROP VIEW IF EXISTS {view}");
                LogInfo($"  ✅ {view} view kaldırıldı");
            }

            LogInfo("✅ Gereksiz trigger ve view'lar kaldırıldı");
        }

        // Track status'larını toplu güncelle (Available/Missing)
        public async Task UpdateTrackStatusesAsync()
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            LogInfo("🔄 Track status'ları güncelleniyor...");

            var sql = @"
                UPDATE tracks 
                SET status = CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM music_files m 
                        WHERE m.path = tracks.path 
                        OR m.normalizedFileName = tracks.normalizedFileName
                    ) THEN 'Found'
                    ELSE 'Missing'
                END,
                updated_at = CURRENT_TIMESTAMP";

            var affectedRows = await connection.ExecuteAsync(sql);
            LogInfo($"✅ {affectedRows} track status'u güncellendi");
        }

        // Tracks'ten playlists tablosunu doldur (GROUP BY ile)
        public async Task InsertPlaylistsFromTracksAsync()
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            var sql = @"
                INSERT INTO playlists (path, type, track_count, created_at, updated_at)
                SELECT 
                    playlist_file_path,
                    CASE 
                        WHEN playlist_file_path LIKE '%.vdjfolder' THEN 'vdjfolder'
                        WHEN playlist_file_path LIKE '%.m3u' THEN 'Playlist'
                        WHEN playlist_file_path LIKE '%.m3u8' THEN 'Playlist'
                        ELSE 'Folder'
                    END as type,
                    COUNT(*) as track_count,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                FROM tracks
                WHERE playlist_file_path IS NOT NULL
                GROUP BY playlist_file_path
                ON CONFLICT(path) DO UPDATE SET
                    track_count = EXCLUDED.track_count,
                    updated_at = CURRENT_TIMESTAMP
            ";

            var affectedRows = await connection.ExecuteAsync(sql);
            LogInfo($"✅ {affectedRows} playlist tracks'ten oluşturuldu");
        }

        // Track words bulk insert
        public async Task BulkInsertTrackWordsAsync(List<TrackWord> trackWords)
        {
            if (trackWords == null || trackWords.Count == 0)
            {
                return;
            }

            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var transaction = connection.BeginTransaction();
            try
            {
                const int batchSize = 5000;
                var batches = trackWords.Chunk(batchSize).ToList();
                var totalInserted = 0;
                var batchIndex = 0;

                foreach (var batch in batches)
                {
                    batchIndex++;
                    var sql = @"
                        INSERT INTO track_words (track_id, word, word_length, word_position, created_at)
                        VALUES (@TrackId, @Word, @WordLength, @WordPosition, @CreatedAt)
                        ON CONFLICT(track_id, word, word_position) DO NOTHING";

                    var inserted = await connection.ExecuteAsync(sql, batch, transaction);
                    totalInserted += inserted;

                    if (batches.Count > 1)
                    {
                        LogInfo($"  📦 Batch {batchIndex}/{batches.Count} işlendi: {batch.Count()} kelime ({totalInserted}/{trackWords.Count})");
                    }
                }

                transaction.Commit();
                LogInfo($"✅ {totalInserted} track_words kaydı eklendi");
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        // Music words bulk insert
        public async Task BulkInsertMusicWordsAsync(List<MusicWord> musicWords)
        {
            if (musicWords == null || musicWords.Count == 0)
            {
                return;
            }

            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var transaction = connection.BeginTransaction();
            try
            {
                const int batchSize = 5000;
                var batches = musicWords.Chunk(batchSize).ToList();
                var totalInserted = 0;
                var batchIndex = 0;

                foreach (var batch in batches)
                {
                    batchIndex++;
                    var sql = @"
                        INSERT INTO music_words (music_file_id, word, word_length, word_position, created_at)
                        VALUES (@MusicFileId, @Word, @WordLength, @WordPosition, @CreatedAt)
                        ON CONFLICT(music_file_id, word, word_position) DO NOTHING";

                    var inserted = await connection.ExecuteAsync(sql, batch, transaction);
                    totalInserted += inserted;

                    if (batches.Count > 1)
                    {
                        LogInfo($"  📦 Batch {batchIndex}/{batches.Count} işlendi: {batch.Count()} kelime ({totalInserted}/{musicWords.Count})");
                    }
                }

                transaction.Commit();
                LogInfo($"✅ {totalInserted} music_words kaydı eklendi");
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        // Query methods for WordIndexService
        public async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null)
        {
            using var connection = GetConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            return await connection.QueryAsync<T>(sql, param);
        }

        private void LogInfo(string message)
        {
            Console.WriteLine(message);
        }

        public void Dispose()
        {
            _connection?.Dispose();
        }
    }
}