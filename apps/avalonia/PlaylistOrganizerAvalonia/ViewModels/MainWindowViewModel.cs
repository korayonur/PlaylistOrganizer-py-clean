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
using PlaylistOrganizerAvalonia.Views;

namespace PlaylistOrganizerAvalonia.ViewModels
{
    public partial class MainWindowViewModel : ViewModelBase, IDisposable
    {
        private readonly PlaylistTreeService _playlistTreeService;
        private readonly VDJFolderParserService _vdjFolderParserService;
        private readonly M3UParserService _m3uParserService;
        private readonly MediaPlayerService _mediaPlayerService;
        private readonly ILogger<MainWindowViewModel> _logger;
        private Playlist? _selectedPlaylist;
        private Track? _selectedTrack;
        private string _searchQuery = string.Empty;
        private string _currentFilter = "all";
        private bool _showOnlyMissingTracks;
        private HashSet<string>? _filteredPlaylistPaths = null; // Filtreleme için eksik içeren playlist path'leri (ID yerine path)
        private List<Playlist>? _originalPlaylists = null; // Filtreleme öncesi orijinal veri (filtre kapalıyken geri yüklemek için)

        // Media Player Properties
        private Track? _currentPlayingTrack;
        private bool _isPlaying;

        public Track? CurrentPlayingTrack
        {
            get => _currentPlayingTrack;
            set
            {
                _currentPlayingTrack = value;
                OnPropertyChanged();
                OnPropertyChanged(nameof(IsPlayerVisible));
            }
        }

        public bool IsPlaying
        {
            get => _isPlaying;
            set
            {
                _isPlaying = value;
                OnPropertyChanged();
            }
        }

        public bool IsPlayerVisible => _currentPlayingTrack != null;

        // Media Player Commands
        public ICommand PauseTrackCommand { get; }
        public ICommand StopTrackCommand { get; }
        public ICommand ClosePlayerCommand { get; }

        public MainWindowViewModel()
        {
            var serviceProvider = App.ServiceProvider;
            _logger = serviceProvider.GetRequiredService<ILogger<MainWindowViewModel>>();
            _playlistTreeService = serviceProvider.GetRequiredService<PlaylistTreeService>();
            _vdjFolderParserService = serviceProvider.GetRequiredService<VDJFolderParserService>();
            _m3uParserService = serviceProvider.GetRequiredService<M3UParserService>();
            _mediaPlayerService = serviceProvider.GetRequiredService<MediaPlayerService>();
            Playlists = [];
            Tracks = [];

            // Hierarchical playlist yapısını oluştur
            // Commands
            RefreshCommand = new RelayCommand(RefreshData);
            FixSuggestionsCommand = new RelayCommand(ShowFixSuggestions);
            SettingsCommand = new RelayCommand(ShowSettings);
            ImportCommand = new RelayCommand(ShowImportDialog);
            ExitCommand = new RelayCommand(ExitApplication);
            SearchCommand = new RelayCommand(PerformSearch);
            ClearSearchCommand = new RelayCommand(ClearSearch);
            FilterMissingTracksCommand = new RelayCommand(FilterMissingTracks);

            // Media Player Commands
            PlayTrackCommand = new RelayCommand<Track>(PlayTrackWithUI);
            PauseTrackCommand = new RelayCommand(PauseTrack);
            StopTrackCommand = new RelayCommand(StopTrack);
            ClosePlayerCommand = new RelayCommand(ClosePlayer);

            // Veri yükleme
            _ = LoadDataAsync(); // Fire and forget
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
                        _logger.LogDebug($"Selected playlist: {value.Name} (Type: {value.Type})");

                        // Playlist ve Folder'lara tıklandığında track'leri yükle
                        if (value.Type == PlaylistType.Playlist || value.Type == PlaylistType.VDJFolder)
                        {
                            LoadTracksForPlaylistAsync(value.Path);
                        }
                        else
                        {
                            // Root seçildiğinde track'leri temizle
                            _logger.LogDebug($"Root selected, clearing tracks");
                            Tracks.Clear();
                            OnPropertyChanged(nameof(TotalTracks));
                            OnPropertyChanged(nameof(FoundTracks));
                            OnPropertyChanged(nameof(MissingTracks));
                        }
                    }
                }
            }
        }

        public Track? SelectedTrack
        {
            get => _selectedTrack;
            set => SetProperty(ref _selectedTrack, value);
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
                _logger.LogDebug($"ShowOnlyMissingTracks setter called: {_showOnlyMissingTracks} -> {value}");
                if (SetProperty(ref _showOnlyMissingTracks, value))
                {
                    _logger.LogDebug($"ShowOnlyMissingTracks changed, calling FilterPlaylists()");
                    FilterPlaylists();
                }
                else
                {
                    _logger.LogDebug($"ShowOnlyMissingTracks setter: value did not change (already {value})");
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
        public ICommand FilterMissingTracksCommand { get; }
        public ICommand PlayTrackCommand { get; }

        // Statistics
        public int TotalTracks => Tracks?.Count ?? 0;
        public int FoundTracks => Tracks?.Count(static t => t.Status == TrackStatus.Found) ?? 0;
        public int MissingTracks => Tracks?.Count(static t => t.Status == TrackStatus.Missing) ?? 0;
        public int TotalPlaylists => Playlists?.Count ?? 0;

        // Methods
        private async Task LoadDataAsync()
        {
            _logger.LogDebug("=== LoadDataAsync START ===");
            try
            {
                // Önce cache'den oku
                List<Playlist>? playlists = await _playlistTreeService.LoadTreeFromCacheAsync();

                // Cache yoksa dosya sisteminden oku ve cache'e yaz
                if (playlists == null || playlists.Count == 0)
                {
                    _logger.LogDebug("Cache not found or empty, building tree from file system...");
                    playlists = await _playlistTreeService.BuildTreeFromFileSystemAsync();
                    await _playlistTreeService.SaveTreeToCacheAsync(playlists);
                    _logger.LogDebug($"Built tree from file system: {playlists.Count} root folders");
                }
                else
                {
                    _logger.LogDebug($"Loaded {playlists.Count} root folders from cache");
                }

                // UI thread'de güncelle
                await Avalonia.Threading.Dispatcher.UIThread.InvokeAsync(() =>
                {
                    _logger.LogDebug("=== UI THREAD UPDATE START ===");
                    _logger.LogDebug("Clearing existing playlists...");
                    Playlists.Clear();
                    _logger.LogDebug($"Playlists collection cleared. Current count: {Playlists.Count}");

                    // Filtreleme field'ını temizle (normal veri yükleme)
                    _filteredPlaylistPaths = null;

                    _logger.LogDebug($"Adding {playlists.Count} root folders to UI...");

                    // 0 track count'lu playlist'leri filtrele
                    var filteredPlaylists = FilterEmptyPlaylists(playlists);
                    _logger.LogDebug($"After filtering empty playlists: {filteredPlaylists.Count} root folders");

                    // Orijinal veriyi sakla (filtre kapandığında geri yüklemek için)
                    _originalPlaylists = filteredPlaylists;
                    _logger.LogDebug($"Original playlists saved: {_originalPlaylists.Count} root folders");

                    // Root folder'ları direkt ekle (zaten hiyerarşik yapıda)
                    foreach (var root in filteredPlaylists)
                    {
                        Playlists.Add(root);
                    }

                    _logger.LogDebug($"✅ LoadDataAsync complete. Playlists count: {Playlists.Count}");

                    // Her bir root folder'ı listele
                    for (int i = 0; i < Playlists.Count; i++)
                    {
                        var root = Playlists[i];
                        _logger.LogDebug($"  Root[{i}]: {root.Name} (Type: {root.Type}, Children: {root.Children.Count}, TrackCount: {root.TrackCount})");
                    }

                    OnPropertyChanged(nameof(TotalPlaylists));
                    _logger.LogDebug($"TotalPlaylists updated: {TotalPlaylists}");
                    _logger.LogDebug("=== UI THREAD UPDATE END ===");
                });
            }
            catch (Exception ex)
            {
                // Error handling
                _logger.LogError(ex, $"Error loading data: {ex.Message}");
            }
            _logger.LogDebug("=== LoadDataAsync END ===");
        }

        private async void LoadTracksForPlaylistAsync(string playlistPath)
        {
            try
            {
                _logger.LogDebug($"=== LoadTracksForPlaylistAsync START - PlaylistPath: {playlistPath} ===");

                if (string.IsNullOrEmpty(playlistPath) || !System.IO.File.Exists(playlistPath))
                {
                    _logger.LogWarning($"Playlist file not found: {playlistPath}");
                    await Avalonia.Threading.Dispatcher.UIThread.InvokeAsync(() =>
                    {
                        Tracks.Clear();
                        OnPropertyChanged(nameof(TotalTracks));
                        OnPropertyChanged(nameof(FoundTracks));
                        OnPropertyChanged(nameof(MissingTracks));
                    });
                    return;
                }

                // Dosya uzantısına göre parse et
                var extension = System.IO.Path.GetExtension(playlistPath).ToLowerInvariant();
                List<Application.Services.ParsedTrack> parsedTracks;

                if (extension == ".vdjfolder")
                {
                    parsedTracks = await _vdjFolderParserService.ParseVDJFolderAsync(playlistPath);
                }
                else if (extension == ".m3u" || extension == ".m3u8")
                {
                    parsedTracks = await _m3uParserService.ParseM3UFileAsync(playlistPath);
                }
                else
                {
                    _logger.LogWarning($"Unsupported playlist format: {extension}");
                    await Avalonia.Threading.Dispatcher.UIThread.InvokeAsync(() =>
                    {
                        Tracks.Clear();
                        OnPropertyChanged(nameof(TotalTracks));
                        OnPropertyChanged(nameof(FoundTracks));
                        OnPropertyChanged(nameof(MissingTracks));
                    });
                    return;
                }

                _logger.LogDebug($"Parsed {parsedTracks.Count} tracks from file");

                // ParsedTrack'leri Track entity'lere dönüştür ve dosya varlığını kontrol et
                var tracks = new List<Track>();
                int trackOrder = 0;
                foreach (var parsedTrack in parsedTracks)
                {
                    var track = new Track
                    {
                        Path = parsedTrack.OriginalPath,
                        FileName = System.IO.Path.GetFileName(parsedTrack.OriginalPath),
                        FileNameOnly = System.IO.Path.GetFileNameWithoutExtension(parsedTrack.OriginalPath),
                        NormalizedFileName = parsedTrack.NormalizedName,
                        PlaylistFilePath = playlistPath,
                        TrackOrder = trackOrder++,
                        Status = System.IO.File.Exists(parsedTrack.OriginalPath) ? TrackStatus.Found : TrackStatus.Missing
                    };
                    tracks.Add(track);
                }

                _logger.LogDebug($"Converted to {tracks.Count} track entities, {tracks.Count(t => t.Status == TrackStatus.Found)} found, {tracks.Count(t => t.Status == TrackStatus.Missing)} missing");

                // UI thread'de güncelle
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

                    _logger.LogDebug($"UI updated: {Tracks.Count} tracks, {FoundTracks} found, {MissingTracks} missing");
                });

                _logger.LogDebug("=== LoadTracksForPlaylistAsync END ===");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error loading tracks: {ex.Message}");
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
            _logger.LogDebug("=== RefreshData START ===");
            // Cache'i temizle
            _playlistTreeService.ClearCache();
            _logger.LogDebug("Cache cleared, reloading from file system...");
            // Dosya sisteminden yeniden oku
            _ = LoadDataAsync(); // Fire and forget
        }

        private async void ShowFixSuggestions()
        {
            try
            {
                _logger.LogDebug("ShowFixSuggestions called. SelectedTrack: {SelectedTrack}",
                    SelectedTrack?.FileName ?? "null");

                // Seçili track var mı ve eksik mi kontrol et
                if (SelectedTrack == null)
                {
                    _logger.LogWarning("No track selected for fix suggestions");
                    return;
                }

                _logger.LogDebug("Selected track: {FileName}, IsMissing: {IsMissing}",
                    SelectedTrack.FileName, SelectedTrack.IsMissing);

                if (!SelectedTrack.IsMissing)
                {
                    _logger.LogInformation("Selected track is not missing, no fix suggestions needed");
                    return;
                }

                // FixSuggestionsDialog'u aç
                var trackFixService = App.ServiceProvider.GetRequiredService<TrackFixService>();
                var loggerFactory = App.ServiceProvider.GetRequiredService<ILoggerFactory>();
                var fixLogger = loggerFactory.CreateLogger<FixSuggestionsViewModel>();
                var viewModel = new FixSuggestionsViewModel(trackFixService, fixLogger)
                {
                    SelectedTrack = SelectedTrack
                };

                var dialog = new FixSuggestionsDialog(viewModel)
                {
                    WindowStartupLocation = WindowStartupLocation.CenterOwner
                };

                // TrackFixed event'ini dinle - track düzeltildiğinde playlist'i yeniden yükle
                viewModel.TrackFixed += (sender, trackId) =>
                {
                    _logger.LogDebug($"Track fixed event received - reloading playlist");

                    // Playlist dosyası güncellendi, track'leri yeniden yükle
                    if (SelectedPlaylist != null)
                    {
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                await Avalonia.Threading.Dispatcher.UIThread.InvokeAsync(() =>
                                {
                                    // Playlist'i yeniden yükle
                                    LoadTracksForPlaylistAsync(SelectedPlaylist.Path);
                                    _logger.LogDebug($"Playlist reloaded after track fix");
                                });
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, $"Error reloading playlist after track fix");
                            }
                        });
                    }
                };

                // Önerileri yükle
                await viewModel.LoadSuggestionsCommand.ExecuteAsync(null);

                // Dialog'u göster
                var mainWindow = GetTopLevel();
                if (mainWindow != null)
                {
                    await dialog.ShowDialog(mainWindow);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error showing fix suggestions dialog");
            }
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

        private async void FilterPlaylists()
        {
            _logger.LogInformation("=== FilterPlaylists START ===");
            _logger.LogDebug($"ShowOnlyMissingTracks value: {ShowOnlyMissingTracks}");

            if (!ShowOnlyMissingTracks)
            {
                // Filtre kapalıysa orijinal veriyi geri yükle (YENILEME YAPMA)
                _logger.LogInformation("Filter is OFF, restoring original playlists WITHOUT reloading from file system");

                // Eğer orijinal veri varsa, onu geri yükle
                if (_originalPlaylists != null && _originalPlaylists.Count > 0)
                {
                    await Avalonia.Threading.Dispatcher.UIThread.InvokeAsync(() =>
                    {
                        _logger.LogDebug("=== RESTORING ORIGINAL PLAYLISTS ===");
                        _logger.LogDebug($"Clearing current playlists. Count: {Playlists.Count}");
                        Playlists.Clear();

                        _logger.LogDebug($"Restoring {_originalPlaylists.Count} original root folders");
                        foreach (var root in _originalPlaylists)
                        {
                            Playlists.Add(root);
                        }

                        _filteredPlaylistPaths = null;

                        _logger.LogInformation($"✅ Original playlists restored. Count: {Playlists.Count}");
                        OnPropertyChanged(nameof(TotalPlaylists));
                    });
                }
                else
                {
                    // Orijinal veri yoksa, cache'den yükle (ama dosya sisteminden yeniden TARAMA)
                    _logger.LogWarning("Original playlists not found, loading from cache");
                    await LoadDataAsync();
                }
                return;
            }

            // Filtre açıksa eksik track içeren playlist'leri göster
            try
            {
                _logger.LogInformation("=== FilterPlaylists: ShowOnlyMissingTracks=TRUE ===");
                _logger.LogDebug("Starting to filter playlists with missing tracks...");

                // Dosya sisteminden tüm playlist'leri al
                var allPlaylists = await _playlistTreeService.BuildTreeFromFileSystemAsync();
                _logger.LogDebug($"Built tree from file system: {allPlaylists.Count} root folders");

                // Tüm leaf playlist'leri topla (recursive)
                var leafPlaylists = new List<Playlist>();
                CollectLeafPlaylists(allPlaylists, leafPlaylists);
                _logger.LogDebug($"Found {leafPlaylists.Count} leaf playlists to check");

                // Her leaf playlist'i parse et ve missing track kontrolü yap
                var playlistsWithMissingTracks = new HashSet<string>();
                int checkedCount = 0;
                foreach (var playlist in leafPlaylists)
                {
                    checkedCount++;
                    if (checkedCount % 10 == 0)
                    {
                        _logger.LogDebug($"Checking playlist {checkedCount}/{leafPlaylists.Count}...");
                    }

                    try
                    {
                        if (string.IsNullOrEmpty(playlist.Path) || !System.IO.File.Exists(playlist.Path))
                        {
                            continue;
                        }

                        // Parse et
                        var extension = System.IO.Path.GetExtension(playlist.Path).ToLowerInvariant();
                        List<Application.Services.ParsedTrack> parsedTracks;

                        if (extension == ".vdjfolder")
                        {
                            parsedTracks = await _vdjFolderParserService.ParseVDJFolderAsync(playlist.Path);
                        }
                        else if (extension == ".m3u" || extension == ".m3u8")
                        {
                            parsedTracks = await _m3uParserService.ParseM3UFileAsync(playlist.Path);
                        }
                        else
                        {
                            continue;
                        }

                        // Missing track kontrolü
                        bool hasMissingTracks = parsedTracks.Any(pt => !System.IO.File.Exists(pt.OriginalPath));
                        if (hasMissingTracks)
                        {
                            playlistsWithMissingTracks.Add(playlist.Path);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, $"Error checking playlist {playlist.Path}: {ex.Message}");
                    }
                }

                _logger.LogDebug($"Found {playlistsWithMissingTracks.Count} playlists with missing tracks");

                // Filtreleme için path set'ini kaydet
                _filteredPlaylistPaths = playlistsWithMissingTracks;

                // UI thread'de güncelle
                await Avalonia.Threading.Dispatcher.UIThread.InvokeAsync(() =>
                {
                    _logger.LogInformation("=== UI THREAD UPDATE: FILTERED PLAYLISTS ===");
                    _logger.LogDebug($"Clearing Playlists collection. Current count: {Playlists.Count}");
                    Playlists.Clear();
                    _logger.LogDebug($"Playlists cleared. New count: {Playlists.Count}");

                    // Seçili playlist'i temizle (eğer eksik içermiyorsa)
                    if (SelectedPlaylist != null && !playlistsWithMissingTracks.Contains(SelectedPlaylist.Path))
                    {
                        _logger.LogInformation($"Selected playlist cleared (no missing tracks): Path={SelectedPlaylist.Path}, Name={SelectedPlaylist.Name}");
                        SelectedPlaylist = null;
                        Tracks.Clear();
                        OnPropertyChanged(nameof(TotalTracks));
                        OnPropertyChanged(nameof(FoundTracks));
                        OnPropertyChanged(nameof(MissingTracks));
                    }

                    // Filtrelenmiş ağaç yapısını oluştur
                    _logger.LogDebug("Calling FilterTreeByMissingTracks...");
                    FilterTreeByMissingTracks(allPlaylists, playlistsWithMissingTracks);

                    _logger.LogInformation($"✅ Filtered hierarchy complete. Playlists count: {Playlists.Count}");

                    // Her root folder'ı logla
                    for (int i = 0; i < Playlists.Count; i++)
                    {
                        var root = Playlists[i];
                        _logger.LogDebug($"  Filtered Root[{i}]: {root.Name} (Type: {root.Type}, Children: {root.Children.Count}, TrackCount: {root.TrackCount})");
                    }

                    OnPropertyChanged(nameof(TotalPlaylists));
                    _logger.LogInformation($"TotalPlaylists updated: {TotalPlaylists}");
                    _logger.LogInformation("=== UI THREAD UPDATE END ===");
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error filtering playlists: {ex.Message}");
            }
        }

        /// <summary>
        /// Leaf playlist'leri recursive olarak topla
        /// </summary>
        private void CollectLeafPlaylists(List<Playlist> playlists, List<Playlist> leafPlaylists)
        {
            foreach (var playlist in playlists)
            {
                if (playlist.Children.Count == 0 && (playlist.Type == PlaylistType.Playlist || playlist.Type == PlaylistType.VDJFolder))
                {
                    // Leaf playlist (dosya)
                    leafPlaylists.Add(playlist);
                }
                else if (playlist.Children.Count > 0)
                {
                    // Klasör, children'ları recursive kontrol et
                    CollectLeafPlaylists(playlist.Children.ToList(), leafPlaylists);
                }
            }
        }

        /// <summary>
        /// Ağaç yapısını missing track içeren playlist'lere göre filtrele
        /// </summary>
        private void FilterTreeByMissingTracks(List<Playlist> roots, HashSet<string> playlistsWithMissingTracks)
        {
            foreach (var root in roots)
            {
                var filteredRoot = FilterPlaylistRecursive(root, playlistsWithMissingTracks);
                if (filteredRoot != null)
                {
                    // 0 track count'lu playlist'leri de filtrele
                    var finalRoot = FilterEmptyPlaylistRecursive(filteredRoot);
                    if (finalRoot != null && (finalRoot.TrackCount > 0 || finalRoot.Children.Count > 0))
                    {
                        Playlists.Add(finalRoot);
                    }
                }
            }
        }

        /// <summary>
        /// Playlist'i recursive olarak filtrele
        /// </summary>
        private Playlist? FilterPlaylistRecursive(Playlist playlist, HashSet<string> playlistsWithMissingTracks)
        {
            // Leaf playlist ise, missing track içeriyorsa dahil et
            if (playlist.Children.Count == 0)
            {
                if (playlistsWithMissingTracks.Contains(playlist.Path))
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
                var filteredChild = FilterPlaylistRecursive(child, playlistsWithMissingTracks);
                if (filteredChild != null)
                {
                    filteredChildren.Add(filteredChild);
                }
            }

            // Eğer geçerli children varsa, klasörü dahil et
            if (filteredChildren.Count > 0)
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
        /// 0 track count'lu playlist'leri recursive olarak filtrele
        /// </summary>
        private List<Playlist> FilterEmptyPlaylists(List<Playlist> roots)
        {
            var filteredRoots = new List<Playlist>();
            foreach (var root in roots)
            {
                var filteredRoot = FilterEmptyPlaylistRecursive(root);
                if (filteredRoot != null && (filteredRoot.TrackCount > 0 || filteredRoot.Children.Count > 0))
                {
                    filteredRoots.Add(filteredRoot);
                }
            }
            return filteredRoots;
        }

        /// <summary>
        /// Playlist'i recursive olarak filtrele - 0 track count'lu olanları kaldır
        /// </summary>
        private Playlist? FilterEmptyPlaylistRecursive(Playlist playlist)
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
                var filteredChild = FilterEmptyPlaylistRecursive(child);
                if (filteredChild != null)
                {
                    filteredChildren.Add(filteredChild);
                }
            }

            // Eğer geçerli children varsa VEYA kendi track count'u > 0 ise, klasörü dahil et
            if (filteredChildren.Count > 0 || playlist.TrackCount > 0)
            {
                // Children'ları alfabetik sırala
                filteredChildren = filteredChildren
                    .OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
                    .ToList();

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

        private void ConvertDatabaseToHierarchy(List<Playlist> allPlaylists, HashSet<string>? allowedPlaylistPaths = null)
        {
            _logger.LogDebug("=== ConvertDatabaseToHierarchy START ===");
            _logger.LogDebug($"Input: {allPlaylists.Count} playlists, AllowedPlaylistPaths: {(allowedPlaylistPaths != null ? allowedPlaylistPaths.Count.ToString() : "null")}");

            // API'deki gibi hierarchy oluştur
            _logger.LogDebug("Building playlist tree like API...");
            BuildPlaylistTreeLikeAPI(allPlaylists, allowedPlaylistPaths);

            _logger.LogDebug($"Final count: {Playlists.Count} playlists");
            _logger.LogDebug("=== ConvertDatabaseToHierarchy END ===");
        }

        /// <summary>
        /// API'deki gibi playlist tree oluştur - TERMINAL TEST PROGRAMINDAN KOPYALANDI
        /// </summary>
        private void BuildPlaylistTreeLikeAPI(List<Playlist> playlists, HashSet<string>? allowedPlaylistPaths = null)
        {
            // Filtreleme için allowed playlist path'lerini set et
            _filteredPlaylistPaths = allowedPlaylistPaths;

            // ÖNEMLİ: UI'ı güncellemek için önce collection'ı temizle
            // Aksi halde eski veriler kalır ve yeni veriler üzerine eklenir
            Playlists.Clear();
            _logger.LogDebug($"Playlists collection cleared at start of BuildPlaylistTreeLikeAPI. Count: {Playlists.Count}");

            _logger.LogDebug($"=== BuildPlaylistTreeLikeAPI START - {playlists.Count} playlists ===");
            _logger.LogDebug($"📊 Building tree for {playlists.Count} playlists");
            if (_filteredPlaylistPaths != null)
            {
                _logger.LogDebug($"🔍 Filtering enabled: {_filteredPlaylistPaths.Count} allowed playlist paths");
            }

            // 1. BASE KLASÖRLERI OLUŞTUR (Name computed from Path)
            var tree = new Dictionary<string, Playlist>
            {
                ["__folders_temp"] = new Playlist { Type = PlaylistType.VDJFolder, TrackCount = 0, Path = "/Folders" },
                ["History"] = new Playlist { Type = PlaylistType.VDJFolder, TrackCount = 0, Path = "/History" },
                ["MyLists"] = new Playlist { Type = PlaylistType.VDJFolder, TrackCount = 0, Path = "/MyLists" },
                ["Sideview"] = new Playlist { Type = PlaylistType.VDJFolder, TrackCount = 0, Path = "/Sideview" }
            };

            _logger.LogDebug($"✅ Created 4 base folder roots");

            // 2. HER PLAYLIST'İ TREE'YE EKLE
            int processedCount = 0;
            int parseErrorCount = 0;
            foreach (var playlist in playlists)
            {
                var parts = ExtractPathParts(playlist.Path);
                if (parts.Count == 0)
                {
                    _logger.LogWarning($"⚠️  Path parse edilemedi: {playlist.Path}");
                    parseErrorCount++;
                    continue;
                }

                // İlk part base folder (History, MyLists, Folders, etc.)
                var baseFolder = parts[0];
                _logger.LogDebug($"Processing playlist Path={playlist.Path}, BaseFolder={baseFolder}, Parts=[{string.Join(", ", parts)}]");

                // Folders ise geçici folder'a ekle
                if (baseFolder == "Folders")
                {
                    InsertIntoTree(tree["__folders_temp"].Children, parts.Skip(1).ToList(), playlist);
                    tree["__folders_temp"].TrackCount += playlist.TrackCount;
                    _logger.LogDebug($"  Added to __folders_temp, remaining parts: [{string.Join(", ", parts.Skip(1))}]");
                }
                else if (tree.ContainsKey(baseFolder))
                {
                    // Diğerleri normal
                    InsertIntoTree(tree[baseFolder].Children, parts.Skip(1).ToList(), playlist);
                    tree[baseFolder].TrackCount += playlist.TrackCount;
                    _logger.LogDebug($"  Added to {baseFolder}, remaining parts: [{string.Join(", ", parts.Skip(1))}]");
                }
                else
                {
                    _logger.LogWarning($"⚠️  Bilinmeyen base folder: {baseFolder} in path: {playlist.Path}");
                }
                processedCount++;
            }
            _logger.LogDebug($"Processed {processedCount} playlists, {parseErrorCount} parse errors");

            // 3. Folders'ın children'ını root'a taşı (koray, PlayLists, Serato)
            var foldersChildren = tree["__folders_temp"].Children;
            _logger.LogDebug($"=== FOLDERS CHILDREN DEBUG ===");
            _logger.LogDebug($"Folders children count: {foldersChildren.Count}");
            foreach (var child in foldersChildren)
            {
                _logger.LogDebug($"Moving folder to root: {child.Name} ({child.TrackCount} tracks, {child.Children.Count} children)");
                tree[child.Name] = child;
            }
            tree.Remove("__folders_temp");  // Geçici folder'ı sil

            // 4. Tree'yi Playlists collection'a ekle (0 track'li klasörleri gizle + alfabetik sırala)
            _logger.LogDebug("=== ROOT FOLDER FILTERING ===");
            var sortedRootFolders = tree.Values
                .Where(f =>
                {
                    bool isValid = false;
                    if (_filteredPlaylistPaths != null)
                    {
                        // Filtre aktifken root ancak allowed playlist'e ulaşabiliyorsa gösterilsin
                        isValid = HasValidChildren(f);
                        _logger.LogDebug($"Root folder '{f.Name}': HasValidChildren={isValid} (filtered mode)");
                    }
                    else
                    {
                        isValid = f.TrackCount > 0 || (f.Children.Count > 0 && HasValidChildren(f));
                        _logger.LogDebug($"Root folder '{f.Name}': TrackCount={f.TrackCount}, Children={f.Children.Count}, HasValidChildren={HasValidChildren(f)}, IsValid={isValid} (normal mode)");
                    }
                    return isValid;
                }) // Track'i olan VEYA geçerli children'ı olan klasörler
                .OrderBy(f => f.Name, StringComparer.OrdinalIgnoreCase) // Alfabetik sıralama
                .ToList();
            _logger.LogDebug($"Root folders after filtering: {sortedRootFolders.Count} folders");

            foreach (var rootFolder in sortedRootFolders)
            {
                _logger.LogDebug($"=== PROCESSING ROOT FOLDER: {rootFolder.Name} ===");
                _logger.LogDebug($"Before filtering: {rootFolder.Children.Count} children");

                // Children'ları sırala: Önce klasörler, sonra playlist'ler (alfabetik) - 0 track'li olanları gizle
                var folders = rootFolder.Children
                    .Where(c =>
                    {
                        bool isFolder = IsFolderNode(c);
                        if (!isFolder)
                        {
                            return false;
                        }

                        if (_filteredPlaylistPaths != null)
                        {
                            return HasValidChildren(c);
                        }

                        return c.TrackCount > 0 || HasValidChildren(c);
                    })
                    .OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase) // Alfabetik sıralama
                    .ToList();

                var playlistItems = rootFolder.Children
                    .Where(c =>
                    {
                        bool isFolder = IsFolderNode(c);

                        // Filtreleme aktifse, sadece allowed playlist'leri göster
                        if (_filteredPlaylistPaths != null)
                        {
                            bool notFolder = !isFolder;
                            bool hasTracks = c.TrackCount > 0;
                            bool inFilteredSet = _filteredPlaylistPaths.Contains(c.Path);
                            bool result = notFolder && hasTracks && inFilteredSet;

                            _logger.LogDebug($"    ROOT FILTER: '{c.Name}' (Path={c.Path}, Type={c.Type}): IsFolder={isFolder}, NotFolder={notFolder}, TrackCount={c.TrackCount}, InFilteredSet={inFilteredSet}, Result={result}");

                            return result;
                        }
                        else
                        {
                            // Filtreleme yoksa: normal filtreleme
                            return !isFolder && c.TrackCount > 0;
                        }
                    })
                    .OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase) // Alfabetik sıralama
                    .ToList();

                _logger.LogDebug($"After filtering: {folders.Count} folders, {playlistItems.Count} playlists");

                // Debug: Filtrelenen klasörleri göster
                foreach (var folder in folders)
                {
                    _logger.LogDebug($"  📁 {folder.Name} (Path={folder.Path}, TrackCount={folder.TrackCount}, Children={folder.Children.Count})");
                }

                // Debug: Filtrelenen playlist'leri göster
                foreach (var playlist in playlistItems)
                {
                    bool inFilteredSet = _filteredPlaylistPaths?.Contains(playlist.Path) ?? false;
                    _logger.LogDebug($"  🎵 {playlist.Name} (Path={playlist.Path}, TrackCount={playlist.TrackCount}, InFilteredSet={inFilteredSet})");
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
                _logger.LogDebug($"✅ Added to Playlists collection: {rootFolder.Name} (Type: {rootFolder.Type}, Children: {rootFolder.Children.Count})");
                _logger.LogDebug($"=== END PROCESSING ROOT FOLDER: {rootFolder.Name} ===");
            }

            _logger.LogDebug($"=== BuildPlaylistTreeLikeAPI END - {Playlists.Count} root folders ===");
            _logger.LogDebug($"📊 Final Playlists collection has {Playlists.Count} items");
        }

        /// <summary>
        /// Klasörün geçerli children'ları var mı kontrol et (recursive)
        /// </summary>
        private static bool IsFolderNode(Playlist playlist)
        {
            return playlist.Type == PlaylistType.VDJFolder && playlist.Children.Count > 0;
        }

        private bool HasValidChildren(Playlist folder)
        {
            if (folder.Children.Count == 0)
            {
                _logger.LogDebug($"HasValidChildren('{folder.Name}'): No children, returning false");
                return false;
            }

            _logger.LogDebug($"HasValidChildren('{folder.Name}'): Checking {folder.Children.Count} children");

            // En az bir geçerli child var mı?
            bool hasValid = folder.Children.Any(child =>
            {
                bool childIsFolder = IsFolderNode(child);
                bool isValid = false;
                string reason = "";

                // Eğer filtreleme aktifse, sadece allowed playlist'leri kontrol et
                if (_filteredPlaylistPaths != null)
                {
                    if (childIsFolder)
                    {
                        // Klasör geçerliliği: alt dallarda allowed playlist var mı?
                        isValid = HasValidChildren(child);
                        reason = $"Folder, HasValidChildren(recursive)={isValid}";
                    }
                    else
                    {
                        // Playlist (ya da tracks içeren vdjfolder) için: allowed path'e sahipse ve track count > 0 ise geçerli
                        bool inFilteredSet = _filteredPlaylistPaths.Contains(child.Path);
                        bool hasTracks = child.TrackCount > 0;
                        isValid = inFilteredSet && hasTracks;
                        reason = $"Playlist, Path={child.Path}, InFilteredSet={inFilteredSet}, TrackCount={child.TrackCount}, IsValid={isValid}";
                    }
                }
                else
                {
                    // Filtreleme yoksa: normal kontrol
                    if (childIsFolder)
                    {
                        bool hasTracks = child.TrackCount > 0;
                        bool hasValidChildren = HasValidChildren(child);
                        isValid = hasTracks || hasValidChildren;
                        reason = $"Folder, TrackCount={child.TrackCount}, HasValidChildren(recursive)={hasValidChildren}, IsValid={isValid}";
                    }
                    else
                    {
                        isValid = child.TrackCount > 0;
                        reason = $"Playlist, TrackCount={child.TrackCount}, IsValid={isValid}";
                    }
                }

                _logger.LogDebug($"  Child '{child.Name}' (Path={child.Path}, Type={child.Type}): {reason}");
                return isValid;
            });

            _logger.LogDebug($"HasValidChildren('{folder.Name}'): Result={hasValid}");
            return hasValid;
        }

        /// <summary>
        /// Klasörün children'larından 0 track'li olanları recursive olarak filtrele
        /// </summary>
        private void FilterEmptyChildren(Playlist folder)
        {
            if (folder.Children.Count == 0) return;

            _logger.LogDebug($"  🔍 Filtering children of '{folder.Name}' (Path={folder.Path}): {folder.Children.Count} children");
            if (_filteredPlaylistPaths != null)
            {
                _logger.LogDebug($"  📊 _filteredPlaylistPaths set has {_filteredPlaylistPaths.Count} items");
            }

            // Children'ları filtrele - BOŞ CHILDREN'LARI DA GİZLE
            // Eğer filtreleme aktifse, sadece allowed playlist'leri göster
            var filteredFolders = folder.Children
                .Where(c =>
                {
                    bool isFolder = IsFolderNode(c);
                    if (!isFolder)
                    {
                        _logger.LogDebug($"    Child '{c.Name}' (Path={c.Path}): Not a folder node, skipping");
                        return false;
                    }

                    bool isValid = false;
                    if (_filteredPlaylistPaths != null)
                    {
                        // Filtre aktifken klasör, ancak altında allowed playlist varsa görünür olsun
                        isValid = HasValidChildren(c);
                        _logger.LogDebug($"    Folder '{c.Name}' (Path={c.Path}): HasValidChildren={isValid} (filtered mode)");
                    }
                    else
                    {
                        bool hasTracks = c.TrackCount > 0;
                        bool hasValidChildren = HasValidChildren(c);
                        isValid = hasTracks || hasValidChildren;
                        _logger.LogDebug($"    Folder '{c.Name}' (Path={c.Path}): TrackCount={c.TrackCount}, HasValidChildren={hasValidChildren}, IsValid={isValid} (normal mode)");
                    }
                    return isValid;
                })
                .OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase) // Alfabetik sıralama
                .ToList();

            var filteredPlaylists = folder.Children
                .Where(c =>
                {
                    bool isFolder = IsFolderNode(c);

                    // Filtreleme aktifse, sadece allowed playlist'leri göster
                    if (_filteredPlaylistPaths != null)
                    {
                        bool inFilteredSet = _filteredPlaylistPaths.Contains(c.Path);
                        bool hasTracks = c.TrackCount > 0;
                        bool isValid = !isFolder && hasTracks && inFilteredSet;

                        // ÖNEMLİ: Eğer playlist set'te yoksa, kesinlikle görünmemeli
                        if (!inFilteredSet && !isFolder)
                        {
                            _logger.LogDebug($"    ❌ REJECTED Playlist '{c.Name}' (Path={c.Path}): NOT in filtered set (InFilteredSet={inFilteredSet}, HasTracks={hasTracks})");
                            return false;
                        }

                        // ÖNEMLİ: Eğer playlist set'te varsa ama hasTracks=false ise, yine de görünmemeli
                        if (inFilteredSet && !hasTracks && !isFolder)
                        {
                            _logger.LogDebug($"    ❌ REJECTED Playlist '{c.Name}' (Path={c.Path}): In filtered set but no tracks (InFilteredSet={inFilteredSet}, HasTracks={hasTracks})");
                            return false;
                        }

                        _logger.LogDebug($"    ✅ ACCEPTED Playlist '{c.Name}' (Path={c.Path}): IsFolder={isFolder}, TrackCount={c.TrackCount}, InFilteredSet={inFilteredSet}, IsValid={isValid}");
                        return isValid;
                    }
                    else
                    {
                        // Filtreleme yoksa: normal filtreleme
                        bool isValid = !isFolder && c.TrackCount > 0;
                        _logger.LogDebug($"    Playlist '{c.Name}' (Path={c.Path}): IsFolder={isFolder}, TrackCount={c.TrackCount}, IsValid={isValid}");
                        return isValid;
                    }
                })
                .OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase) // Alfabetik sıralama
                .ToList();

            _logger.LogDebug($"  ✅ After filtering: {filteredFolders.Count} folders, {filteredPlaylists.Count} playlists");

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
                        // Name computed from Path
                        Type = playlist.Type,
                        TrackCount = playlist.TrackCount,
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
                        // Name computed from Path
                        Type = PlaylistType.VDJFolder,
                        TrackCount = 0,
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

        private static Window? GetTopLevel()
        {
            return Avalonia.Application.Current?.ApplicationLifetime is
                Avalonia.Controls.ApplicationLifetimes.IClassicDesktopStyleApplicationLifetime desktop
                ? desktop.MainWindow
                : null;
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

                // Basit filtreleme - SearchService artık kullanılmıyor
                var query = SearchQuery.ToLowerInvariant();

                // Playlist isimlerinde arama yap
                var allPlaylists = Playlists.ToList(); // Mevcut playlist'leri al
                var filteredPlaylists = allPlaylists
                    .Where(p => p.Name.ToLowerInvariant().Contains(query))
                    .ToList();

                Playlists.Clear();
                foreach (var playlist in filteredPlaylists)
                {
                    Playlists.Add(playlist);
                }

                // Track'lerde arama yap (sadece seçili playlist'te)
                if (SelectedPlaylist != null)
                {
                    var allTracks = Tracks.ToList(); // Mevcut track'leri al
                    var filteredTracks = allTracks
                        .Where(t => t.FileName.ToLowerInvariant().Contains(query) ||
                                   t.Path.ToLowerInvariant().Contains(query))
                        .ToList();

                    Tracks.Clear();
                    foreach (var track in filteredTracks)
                    {
                        Tracks.Add(track);
                    }
                }

                _logger.LogInformation($"Arama tamamlandı: {filteredPlaylists.Count} playlist, {(SelectedPlaylist != null ? Tracks.Count : 0)} track bulundu");
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
                _ = LoadDataAsync(); // Fire and forget

                _logger.LogInformation("Arama temizlendi, orijinal veriler yüklendi");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Arama temizlenirken hata oluştu");
            }
        }

        /// <summary>
        /// "Eksik" istatistiğine tıklanınca filtreyi tetikle
        /// </summary>
        private void FilterMissingTracks()
        {
            try
            {
                _logger.LogInformation("=== FilterMissingTracks COMMAND TRIGGERED ===");
                _logger.LogDebug($"Current ShowOnlyMissingTracks value: {ShowOnlyMissingTracks}");

                // Filtreyi aç/kapat
                var newValue = !ShowOnlyMissingTracks;
                _logger.LogDebug($"Toggling ShowOnlyMissingTracks to: {newValue}");

                ShowOnlyMissingTracks = newValue;

                _logger.LogInformation($"✅ Missing tracks filter toggled: {ShowOnlyMissingTracks}");
                _logger.LogInformation("=== FilterMissingTracks COMMAND END ===");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ FilterMissingTracks sırasında hata oluştu: {ex.Message}");
                _logger.LogError(ex, $"Stack trace: {ex.StackTrace}");
            }
        }

        /// <summary>
        /// Track'e tıklanınca oynat (sadece bulunan track'ler için)
        /// </summary>
        private void PlayTrack(Track? track)
        {
            try
            {
                if (track == null)
                {
                    _logger.LogWarning("PlayTrack called with null track");
                    return;
                }

                // Sadece bulunan track'leri oynat
                if (track.Status != TrackStatus.Found)
                {
                    _logger.LogWarning($"Track is not found, cannot play: {track.FileName} (Status: {track.Status})");
                    return;
                }

                if (!System.IO.File.Exists(track.Path))
                {
                    _logger.LogWarning($"Track file does not exist: {track.Path}");
                    return;
                }

                _logger.LogInformation($"Playing track: {track.FileName}");
                _mediaPlayerService.PlayFile(track.Path);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"PlayTrack sırasında hata oluştu: {track?.FileName}");
            }
        }

        private void PlayTrackWithUI(Track? track)
        {
            try
            {
                if (track == null)
                {
                    _logger.LogWarning("PlayTrackWithUI called with null track");
                    return;
                }

                if (track.Status != TrackStatus.Found)
                {
                    _logger.LogWarning($"Track is not found, cannot play: {track.FileName} (Status: {track.Status})");
                    return;
                }

                if (!System.IO.File.Exists(track.Path))
                {
                    _logger.LogWarning($"Track file does not exist: {track.Path}");
                    return;
                }

                _logger.LogInformation($"Playing track with UI: {track.FileName}");

                // Track'i set et ve çal
                CurrentPlayingTrack = track;
                IsPlaying = true;

                // Media player servisini kullan
                _mediaPlayerService.PlayFile(track.Path);

                _logger.LogInformation($"✅ Track started playing: {track.FileName}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"PlayTrackWithUI sırasında hata oluştu: {track?.FileName}");
            }
        }

        private void PauseTrack()
        {
            try
            {
                _logger.LogInformation("Pausing track...");
                _mediaPlayerService.Pause();
                IsPlaying = false;
                _logger.LogInformation("✅ Track paused");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PauseTrack sırasında hata oluştu");
            }
        }

        private void StopTrack()
        {
            try
            {
                _logger.LogInformation("Stopping track...");
                _mediaPlayerService.Stop();
                IsPlaying = false;
                _logger.LogInformation("✅ Track stopped");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "StopTrack sırasında hata oluştu");
            }
        }

        private void ClosePlayer()
        {
            try
            {
                _logger.LogInformation("Closing player...");
                StopTrack();
                CurrentPlayingTrack = null;
                _logger.LogInformation("✅ Player closed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ClosePlayer sırasında hata oluştu");
            }
        }

        public void Dispose()
        {
            // Artık veritabanı kullanılmıyor, dispose gerekmiyor
        }
    }
}
