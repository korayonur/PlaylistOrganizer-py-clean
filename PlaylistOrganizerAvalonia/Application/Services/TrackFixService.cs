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
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// Track fix service for missing tracks
    /// API'dan migration edilen missing track düzeltme servisi
    /// </summary>
    public class TrackFixService : BaseDatabaseService
    {
        private readonly TrackService _trackService;

        public TrackFixService(ILogger<TrackFixService> logger, IDatabaseManager databaseManager, TrackService trackService) 
            : base(logger, databaseManager)
        {
            _trackService = trackService;
        }

        /// <summary>
        /// Missing track'leri analiz et ve düzeltme önerileri getir
        /// </summary>
        public async Task<List<TrackFixSuggestion>> AnalyzeMissingTracksAsync()
        {
            try
            {
                _logger.LogInformation("Analyzing missing tracks for fix suggestions");
                
                var missingTracks = await _trackService.GetMissingTracksAsync();
                var suggestions = new List<TrackFixSuggestion>();

                foreach (var track in missingTracks)
                {
                    var suggestion = await AnalyzeTrackAsync(track);
                    if (suggestion != null)
                    {
                        suggestions.Add(suggestion);
                    }
                }

                _logger.LogInformation($"Generated {suggestions.Count} fix suggestions for {missingTracks.Count} missing tracks");
                return suggestions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing missing tracks");
                throw;
            }
        }

        /// <summary>
        /// Tek bir track'i analiz et
        /// </summary>
        private async Task<TrackFixSuggestion?> AnalyzeTrackAsync(Track track)
        {
            try
            {
                var suggestion = new TrackFixSuggestion
                {
                    TrackId = track.Id,
                    TrackPath = track.Path,
                    TrackFileName = track.FileName,
                    OriginalPath = track.Path,
                    SuggestedPath = null,
                    Confidence = 0,
                    FixType = FixType.NotFound,
                    Reason = "No suggestions found"
                };

                // 1. Dosya gerçekten var mı kontrol et
                if (File.Exists(track.Path))
                {
                    suggestion.FixType = FixType.FileExists;
                    suggestion.Confidence = 100;
                    suggestion.Reason = "File exists on disk";
                    return suggestion;
                }

                // 2. Dosya adına göre benzer dosyalar ara
                var similarFiles = await FindSimilarFilesAsync(track.FileName);
                if (similarFiles.Any())
                {
                    var bestMatch = similarFiles.OrderByDescending(f => f.Confidence).First();
                    suggestion.SuggestedPath = bestMatch.Path;
                    suggestion.FixType = FixType.Rename;
                    suggestion.Confidence = bestMatch.Confidence;
                    suggestion.Reason = $"Found similar file: {bestMatch.FileName}";
                    return suggestion;
                }

                // 3. Klasör yapısına göre ara
                var folderSuggestions = await FindInFolderStructureAsync(track);
                if (folderSuggestions.Any())
                {
                    var bestMatch = folderSuggestions.OrderByDescending(f => f.Confidence).First();
                    suggestion.SuggestedPath = bestMatch.Path;
                    suggestion.FixType = FixType.Move;
                    suggestion.Confidence = bestMatch.Confidence;
                    suggestion.Reason = $"Found in folder structure: {bestMatch.FileName}";
                    return suggestion;
                }

                // 4. Dosya uzantısı değişikliği öner
                var extensionSuggestions = await FindWithDifferentExtensionAsync(track);
                if (extensionSuggestions.Any())
                {
                    var bestMatch = extensionSuggestions.OrderByDescending(f => f.Confidence).First();
                    suggestion.SuggestedPath = bestMatch.Path;
                    suggestion.FixType = FixType.ExtensionChange;
                    suggestion.Confidence = bestMatch.Confidence;
                    suggestion.Reason = $"Found with different extension: {bestMatch.FileName}";
                    return suggestion;
                }

                return suggestion;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error analyzing track: {track.FileName}");
                return null;
            }
        }

        /// <summary>
        /// Benzer dosya adlarına sahip dosyaları bul
        /// </summary>
        private async Task<List<FileMatch>> FindSimilarFilesAsync(string fileName)
        {
            var matches = new List<FileMatch>();
            
            try
            {
                // Müzik klasörlerini tara
                var musicPaths = new[]
                {
                    "/Users/koray/Music",
                    "/Users/koray/Desktop",
                    "/Users/koray/Downloads"
                };

                foreach (var musicPath in musicPaths)
                {
                    if (Directory.Exists(musicPath))
                    {
                        var files = Directory.GetFiles(musicPath, "*", SearchOption.AllDirectories)
                            .Where(f => IsMusicFile(f))
                            .ToList();

                        foreach (var file in files)
                        {
                            var similarity = CalculateSimilarity(fileName, Path.GetFileName(file));
                            if (similarity > 70) // %70'den fazla benzerlik
                            {
                                matches.Add(new FileMatch
                                {
                                    Path = file,
                                    FileName = Path.GetFileName(file),
                                    Confidence = similarity
                                });
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error finding similar files");
            }

            return matches;
        }

        /// <summary>
        /// Klasör yapısında ara
        /// </summary>
        private async Task<List<FileMatch>> FindInFolderStructureAsync(Track track)
        {
            var matches = new List<FileMatch>();
            
            try
            {
                var trackDir = Path.GetDirectoryName(track.Path);
                if (string.IsNullOrEmpty(trackDir))
                    return matches;

                // Üst klasörlerde ara
                var currentDir = trackDir;
                for (int i = 0; i < 3 && !string.IsNullOrEmpty(currentDir); i++)
                {
                    currentDir = Path.GetDirectoryName(currentDir);
                    if (string.IsNullOrEmpty(currentDir))
                        break;

                    var files = Directory.GetFiles(currentDir, "*", SearchOption.AllDirectories)
                        .Where(f => IsMusicFile(f) && Path.GetFileName(f).Contains(track.FileNameOnly))
                        .ToList();

                    foreach (var file in files)
                    {
                        matches.Add(new FileMatch
                        {
                            Path = file,
                            FileName = Path.GetFileName(file),
                            Confidence = 80 - (i * 10) // Üst klasörlerde daha düşük confidence
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error finding in folder structure");
            }

            return matches;
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
        /// Track'i düzelt
        /// </summary>
        public async Task<bool> FixTrackAsync(int trackId, string newPath)
        {
            try
            {
                _logger.LogInformation($"Fixing track {trackId} with new path: {newPath}");

                var track = await _trackService.GetTrackByIdAsync(trackId);
                if (track == null)
                {
                    _logger.LogWarning($"Track not found: {trackId}");
                    return false;
                }

                // Yeni path'i kontrol et
                if (!File.Exists(newPath))
                {
                    _logger.LogWarning($"New path does not exist: {newPath}");
                    return false;
                }

                // Track'i güncelle
                track.Path = newPath;
                track.FileName = Path.GetFileName(newPath);
                track.FileNameOnly = Path.GetFileNameWithoutExtension(newPath);
                track.NormalizedFileName = StringNormalizationService.NormalizeFileName(track.FileName);
                track.Status = TrackStatus.Found;
                track.UpdatedAt = DateTime.UtcNow;

                await _trackService.UpdateTrackAsync(track);
                
                _logger.LogInformation($"Track fixed successfully: {trackId} -> {newPath}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fixing track: {trackId}");
                return false;
            }
        }

        /// <summary>
        /// Toplu düzeltme yap
        /// </summary>
        public async Task<FixResult> FixTracksBatchAsync(List<TrackFixSuggestion> suggestions)
        {
            var result = new FixResult();
            
            try
            {
                _logger.LogInformation($"Starting batch fix for {suggestions.Count} tracks");

                foreach (var suggestion in suggestions)
                {
                    if (suggestion.FixType == FixType.NotFound || string.IsNullOrEmpty(suggestion.SuggestedPath))
                    {
                        result.Skipped++;
                        continue;
                    }

                    var success = await FixTrackAsync(suggestion.TrackId, suggestion.SuggestedPath);
                    if (success)
                    {
                        result.Success++;
                    }
                    else
                    {
                        result.Failed++;
                    }
                }

                _logger.LogInformation($"Batch fix completed: {result.Success} success, {result.Failed} failed, {result.Skipped} skipped");
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in batch fix");
                throw;
            }
        }

        private bool IsMusicFile(string filePath)
        {
            var extension = Path.GetExtension(filePath).ToLowerInvariant();
            var musicExtensions = new[] { ".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".wma" };
            return musicExtensions.Contains(extension);
        }

        private int CalculateSimilarity(string str1, string str2)
        {
            if (string.IsNullOrEmpty(str1) || string.IsNullOrEmpty(str2))
                return 0;

            var s1 = str1.ToLowerInvariant();
            var s2 = str2.ToLowerInvariant();

            if (s1 == s2)
                return 100;

            // Basit benzerlik hesaplama
            var longer = s1.Length > s2.Length ? s1 : s2;
            var shorter = s1.Length > s2.Length ? s2 : s1;

            if (longer.Length == 0)
                return 100;

            var editDistance = LevenshteinDistance(longer, shorter);
            return (int)((1.0 - (double)editDistance / longer.Length) * 100);
        }

        private int LevenshteinDistance(string s1, string s2)
        {
            var matrix = new int[s1.Length + 1, s2.Length + 1];

            for (int i = 0; i <= s1.Length; i++)
                matrix[i, 0] = i;

            for (int j = 0; j <= s2.Length; j++)
                matrix[0, j] = j;

            for (int i = 1; i <= s1.Length; i++)
            {
                for (int j = 1; j <= s2.Length; j++)
                {
                    var cost = s1[i - 1] == s2[j - 1] ? 0 : 1;
                    matrix[i, j] = Math.Min(
                        Math.Min(matrix[i - 1, j] + 1, matrix[i, j - 1] + 1),
                        matrix[i - 1, j - 1] + cost);
                }
            }

            return matrix[s1.Length, s2.Length];
        }
    }

    public class TrackFixSuggestion
    {
        public int TrackId { get; set; }
        public string TrackPath { get; set; } = string.Empty;
        public string TrackFileName { get; set; } = string.Empty;
        public string OriginalPath { get; set; } = string.Empty;
        public string? SuggestedPath { get; set; }
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
