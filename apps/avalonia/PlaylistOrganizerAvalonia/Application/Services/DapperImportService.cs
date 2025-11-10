using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Common;
using PlaylistOrganizerAvalonia.Application.Interfaces;
using PlaylistOrganizerAvalonia.Application.Models;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.Domain.Enums;
using PlaylistOrganizerAvalonia.Infrastructure.Services;
using PlaylistOrganizerAvalonia.Shared.Services;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// Dapper ile bulk insert import servisi
    /// </summary>
    public class DapperImportService : BaseDatabaseService
    {
        private readonly FileScannerService _fileScannerService;
        private readonly M3UParserService _m3uParserService;
        private readonly VDJFolderParserService _vdjFolderParserService;
        private readonly IWordIndexService _wordIndexService;

        public DapperImportService(
            ILogger<DapperImportService> logger,
            IDatabaseManager databaseManager,
            FileScannerService fileScannerService,
            M3UParserService m3uParserService,
            VDJFolderParserService vdjFolderParserService,
            IWordIndexService wordIndexService)
            : base(logger, databaseManager)
        {
            _fileScannerService = fileScannerService;
            _m3uParserService = m3uParserService;
            _vdjFolderParserService = vdjFolderParserService;
            _wordIndexService = wordIndexService;
        }

        /// <summary>
        /// Dapper ile bulk insert import
        /// </summary>
        public async Task<ImportResult> ImportAllWithBulkInsertAsync(IProgress<ImportProgress>? progress = null)
        {
            var result = new ImportResult();
            ImportSession? importSession = null;

            // Progress helper
            void ReportProgress(string stage, int percentage, int processed = 0, int total = 0, string currentFile = "")
            {
                progress?.Report(new ImportProgress
                {
                    CurrentStage = stage,
                    ProgressPercentage = percentage,
                    ProcessedFiles = processed,
                    TotalFiles = total,
                    CurrentFile = currentFile
                });
                LogInfo($"📊 [{percentage}%] {stage}");
            }

            try
            {
                LogInfo("🚀 Dapper ile bulk insert import başlatılıyor...");
                ReportProgress("Import başlatılıyor...", 0);

                // 1. Import session oluştur (5%)
                ReportProgress("Import session oluşturuluyor...", 5);
                try
                {
                    importSession = new ImportSession
                    {
                        SessionType = ImportSessionType.Import,
                        SourcePath = "/Users/koray/Music/KorayMusics", // Hardcoded for now
                        Status = ImportSessionStatus.Running,
                        StartedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    var sessionId = await DatabaseManager.InsertImportSessionAsync(importSession);
                    importSession.Id = sessionId;
                    LogInfo($"✅ Import session oluşturuldu: {sessionId}");
                }
                catch (Exception ex)
                {
                    LogWarning($"Import session oluşturulamadı: {ex.Message}");
                    // Import devam etsin
                }

                // 2. Database'i temizle (10%)
                ReportProgress("Database temizleniyor...", 10);
                LogInfo("🧹 Import öncesi temizlik başlatılıyor...");
                await DatabaseManager.CleanTablesBeforeImportAsync();
                ReportProgress("Database temizlendi", 10);

                // 3. Müzik dosyalarını tara (15%)
                ReportProgress("Müzik dosyaları taranıyor...", 15);
                LogInfo("Müzik dosyaları taranıyor...");
                var musicFiles = await _fileScannerService.ScanMusicFilesAsync();
                LogInfo($"✅ Tarama tamamlandı: {musicFiles.Count} müzik dosyası bulundu");
                ReportProgress($"Müzik dosyaları taranıyor... ({musicFiles.Count} bulundu)", 15, musicFiles.Count, musicFiles.Count);

                // 4. Müzik dosyalarını bulk insert ile import et (25%)
                ReportProgress($"{musicFiles.Count} müzik dosyası import ediliyor...", 20);
                await BulkInsertMusicFilesAsync(musicFiles, progress, 20, 25);
                ReportProgress($"{musicFiles.Count} müzik dosyası import edildi", 25);

                // Session'ı güncelle (hata durumunda atla)
                try
                {
                    if (importSession != null)
                    {
                        importSession.MusicFilesCount = musicFiles.Count;
                        importSession.ProcessedFiles += musicFiles.Count;
                        await DatabaseManager.UpdateImportSessionAsync(importSession);
                    }
                }
                catch (Exception ex)
                {
                    LogWarning($"Import session güncellenemedi: {ex.Message}");
                }

                // 5. Playlist dosyalarını tara (30%)
                ReportProgress("Playlist dosyaları taranıyor...", 30);
                LogInfo("Playlist dosyaları taranıyor...");
                var playlistFiles = await _fileScannerService.ScanPlaylistFilesAsync();
                LogInfo($"✅ Tarama tamamlandı: {playlistFiles.Count} playlist dosyası bulundu");
                ReportProgress($"Playlist dosyaları taranıyor... ({playlistFiles.Count} bulundu)", 30, playlistFiles.Count, playlistFiles.Count);

                // 6. Track'leri bulk insert ile import et (50%)
                ReportProgress("Track'ler parse ediliyor ve import ediliyor...", 35);
                await BulkInsertTracksAsync(playlistFiles, progress, 35, 50);
                ReportProgress("Track'ler import edildi", 50);

                // 7. Track'lerden playlists tablosunu oluştur (55%)
                ReportProgress("Playlists tablosu oluşturuluyor...", 55);
                LogInfo("Track'lerden playlists tablosu oluşturuluyor...");
                await DatabaseManager.InsertPlaylistsFromTracksAsync();
                ReportProgress("Playlists tablosu oluşturuldu", 55);

                // Session'ı güncelle (hata durumunda atla)
                try
                {
                    if (importSession != null)
                    {
                        var playlistsCount = await DatabaseManager.GetPlaylistsCountAsync();
                        var tracksCount = await DatabaseManager.GetTracksCountAsync();
                        importSession.PlaylistsCount = playlistsCount;
                        importSession.TracksCount = tracksCount;
                        importSession.ProcessedFiles += tracksCount;
                        await DatabaseManager.UpdateImportSessionAsync(importSession);
                    }
                }
                catch (Exception ex)
                {
                    LogWarning($"Import session güncellenemedi: {ex.Message}");
                }

                // 8. Post-processing: Track status güncelle (70%)
                ReportProgress("Track status'ları güncelleniyor...", 60);
                LogInfo("🔄 Track status'ları güncelleniyor...");
                await DatabaseManager.UpdateTrackStatusesAsync();
                ReportProgress("Track status'ları güncellendi", 70);

                // 9. Word indexing (85%)
                ReportProgress("Word indexing başlatılıyor...", 70);
                LogInfo("🔍 Word indexing başlatılıyor...");
                await _wordIndexService.IndexAllAsync();
                ReportProgress("Word indexing tamamlandı", 85);
                LogInfo("✅ Word indexing tamamlandı");

                // TODO: Word indexing için progress tracking ekle (IndexAllAsync içinde)

                // 10. İstatistikleri güncelle (100%)
                ReportProgress("İstatistikler güncelleniyor...", 90);
                LogInfo("İstatistikler güncelleniyor...");
                var finalTrackCount = await DatabaseManager.GetTracksCountAsync();
                var finalPlaylistCount = await DatabaseManager.GetPlaylistsCountAsync();
                result.MusicFilesImported = musicFiles.Count;
                result.PlaylistFilesImported = finalPlaylistCount;
                result.TracksImported = finalTrackCount;
                result.TotalFiles = musicFiles.Count + playlistFiles.Count;
                result.ProcessedFiles = result.TotalFiles;
                result.AddedFiles = result.ProcessedFiles;
                result.SkippedFiles = 0;
                result.ErrorFiles = 0;

                // Session'ı tamamla (hata durumunda atla)
                try
                {
                    if (importSession != null)
                    {
                        importSession.Complete(ImportSessionStatus.Completed);
                        await DatabaseManager.UpdateImportSessionAsync(importSession);
                    }
                }
                catch (Exception ex)
                {
                    LogWarning($"Import session tamamlanamadı: {ex.Message}");
                }

                ReportProgress("Import tamamlandı", 100);
                LogInfo($"✅ Dapper import başarıyla tamamlandı: {musicFiles.Count} müzik, {playlistFiles.Count} playlist, {finalTrackCount} track");
            }
            catch (Exception ex)
            {
                LogError(ex, "Dapper import sırasında hata oluştu");
                result.ErrorFiles = 1;
                ReportProgress($"HATA: {ex.Message}", -1);

                // Session'ı hata ile tamamla
                if (importSession != null)
                {
                    importSession.Complete(ImportSessionStatus.Failed, ex.Message);
                    await DatabaseManager.UpdateImportSessionAsync(importSession);
                }

                throw;
            }

            return result;
        }

        /// <summary>
        /// Müzik dosyalarını bulk insert ile import et
        /// </summary>
        private async Task BulkInsertMusicFilesAsync(List<ScannedFile> musicFiles, IProgress<ImportProgress>? progress = null, int startPercent = 20, int endPercent = 25)
        {
            LogInfo($"{musicFiles.Count} müzik dosyası bulk insert ile import ediliyor...");

            const int batchSize = 1000; // 1000'lik parçalar halinde
            var batches = musicFiles.Chunk(batchSize).ToList();
            var processedCount = 0;

            for (int i = 0; i < batches.Count; i++)
            {
                var batch = batches[i];
                var musicFileEntities = batch.Select(musicFile => new MusicFile
                {
                    Path = musicFile.Path,
                    FileName = musicFile.Name,
                    FileNameOnly = Path.GetFileNameWithoutExtension(musicFile.Name),
                    NormalizedFileName = StringNormalizationService.NormalizeFileName(musicFile.Name),
                    Extension = musicFile.Extension,
                    Size = musicFile.Size,
                    ModifiedTime = ((DateTimeOffset)musicFile.ModifiedTime).ToUnixTimeSeconds(),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }).ToList();

                await BulkInsertMusicFilesBatchAsync(musicFileEntities);
                processedCount += batch.Count();

                // Progress hesapla
                var currentPercent = startPercent + (int)((endPercent - startPercent) * (double)processedCount / musicFiles.Count);
                progress?.Report(new ImportProgress
                {
                    CurrentStage = $"Müzik dosyaları import ediliyor... ({processedCount}/{musicFiles.Count})",
                    ProgressPercentage = currentPercent,
                    ProcessedFiles = processedCount,
                    TotalFiles = musicFiles.Count
                });
            }
        }

        // NOT: BulkInsertPlaylistsAsync metodu kaldırıldı
        // Playlists artık tracks'ten otomatik oluşturuluyor (InsertPlaylistsFromTracksAsync)

        /// <summary>
        /// Track'leri bulk insert ile import et (playlist_file_path ile)
        /// </summary>
        private async Task BulkInsertTracksAsync(List<ScannedFile> playlistFiles, IProgress<ImportProgress>? progress = null, int startPercent = 35, int endPercent = 50)
        {
            LogInfo("Track'ler bulk insert ile import ediliyor...");

            const int batchSize = 1000;
            var allTracks = new List<Track>();
            var parsedPlaylistCount = 0;
            var totalPlaylists = playlistFiles.Count;

            // Parse etme ve progress tracking
            foreach (var playlistFile in playlistFiles)
            {
                List<ParsedTrack> parsedTracks = new();

                // Playlist tipine göre parse et
                var extension = Path.GetExtension(playlistFile.Path).ToLowerInvariant();
                if (extension == ".m3u" || extension == ".m3u8")
                {
                    parsedTracks = await _m3uParserService.ParseM3UFileAsync(playlistFile.Path);
                }
                else if (extension == ".vdjfolder")
                {
                    parsedTracks = await _vdjFolderParserService.ParseVDJFolderAsync(playlistFile.Path);
                }
                else
                {
                    continue; // Tanınmayan format
                }

                // Track'leri entity'ye çevir
                var trackEntities = parsedTracks.Select((parsedTrack, index) => new Track
                {
                    Path = parsedTrack.OriginalPath,
                    FileName = Path.GetFileName(parsedTrack.OriginalPath),
                    FileNameOnly = Path.GetFileNameWithoutExtension(parsedTrack.OriginalPath),
                    NormalizedFileName = parsedTrack.NormalizedName,
                    PlaylistFilePath = playlistFile.Path, // Hangi playlist dosyasından
                    TrackOrder = index + 1, // Playlist içindeki sıra
                    Status = TrackStatus.Missing,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }).ToList();

                allTracks.AddRange(trackEntities);
                parsedPlaylistCount++;

                // Parse progress (startPercent ile startPercent + 10 arası)
                var parseEndPercent = startPercent + 10;
                var parsePercent = startPercent + (int)(10 * (double)parsedPlaylistCount / totalPlaylists);
                
                // Progress güncellemesini daha sık yap (her 10 dosyada bir)
                if (parsedPlaylistCount % 10 == 0 || parsedPlaylistCount == totalPlaylists)
                {
                    progress?.Report(new ImportProgress
                    {
                        CurrentStage = $"Playlist parse ediliyor... ({parsedPlaylistCount}/{totalPlaylists}) - {playlistFile.Name}",
                        ProgressPercentage = parsePercent,
                        ProcessedFiles = parsedPlaylistCount,
                        TotalFiles = totalPlaylists,
                        CurrentFile = playlistFile.Name
                    });
                }
                
                // Her dosyada son log
                LogInfo($"✅ {parsedTracks.Count} track '{playlistFile.Name}' playlist dosyasından parse edildi");
                
                // UI thread'e nefes almak için fırsat ver (her 100 dosyada bir)
                if (parsedPlaylistCount % 100 == 0)
                {
                    await Task.Yield();
                }
            }

            // Batch'ler halinde insert et (startPercent + 10 ile endPercent arası)
            var insertStartPercent = startPercent + 10;
            var batches = allTracks.Chunk(batchSize).ToList();
            var insertedCount = 0;

            for (int i = 0; i < batches.Count; i++)
            {
                var batch = batches[i];
                await BulkInsertTracksBatchAsync(batch.ToList());
                insertedCount += batch.Count();

                // Insert progress
                var insertPercent = insertStartPercent + (int)((endPercent - insertStartPercent) * (double)insertedCount / allTracks.Count);
                progress?.Report(new ImportProgress
                {
                    CurrentStage = $"Track'ler import ediliyor... ({insertedCount}/{allTracks.Count})",
                    ProgressPercentage = insertPercent,
                    ProcessedFiles = insertedCount,
                    TotalFiles = allTracks.Count
                });
            }

            LogInfo($"✅ Toplam {allTracks.Count} track import edildi");
        }

        /// <summary>
        /// Müzik dosyalarını batch halinde bulk insert et
        /// </summary>
        private async Task BulkInsertMusicFilesBatchAsync(List<MusicFile> musicFiles)
        {
            using var connection = DatabaseManager.GetConnection();

            var sql = @"
                INSERT INTO music_files (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime, created_at, updated_at)
                VALUES (@Path, @FileName, @FileNameOnly, @NormalizedFileName, @Extension, @Size, @ModifiedTime, @CreatedAt, @UpdatedAt)";

            await connection.ExecuteAsync(sql, musicFiles);
        }

        /// <summary>
        /// Playlist dosyalarını batch halinde bulk insert et
        /// </summary>
        private async Task BulkInsertPlaylistFilesBatchAsync(List<Playlist> playlists)
        {
            using var connection = DatabaseManager.GetConnection();

            var sql = @"
                INSERT INTO playlists (path, name, type, track_count, parent_id, created_at, updated_at)
                VALUES (@Path, @Name, @Type, @TrackCount, @ParentId, @CreatedAt, @UpdatedAt)";

            // Enum'u string'e çevir - Database schema'ya uygun
            var playlistsWithStringType = playlists.Select(p => new
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

            // Debug: Hangi type'ları gönderiyoruz?
            var types = playlistsWithStringType.Select(p => p.Type).Distinct().ToList();
            LogInfo($"Gönderilen playlist type'ları: {string.Join(", ", types)}");

            await connection.ExecuteAsync(sql, playlistsWithStringType);
        }

        /// <summary>
        /// Track'leri batch halinde bulk insert et
        /// </summary>
        private async Task BulkInsertTracksBatchAsync(List<Track> tracks)
        {
            using var connection = DatabaseManager.GetConnection();

            var sql = @"
                INSERT INTO tracks (path, fileName, fileNameOnly, normalizedFileName, status, playlist_file_path, track_order, created_at, updated_at)
                VALUES (@Path, @FileName, @FileNameOnly, @NormalizedFileName, @Status, @PlaylistFilePath, @TrackOrder, @CreatedAt, @UpdatedAt)";

            // Enum'u string'e çevir - Database schema'ya uygun
            var tracksWithStringStatus = tracks.Select(t => new
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
                t.PlaylistFilePath,
                t.TrackOrder,
                t.CreatedAt,
                t.UpdatedAt
            }).ToList();

            await connection.ExecuteAsync(sql, tracksWithStringStatus);
        }

        /// <summary>
        /// Import öncesi database'i temizle (session tablosu hariç)
        /// </summary>
        private async Task CleanDatabaseBeforeImportAsync()
        {
            try
            {
                LogInfo("Import öncesi database temizleniyor...");

                using var connection = DatabaseManager.GetConnection();
                if (connection.State != System.Data.ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }

                using var transaction = connection.BeginTransaction();

                try
                {
                    // Foreign key constraints'i geçici olarak kapat
                    using var pragmaCommand = new Microsoft.Data.Sqlite.SqliteCommand("PRAGMA foreign_keys = OFF", connection, transaction);
                    await pragmaCommand.ExecuteNonQueryAsync();

                    // Tabloları temizle (bağımlı tablolar önce)
                    var deleteCommands = new[]
                    {
                        "DELETE FROM tracks",
                        "DELETE FROM playlists",
                        "DELETE FROM music_files",
                        "DELETE FROM music_words"
                    };

                    foreach (var deleteCommand in deleteCommands)
                    {
                        using var command = new Microsoft.Data.Sqlite.SqliteCommand(deleteCommand, connection, transaction);
                        await command.ExecuteNonQueryAsync();
                    }

                    // Foreign key constraints'i tekrar aç
                    using var pragmaCommand2 = new Microsoft.Data.Sqlite.SqliteCommand("PRAGMA foreign_keys = ON", connection, transaction);
                    await pragmaCommand2.ExecuteNonQueryAsync();

                    transaction.Commit();
                    LogInfo("Database başarıyla temizlendi");
                }
                catch
                {
                    transaction.Rollback();
                    throw;
                }
            }
            catch (Exception ex)
            {
                LogError(ex, "Database temizleme sırasında hata oluştu");
                throw;
            }
        }

        /// <summary>
        /// Playlist tipini belirle
        /// </summary>
        private PlaylistType DeterminePlaylistType(string extension)
        {
            return extension.ToLowerInvariant() switch
            {
                ".m3u" => PlaylistType.Playlist,
                ".m3u8" => PlaylistType.Playlist,
                ".vdjfolder" => PlaylistType.VDJFolder,
                ".vdj" => PlaylistType.VDJFolder,
                _ => PlaylistType.Folder
            };
        }

        /// <summary>
        /// Track path'lerine göre track ID'lerini al
        /// </summary>
        private async Task<List<int>> GetTrackIdsByPathsAsync(List<string> paths)
        {
            using var connection = DatabaseManager.GetConnection();

            var sql = "SELECT id FROM tracks WHERE path IN @Paths";
            var trackIds = await connection.QueryAsync<int>(sql, new { Paths = paths });

            return trackIds.ToList();
        }
    }
}