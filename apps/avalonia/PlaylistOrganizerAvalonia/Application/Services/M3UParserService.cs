using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Common;
using PlaylistOrganizerAvalonia.Shared.Services;
using PlaylistOrganizerAvalonia.Domain.Entities;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// M3U dosyalarını parse eden servis
    /// </summary>
    public class M3UParserService : BaseParserService
    {
        public M3UParserService(ILogger<M3UParserService> logger) 
            : base(logger) { }

        /// <summary>
        /// M3U dosyasını parse et
        /// </summary>
        /// <param name="filePath">M3U dosya yolu</param>
        /// <returns>Track listesi</returns>
        public async Task<List<ParsedTrack>> ParseM3UFileAsync(string filePath)
        {
            try
            {
                _logger.LogInformation($"M3U dosyası parse ediliyor: {filePath}");

                var fileContent = await File.ReadAllTextAsync(filePath);
                var lines = fileContent.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
                var tracks = new List<ParsedTrack>();
                TrackMetadata? currentMetadata = null;

                foreach (var rawLine in lines)
                {
                    var line = rawLine.Trim();
                    if (string.IsNullOrEmpty(line)) continue;

                    // EXTVDJ metadata kontrolü
                    if (line.StartsWith("#EXTVDJ"))
                    {
                        currentMetadata = ParseExtVDJ(line);
                        continue;
                    }

                    // VDJCache dosyalarını atla
                    if (line.ToLower().Contains(".vdjcache"))
                    {
                        continue;
                    }

                    // Tam yol kontrolü
                    if (!Path.IsPathRooted(line))
                    {
                        _logger.LogWarning($"M3U'da tam yol olmayan satır atlandı: {line}");
                        continue;
                    }

                    // HTML decode yap
                    var decodedPath = HtmlDecode(line);
                    var normalizedName = StringNormalizationService.NormalizeFileName(Path.GetFileName(decodedPath));

                    tracks.Add(new ParsedTrack
                    {
                        OriginalPath = decodedPath,
                        NormalizedName = normalizedName,
                        Metadata = currentMetadata
                    });

                    currentMetadata = null;
                }

                _logger.LogInformation($"M3U parse tamamlandı: {tracks.Count} track bulundu");
                return tracks;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"M3U parse hatası: {filePath}");
                return new List<ParsedTrack>();
            }
        }

        /// <summary>
        /// EXTVDJ metadata'sını parse et
        /// </summary>
        private TrackMetadata? ParseExtVDJ(string line)
        {
            try
            {
                // #EXTVDJ:Artist - Title (Duration)
                var match = Regex.Match(line, @"#EXTVDJ:(.+?)\s*-\s*(.+?)\s*\((\d+)\)");
                if (match.Success)
                {
                    return new TrackMetadata
                    {
                        Artist = match.Groups[1].Value.Trim(),
                        Title = match.Groups[2].Value.Trim(),
                        Duration = int.Parse(match.Groups[3].Value)
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, $"EXTVDJ parse hatası: {line}");
            }

            return null;
        }

        /// <summary>
        /// HTML decode yap
        /// </summary>
        private string HtmlDecode(string input)
        {
            return input
                .Replace("&amp;", "&")
                .Replace("&lt;", "<")
                .Replace("&gt;", ">")
                .Replace("&quot;", "\"")
                .Replace("&#39;", "'")
                .Replace("&nbsp;", " ");
        }

        /// <summary>
        /// M3U dosyası mı kontrol et
        /// </summary>
        public bool IsM3UFile(string filePath)
        {
            var extension = Path.GetExtension(filePath).ToLowerInvariant();
            return extension == ".m3u" || extension == ".m3u8";
        }
    }

    /// <summary>
    /// Parse edilmiş track modeli
    /// </summary>
    public class ParsedTrack
    {
        public string OriginalPath { get; set; } = string.Empty;
        public string NormalizedName { get; set; } = string.Empty;
        public TrackMetadata? Metadata { get; set; }
    }

    /// <summary>
    /// Track metadata modeli
    /// </summary>
    public class TrackMetadata
    {
        public string Artist { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int Duration { get; set; }
    }
}
