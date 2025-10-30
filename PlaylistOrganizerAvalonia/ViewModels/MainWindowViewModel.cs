using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using Avalonia.Controls;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Services;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.Domain.Enums;
using PlaylistOrganizerAvalonia.Infrastructure.Services;
using PlaylistOrganizerAvalonia.Views;

namespace PlaylistOrganizerAvalonia.ViewModels
{
    public partial class MainWindowViewModel : ViewModelBase, IDisposable
    {
        private readonly IDatabaseManager _databaseManager;
        private readonly SearchService _searchService;
        private readonly ILogger<MainWindowViewModel> _logger;
        private Playlist? _selectedPlaylist;
        private string _searchQuery = string.Empty;
        private string _currentFilter = "all";
        private bool _showOnlyMissingTracks;

        public MainWindowViewModel()
        {
            var serviceProvider = App.ServiceProvider;
            _logger = serviceProvider.GetRequiredService<ILogger<MainWindowViewModel>>();
            _searchService = serviceProvider.GetRequiredService<SearchService>();
            _databaseManager = serviceProvider.GetRequiredService<IDatabaseManager>();
            Playlists = [];
            Tracks = [];

            // Hierarchical yapı için Children'ları organize et
            OrganizePlaylistHierarchy();

            // Commands
            RefreshCommand = new RelayCommand(RefreshData);
            FixSuggestionsCommand = new RelayCommand(ShowFixSuggestions);
            SettingsCommand = new RelayCommand(ShowSettings);
            ImportCommand = new RelayCommand(ShowImportDialog);
            ExitCommand = new RelayCommand(ExitApplication);
            SearchCommand = new RelayCommand(PerformSearch);
            ClearSearchCommand = new RelayCommand(ClearSearch);

            // Veri yükleme
            LoadDataAsync();
        }

        // Properties
        public ObservableCollection<Playlist> Playlists { get; }
        public ObservableCollection<Track> Tracks { get; }

        public Playlist? SelectedPlaylist
        {
            get => _selectedPlaylist;
            set
            {
                if (SetProperty(ref _selectedPlaylist, value))
                {
                    if (value != null)
                    {
                        Console.WriteLine($"Selected playlist: {value.Name} (Type: {value.Type})");

                        // Playlist ve Folder'lara tıklandığında track'leri yükle
                        if (value.Type == PlaylistType.Playlist || value.Type == PlaylistType.VDJFolder)
                        {
                            LoadTracksForPlaylistAsync(value.Id);
                        }
                        else
                        {
                            // Root seçildiğinde track'leri temizle
                            Console.WriteLine($"Root selected, clearing tracks");
                            Tracks.Clear();
                            OnPropertyChanged(nameof(TotalTracks));
                            OnPropertyChanged(nameof(FoundTracks));
                            OnPropertyChanged(nameof(MissingTracks));
                        }
                    }
                }
            }
        }

        public string SearchQuery
        {
            get => _searchQuery;
            set
            {
                if (SetProperty(ref _searchQuery, value))
                {
                    FilterTracks();
                }
            }
        }

        public string CurrentFilter
        {
            get => _currentFilter;
            set
            {
                if (SetProperty(ref _currentFilter, value))
                {
                    FilterTracks();
                }
            }
        }

        public bool ShowOnlyMissingTracks
        {
            get => _showOnlyMissingTracks;
            set
            {
                if (SetProperty(ref _showOnlyMissingTracks, value))
                {
                    FilterPlaylists();
                }
            }
        }

        // Commands
        public ICommand RefreshCommand { get; }
        public ICommand FixSuggestionsCommand { get; }
        public ICommand SettingsCommand { get; }
        public ICommand ImportCommand { get; }
        public ICommand ExitCommand { get; }
        public ICommand SearchCommand { get; }
        public ICommand ClearSearchCommand { get; }

        // Statistics
        public int TotalTracks => Tracks?.Count ?? 0;
        public int FoundTracks => Tracks?.Count(static t => t.Status == TrackStatus.Found) ?? 0;
        public int MissingTracks => Tracks?.Count(static t => t.Status == TrackStatus.Missing) ?? 0;
        public int TotalPlaylists => Playlists?.Count ?? 0;

        // Methods
        private async void LoadDataAsync()
        {
            Console.WriteLine("=== LoadDataAsync START ===");
            try
            {
                List<Playlist> playlists = await _databaseManager.GetPlaylistsAsync();
                Console.WriteLine($"Loaded {playlists.Count} playlists from database");

                // Database verilerini analiz et
                Console.WriteLine("=== DATABASE ANALYSIS ===");
                List<IGrouping<int?, Playlist>> parentIdGroups = playlists.GroupBy(p => p.ParentId).ToList();
                foreach (IGrouping<int?, Playlist>? group in parentIdGroups.Take(10))
                {
                    Console.WriteLine($"ParentId {group.Key}: {group.Count()} playlists");
                    if (group.Count() <= 5)
                    {
                        foreach (Playlist? playlist in group)
                        {
                            Console.WriteLine($"  - {playlist.Name} (ID: {playlist.Id})");
                        }
                    }
                }
                Console.WriteLine("=== END DATABASE ANALYSIS ===");

                // UI thread'de güncelle
                await Avalonia.Threading.Dispatcher.UIThread.InvokeAsync(() =>
                {
                    Console.WriteLine("Clearing existing playlists...");
                    Playlists.Clear();

                    Console.WriteLine($"Adding {playlists.Count} playlists to collection...");
                    foreach (Playlist playlist in playlists)
                    {
                        Playlists.Add(playlist);
                    }

                    // Hierarchy'yi organize et
                    Console.WriteLine("Organizing hierarchy...");
                    OrganizePlaylistHierarchy();

                    OnPropertyChanged(nameof(TotalPlaylists));
                    Console.WriteLine($"TotalPlaylists updated: {TotalPlaylists}");
                });
            }
            catch (Exception ex)
            {
                // Error handling
                Console.WriteLine($"Error loading data: {ex.Message}");
            }
            Console.WriteLine("=== LoadDataAsync END ===");
        }

        private async void LoadTracksForPlaylistAsync(int playlistId)
        {
            try
            {
                Console.WriteLine($"=== LoadTracksForPlaylistAsync START - PlaylistId: {playlistId} ===");

                List<Track> tracks = await _databaseManager.GetTracksForPlaylistAsync(playlistId);
                Console.WriteLine($"Loaded {tracks.Count} tracks from database");

                // Track status'larını güncelle (dosya varlığını kontrol et)
                foreach (var track in tracks)
                {
                    track.Status = track.ExistsOnDisk ? TrackStatus.Found : TrackStatus.Missing;
                }

                await Avalonia.Threading.Dispatcher.UIThread.InvokeAsync(() =>
                {
                    Tracks.Clear();
                    foreach (Track track in tracks)
                    {
                        Tracks.Add(track);
                    }

                    // Statistics güncelle
                    OnPropertyChanged(nameof(TotalTracks));
                    OnPropertyChanged(nameof(FoundTracks));
                    OnPropertyChanged(nameof(MissingTracks));

                    Console.WriteLine($"UI updated: {Tracks.Count} tracks, {FoundTracks} found, {MissingTracks} missing");
                });

                Console.WriteLine("=== LoadTracksForPlaylistAsync END ===");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading tracks: {ex.Message}");
            }
        }

        private void FilterTracks()
        {
            // Filtreleme mantığı burada implement edilecek
            OnPropertyChanged(nameof(TotalTracks));
            OnPropertyChanged(nameof(FoundTracks));
            OnPropertyChanged(nameof(MissingTracks));
        }

        public void RefreshData()
        {
            LoadDataAsync();
        }

        private void ShowFixSuggestions()
        {
            // TODO: Implement fix suggestions dialog
            Console.WriteLine("Fix suggestions clicked");
        }

        private async void ShowSettings()
        {
            try
            {
                _logger.LogInformation("Settings dialog açılıyor...");

                var settingsDialog = new SettingsDialog();
                var result = await settingsDialog.ShowDialog<bool>(GetTopLevel());

                if (result)
                {
                    // Ayarlar kaydedildi, verileri yenile
                    RefreshData();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Settings dialog açılırken hata oluştu");
            }
        }

        private void FilterPlaylists()
        {
            // TODO: Implement playlist filtering based on ShowOnlyMissingTracks
            OnPropertyChanged(nameof(Playlists));
        }

        private void OrganizePlaylistHierarchy()
        {
            Console.WriteLine("=== OrganizePlaylistHierarchy START ===");

            // Tüm playlist'leri temizle
            List<Playlist> allPlaylists = [.. Playlists];
            Console.WriteLine($"All playlists count: {allPlaylists.Count}");

            Playlists.Clear();

            // Root playlist'leri bul (ParentId = 0)
            List<Playlist> rootPlaylists = allPlaylists.Where(static p => p.ParentId == 0).ToList();
            Console.WriteLine($"Root playlists count: {rootPlaylists.Count}");

            // Database'deki verileri hierarchy'ye dönüştür
            Console.WriteLine("Converting database data to hierarchy...");
            ConvertDatabaseToHierarchy(allPlaylists);

            Console.WriteLine($"Final Playlists count: {Playlists.Count}");
            foreach (Playlist playlist in Playlists)
            {
                Console.WriteLine($"  - {playlist.Name} (ID: {playlist.Id}, Children: {playlist.Children.Count})");
                foreach (Playlist child in playlist.Children)
                {
                    Console.WriteLine($"    └─ {child.Name} (ID: {child.Id})");
                }
            }
            Console.WriteLine("=== OrganizePlaylistHierarchy END ===");
        }

        private void ConvertDatabaseToHierarchy(List<Playlist> allPlaylists)
        {
            Console.WriteLine("=== ConvertDatabaseToHierarchy START ===");

            // API'deki gibi hierarchy oluştur
            Console.WriteLine("Building playlist tree like API...");
            BuildPlaylistTreeLikeAPI(allPlaylists);

            Console.WriteLine($"Final count: {Playlists.Count} playlists");
            Console.WriteLine("=== ConvertDatabaseToHierarchy END ===");
        }

        /// <summary>
        /// API'deki gibi playlist tree oluştur - TERMINAL TEST PROGRAMINDAN KOPYALANDI
        /// </summary>
        private void BuildPlaylistTreeLikeAPI(List<Playlist> playlists)
        {
            Console.WriteLine($"=== BuildPlaylistTreeLikeAPI START - {playlists.Count} playlists ===");

            // 1. BASE KLASÖRLERI OLUŞTUR (Name computed from Path)
            var tree = new Dictionary<string, Playlist>
            {
                ["__folders_temp"] = new Playlist { Id = 9996, Type = PlaylistType.VDJFolder, TrackCount = 0, ParentId = 0, Path = "/Folders" },
                ["History"] = new Playlist { Id = 9999, Type = PlaylistType.VDJFolder, TrackCount = 0, ParentId = 0, Path = "/History" },
                ["MyLists"] = new Playlist { Id = 9998, Type = PlaylistType.VDJFolder, TrackCount = 0, ParentId = 0, Path = "/MyLists" },
                ["Sideview"] = new Playlist { Id = 9997, Type = PlaylistType.VDJFolder, TrackCount = 0, ParentId = 0, Path = "/Sideview" }
            };

            // 2. HER PLAYLIST'İ TREE'YE EKLE
            foreach (var playlist in playlists)
            {
                var parts = ExtractPathParts(playlist.Path);
                if (parts.Count == 0)
                {
                    Console.WriteLine($"⚠️  Path parse edilemedi: {playlist.Path}");
                    continue;
                }

                // İlk part base folder (History, MyLists, Folders, etc.)
                var baseFolder = parts[0];

                // Folders ise geçici folder'a ekle
                if (baseFolder == "Folders")
                {
                    InsertIntoTree(tree["__folders_temp"].Children, parts.Skip(1).ToList(), playlist);
                    tree["__folders_temp"].TrackCount += playlist.TrackCount;
                }
                else if (tree.ContainsKey(baseFolder))
                {
                    // Diğerleri normal
                    InsertIntoTree(tree[baseFolder].Children, parts.Skip(1).ToList(), playlist);
                    tree[baseFolder].TrackCount += playlist.TrackCount;
                }
                else
                {
                    Console.WriteLine($"⚠️  Bilinmeyen base folder: {baseFolder} in path: {playlist.Path}");
                }
            }

            // 3. Folders'ın children'ını root'a taşı (koray, PlayLists, Serato)
            var foldersChildren = tree["__folders_temp"].Children;
            Console.WriteLine($"=== FOLDERS CHILDREN DEBUG ===");
            Console.WriteLine($"Folders children count: {foldersChildren.Count}");
            foreach (var child in foldersChildren)
            {
                Console.WriteLine($"Moving folder to root: {child.Name} ({child.TrackCount} tracks, {child.Children.Count} children)");
                tree[child.Name] = child;
            }
            tree.Remove("__folders_temp");  // Geçici folder'ı sil

            // 4. Tree'yi Playlists collection'a ekle (0 track'li klasörleri gizle + alfabetik sırala)
            var sortedRootFolders = tree.Values
                .Where(f => f.TrackCount > 0 || (f.Children.Count > 0 && HasValidChildren(f))) // Track'i olan VEYA geçerli children'ı olan klasörler
                .OrderBy(f => f.Name)
                .ToList();

            foreach (var rootFolder in sortedRootFolders)
            {
                Console.WriteLine($"=== PROCESSING ROOT FOLDER: {rootFolder.Name} ===");
                Console.WriteLine($"Before filtering: {rootFolder.Children.Count} children");

                // Children'ları sırala: Önce klasörler, sonra playlist'ler (alfabetik) - 0 track'li olanları gizle
                var folders = rootFolder.Children
                    .Where(c => c.Type == PlaylistType.VDJFolder &&
                               (c.TrackCount > 0 ||
                                (c.Children.Count > 0 && HasValidChildren(c))))
                    .OrderBy(c => c.Name)
                    .ToList();

                var playlistItems = rootFolder.Children
                    .Where(c => c.Type != PlaylistType.VDJFolder && c.TrackCount > 0)
                    .OrderBy(c => c.Name)
                    .ToList();

                Console.WriteLine($"After filtering: {folders.Count} folders, {playlistItems.Count} playlists");

                // Debug: Filtrelenen klasörleri göster
                foreach (var folder in folders)
                {
                    Console.WriteLine($"  📁 {folder.Name} ({folder.TrackCount} tracks, {folder.Children.Count} children)");
                }

                // Debug: Filtrelenen playlist'leri göster
                foreach (var playlist in playlistItems)
                {
                    Console.WriteLine($"  🎵 {playlist.Name} ({playlist.TrackCount} tracks)");
                }

                rootFolder.Children.Clear();

                // Önce klasörleri ekle
                foreach (var folder in folders)
                {
                    // RECURSIVE FILTRELEME: Klasörün children'larını da filtrele
                    FilterEmptyChildren(folder);
                    rootFolder.Children.Add(folder);
                }

                // Sonra playlist'leri ekle
                foreach (var playlist in playlistItems)
                {
                    rootFolder.Children.Add(playlist);
                }

                Playlists.Add(rootFolder);
                Console.WriteLine($"=== END PROCESSING ROOT FOLDER: {rootFolder.Name} ===");
            }

            Console.WriteLine($"=== BuildPlaylistTreeLikeAPI END - {Playlists.Count} root folders ===");
        }

        /// <summary>
        /// Klasörün geçerli children'ları var mı kontrol et (recursive)
        /// </summary>
        private bool HasValidChildren(Playlist folder)
        {
            if (folder.Children.Count == 0) return false;

            // En az bir geçerli child var mı?
            return folder.Children.Any(child =>
                (child.Type == PlaylistType.VDJFolder &&
                 (child.TrackCount > 0 || HasValidChildren(child))) ||
                (child.Type != PlaylistType.VDJFolder && child.TrackCount > 0));
        }

        /// <summary>
        /// Klasörün children'larından 0 track'li olanları recursive olarak filtrele
        /// </summary>
        private void FilterEmptyChildren(Playlist folder)
        {
            if (folder.Children.Count == 0) return;

            Console.WriteLine($"  🔍 Filtering children of '{folder.Name}': {folder.Children.Count} children");

            // Children'ları filtrele - BOŞ CHILDREN'LARI DA GİZLE
            var filteredFolders = folder.Children
                .Where(c => c.Type == PlaylistType.VDJFolder &&
                           (c.TrackCount > 0 ||
                            (c.Children.Count > 0 && HasValidChildren(c))))
                .OrderBy(c => c.Name)
                .ToList();

            var filteredPlaylists = folder.Children
                .Where(c => c.Type != PlaylistType.VDJFolder && c.TrackCount > 0)
                .OrderBy(c => c.Name)
                .ToList();

            Console.WriteLine($"  ✅ After filtering: {filteredFolders.Count} folders, {filteredPlaylists.Count} playlists");

            // Children'ları temizle ve yeniden ekle
            folder.Children.Clear();

            // Önce klasörleri ekle (recursive filtreleme ile)
            foreach (var childFolder in filteredFolders)
            {
                FilterEmptyChildren(childFolder); // Recursive call
                folder.Children.Add(childFolder);
            }

            // Sonra playlist'leri ekle
            foreach (var childPlaylist in filteredPlaylists)
            {
                folder.Children.Add(childPlaylist);
            }
        }
        private List<string> ExtractPathParts(string fullPath)
        {
            // 1. VirtualDJ sonrasını al
            var vdjIndex = fullPath.IndexOf("VirtualDJ/");
            if (vdjIndex == -1) return new List<string>();

            var relativePath = fullPath.Substring(vdjIndex + "VirtualDJ/".Length);

            // 2. .subfolders/ → / (parent-child marker'ı normalize et)
            // 3. Dosya uzantısını kaldır
            // 4. Slash'lere böl
            var parts = relativePath
                .Replace(".subfolders/", "/")  // Latin.subfolders/bachata → Latin/bachata
                .Replace(".vdjfolder", "")     // uzantı kaldır
                .Replace(".m3u", "")           // uzantı kaldır
                .Replace(".m3u8", "")          // uzantı kaldır
                .Split('/')
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .ToList();

            return parts;
        }

        /// <summary>
        /// Playlist'i tree'ye recursive olarak ekle - TERMINAL TEST PROGRAMINDAN KOPYALANDI
        /// </summary>
        private void InsertIntoTree(ICollection<Playlist> node, List<string> parts, Playlist playlist)
        {
            if (parts.Count == 0) return;

            var current = parts[0];
            var remaining = parts.Skip(1).ToList();

            if (remaining.Count == 0)
            {
                // SON ELEMAN = PLAYLIST (leaf node)
                var existingPlaylist = node.FirstOrDefault(p => p.Name == current);
                if (existingPlaylist == null)
                {
                    node.Add(new Playlist
                    {
                        Id = playlist.Id,
                        // Name computed from Path
                        Type = playlist.Type,
                        TrackCount = playlist.TrackCount,
                        ParentId = 0,
                        Path = playlist.Path
                    });
                }
                else
                {
                    // Aynı isimli playlist varsa track count'u artır
                    existingPlaylist.TrackCount += playlist.TrackCount;
                }
            }
            else
            {
                // ARA ELEMAN = FOLDER (branch node)
                var existingFolder = node.FirstOrDefault(p => p.Name == current && p.Type == PlaylistType.VDJFolder);
                if (existingFolder == null)
                {
                    var newFolder = new Playlist
                    {
                        Id = playlist.Id + 10000, // Geçici ID
                        // Name computed from Path
                        Type = PlaylistType.VDJFolder,
                        TrackCount = 0,
                        ParentId = 0,
                        Path = $"/{current}"
                    };
                    node.Add(newFolder);
                    InsertIntoTree(newFolder.Children, remaining, playlist);
                    newFolder.TrackCount += playlist.TrackCount;
                }
                else
                {
                    InsertIntoTree(existingFolder.Children, remaining, playlist);
                    existingFolder.TrackCount += playlist.TrackCount;
                }
            }
        }


        private async void ShowImportDialog()
        {
            try
            {
                _logger.LogInformation("Import dialog açılıyor...");

                var importDialog = new ImportProgressDialog();
                var result = await importDialog.ShowDialog<bool>(GetTopLevel());

                if (result)
                {
                    // Import tamamlandı, verileri yenile
                    RefreshData();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Import dialog açılırken hata oluştu");
            }
        }

        private Window? GetTopLevel()
        {
            // Bu method MainWindow'u döndürmeli
            return null; // TODO: Implement
        }

        private void ExitApplication()
        {
            try
            {
                _logger.LogInformation("Uygulama kapatılıyor...");
                Environment.Exit(0);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Uygulama kapatılırken hata oluştu");
            }
        }

        private async void PerformSearch()
        {
            try
            {
                if (string.IsNullOrWhiteSpace(SearchQuery))
                {
                    ClearSearch();
                    return;
                }

                _logger.LogInformation($"Arama başlatıldı: '{SearchQuery}'");

                // Playlist arama
                var playlists = await _searchService.SearchPlaylistsAsync(SearchQuery);

                // Track arama (seçili playlist varsa sadece o playlist'te)
                var tracks = await _searchService.SearchTracksAsync(SearchQuery, SelectedPlaylist?.Id);

                // Sonuçları göster
                Playlists.Clear();
                foreach (var playlist in playlists)
                {
                    Playlists.Add(playlist);
                }

                Tracks.Clear();
                foreach (var track in tracks)
                {
                    Tracks.Add(track);
                }

                _logger.LogInformation($"Arama tamamlandı: {playlists.Count} playlist, {tracks.Count} track bulundu");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Arama sırasında hata oluştu");
            }
        }

        private void ClearSearch()
        {
            try
            {
                SearchQuery = string.Empty;

                // Orijinal verileri yükle
                LoadDataAsync();

                _logger.LogInformation("Arama temizlendi, orijinal veriler yüklendi");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Arama temizlenirken hata oluştu");
            }
        }

        public void Dispose()
        {
            _databaseManager?.Dispose();
        }
    }
}
