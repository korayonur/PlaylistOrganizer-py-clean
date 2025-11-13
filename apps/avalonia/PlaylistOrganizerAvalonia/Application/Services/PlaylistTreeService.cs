using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Common;
using PlaylistOrganizerAvalonia.Application.Models;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.Domain.Enums;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// Playlist ağaç yapısını dosya sisteminden oluşturan ve cache'leyen servis
    /// </summary>
    public class PlaylistTreeService : BaseService
    {
        private readonly FileScannerService _fileScannerService;
        private readonly VDJFolderParserService _vdjFolderParserService;
        private readonly M3UParserService _m3uParserService;
        private readonly IConfiguration _configuration;
        private readonly string _cacheFilePath;

        public PlaylistTreeService(
            ILogger<PlaylistTreeService> logger,
            FileScannerService fileScannerService,
            VDJFolderParserService vdjFolderParserService,
            M3UParserService m3uParserService,
            IConfiguration configuration)
            : base(logger)
        {
            _fileScannerService = fileScannerService;
            _vdjFolderParserService = vdjFolderParserService;
            _m3uParserService = m3uParserService;
            _configuration = configuration;

            // Cache dosya yolu: /Users/koray/projects/PlaylistOrganizer-py-backup/data/playlist-tree.json
            // Sabit path kullan
            var dataDir = "/Users/koray/projects/PlaylistOrganizer-py-backup/data";
            if (!Directory.Exists(dataDir))
            {
                Directory.CreateDirectory(dataDir);
            }
            _cacheFilePath = Path.Combine(dataDir, "playlist-tree.json");
            LogInfo($"PlaylistTreeService initialized. Cache file: {_cacheFilePath}");
        }


        /// <summary>
        /// Dosya sisteminden ağaç yapısını oluştur
        /// </summary>
        public async Task<List<Playlist>> BuildTreeFromFileSystemAsync()
        {
            LogInfo("Building playlist tree from file system...");

            // 1. Playlist dosyalarını tara
            var playlistFiles = await _fileScannerService.ScanPlaylistFilesAsync();
            LogInfo($"Found {playlistFiles.Count} playlist files");

            // 2. ScannedFile'ları Playlist entity'lere dönüştür ve track count'ları hesapla
            var playlists = new List<Playlist>();
            int processedCount = 0;
            foreach (var file in playlistFiles)
            {
                processedCount++;
                if (processedCount % 100 == 0)
                {
                    LogInfo($"Processing playlist {processedCount}/{playlistFiles.Count}...");
                }

                var playlist = new Playlist
                {
                    Path = file.Path,
                    Type = DeterminePlaylistType(file.Extension),
                    TrackCount = await CalculatePlaylistTrackCountAsync(file.Path, file.Extension)
                };
                playlists.Add(playlist);
            }

            LogInfo($"Track counts calculated for {playlists.Count} playlists");
            
            // Debug: Track count'ları logla
            var nonZeroCount = playlists.Count(p => p.TrackCount > 0);
            LogInfo($"Playlists with tracks: {nonZeroCount}/{playlists.Count}");

            // 3. Hiyerarşik yapıyı oluştur (mevcut BuildPlaylistTreeLikeAPI mantığını kullan)
            var tree = BuildHierarchicalTree(playlists);
            
            // 4. Parent folder'ların track count'larını güncelle (recursive)
            UpdateParentTrackCounts(tree);
            
            LogInfo($"Tree built: {tree.Count} root folders");

            return tree;
        }

        /// <summary>
        /// Playlist dosyasının track count'unu hesapla
        /// </summary>
        private async Task<int> CalculatePlaylistTrackCountAsync(string filePath, string extension)
        {
            try
            {
                if (!File.Exists(filePath))
                {
                    LogDebug($"File not found: {filePath}");
                    return 0;
                }

                List<Application.Services.ParsedTrack> parsedTracks;
                var ext = extension.ToLowerInvariant();

                if (ext == ".vdjfolder")
                {
                    parsedTracks = await _vdjFolderParserService.ParseVDJFolderAsync(filePath);
                }
                else if (ext == ".m3u" || ext == ".m3u8")
                {
                    parsedTracks = await _m3uParserService.ParseM3UFileAsync(filePath);
                }
                else
                {
                    LogDebug($"Unsupported extension: {ext} for {filePath}");
                    return 0;
                }

                var count = parsedTracks.Count;
                if (count == 0)
                {
                    LogDebug($"No tracks found in: {filePath}");
                }
                return count;
            }
            catch (Exception ex)
            {
                LogWarning($"Error calculating track count for {filePath}: {ex.Message}");
                return 0;
            }
        }

        /// <summary>
        /// Hiyerarşik ağaç yapısını oluştur
        /// </summary>
        private List<Playlist> BuildHierarchicalTree(List<Playlist> playlists)
        {
            // Base klasörleri oluştur
            var tree = new Dictionary<string, Playlist>
            {
                ["__folders_temp"] = new Playlist { Type = PlaylistType.VDJFolder, TrackCount = 0, Path = "/Folders" },
                ["History"] = new Playlist { Type = PlaylistType.VDJFolder, TrackCount = 0, Path = "/History" },
                ["MyLists"] = new Playlist { Type = PlaylistType.VDJFolder, TrackCount = 0, Path = "/MyLists" },
                ["Sideview"] = new Playlist { Type = PlaylistType.VDJFolder, TrackCount = 0, Path = "/Sideview" }
            };

            // Her playlist'i tree'ye ekle
            foreach (var playlist in playlists)
            {
                var parts = ExtractPathParts(playlist.Path);
                if (parts.Count == 0)
                {
                    LogWarning($"Path parse edilemedi: {playlist.Path}");
                    continue;
                }

                var baseFolder = parts[0];
                if (baseFolder == "Folders")
                {
                    InsertIntoTree(tree["__folders_temp"].Children, parts.Skip(1).ToList(), playlist);
                }
                else if (tree.ContainsKey(baseFolder))
                {
                    InsertIntoTree(tree[baseFolder].Children, parts.Skip(1).ToList(), playlist);
                }
            }

            // Folders'ın children'ını root'a taşı
            var foldersChildren = tree["__folders_temp"].Children;
            foreach (var child in foldersChildren)
            {
                tree[child.Name] = child;
            }
            tree.Remove("__folders_temp");

            // Root folder'ları listeye çevir (alfabetik sırala)
            return tree.Values
                .OrderBy(f => f.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        /// <summary>
        /// Parent folder'ların track count'larını recursive olarak güncelle ve sırala
        /// </summary>
        private void UpdateParentTrackCounts(List<Playlist> roots)
        {
            foreach (var root in roots)
            {
                UpdateParentTrackCountRecursive(root);
                SortChildrenRecursive(root);
            }
        }

        /// <summary>
        /// Children'ları recursive olarak alfabetik sırala
        /// </summary>
        private void SortChildrenRecursive(Playlist playlist)
        {
            if (playlist.Children.Count > 0)
            {
                playlist.Children = playlist.Children
                    .OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
                    .ToList();

                // Her child için de recursive sırala
                foreach (var child in playlist.Children)
                {
                    SortChildrenRecursive(child);
                }
            }
        }

        /// <summary>
        /// Playlist'in track count'unu recursive olarak güncelle (children'ların toplamını ekle)
        /// </summary>
        private int UpdateParentTrackCountRecursive(Playlist playlist)
        {
            if (playlist.Children.Count == 0)
            {
                // Leaf node, kendi track count'unu döndür
                return playlist.TrackCount;
            }

            // Children'ların track count'larını topla
            int childrenTrackCount = 0;
            foreach (var child in playlist.Children)
            {
                childrenTrackCount += UpdateParentTrackCountRecursive(child);
            }

            // Parent'ın track count'u = kendi track count'u + children'ların toplamı
            playlist.TrackCount += childrenTrackCount;
            return playlist.TrackCount;
        }

        /// <summary>
        /// Path'ten parçaları çıkar
        /// </summary>
        private List<string> ExtractPathParts(string fullPath)
        {
            var vdjIndex = fullPath.IndexOf("VirtualDJ/");
            if (vdjIndex == -1) return new List<string>();

            var relativePath = fullPath.Substring(vdjIndex + "VirtualDJ/".Length);
            var parts = relativePath
                .Replace(".subfolders/", "/")
                .Replace(".vdjfolder", "")
                .Replace(".m3u", "")
                .Replace(".m3u8", "")
                .Split('/')
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .ToList();

            return parts;
        }

        /// <summary>
        /// Playlist'i tree'ye recursive olarak ekle
        /// </summary>
        private void InsertIntoTree(ICollection<Playlist> node, List<string> parts, Playlist playlist)
        {
            if (parts.Count == 0) return;

            var current = parts[0];
            var remaining = parts.Skip(1).ToList();

            if (remaining.Count == 0)
            {
                // Son eleman = playlist (leaf node)
                var existingPlaylist = node.FirstOrDefault(p => p.Name == current);
                if (existingPlaylist == null)
                {
                    node.Add(new Playlist
                    {
                        Path = playlist.Path,
                        Type = playlist.Type,
                        TrackCount = playlist.TrackCount
                    });
                }
                else
                {
                    existingPlaylist.TrackCount += playlist.TrackCount;
                }
            }
            else
            {
                // Ara eleman = klasör
                var existingFolder = node.FirstOrDefault(p => p.Name == current && p.Type == PlaylistType.VDJFolder);
                if (existingFolder == null)
                {
                    existingFolder = new Playlist
                    {
                        Path = playlist.Path.Substring(0, playlist.Path.LastIndexOf(current) + current.Length),
                        Type = PlaylistType.VDJFolder,
                        TrackCount = 0
                    };
                    node.Add(existingFolder);
                }
                InsertIntoTree(existingFolder.Children, remaining, playlist);
            }
        }


        /// <summary>
        /// Playlist tipini dosya uzantısından belirle
        /// </summary>
        private PlaylistType DeterminePlaylistType(string extension)
        {
            return extension.ToLowerInvariant() switch
            {
                ".vdjfolder" => PlaylistType.VDJFolder,
                ".m3u" => PlaylistType.Playlist,
                ".m3u8" => PlaylistType.Playlist,
                _ => PlaylistType.Playlist
            };
        }

        /// <summary>
        /// JSON cache'e yaz
        /// </summary>
        public async Task SaveTreeToCacheAsync(List<Playlist> roots)
        {
            try
            {
                // 0 track count'lu playlist'leri filtrele (recursive)
                var filteredRoots = FilterEmptyPlaylistsForCache(roots);
                
                var tree = new PlaylistTree
                {
                    Version = "1.0",
                    LastUpdated = DateTime.UtcNow,
                    Roots = filteredRoots.Select(r => PlaylistTreeNode.FromPlaylistEntity(r)).ToList()
                };

                var options = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                var json = JsonSerializer.Serialize(tree, options);
                await File.WriteAllTextAsync(_cacheFilePath, json);
                LogInfo($"Playlist tree saved to cache: {_cacheFilePath}");
            }
            catch (Exception ex)
            {
                LogError(ex, $"Failed to save playlist tree to cache: {_cacheFilePath}");
            }
        }

        /// <summary>
        /// JSON cache'den oku
        /// </summary>
        public async Task<List<Playlist>?> LoadTreeFromCacheAsync()
        {
            try
            {
                if (!File.Exists(_cacheFilePath))
                {
                    LogInfo($"Cache file not found: {_cacheFilePath}");
                    return null;
                }

                var json = await File.ReadAllTextAsync(_cacheFilePath);
                var options = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                var tree = JsonSerializer.Deserialize<PlaylistTree>(json, options);
                if (tree == null)
                {
                    LogWarning("Failed to deserialize cache file");
                    return null;
                }

                LogInfo($"Playlist tree loaded from cache: {tree.Roots.Count} roots, last updated: {tree.LastUpdated}");

                // PlaylistTreeNode'ları Playlist entity'lere dönüştür (recursive)
                var roots = new List<Playlist>();
                foreach (var treeNode in tree.Roots)
                {
                    var rootEntity = ConvertTreeNodeToEntity(treeNode);
                    roots.Add(rootEntity);
                }

                return roots;
            }
            catch (Exception ex)
            {
                LogError(ex, $"Failed to load playlist tree from cache: {_cacheFilePath}");
                return null;
            }
        }

        /// <summary>
        /// PlaylistTreeNode'u Playlist entity'ye recursive olarak dönüştür
        /// </summary>
        private Playlist ConvertTreeNodeToEntity(PlaylistTreeNode treeNode)
        {
            var entity = treeNode.ToPlaylistEntity();
            foreach (var childNode in treeNode.Children)
            {
                var childEntity = ConvertTreeNodeToEntity(childNode);
                entity.Children.Add(childEntity);
            }
            return entity;
        }

        /// <summary>
        /// Cache için 0 track count'lu playlist'leri filtrele (recursive)
        /// </summary>
        private List<Playlist> FilterEmptyPlaylistsForCache(List<Playlist> roots)
        {
            var filteredRoots = new List<Playlist>();
            foreach (var root in roots)
            {
                var filteredRoot = FilterEmptyPlaylistForCacheRecursive(root);
                if (filteredRoot != null && (filteredRoot.TrackCount > 0 || filteredRoot.Children.Count > 0))
                {
                    filteredRoots.Add(filteredRoot);
                }
            }
            return filteredRoots;
        }

        /// <summary>
        /// Playlist'i recursive olarak filtrele - 0 track count'lu olanları kaldır (cache için)
        /// </summary>
        private Playlist? FilterEmptyPlaylistForCacheRecursive(Playlist playlist)
        {
            // Leaf playlist ise, track count > 0 ise dahil et
            if (playlist.Children.Count == 0)
            {
                if (playlist.TrackCount > 0)
                {
                    return new Playlist
                    {
                        Path = playlist.Path,
                        Type = playlist.Type,
                        TrackCount = playlist.TrackCount
                    };
                }
                return null;
            }

            // Klasör ise, children'ları filtrele
            var filteredChildren = new List<Playlist>();
            foreach (var child in playlist.Children)
            {
                var filteredChild = FilterEmptyPlaylistForCacheRecursive(child);
                if (filteredChild != null)
                {
                    filteredChildren.Add(filteredChild);
                }
            }

            // Eğer geçerli children varsa VEYA kendi track count'u > 0 ise, klasörü dahil et
            if (filteredChildren.Count > 0 || playlist.TrackCount > 0)
            {
                var filteredPlaylist = new Playlist
                {
                    Path = playlist.Path,
                    Type = playlist.Type,
                    TrackCount = playlist.TrackCount
                };
                foreach (var child in filteredChildren)
                {
                    filteredPlaylist.Children.Add(child);
                }
                return filteredPlaylist;
            }

            return null;
        }

        /// <summary>
        /// Cache'i temizle
        /// </summary>
        public void ClearCache()
        {
            try
            {
                if (File.Exists(_cacheFilePath))
                {
                    File.Delete(_cacheFilePath);
                    LogInfo($"Cache file deleted: {_cacheFilePath}");
                }
            }
            catch (Exception ex)
            {
                LogError(ex, $"Failed to clear cache: {_cacheFilePath}");
            }
        }
    }
}

