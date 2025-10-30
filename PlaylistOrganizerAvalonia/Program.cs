using System;
using System.Threading.Tasks;
using Avalonia;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Infrastructure.Database;

namespace PlaylistOrganizerAvalonia;

sealed class Program
{
    // Initialization code. Don't use any Avalonia, third-party APIs or any
    // SynchronizationContext-reliant code before AppMain is called: things aren't initialized
    // yet and stuff might break.
    [STAThread]
    public static async Task Main(string[] args)
    {
        // Test modu kontrolü
        if (args.Length > 0 && args[0] == "--test-import")
        {
            // Ana import testi - Dapper bulk import
            await PlaylistOrganizerAvalonia.Tests.DapperImportTest.TestDapperImportAsync();
            return;
        }

        if (args.Length > 0 && args[0] == "--test-db")
        {
            await PlaylistOrganizerAvalonia.Tests.SimpleDatabaseTest.TestDatabaseAsync();
            return;
        }

        if (args.Length > 0 && args[0] == "--test-word-index")
        {
            // Word indexing debug testi
            await PlaylistOrganizerAvalonia.Tests.WordIndexDebugTest.TestWordIndexingAsync();
            return;
        }

        if (args.Length > 0 && args[0] == "--test-import-progress")
        {
            // Import progress testi (terminal'de progress gösterimi ile)
            await PlaylistOrganizerAvalonia.Tests.ImportProgressTest.TestImportWithProgressAsync();
            return;
        }

        // Normal uygulama başlatma
        BuildAvaloniaApp()
            .StartWithClassicDesktopLifetime(args);
    }

    // Avalonia configuration, don't remove; also used by visual designer.
    public static AppBuilder BuildAvaloniaApp()
    {
        return AppBuilder.Configure<App>()
            .UsePlatformDetect()
            .WithInterFont()
            .LogToTrace()
            .AfterSetup(async app =>
            {
                // Initialize database after Avalonia setup
                await InitializeDatabaseAsync();
            });
    }

    private static async Task InitializeDatabaseAsync()
    {
        try
        {
            // Build configuration
            var configuration = new ConfigurationBuilder()
                .SetBasePath(AppDomain.CurrentDomain.BaseDirectory)
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                .Build();

            // Build service provider
            var services = new ServiceCollection()
                .AddSingleton<IConfiguration>(configuration)
                .AddLogging(builder => builder.AddConsole())
                .AddPlaylistOrganizerServices()
                .BuildServiceProvider();

            // Get migration service and initialize database
            var migrationService = services.GetRequiredService<DatabaseMigrationService>();
            await migrationService.InitializeDatabaseAsync();

            Console.WriteLine("✅ Database initialized successfully");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Failed to initialize database: {ex.Message}");
            // Don't throw - let the app start without database initialization
            Console.WriteLine("⚠️ Continuing without database initialization...");
        }
    }
}
