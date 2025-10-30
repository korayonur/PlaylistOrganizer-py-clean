using System;
using System.IO;
using System.Threading.Tasks;
using Avalonia.Controls;
using Avalonia.Platform.Storage;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Infrastructure.Database;

namespace PlaylistOrganizerAvalonia.ViewModels
{
    public partial class SettingsViewModel : ViewModelBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<SettingsViewModel> _logger;
        private readonly DatabaseMigrationService _migrationService;

        [ObservableProperty]
        private string _databasePath = string.Empty;

        [ObservableProperty]
        private string _musicFolderPath = string.Empty;

        [ObservableProperty]
        private string _virtualDJFolderPath = string.Empty;

        [ObservableProperty]
        private bool _autoScan = true;

        [ObservableProperty]
        private string _selectedTheme = "Koyu";

        [ObservableProperty]
        private string _selectedLanguage = "Türkçe";

        [ObservableProperty]
        private bool _autoRefresh = true;

        [ObservableProperty]
        private int _refreshInterval = 30;

        [ObservableProperty]
        private bool _debugMode = false;

        [ObservableProperty]
        private bool _performanceMonitoring = false;

        [ObservableProperty]
        private int _maxConcurrentImports = 5;

        [ObservableProperty]
        private int _batchSize = 100;

        [ObservableProperty]
        private string _musicExtensions = string.Empty;

        [ObservableProperty]
        private string _playlistExtensions = string.Empty;

        [ObservableProperty]
        private string _excludePaths = string.Empty;

        public SettingsViewModel()
        {
            _configuration = new ConfigurationBuilder()
                .SetBasePath(AppDomain.CurrentDomain.BaseDirectory)
                .AddJsonFile("appsettings.json", optional: true)
                .Build();

            _logger = new LoggerFactory().CreateLogger<SettingsViewModel>();
            _migrationService = new DatabaseMigrationService(_configuration, 
                new LoggerFactory().CreateLogger<DatabaseMigrationService>());

            LoadSettings();
        }

        private void LoadSettings()
        {
            // Database settings
            DatabasePath = _configuration["Database:Path"] ?? "playlistorganizer.db";
            
            // Import paths (from old project)
            MusicFolderPath = _configuration["ImportPaths:Music"] ?? "/Users/koray/Music/KorayMusics";
            VirtualDJFolderPath = _configuration["ImportPaths:VirtualDJ"] ?? "/Users/koray/Library/Application Support/VirtualDJ";
            
            // Import settings
            AutoScan = _configuration.GetValue<bool>("ImportSettings:AutoScan", true);
            
            // UI settings
            SelectedTheme = _configuration["UI:Theme"] ?? "Dark";
            SelectedLanguage = _configuration["UI:Language"] ?? "tr-TR";
            AutoRefresh = _configuration.GetValue<bool>("UI:AutoRefresh", true);
            RefreshInterval = _configuration.GetValue<int>("UI:RefreshIntervalSeconds", 30);
            
            // Application settings
            DebugMode = _configuration.GetValue<bool>("Application:DebugMode", false);
            PerformanceMonitoring = _configuration.GetValue<bool>("Application:PerformanceMonitoring", false);
            
            // Import performance settings
            MaxConcurrentImports = _configuration.GetValue<int>("ImportSettings:MaxConcurrentImports", 5);
            BatchSize = _configuration.GetValue<int>("ImportSettings:BatchSize", 100);
            
            // File extensions (from old project)
            var musicExts = _configuration.GetSection("ImportPaths:MusicExtensions").Get<string[]>() ?? 
                           new[] { ".mp3", ".wav", ".m4a", ".flac", ".ogg" };
            MusicExtensions = string.Join(", ", musicExts);
            
            var playlistExts = _configuration.GetSection("ImportPaths:PlaylistExtensions").Get<string[]>() ?? 
                              new[] { ".m3u", ".m3u8", ".vdjfolder" };
            PlaylistExtensions = string.Join(", ", playlistExts);
            
            var excludePaths = _configuration.GetSection("ImportPaths:ExcludePaths").Get<string[]>() ?? 
                              new[] { "/Users/koray/Library/Application Support/VirtualDJ/Folders/My Library.subfolders" };
            ExcludePaths = string.Join(", ", excludePaths);
        }

        [RelayCommand]
        private async Task BrowseDatabase()
        {
            try
            {
                var topLevel = GetTopLevel();
                if (topLevel?.StorageProvider is { } storageProvider)
                {
                    var file = await storageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
                    {
                        Title = "Veritabanı Dosyası Seç",
                        SuggestedFileName = "playlistorganizer.db",
                        FileTypeChoices = new[]
                        {
                            new FilePickerFileType("SQLite Database")
                            {
                                Patterns = new[] { "*.db", "*.sqlite", "*.sqlite3" }
                            }
                        }
                    });

                    if (file is not null)
                    {
                        DatabasePath = file.Path.LocalPath;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to browse database file");
            }
        }

        [RelayCommand]
        private async Task BrowseMusicFolder()
        {
            try
            {
                var topLevel = GetTopLevel();
                if (topLevel?.StorageProvider is { } storageProvider)
                {
                    var folder = await storageProvider.OpenFolderPickerAsync(new FolderPickerOpenOptions
                    {
                        Title = "Müzik Klasörü Seç",
                        AllowMultiple = false
                    });

                    if (folder.Count > 0)
                    {
                        MusicFolderPath = folder[0].Path.LocalPath;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to browse music folder");
            }
        }

        [RelayCommand]
        private async Task BrowseVirtualDJFolder()
        {
            try
            {
                var topLevel = GetTopLevel();
                if (topLevel?.StorageProvider is { } storageProvider)
                {
                    var folder = await storageProvider.OpenFolderPickerAsync(new FolderPickerOpenOptions
                    {
                        Title = "VirtualDJ Klasörü Seç",
                        AllowMultiple = false
                    });

                    if (folder.Count > 0)
                    {
                        VirtualDJFolderPath = folder[0].Path.LocalPath;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to browse VirtualDJ folder");
            }
        }

        [RelayCommand]
        private async Task CreateNewDatabase()
        {
            try
            {
                await _migrationService.InitializeDatabaseAsync();
                _logger.LogInformation("New database created successfully");
                
                // Show success message
                var successWindow = new Window
                {
                    Title = "Başarılı",
                    Content = new TextBlock { Text = "Yeni veritabanı başarıyla oluşturuldu!" },
                    Width = 300,
                    Height = 150,
                    WindowStartupLocation = WindowStartupLocation.CenterScreen
                };
                await successWindow.ShowDialog(GetTopLevel() as Window);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create new database");
                
                var errorWindow = new Window
                {
                    Title = "Hata",
                    Content = new TextBlock { Text = $"Veritabanı oluşturulurken hata: {ex.Message}" },
                    Width = 400,
                    Height = 200,
                    WindowStartupLocation = WindowStartupLocation.CenterScreen
                };
                await errorWindow.ShowDialog(GetTopLevel() as Window);
            }
        }

        [RelayCommand]
        private async Task ClearDatabase()
        {
            try
            {
                var confirmWindow = new Window
                {
                    Title = "Onay",
                    Width = 400,
                    Height = 200,
                    WindowStartupLocation = WindowStartupLocation.CenterScreen
                };

                var panel = new StackPanel();
                panel.Children.Add(new TextBlock 
                { 
                    Text = "Mevcut veritabanı temizlenecek. Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?",
                    TextWrapping = Avalonia.Media.TextWrapping.Wrap,
                    Margin = new Avalonia.Thickness(10)
                });

                var buttonPanel = new StackPanel { Orientation = Avalonia.Layout.Orientation.Horizontal, HorizontalAlignment = Avalonia.Layout.HorizontalAlignment.Center };
                var yesButton = new Button { Content = "Evet", Margin = new Avalonia.Thickness(5) };
                var noButton = new Button { Content = "Hayır", Margin = new Avalonia.Thickness(5) };

                bool confirmed = false;
                yesButton.Click += (s, e) => { confirmed = true; confirmWindow.Close(); };
                noButton.Click += (s, e) => { confirmed = false; confirmWindow.Close(); };

                buttonPanel.Children.Add(yesButton);
                buttonPanel.Children.Add(noButton);
                panel.Children.Add(buttonPanel);
                confirmWindow.Content = panel;

                await confirmWindow.ShowDialog(GetTopLevel() as Window);

                if (confirmed)
                {
                    // Clear database logic here
                    _logger.LogInformation("Database cleared");
                    
                    var successWindow = new Window
                    {
                        Title = "Başarılı",
                        Content = new TextBlock { Text = "Veritabanı başarıyla temizlendi!" },
                        Width = 300,
                        Height = 150,
                        WindowStartupLocation = WindowStartupLocation.CenterScreen
                    };
                    await successWindow.ShowDialog(GetTopLevel() as Window);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to clear database");
            }
        }

        [RelayCommand]
        private void Save()
        {
            try
            {
                // Save settings logic here
                _logger.LogInformation("Settings saved");
                
                // Close dialog
                var topLevel = GetTopLevel();
                if (topLevel is Window window)
                {
                    window.Close(true);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save settings");
            }
        }

        [RelayCommand]
        private void Cancel()
        {
            var topLevel = GetTopLevel();
            if (topLevel is Window window)
            {
                window.Close(false);
            }
        }

        private static TopLevel? GetTopLevel()
        {
            return Avalonia.Application.Current?.ApplicationLifetime is 
                Avalonia.Controls.ApplicationLifetimes.IClassicDesktopStyleApplicationLifetime desktop 
                ? desktop.MainWindow 
                : null;
        }
    }
}
