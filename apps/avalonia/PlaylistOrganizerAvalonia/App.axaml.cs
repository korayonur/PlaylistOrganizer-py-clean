using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Data.Core;
using Avalonia.Data.Core.Plugins;
using System.Linq;
using Avalonia.Markup.Xaml;
using PlaylistOrganizerAvalonia.ViewModels;
using PlaylistOrganizerAvalonia.Views;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.Json;
using System;
using System.IO;
using System.Threading.Tasks;
using PlaylistOrganizerAvalonia.Application.Services;

namespace PlaylistOrganizerAvalonia;

public partial class App : Avalonia.Application
{
    public static IServiceProvider ServiceProvider { get; private set; } = null!;

    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
        
        // Build configuration
        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppDomain.CurrentDomain.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .Build();
        
        // Configure services
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddPlaylistOrganizerServices();
        ServiceProvider = services.BuildServiceProvider();
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            // Avoid duplicate validations from both Avalonia and the CommunityToolkit. 
            // More info: https://docs.avaloniaui.net/docs/guides/development-guides/data-validation#manage-validationplugins
            DisableAvaloniaDataAnnotationValidation();
            desktop.MainWindow = new MainWindow
            {
                DataContext = ServiceProvider.GetRequiredService<MainWindowViewModel>(),
            };
        }

        // Word index'i background'da yükle ve JSON'a export et
        _ = Task.Run(async () =>
        {
            try
            {
                var wordIndex = ServiceProvider.GetRequiredService<InMemoryWordIndex>();
                var jsonWordIndex = ServiceProvider.GetRequiredService<JsonWordIndexService>();
                var logger = ServiceProvider.GetRequiredService<ILogger<App>>();
                
                logger.LogInformation("📦 Word index yükleniyor (dosya sisteminden)...");
                await wordIndex.LoadFromFileSystemAsync();
                logger.LogInformation("✅ Word index yüklendi");
                
                // JSON search formatına export et (word-index.json)
                try
                {
                    var jsonPath = Path.Combine(AppContext.BaseDirectory, "word-index.json");
                    await wordIndex.ExportToSearchJsonAsync(jsonPath);
                    logger.LogInformation($"📄 Index search JSON'a export edildi: {jsonPath}");
                    
                    // JSON index'i yükle (JsonWordIndexService)
                    logger.LogInformation("📦 JSON index yükleniyor (memory cache)...");
                    await jsonWordIndex.LoadFromJsonAsync(jsonPath);
                    logger.LogInformation($"✅ JSON index yüklendi: {jsonWordIndex.FileCount} dosya");
                    
                    // Debug export'lar (opsiyonel)
                    var debugPath = Path.Combine(AppContext.BaseDirectory, "word-index-debug.json");
                    await wordIndex.ExportToJsonAsync(debugPath);
                    logger.LogInformation($"📄 Index debug dosyası oluşturuldu: {debugPath}");
                    
                    var fullDebugPath = Path.Combine(AppContext.BaseDirectory, "word-index-full-debug.json");
                    await wordIndex.ExportFullToJsonAsync(fullDebugPath, maxRecords: 100);
                    logger.LogInformation($"📄 Index FULL debug dosyası oluşturuldu: {fullDebugPath}");
                }
                catch (Exception exportEx)
                {
                    logger.LogWarning(exportEx, "Index export/yükleme hatası (devam ediliyor)");
                }
            }
            catch (Exception ex)
            {
                var logger = ServiceProvider.GetRequiredService<ILogger<App>>();
                logger.LogError(ex, "❌ Word index yükleme hatası");
            }
        });

        base.OnFrameworkInitializationCompleted();
    }

    private void DisableAvaloniaDataAnnotationValidation()
    {
        // Get an array of plugins to remove
        var dataValidationPluginsToRemove =
            BindingPlugins.DataValidators.OfType<DataAnnotationsValidationPlugin>().ToArray();

        // remove each entry found
        foreach (var plugin in dataValidationPluginsToRemove)
        {
            BindingPlugins.DataValidators.Remove(plugin);
        }
    }
}