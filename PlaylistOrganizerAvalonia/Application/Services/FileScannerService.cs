using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using PlaylistOrganizerAvalonia.Application.Common;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// Dosya sistemi tarama servisi
    /// </summary>
    public class FileScannerService : BaseService
    {
        private readonly IConfiguration _configuration;

        public FileScannerService(ILogger<FileScannerService> logger, IConfiguration configuration) 
            : base(logger)
        {
            _configuration = configuration;
        }

        /// <summary>
        /// Playlist dosyalarını tara
        /// </summary>
        /// <returns>Bulunan playlist dosyaları</returns>
        public async Task<List<ScannedFile>> ScanPlaylistFilesAsync()
        {
            var playlistFiles = new List<ScannedFile>();
            var virtualDJPath = _configuration["ImportPaths:VirtualDJ"];

            if (string.IsNullOrEmpty(virtualDJPath) || !Directory.Exists(virtualDJPath))
            {
                LogWarning($"VirtualDJ klasörü bulunamadı: {virtualDJPath}");
                return playlistFiles;
            }

            LogInfo($"Playlist dosyaları taranıyor: {virtualDJPath}");

            try
            {
                await ScanDirectoryRecursiveAsync(virtualDJPath, playlistFiles, 0);
                LogInfo($"Tarama tamamlandı: {playlistFiles.Count} playlist dosyası bulundu");
            }
            catch (Exception ex)
            {
                LogError(ex, "Playlist dosyaları taranırken hata oluştu");
            }

            return playlistFiles;
        }

        /// <summary>
        /// Müzik dosyalarını tara
        /// </summary>
        /// <returns>Bulunan müzik dosyaları</returns>
        public async Task<List<ScannedFile>> ScanMusicFilesAsync()
        {
            var musicFiles = new List<ScannedFile>();
            var musicPath = _configuration["ImportPaths:Music"];

            if (string.IsNullOrEmpty(musicPath) || !Directory.Exists(musicPath))
            {
                LogWarning($"Müzik klasörü bulunamadı: {musicPath}");
                return musicFiles;
            }

            LogInfo($"Müzik dosyaları taranıyor: {musicPath}");

            try
            {
                await ScanDirectoryRecursiveAsync(musicPath, musicFiles, 0, isMusicScan: true);
                LogInfo($"Tarama tamamlandı: {musicFiles.Count} müzik dosyası bulundu");
            }
            catch (Exception ex)
            {
                LogError(ex, "Müzik dosyaları taranırken hata oluştu");
            }

            return musicFiles;
        }

        /// <summary>
        /// Klasörü recursive olarak tara
        /// </summary>
        private async Task ScanDirectoryRecursiveAsync(string directoryPath, List<ScannedFile> files, int depth, bool isMusicScan = false)
        {
            if (depth > 10) // Maksimum derinlik kontrolü
            {
                LogWarning($"Maksimum derinlik aşıldı: {directoryPath}");
                return;
            }

            try
            {
                var directory = new DirectoryInfo(directoryPath);
                var excludePaths = GetExcludePaths();

                // Dışlanacak klasör kontrolü
                if (excludePaths.Any(excludePath => directoryPath.StartsWith(excludePath, StringComparison.OrdinalIgnoreCase)))
                {
                    LogDebug($"Klasör dışlandı: {directoryPath}");
                    return;
                }

                // Dosyaları tara
                var fileInfos = directory.GetFiles();
                foreach (var fileInfo in fileInfos)
                {
                    if (ShouldIncludeFile(fileInfo, isMusicScan))
                    {
                        files.Add(new ScannedFile
                        {
                            Path = fileInfo.FullName,
                            Name = fileInfo.Name,
                            Extension = fileInfo.Extension.ToLowerInvariant(),
                            Size = fileInfo.Length,
                            ModifiedTime = fileInfo.LastWriteTime,
                            IsMusicFile = isMusicScan
                        });
                    }
                }

                // Alt klasörleri tara
                var subDirectories = directory.GetDirectories();
                foreach (var subDirectory in subDirectories)
                {
                    await ScanDirectoryRecursiveAsync(subDirectory.FullName, files, depth + 1, isMusicScan);
                }
            }
            catch (UnauthorizedAccessException)
            {
                LogWarning($"Erişim reddedildi: {directoryPath}");
            }
            catch (Exception ex)
            {
                LogError(ex, $"Klasör taranırken hata: {directoryPath}");
            }
        }

        /// <summary>
        /// Dosya dahil edilmeli mi kontrol et
        /// </summary>
        private bool ShouldIncludeFile(FileInfo fileInfo, bool isMusicScan)
        {
            var extension = fileInfo.Extension.ToLowerInvariant();

            if (isMusicScan)
            {
                var musicExtensions = GetMusicExtensions();
                return musicExtensions.Contains(extension);
            }
            else
            {
                var playlistExtensions = GetPlaylistExtensions();
                return playlistExtensions.Contains(extension);
            }
        }

        /// <summary>
        /// Playlist uzantılarını al
        /// </summary>
        private List<string> GetPlaylistExtensions()
        {
            var extensions = _configuration.GetSection("ImportPaths:PlaylistExtensions").Get<List<string>>();
            return extensions ?? new List<string> { ".m3u", ".m3u8", ".vdjfolder" };
        }

        /// <summary>
        /// Müzik uzantılarını al
        /// </summary>
        private List<string> GetMusicExtensions()
        {
            var extensions = _configuration.GetSection("ImportPaths:MusicExtensions").Get<List<string>>();
            return extensions ?? new List<string> { ".mp3", ".wav", ".m4a", ".flac" };
        }

        /// <summary>
        /// Dışlanacak yolları al
        /// </summary>
        private List<string> GetExcludePaths()
        {
            var excludePaths = _configuration.GetSection("ImportPaths:ExcludePaths").Get<List<string>>();
            return excludePaths ?? new List<string>();
        }

        /// <summary>
        /// Dosya var mı kontrol et
        /// </summary>
        public bool FileExists(string filePath)
        {
            return File.Exists(filePath);
        }

        /// <summary>
        /// Dosya boyutunu al
        /// </summary>
        public long GetFileSize(string filePath)
        {
            try
            {
                var fileInfo = new FileInfo(filePath);
                return fileInfo.Exists ? fileInfo.Length : 0;
            }
            catch
            {
                return 0;
            }
        }

        /// <summary>
        /// Dosya değiştirilme tarihini al
        /// </summary>
        public DateTime GetFileModifiedTime(string filePath)
        {
            try
            {
                var fileInfo = new FileInfo(filePath);
                return fileInfo.Exists ? fileInfo.LastWriteTime : DateTime.MinValue;
            }
            catch
            {
                return DateTime.MinValue;
            }
        }
    }

    /// <summary>
    /// Taranmış dosya modeli
    /// </summary>
    public class ScannedFile
    {
        public string Path { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Extension { get; set; } = string.Empty;
        public long Size { get; set; }
        public DateTime ModifiedTime { get; set; }
        public bool IsMusicFile { get; set; }
    }
}
