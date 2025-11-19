using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Common;
using PlaylistOrganizerAvalonia.Shared.Services;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.Domain.Enums;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// Track fix service for missing tracks
    /// Veritabanı kullanmaz, playlist dosyalarını direkt günceller
    /// </summary>
    public class TrackFixService : BaseService
    {
        private readonly JsonWordIndexService _jsonWordIndex;
        private readonly M3UParserService _m3uParserService;
        private readonly VDJFolderParserService _vdjFolderParserService;

        public TrackFixService(
            ILogger<TrackFixService> logger, 
            JsonWordIndexService jsonWordIndex,
            M3UParserService m3uParserService,
            VDJFolderParserService vdjFolderParserService) 
            : base(logger)
        {
            _jsonWordIndex = jsonWordIndex;
            _m3uParserService = m3uParserService;
            _vdjFolderParserService = vdjFolderParserService;
        }


        /// <summary>
        /// Benzer dosya adlarına sahip dosyaları bul
        /// JSON + Memory Cache index'i kullanarak arama yapar
        /// ÖNEMLİ: Sadece dosya adı kullanılır, path dahil edilmez
        /// </summary>
        /// <param name="fileName">Sadece dosya adı (path değil, örn: "song.mp3")</param>
        private async Task<List<FileMatch>> FindSimilarFilesAsync(string fileName)
        {
            var matches = new List<FileMatch>();
            
            try
            {
                // Index yüklenmiş mi kontrol et
                if (!_jsonWordIndex.IsLoaded)
                {
                    _logger.LogWarning("JSON word index henüz yüklenmemiş. Index yüklenene kadar arama yapılamayacak.");
                    _logger.LogInformation("Index startup'ta otomatik yüklenir. Lütfen bekleyin.");
                    return matches;
                }

                _logger.LogDebug($"JSON word index yüklü: {_jsonWordIndex.FileCount} dosya");
                _logger.LogDebug($"Aranan dosya: {fileName}");

                // ÖNEMLİ: Sadece dosya adını normalize et, path'i dahil etme
                // Eğer path gelirse, sadece dosya adını al
                var fileNameOnly = Path.GetFileName(fileName);

                // JSON index'te arama yap (tam eşleşme + benzerlik)
                var searchResults = _jsonWordIndex.Search(fileNameOnly, maxResults: 200);
                
                _logger.LogDebug($"JSON index'ten {searchResults.Count} sonuç bulundu");

                // SearchResult'ları FileMatch'e çevir
                foreach (var result in searchResults)
                {
                    var confidence = (int)(result.Similarity * 100);
                        matches.Add(new FileMatch
                        {
                        Path = result.Path,
                        FileName = result.FileName,
                            Confidence = confidence
                        });
                }

                _logger.LogDebug($"FindSimilarFilesAsync sonucu: {matches.Count} eşleşme bulundu");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding similar files using JSON index");
            }

            return matches;
        }

        /// <summary>
        /// Klasör yapısında ara (artık kullanılmıyor - çok yavaş)
        /// </summary>
        private async Task<List<FileMatch>> FindInFolderStructureAsync(Track track)
        {
            // Bu metod çok yavaş olduğu için devre dışı bırakıldı
            // InMemoryWordIndex zaten tüm dosyaları index'liyor
            _logger.LogDebug("FindInFolderStructureAsync devre dışı - InMemoryWordIndex kullanılıyor");
            return new List<FileMatch>();
        }

        /// <summary>
        /// Farklı uzantılı dosyaları bul
        /// </summary>
        private async Task<List<FileMatch>> FindWithDifferentExtensionAsync(Track track)
        {
            var matches = new List<FileMatch>();
            
            try
            {
                var trackDir = Path.GetDirectoryName(track.Path);
                if (string.IsNullOrEmpty(trackDir) || !Directory.Exists(trackDir))
                    return matches;

                var fileNameWithoutExt = Path.GetFileNameWithoutExtension(track.FileName);
                var musicExtensions = new[] { ".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg" };

                foreach (var ext in musicExtensions)
                {
                    var searchPattern = fileNameWithoutExt + ext;
                    var files = Directory.GetFiles(trackDir, searchPattern, SearchOption.AllDirectories);
                    
                    foreach (var file in files)
                    {
                        matches.Add(new FileMatch
                        {
                            Path = file,
                            FileName = Path.GetFileName(file),
                            Confidence = 90 // Uzantı değişikliği yüksek confidence
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error finding files with different extension");
            }

            return matches;
        }

        /// <summary>
        /// Track'i düzelt - playlist dosyasını günceller
        /// </summary>
        public async Task<bool> FixTrackAsync(Track track, string newPath)
        {
            try
            {
                if (track == null)
                {
                    _logger.LogWarning("Track is null");
                    return false;
                }

                _logger.LogInformation($"Fixing track in playlist: {track.PlaylistFilePath}, old path: {track.Path}, new path: {newPath}");

                // Yeni path'i kontrol et
                if (!File.Exists(newPath))
                {
                    _logger.LogWarning($"New path does not exist: {newPath}");
                    return false;
                }

                // Playlist dosyasını güncelle
                var playlistPath = track.PlaylistFilePath;
                if (string.IsNullOrEmpty(playlistPath) || !File.Exists(playlistPath))
                {
                    _logger.LogWarning($"Playlist file not found: {playlistPath}");
                    return false;
                }

                var extension = Path.GetExtension(playlistPath).ToLowerInvariant();
                bool success = false;

                if (extension == ".vdjfolder")
                {
                    success = await UpdateVDJFolderTrackAsync(playlistPath, track.Path, newPath);
                }
                else if (extension == ".m3u" || extension == ".m3u8")
                {
                    success = await UpdateM3UTrackAsync(playlistPath, track.Path, newPath);
                }
                else
                {
                    _logger.LogWarning($"Unsupported playlist format: {extension}");
                    return false;
                }

                if (success)
                {
                    _logger.LogInformation($"Track fixed successfully in playlist: {playlistPath}");
                }

                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fixing track: {track?.FileName}");
                return false;
            }
        }

        /// <summary>
        /// VDJFolder dosyasındaki track'i güncelle
        /// </summary>
        private async Task<bool> UpdateVDJFolderTrackAsync(string playlistPath, string oldPath, string newPath)
        {
            try
        {
                var fileContent = await File.ReadAllTextAsync(playlistPath);
                var xmlDoc = System.Xml.Linq.XDocument.Parse(fileContent);
                
                // Eski path'i yeni path ile değiştir
                var songElements = xmlDoc.Descendants("song");
                bool updated = false;

                foreach (var songElement in songElements)
                {
                    var pathAttr = songElement.Attribute("path");
                    if (pathAttr != null && pathAttr.Value == oldPath)
                    {
                        pathAttr.Value = newPath;
                        updated = true;
                        _logger.LogDebug($"Updated VDJFolder track: {oldPath} -> {newPath}");
                    }
                }

                if (updated)
                    {
                    // Dosyayı kaydet
                    xmlDoc.Save(playlistPath);
                    return true;
                    }
                    else
                    {
                    _logger.LogWarning($"Track not found in VDJFolder: {oldPath}");
                    return false;
                    }
                }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating VDJFolder track: {playlistPath}");
                return false;
            }
        }

        /// <summary>
        /// M3U dosyasındaki track'i güncelle
        /// </summary>
        private async Task<bool> UpdateM3UTrackAsync(string playlistPath, string oldPath, string newPath)
        {
            try
            {
                var fileContent = await File.ReadAllTextAsync(playlistPath);
                var lines = fileContent.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
                bool updated = false;

                for (int i = 0; i < lines.Length; i++)
                {
                    var line = lines[i].Trim();
                    // HTML decode yap ve karşılaştır
                    var decodedLine = System.Net.WebUtility.HtmlDecode(line);
                    if (decodedLine == oldPath || line == oldPath)
                    {
                        // HTML encode yap
                        var encodedNewPath = System.Net.WebUtility.HtmlEncode(newPath);
                        lines[i] = encodedNewPath;
                        updated = true;
                        _logger.LogDebug($"Updated M3U track: {oldPath} -> {newPath}");
                        break;
                    }
                }

                if (updated)
                {
                    // Dosyayı kaydet
                    await File.WriteAllTextAsync(playlistPath, string.Join("\n", lines));
                    return true;
                }
                else
                {
                    _logger.LogWarning($"Track not found in M3U: {oldPath}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating M3U track: {playlistPath}");
                return false;
            }
        }

        /// <summary>
        /// Toplu düzeltme yap (artık kullanılmıyor - her track ayrı ayrı düzeltilmeli)
        /// </summary>
        [Obsolete("Use FixTrackAsync for individual tracks")]
        public async Task<FixResult> FixTracksBatchAsync(List<TrackFixSuggestion> suggestions)
        {
            var result = new FixResult();
            _logger.LogWarning("FixTracksBatchAsync is deprecated - use FixTrackAsync for individual tracks");
            return result;
        }


        /// <summary>
        /// Tek track için en benzer ilk 5 öneri getir
        /// </summary>
        public async Task<List<TrackFixSuggestion>> GetFixSuggestionsAsync(Track track)
        {
            try
            {
                if (track == null)
                {
                    _logger.LogWarning("Track is null");
                    return new List<TrackFixSuggestion>();
                }

                // Dosya gerçekten var mı kontrol et
                if (File.Exists(track.Path))
                {
                    return new List<TrackFixSuggestion>
                    {
                        new TrackFixSuggestion
                        {
                            Track = track,
                            TrackPath = track.Path,
                            TrackFileName = track.FileName,
                            OriginalPath = track.Path,
                            SuggestedPath = track.Path,
                            SuggestedFileName = track.FileName,
                            Confidence = 100,
                            FixType = FixType.FileExists,
                            Reason = "File exists on disk"
                        }
                    };
                }

                _logger.LogDebug($"Getting fix suggestions for track: {track.FileName} (ID: {track.Id})");

                var allMatches = new List<FileMatch>();

                // 1. Dosya adına göre benzer dosyalar ara
                _logger.LogDebug("1. Searching similar files by name...");
                var similarFiles = await FindSimilarFilesAsync(track.FileName);
                allMatches.AddRange(similarFiles);
                _logger.LogDebug($"   Found {similarFiles.Count} similar files");

                // 2. Klasör yapısına göre ara
                _logger.LogDebug("2. Searching in folder structure...");
                var folderSuggestions = await FindInFolderStructureAsync(track);
                allMatches.AddRange(folderSuggestions);
                _logger.LogDebug($"   Found {folderSuggestions.Count} files in folder structure");

                // 3. Dosya uzantısı değişikliği öner
                _logger.LogDebug("3. Searching with different extensions...");
                var extensionSuggestions = await FindWithDifferentExtensionAsync(track);
                allMatches.AddRange(extensionSuggestions);
                _logger.LogDebug($"   Found {extensionSuggestions.Count} files with different extensions");

                _logger.LogDebug($"Total matches found: {allMatches.Count}");

                // Aynı path'e sahip dosyaları grupla ve en yüksek confidence'i al
                // Böylece aynı dosya birden fazla kez gösterilmez
                var uniqueMatches = allMatches
                    .GroupBy(m => m.Path, StringComparer.OrdinalIgnoreCase)
                    .Select(g => new FileMatch
                    {
                        Path = g.Key,
                        FileName = g.First().FileName,
                        Confidence = g.Max(m => m.Confidence) // En yüksek confidence'i al
                    })
                    .ToList();

                _logger.LogDebug($"Unique matches after deduplication: {uniqueMatches.Count}");
                
                // En yüksek confidence'e göre sırala ve ilk 5'i al
                var suggestions = uniqueMatches
                    .OrderByDescending(f => f.Confidence)
                    .Take(5)
                    .Select(f => new TrackFixSuggestion
                    {
                        Track = track,
                        TrackPath = track.Path,
                        TrackFileName = track.FileName,
                        OriginalPath = track.Path,
                        SuggestedPath = f.Path,
                        SuggestedFileName = f.FileName,
                        Confidence = f.Confidence,
                        FixType = DetermineFixType(f, track),
                        Reason = $"Found similar file with {f.Confidence}% confidence"
                    })
                    .ToList();

                return suggestions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting fix suggestions for track: {track.FileName}");
                return new List<TrackFixSuggestion>();
            }
        }

        /// <summary>
        /// FileMatch'e göre FixType belirle
        /// </summary>
        private FixType DetermineFixType(FileMatch match, Track track)
        {
            // Aynı klasördeyse ve sadece uzantı farklıysa ExtensionChange
            var trackDir = Path.GetDirectoryName(track.Path);
            var matchDir = Path.GetDirectoryName(match.Path);
            
            if (trackDir != null && matchDir != null && 
                string.Equals(trackDir, matchDir, StringComparison.OrdinalIgnoreCase))
            {
                var trackExt = Path.GetExtension(track.FileName);
                var matchExt = Path.GetExtension(match.FileName);
                
                if (!string.Equals(trackExt, matchExt, StringComparison.OrdinalIgnoreCase))
                {
                    return FixType.ExtensionChange;
                }
            }
            
            // Farklı klasördeyse Move
            if (trackDir != null && matchDir != null && 
                !string.Equals(trackDir, matchDir, StringComparison.OrdinalIgnoreCase))
            {
                return FixType.Move;
            }
            
            // Aynı klasörde ve benzer isimse Rename
            return FixType.Rename;
        }

        private bool IsMusicFile(string filePath)
        {
            var extension = Path.GetExtension(filePath).ToLowerInvariant();
            var musicExtensions = new[] { ".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".wma" };
            return musicExtensions.Contains(extension);
        }
    }

    public class TrackFixSuggestion
    {
        public Track? Track { get; set; }
        public string TrackPath { get; set; } = string.Empty;
        public string TrackFileName { get; set; } = string.Empty;
        public string OriginalPath { get; set; } = string.Empty;
        public string? SuggestedPath { get; set; }
        public string? SuggestedFileName { get; set; }
        public int Confidence { get; set; }
        public FixType FixType { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class FileMatch
    {
        public string Path { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public int Confidence { get; set; }
    }

    public class FixResult
    {
        public int Success { get; set; }
        public int Failed { get; set; }
        public int Skipped { get; set; }
        public int Total => Success + Failed + Skipped;
    }

    public enum FixType
    {
        NotFound,
        FileExists,
        Rename,
        Move,
        ExtensionChange
    }
}

