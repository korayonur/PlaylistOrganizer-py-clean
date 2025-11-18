using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Shared.Services;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// In-memory word index for fast file searching
    /// Dosya sisteminden direkt okuyarak memory'de index oluşturur
    /// </summary>
    public class InMemoryWordIndex
    {
        private readonly Dictionary<string, HashSet<string>> _wordIndex = new();
        private readonly Dictionary<string, FileInfo> _fileIndex = new();
        private readonly string _musicFolderPath;
        private readonly ILogger<InMemoryWordIndex>? _logger;
        private readonly string[] _musicExtensions;
        private bool _isLoaded = false;

        public InMemoryWordIndex(IConfiguration configuration, ILogger<InMemoryWordIndex>? logger = null)
        {
            _logger = logger;
            _musicFolderPath = configuration["ImportPaths:Music"] ?? "/Users/koray/Music";

            // Music extensions from configuration
            var extensions = configuration.GetSection("ImportPaths:MusicExtensions").Get<string[]>();
            _musicExtensions = extensions ?? new[] { ".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".wma" };
        }

        /// <summary>
        /// Index yüklendi mi?
        /// </summary>
        public bool IsLoaded => _isLoaded;

        /// <summary>
        /// Index'teki unique kelime sayısı
        /// </summary>
        public int WordCount => _wordIndex.Count;

        /// <summary>
        /// Index'teki dosya sayısı
        /// </summary>
        public int FileCount => _fileIndex.Count;

        /// <summary>
        /// Startup'ta sabit klasörden tüm müzik dosyalarını tarar ve index oluşturur
        /// </summary>
        public async Task LoadFromFileSystemAsync()
        {
            if (_isLoaded)
            {
                _logger?.LogInformation("Index zaten yüklü, atlanıyor");
                return;
            }

            _logger?.LogInformation($"📦 Müzik klasörü taranıyor: {_musicFolderPath}");
            var stopwatch = Stopwatch.StartNew();

            if (!Directory.Exists(_musicFolderPath))
            {
                _logger?.LogWarning($"⚠️ Klasör bulunamadı: {_musicFolderPath}");
                return;
            }

            try
            {
                // Tüm müzik dosyalarını bul (recursive)
                var allFiles = await Task.Run(() =>
                {
                    return Directory.GetFiles(_musicFolderPath, "*", SearchOption.AllDirectories)
                        .Where(f => _musicExtensions.Contains(Path.GetExtension(f).ToLowerInvariant()))
                        .ToList();
                });

                _logger?.LogInformation($"  {allFiles.Count} müzik dosyası bulundu");

                // Her dosya için index oluştur
                int indexed = 0;
                foreach (var filePath in allFiles)
                {
                    try
                    {
                        var fileName = Path.GetFileName(filePath);
                        var normalized = StringNormalizationService.NormalizeFileName(fileName);

                        // File info'yu sakla
                        _fileIndex[filePath] = new FileInfo
                        {
                            Path = filePath,
                            FileName = fileName,
                            NormalizedFileName = normalized
                        };

                        // Kelimelere ayır ve index'e ekle
                        var words = normalized
                            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                            .Where(w => w.Length > 0)
                            .ToList();

                        foreach (var word in words)
                        {
                            if (!_wordIndex.ContainsKey(word))
                            {
                                _wordIndex[word] = new HashSet<string>();
                            }
                            _wordIndex[word].Add(filePath);
                        }

                        indexed++;

                        // Progress log (her 5000 dosyada bir)
                        if (indexed % 5000 == 0)
                        {
                            _logger?.LogInformation($"  {indexed}/{allFiles.Count} dosya indexlendi...");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogWarning(ex, $"Dosya indexlenemedi: {filePath}");
                    }
                }

                stopwatch.Stop();
                _isLoaded = true;

                _logger?.LogInformation(
                    $"✅ Index yüklendi: {_wordIndex.Count} unique kelime, " +
                    $"{_fileIndex.Count} dosya, {stopwatch.ElapsedMilliseconds}ms " +
                    $"({stopwatch.ElapsedMilliseconds / 1000.0:F1} saniye)"
                );
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Index yükleme hatası");
                throw;
            }
        }

        /// <summary>
        /// Kelime bazlı aday dosyaları bul (0-1ms hızında)
        /// </summary>
        public List<FileInfo> FindCandidates(List<string> words)
        {
            if (words.Count == 0 || !_isLoaded)
                return new List<FileInfo>();

            // Her kelime için file path'leri topla
            var candidatePaths = new Dictionary<string, int>(); // path -> match count

            foreach (var word in words)
            {
                if (_wordIndex.TryGetValue(word, out var filePaths))
                {
                    foreach (var filePath in filePaths)
                    {
                        candidatePaths.TryGetValue(filePath, out var count);
                        candidatePaths[filePath] = count + 1;
                    }
                }
            }

            // En çok eşleşen dosyaları al (top 100)
            var topCandidates = candidatePaths
                .OrderByDescending(kvp => kvp.Value)
                .Take(100)
                .Select(kvp => _fileIndex.TryGetValue(kvp.Key, out var fileInfo) ? fileInfo : null)
                .Where(f => f != null)
                .Cast<FileInfo>()
                .ToList();

            return topCandidates;
        }

        /// <summary>
        /// Index'i temizle
        /// </summary>
        public void Clear()
        {
            _wordIndex.Clear();
            _fileIndex.Clear();
            _isLoaded = false;
        }
    }

    /// <summary>
    /// Dosya bilgisi modeli
    /// </summary>
    public class FileInfo
    {
        public string Path { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string NormalizedFileName { get; set; } = string.Empty;
    }
}

