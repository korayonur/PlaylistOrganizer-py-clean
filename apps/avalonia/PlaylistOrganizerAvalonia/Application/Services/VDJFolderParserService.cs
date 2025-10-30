using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Xml.Linq;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Common;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.Shared.Services;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// VDJFolder dosyalarını parse eden servis
    /// </summary>
    public class VDJFolderParserService : BaseParserService
    {
        public VDJFolderParserService(ILogger<VDJFolderParserService> logger)
            : base(logger) { }

        /// <summary>
        /// VDJFolder dosyasını parse et
        /// </summary>
        /// <param name="filePath">VDJFolder dosya yolu</param>
        /// <returns>Track listesi</returns>
        public async Task<List<ParsedTrack>> ParseVDJFolderAsync(string filePath)
        {
            try
            {
                _logger.LogInformation($"VDJFolder dosyası parse ediliyor: {filePath}");

                var fileContent = await File.ReadAllTextAsync(filePath);
                var tracks = new List<ParsedTrack>();

                // XML parse et
                var xmlDoc = XDocument.Parse(fileContent);
                // VDJFolder uses "song" elements, not "track"
                var trackElements = xmlDoc.Descendants("song");

                foreach (var trackElement in trackElements)
                {
                    // VDJFolder stores path in "path" attribute, not element
                    var path = trackElement.Attribute("path")?.Value;
                    if (string.IsNullOrEmpty(path)) continue;

                    // Tam yol kontrolü
                    if (!Path.IsPathRooted(path))
                    {
                        _logger.LogWarning($"VDJFolder'da tam yol olmayan track atlandı: {path}");
                        continue;
                    }

                    var normalizedName = StringNormalizationService.NormalizeFileName(Path.GetFileName(path));

                    // Metadata'yı parse et
                    var metadata = ParseTrackMetadata(trackElement);

                    tracks.Add(new ParsedTrack
                    {
                        OriginalPath = path,
                        NormalizedName = normalizedName,
                        Metadata = metadata
                    });
                }

                _logger.LogInformation($"VDJFolder parse tamamlandı: {tracks.Count} track bulundu");
                return tracks;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"VDJFolder parse hatası: {filePath}");
                return new List<ParsedTrack>();
            }
        }

        /// <summary>
        /// Track metadata'sını parse et
        /// </summary>
        private TrackMetadata? ParseTrackMetadata(XElement trackElement)
        {
            try
            {
                // VDJFolder stores metadata in attributes
                var artist = trackElement.Attribute("artist")?.Value;
                var title = trackElement.Attribute("title")?.Value;
                var durationStr = trackElement.Attribute("songlength")?.Value;

                if (string.IsNullOrEmpty(artist) && string.IsNullOrEmpty(title))
                    return null;

                var metadata = new TrackMetadata
                {
                    Artist = artist ?? string.Empty,
                    Title = title ?? string.Empty
                };

                if (double.TryParse(durationStr, out var duration))
                {
                    metadata.Duration = (int)duration;
                }

                return metadata;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Track metadata parse hatası");
                return null;
            }
        }

        /// <summary>
        /// VDJFolder dosyası mı kontrol et
        /// </summary>
        public bool IsVDJFolderFile(string filePath)
        {
            var extension = Path.GetExtension(filePath).ToLowerInvariant();
            return extension == ".vdjfolder";
        }

        /// <summary>
        /// VDJFolder dosyasını güncelle
        /// </summary>
        public async Task<bool> UpdateVDJFolderAsync(string filePath, string oldPath, string newPath)
        {
            try
            {
                var fileContent = await File.ReadAllTextAsync(filePath);
                var xmlDoc = XDocument.Parse(fileContent);
                // VDJFolder uses "song" elements, not "track" (consistent with ParseVDJFolderAsync)
                var trackElements = xmlDoc.Descendants("song");

                bool updated = false;
                foreach (var trackElement in trackElements)
                {
                    // VDJFolder stores path in "path" attribute, not element
                    var pathAttribute = trackElement.Attribute("path");
                    if (pathAttribute != null && pathAttribute.Value == oldPath)
                    {
                        pathAttribute.Value = newPath;
                        updated = true;
                    }
                }

                if (updated)
                {
                    await File.WriteAllTextAsync(filePath, xmlDoc.ToString());
                    _logger.LogInformation($"VDJFolder dosyası güncellendi: {filePath}");
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"VDJFolder dosyası güncellenemedi: {filePath}");
                return false;
            }
        }
    }
}
