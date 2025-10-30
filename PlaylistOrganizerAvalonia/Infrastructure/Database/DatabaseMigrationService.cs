using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Threading.Tasks;

namespace PlaylistOrganizerAvalonia.Infrastructure.Database
{
    /// <summary>
    /// Database migration service for schema management
    /// </summary>
    public class DatabaseMigrationService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<DatabaseMigrationService> _logger;
        private readonly string _connectionString;

        public DatabaseMigrationService(IConfiguration configuration, ILogger<DatabaseMigrationService> logger)
        {
            _configuration = configuration;
            _logger = logger;
            _connectionString = _configuration.GetConnectionString("DefaultConnection") ?? 
                              "Data Source=playlistorganizer.db";
        }

        /// <summary>
        /// Initialize database with clean schema
        /// </summary>
        public async Task InitializeDatabaseAsync()
        {
            try
            {
                _logger.LogInformation("Starting database initialization...");

                // Read schema from file
                var schemaPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Database", "schema.sql");
                if (!File.Exists(schemaPath))
                {
                    throw new FileNotFoundException($"Schema file not found: {schemaPath}");
                }

                var schema = await File.ReadAllTextAsync(schemaPath);

                // Apply schema
                using var connection = new SqliteConnection(_connectionString);
                await connection.OpenAsync();

                using var command = new SqliteCommand(schema, connection);
                await command.ExecuteNonQueryAsync();

                _logger.LogInformation("Database schema applied successfully");

                // Verify tables
                await VerifyTablesAsync(connection);

                _logger.LogInformation("Database initialization completed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize database");
                throw;
            }
        }

        /// <summary>
        /// Migrate existing database to new schema
        /// </summary>
        public async Task MigrateDatabaseAsync()
        {
            try
            {
                _logger.LogInformation("Starting database migration...");

                using var connection = new SqliteConnection(_connectionString);
                await connection.OpenAsync();

                // Check if migration is needed
                if (await IsMigrationNeededAsync(connection))
                {
                    await PerformMigrationAsync(connection);
                    _logger.LogInformation("Database migration completed");
                }
                else
                {
                    _logger.LogInformation("No migration needed");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to migrate database");
                throw;
            }
        }

        /// <summary>
        /// Backup current database
        /// </summary>
        public async Task BackupDatabaseAsync(string backupPath)
        {
            try
            {
                _logger.LogInformation($"Creating database backup: {backupPath}");

                var sourcePath = GetDatabasePath();
                if (File.Exists(sourcePath))
                {
                    await Task.Run(() => File.Copy(sourcePath, backupPath, true));
                    _logger.LogInformation("Database backup created successfully");
                }
                else
                {
                    _logger.LogWarning("Source database file not found");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create database backup");
                throw;
            }
        }

        /// <summary>
        /// Restore database from backup
        /// </summary>
        public async Task RestoreDatabaseAsync(string backupPath)
        {
            try
            {
                _logger.LogInformation($"Restoring database from backup: {backupPath}");

                if (!File.Exists(backupPath))
                {
                    throw new FileNotFoundException($"Backup file not found: {backupPath}");
                }

                var targetPath = GetDatabasePath();
                await Task.Run(() => File.Copy(backupPath, targetPath, true));

                _logger.LogInformation("Database restored successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to restore database");
                throw;
            }
        }

        /// <summary>
        /// Get database statistics
        /// </summary>
        public async Task<DatabaseStatistics> GetDatabaseStatisticsAsync()
        {
            try
            {
                using var connection = new SqliteConnection(_connectionString);
                await connection.OpenAsync();

                var stats = new DatabaseStatistics();

                // Get table counts
                var tables = new[] { "music_files", "playlists", "tracks", "playlist_tracks", "track_words", "music_words" };
                
                foreach (var table in tables)
                {
                    using var command = new SqliteCommand($"SELECT COUNT(*) FROM {table}", connection);
                    var count = Convert.ToInt32(await command.ExecuteScalarAsync());
                    
                    switch (table)
                    {
                        case "music_files":
                            stats.MusicFilesCount = count;
                            break;
                        case "playlists":
                            stats.PlaylistsCount = count;
                            break;
                        case "tracks":
                            stats.TracksCount = count;
                            break;
                        case "playlist_tracks":
                            stats.PlaylistTracksCount = count;
                            break;
                        case "track_words":
                            stats.TrackWordsCount = count;
                            break;
                        case "music_words":
                            stats.MusicWordsCount = count;
                            break;
                    }
                }

                // Get database file size
                var dbPath = GetDatabasePath();
                if (File.Exists(dbPath))
                {
                    var fileInfo = new FileInfo(dbPath);
                    stats.DatabaseSizeBytes = fileInfo.Length;
                }

                return stats;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get database statistics");
                throw;
            }
        }

        private async Task<bool> IsMigrationNeededAsync(SqliteConnection connection)
        {
            // Check if new tables exist
            var newTables = new[] { "music_files", "track_words", "music_words" };
            
            foreach (var table in newTables)
            {
                using var command = new SqliteCommand(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=@tableName", 
                    connection);
                command.Parameters.AddWithValue("@tableName", table);
                
                var result = await command.ExecuteScalarAsync();
                if (result == null)
                {
                    return true; // Migration needed
                }
            }

            return false;
        }

        private async Task PerformMigrationAsync(SqliteConnection connection)
        {
            // Create backup first
            var backupPath = Path.Combine(
                Path.GetDirectoryName(GetDatabasePath()) ?? "",
                $"playlistorganizer_backup_{DateTime.Now:yyyyMMdd_HHmmss}.db"
            );
            await BackupDatabaseAsync(backupPath);

            // Read and apply new schema
            var schemaPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Database", "schema.sql");
            var schema = await File.ReadAllTextAsync(schemaPath);

            using var command = new SqliteCommand(schema, connection);
            await command.ExecuteNonQueryAsync();

            _logger.LogInformation($"Database migrated successfully. Backup created: {backupPath}");
        }

        private async Task VerifyTablesAsync(SqliteConnection connection)
        {
            var expectedTables = new[] 
            { 
                "music_files", "playlists", "tracks", "playlist_tracks", 
                "track_words", "music_words", "import_sessions" 
            };

            foreach (var table in expectedTables)
            {
                using var command = new SqliteCommand(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=@tableName", 
                    connection);
                command.Parameters.AddWithValue("@tableName", table);
                
                var result = await command.ExecuteScalarAsync();
                if (result == null)
                {
                    throw new InvalidOperationException($"Required table '{table}' not found after migration");
                }
            }

            _logger.LogInformation("All required tables verified");
        }

        private string GetDatabasePath()
        {
            var dbPath = _configuration["Database:Path"];
            if (!string.IsNullOrEmpty(dbPath) && File.Exists(dbPath))
            {
                return dbPath;
            }

            // Fallback to connection string
            if (_connectionString.StartsWith("Data Source="))
            {
                return _connectionString.Substring("Data Source=".Length);
            }

            return "playlistorganizer.db";
        }
    }

    /// <summary>
    /// Database statistics model
    /// </summary>
    public class DatabaseStatistics
    {
        public int MusicFilesCount { get; set; }
        public int PlaylistsCount { get; set; }
        public int TracksCount { get; set; }
        public int PlaylistTracksCount { get; set; }
        public int TrackWordsCount { get; set; }
        public int MusicWordsCount { get; set; }
        public long DatabaseSizeBytes { get; set; }

        public string DatabaseSizeFormatted => FormatBytes(DatabaseSizeBytes);
        public int TotalRecords => MusicFilesCount + PlaylistsCount + TracksCount + PlaylistTracksCount + TrackWordsCount + MusicWordsCount;

        private static string FormatBytes(long bytes)
        {
            string[] suffixes = { "B", "KB", "MB", "GB", "TB" };
            int counter = 0;
            decimal number = bytes;
            while (Math.Round(number / 1024) >= 1)
            {
                number /= 1024;
                counter++;
            }
            return $"{number:n1} {suffixes[counter]}";
        }
    }
}
