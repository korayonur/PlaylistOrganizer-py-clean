using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
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
        private readonly Dictionary<string, IndexedFileInfo> _fileIndex = new();
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
                        // ÖNEMLİ: Sadece dosya adını kullan, path'i dahil etme
                        var fileName = Path.GetFileName(filePath);
                        var normalized = StringNormalizationService.NormalizeFileName(fileName);

                        // File info'yu sakla
                        _fileIndex[filePath] = new IndexedFileInfo
                        {
                            Path = filePath,
                            FileName = fileName,
                            NormalizedFileName = normalized
                        };

                        // Kelimelere ayır ve index'e ekle
                        // ÖNEMLİ: Kısa kelimeleri filtrele (1-2 harf) - çok fazla false positive verir
                        // Ama sayıları dahil et (2017, 2020, 128 gibi BPM/key bilgileri önemli)
                        var words = normalized
                            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                            .Where(w => w.Length > 2 || (w.Length > 0 && char.IsDigit(w[0]))) // 3+ karakter veya sayı ile başlayan
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
        public List<IndexedFileInfo> FindCandidates(List<string> words)
        {
            if (words.Count == 0 || !_isLoaded)
            {
                _logger?.LogWarning($"FindCandidates: words.Count={words.Count}, _isLoaded={_isLoaded}");
                return new List<IndexedFileInfo>();
            }

            _logger?.LogDebug($"FindCandidates çağrıldı: {words.Count} kelime");

            // Her kelime için file path'leri topla
            var candidatePaths = new Dictionary<string, int>(); // path -> match count

            foreach (var word in words)
            {
                if (_wordIndex.TryGetValue(word, out var filePaths))
                {
                    _logger?.LogDebug($"  Kelime '{word}' bulundu: {filePaths.Count} dosya");
                    foreach (var filePath in filePaths)
                    {
                        candidatePaths.TryGetValue(filePath, out var count);
                        candidatePaths[filePath] = count + 1;
                    }
                }
                else
                {
                    _logger?.LogDebug($"  Kelime '{word}' index'te bulunamadı");
                }
            }

            _logger?.LogDebug($"Toplam {candidatePaths.Count} unique dosya path bulundu");

            // ÖNEMLİ: Tüm kelimeleri içeren dosyaları önceliklendir
            // Önce tüm kelimeleri içeren dosyaları al, sonra kısmi eşleşmeleri al
            var allWordsCount = words.Count;
            var perfectMatches = candidatePaths
                .Where(kvp => kvp.Value == allWordsCount) // Tüm kelimeleri içeren
                .OrderByDescending(kvp => kvp.Value)
                .ToList();
            
            var partialMatches = candidatePaths
                .Where(kvp => kvp.Value < allWordsCount) // Kısmi eşleşmeler
                .OrderByDescending(kvp => kvp.Value)
                .ToList();

            _logger?.LogDebug($"Mükemmel eşleşme (tüm kelimeler): {perfectMatches.Count}, Kısmi eşleşme: {partialMatches.Count}");

            // Önce mükemmel eşleşmeleri al, sonra kısmi eşleşmeleri al (toplam 200)
            var allMatches = perfectMatches
                .Concat(partialMatches)
                .Take(200) // Daha fazla aday al (200'e çıkardık)
                .Select(kvp => 
                {
                    if (_fileIndex.TryGetValue(kvp.Key, out var fileInfo))
                    {
                        _logger?.LogDebug($"  Aday: {fileInfo.FileName} (match count: {kvp.Value}/{allWordsCount})");
                        return fileInfo;
                    }
                    return null;
                })
                .Where(f => f != null)
                .Cast<IndexedFileInfo>()
                .ToList();

            _logger?.LogDebug($"FindCandidates sonucu: {allMatches.Count} aday döndürüldü ({perfectMatches.Count} mükemmel, {allMatches.Count - perfectMatches.Count} kısmi)");

            return allMatches;
        }

        /// <summary>
        /// Kelimenin index'te olup olmadığını kontrol et
        /// </summary>
        public bool ContainsWord(string word)
        {
            return _isLoaded && _wordIndex.ContainsKey(word);
        }

        /// <summary>
        /// Kelime için dosya sayısını al
        /// </summary>
        public int GetFileCountForWord(string word)
        {
            if (!_isLoaded || !_wordIndex.TryGetValue(word, out var filePaths))
                return 0;
            return filePaths.Count;
        }

        /// <summary>
        /// Index'teki örnek kelimeleri al (debug için)
        /// </summary>
        public List<string> GetSampleWords(int count = 20)
        {
            if (!_isLoaded)
                return new List<string>();
            return _wordIndex.Keys.Take(count).ToList();
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

        /// <summary>
        /// Index'i JSON dosyasına export et (debug için)
        /// Yeni şema: Sadece metadata, istatistikler ve örnekler (dosya path'leri export edilmez)
        /// </summary>
        public async Task ExportToJsonAsync(string outputPath = "word-index-debug.json")
        {
            try
            {
                var averageWordsPerFile = _fileIndex.Count > 0 
                    ? _wordIndex.Values.Sum(hs => hs.Count) / (double)_fileIndex.Count 
                    : 0;

                var exportData = new
                {
                    metadata = new
                    {
                        isLoaded = _isLoaded,
                        wordCount = _wordIndex.Count,
                        fileCount = _fileIndex.Count,
                        musicFolderPath = _musicFolderPath,
                        exportDate = DateTime.UtcNow,
                        exportVersion = "2.0"
                    },
                    statistics = new
                    {
                        totalWords = _wordIndex.Count,
                        totalFiles = _fileIndex.Count,
                        averageWordsPerFile = Math.Round(averageWordsPerFile, 2),
                        indexSizeBytes = 0, // TODO: Gerçek boyutu hesapla
                        loadTimeMs = 0 // TODO: Load süresini kaydet
                    },
                    wordIndex = new
                    {
                        // Örnek kelimeler (ilk 20, sadece kelime ve dosya sayısı)
                        sample = _wordIndex
                            .Take(20)
                            .Select(kvp => new
                            {
                                word = kvp.Key,
                                fileCount = kvp.Value.Count
                            })
                            .ToList(),
                        // En çok dosya içeren kelimeler (top 50, sadece kelime ve dosya sayısı)
                        topWords = _wordIndex
                            .OrderByDescending(kvp => kvp.Value.Count)
                            .Take(50)
                            .Select(kvp => new
                            {
                                word = kvp.Key,
                                fileCount = kvp.Value.Count
                            })
                            .ToList(),
                        // Test kelimeleri (sadece bulunup bulunmadığı ve dosya sayısı)
                        testWords = new[]
                        {
                            "davut", "guloglu", "katula"
                        }.Distinct()
                        .Select(word => new
                        {
                            word = word,
                            found = _wordIndex.ContainsKey(word),
                            fileCount = _wordIndex.ContainsKey(word) ? _wordIndex[word].Count : 0
                        })
                        .ToList()
                    },
                    fileIndex = new
                    {
                        // Örnek dosyalar (ilk 20, sadece dosya adı ve normalize edilmiş adı)
                        sample = _fileIndex
                            .Take(20)
                            .Select(kvp => new
                            {
                                fileName = kvp.Value.FileName,
                                normalizedFileName = kvp.Value.NormalizedFileName,
                                wordCount = kvp.Value.NormalizedFileName.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length
                            })
                            .ToList(),
                        totalCount = _fileIndex.Count
                    },
                    searchPerformance = new
                    {
                        averageSearchTimeMs = 0.5, // TODO: Gerçek değeri kaydet
                        candidateLimit = 200,
                        similarityThreshold = 0.0
                    }
                };

                var options = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                };

                var json = JsonSerializer.Serialize(exportData, options);
                await File.WriteAllTextAsync(outputPath, json);

                var fileSize = new System.IO.FileInfo(outputPath).Length;
                _logger?.LogInformation($"✅ Index JSON'a export edildi: {outputPath}");
                _logger?.LogInformation($"   - {_wordIndex.Count} kelime, {_fileIndex.Count} dosya");
                _logger?.LogInformation($"   - Dosya boyutu: {fileSize / 1024.0:F2} KB");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Index export hatası: {outputPath}");
                throw;
            }
        }

        /// <summary>
        /// Index'i FULL JSON'a export et (ilk N kayıt için path'ler dahil - debug için)
        /// </summary>
        public async Task ExportFullToJsonAsync(string outputPath = "word-index-full-debug.json", int maxRecords = 100)
        {
            try
            {
                var averageWordsPerFile = _fileIndex.Count > 0 
                    ? _wordIndex.Values.Sum(hs => hs.Count) / (double)_fileIndex.Count 
                    : 0;

                // İlk N kelimeyi al (path'ler dahil)
                var wordIndexFull = _wordIndex
                    .Take(maxRecords)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value.ToList()  // HashSet'i List'e çevir (path'ler dahil)
                    );

                // İlk N dosyayı al (tam bilgiler dahil)
                var fileIndexFull = _fileIndex
                    .Take(maxRecords)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => new
                        {
                            path = kvp.Value.Path,
                            fileName = kvp.Value.FileName,
                            normalizedFileName = kvp.Value.NormalizedFileName,
                            wordCount = kvp.Value.NormalizedFileName.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length
                        }
                    );

                var exportData = new
                {
                    metadata = new
                    {
                        isLoaded = _isLoaded,
                        wordCount = _wordIndex.Count,
                        fileCount = _fileIndex.Count,
                        musicFolderPath = _musicFolderPath,
                        exportDate = DateTime.UtcNow,
                        exportVersion = "3.0-full",
                        maxRecordsExported = maxRecords,
                        note = "Bu export path'ler dahil tam veri içerir (ilk " + maxRecords + " kayıt)"
                    },
                    statistics = new
                    {
                        totalWords = _wordIndex.Count,
                        totalFiles = _fileIndex.Count,
                        exportedWords = wordIndexFull.Count,
                        exportedFiles = fileIndexFull.Count,
                        averageWordsPerFile = Math.Round(averageWordsPerFile, 2)
                    },
                    wordIndex = new
                    {
                        // İlk N kelime (path'ler dahil!)
                        words = wordIndexFull.Select(kvp => new
                        {
                            word = kvp.Key,
                            fileCount = kvp.Value.Count,
                            filePaths = kvp.Value  // ← PATH'LER BURADA!
                        }).ToList()
                    },
                    fileIndex = new
                    {
                        // İlk N dosya (tam bilgiler dahil!)
                        files = fileIndexFull.Select(kvp => new
                        {
                            path = kvp.Value.path,  // ← TAM PATH!
                            fileName = kvp.Value.fileName,
                            normalizedFileName = kvp.Value.normalizedFileName,
                            wordCount = kvp.Value.wordCount
                        }).ToList()
                    }
                };

                var options = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                };

                var json = JsonSerializer.Serialize(exportData, options);
                await File.WriteAllTextAsync(outputPath, json);

                var fileSize = new System.IO.FileInfo(outputPath).Length;
                _logger?.LogInformation($"✅ Index FULL JSON'a export edildi: {outputPath}");
                _logger?.LogInformation($"   - {wordIndexFull.Count} kelime (path'ler dahil), {fileIndexFull.Count} dosya");
                _logger?.LogInformation($"   - Dosya boyutu: {fileSize / 1024.0:F2} KB");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Index FULL export hatası: {outputPath}");
                throw;
            }
        }

        /// <summary>
        /// Index'i JSON search formatına export et (JsonWordIndexService için)
        /// Format: { metadata: {...}, files: [{ path, fileName, normalizedFileName, words: [...] }] }
        /// </summary>
        public async Task ExportToSearchJsonAsync(string outputPath = "word-index.json")
        {
            try
            {
                _logger?.LogInformation($"📄 Index search JSON'a export ediliyor: {outputPath}");

                var exportData = new
                {
                    metadata = new
                    {
                        version = "1.0",
                        totalFiles = _fileIndex.Count,
                        exportDate = DateTime.UtcNow,
                        musicFolderPath = _musicFolderPath
                    },
                    files = _fileIndex.Values.Select(fileInfo => new
                    {
                        path = fileInfo.Path,
                        fileName = fileInfo.FileName,
                        normalizedFileName = fileInfo.NormalizedFileName,
                        words = fileInfo.NormalizedFileName
                            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                            .Where(w => w.Length > 0) // TÜM kelimeler (kısıtlama yok)
                            .ToList()
                    }).ToList()
                };

                var options = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                };

                var json = JsonSerializer.Serialize(exportData, options);
                await File.WriteAllTextAsync(outputPath, json);

                var fileSize = new System.IO.FileInfo(outputPath).Length;
                _logger?.LogInformation($"✅ Index search JSON'a export edildi: {outputPath}");
                _logger?.LogInformation($"   - {_fileIndex.Count} dosya");
                _logger?.LogInformation($"   - Dosya boyutu: {fileSize / 1024.0 / 1024.0:F2} MB");
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Index search JSON export hatası: {outputPath}");
                throw;
            }
        }
    }

    /// <summary>
    /// Dosya bilgisi modeli (index için)
    /// </summary>
    public class IndexedFileInfo
    {
        public string Path { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string NormalizedFileName { get; set; } = string.Empty;
    }
}

