using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Shared.Services;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// JSON tabanlı word index servisi (Memory Cache ile)
    /// JSON dosyasından yükler ve memory'de cache'ler
    /// </summary>
    public class JsonWordIndexService
    {
        private List<CachedFileInfo>? _cachedFiles;
        private DateTime _lastLoadTime;
        private readonly HybridSimilarityCalculator _similarityCalculator;
        private readonly ILogger<JsonWordIndexService>? _logger;

        public JsonWordIndexService(
            HybridSimilarityCalculator similarityCalculator,
            ILogger<JsonWordIndexService>? logger = null)
        {
            _similarityCalculator = similarityCalculator;
            _logger = logger;
        }

        /// <summary>
        /// Index yüklendi mi?
        /// </summary>
        public bool IsLoaded => _cachedFiles != null;

        /// <summary>
        /// Yüklenen dosya sayısı
        /// </summary>
        public int FileCount => _cachedFiles?.Count ?? 0;

        /// <summary>
        /// JSON'dan yükle (bir kere, startup'ta)
        /// </summary>
        public async Task LoadFromJsonAsync(string jsonPath)
        {
            try
            {
                if (!File.Exists(jsonPath))
                {
                    _logger?.LogWarning($"JSON index dosyası bulunamadı: {jsonPath}");
                    return;
                }

                _logger?.LogInformation($"📦 JSON index yükleniyor: {jsonPath}");

                var json = await File.ReadAllTextAsync(jsonPath);
                var index = JsonSerializer.Deserialize<WordIndexJson>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (index?.Files == null)
                {
                    _logger?.LogWarning("JSON index dosyası boş veya geçersiz");
                    return;
                }

                // Words array'lerini HashSet'e çevir (O(1) lookup için)
                _cachedFiles = index.Files.Select(file => new CachedFileInfo
                {
                    Path = file.Path,
                    FileName = file.FileName,
                    NormalizedFileName = file.NormalizedFileName,
                    Words = new HashSet<string>(file.Words ?? new List<string>())
                }).ToList();
                _lastLoadTime = DateTime.Now;

                _logger?.LogInformation($"✅ JSON index yüklendi: {_cachedFiles.Count} dosya");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"JSON index yükleme hatası: {jsonPath}");
                throw;
            }
        }

        /// <summary>
        /// Arama yap (tam eşleşme + benzerlik)
        /// </summary>
        public List<SearchResult> Search(string searchText, int maxResults = 50)
        {
            if (_cachedFiles == null)
            {
                _logger?.LogWarning("Index yüklenmemiş, arama yapılamıyor");
                return new List<SearchResult>();
            }

            var normalized = StringNormalizationService.NormalizeFileName(searchText);

            // 1. Önce tam eşleşme kontrolü (normalize edilmiş string'lerin tam eşleşmesi)
            var exactMatches = _cachedFiles!
                .Where(file => file.NormalizedFileName == normalized)
                .ToList();

            // 2. Eğer tam eşleşme varsa, benzerlik skorunu hesapla ve döndür
            if (exactMatches.Count > 0)
            {
                _logger?.LogDebug($"Tam eşleşme bulundu: {exactMatches.Count} dosya");
                return exactMatches
                    .Select(f => new SearchResult
                    {
                        Path = f.Path,
                        FileName = f.FileName,
                        Similarity = 1.0, // Tam eşleşme = %100
                        MatchType = "exact"
                    })
                    .Take(maxResults)
                    .ToList();
            }

            // 3. Tam eşleşme yoksa, benzerlik araması yap
            _logger?.LogDebug("Tam eşleşme bulunamadı, benzerlik araması yapılıyor");
            return SearchSimilar(searchText, maxResults);
        }

        /// <summary>
        /// Benzerlik araması (eşleşme yoksa)
        /// </summary>
        private List<SearchResult> SearchSimilar(string searchText, int maxResults)
        {
            var normalized = StringNormalizationService.NormalizeFileName(searchText);

            // Tüm dosyaları benzerlik skoruna göre sırala
            var results = _cachedFiles!
                .Select(file => new
                {
                    File = file,
                    Similarity = _similarityCalculator.CalculateSimilarity(
                        normalized,
                        file.NormalizedFileName
                    )
                })
                .Where(x => x.Similarity > 0.3) // Minimum %30 benzerlik eşiği
                .OrderByDescending(x => x.Similarity)
                .Take(maxResults)
                .Select(x => new SearchResult
                {
                    Path = x.File.Path,
                    FileName = x.File.FileName,
                    Similarity = x.Similarity,
                    MatchType = "similar"
                })
                .ToList();

            _logger?.LogDebug($"Benzerlik araması sonucu: {results.Count} dosya bulundu");

            return results;
        }
    }

    /// <summary>
    /// JSON model
    /// </summary>
    public class WordIndexJson
    {
        public Metadata? Metadata { get; set; }
        public List<FileInfo> Files { get; set; } = new();
    }

    /// <summary>
    /// Metadata
    /// </summary>
    public class Metadata
    {
        public string Version { get; set; } = "1.0";
        public int TotalFiles { get; set; }
        public DateTime ExportDate { get; set; }
        public string MusicFolderPath { get; set; } = string.Empty;
    }

    /// <summary>
    /// Dosya bilgisi (JSON'dan yüklenirken)
    /// </summary>
    public class FileInfo
    {
        public string Path { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string NormalizedFileName { get; set; } = string.Empty;
        public List<string> Words { get; set; } = new(); // JSON'dan List olarak gelir
    }

    /// <summary>
    /// Dosya bilgisi (Memory'de cache'lenirken - HashSet ile)
    /// </summary>
    public class CachedFileInfo
    {
        public string Path { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string NormalizedFileName { get; set; } = string.Empty;
        public HashSet<string> Words { get; set; } = new(); // Memory'de HashSet (O(1) lookup)
    }

    /// <summary>
    /// Arama sonucu
    /// </summary>
    public class SearchResult
    {
        public string Path { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public double Similarity { get; set; } // 0.0 - 1.0
        public string MatchType { get; set; } = string.Empty; // "exact" veya "similar"
    }
}

