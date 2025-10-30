using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Interfaces;
using PlaylistOrganizerAvalonia.Application.Services;
using PlaylistOrganizerAvalonia.Configuration;
using PlaylistOrganizerAvalonia.Exceptions;
using PlaylistOrganizerAvalonia.HealthChecks;
using PlaylistOrganizerAvalonia.Infrastructure.Database;
using PlaylistOrganizerAvalonia.Infrastructure.Services;
using PlaylistOrganizerAvalonia.Repositories;
using PlaylistOrganizerAvalonia.Validation;
using PlaylistOrganizerAvalonia.ViewModels;

namespace PlaylistOrganizerAvalonia;

/// <summary>
/// Dependency Injection Container - Clean Architecture
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Tüm servisleri DI container'a ekle
    /// </summary>
    public static IServiceCollection AddPlaylistOrganizerServices(this IServiceCollection services)
    {
        services.AddInfrastructureServices();
        services.AddApplicationServices();
        services.AddPresentationServices();

        return services;
    }

    /// <summary>
    /// Infrastructure layer servislerini ekle (Database, Configuration, Caching, etc.)
    /// </summary>
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
    {
        // Configuration
        services.AddSingleton<IConfigurationService, ConfigurationService>();

        // Logging
        services.AddLogging(builder => builder.AddConsole());
        services.AddSingleton<ILoggingService, ConsoleLoggingService>();

        // Caching
        services.AddMemoryCache();
        services.AddSingleton<ICacheService, CacheService>();

        // Database Infrastructure
        services.AddSingleton<IDatabaseManager, DatabaseManager>();
        services.AddSingleton<DatabaseMigrationService>();

        return services;
    }

    /// <summary>
    /// Application layer servislerini ekle (Parsers, Import, Search, etc.)
    /// </summary>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Parsers
        services.AddSingleton<M3UParserService>();
        services.AddSingleton<VDJFolderParserService>();

        // File Operations
        services.AddSingleton<FileScannerService>();

        // Import
        services.AddSingleton<DapperImportService>();

        // Search & Index
        services.AddSingleton<SearchService>();
        services.AddSingleton<IWordIndexService, WordIndexService>();

        // Business Logic
        services.AddSingleton<PlaylistService>();
        services.AddSingleton<TrackService>();
        services.AddSingleton<TrackFixService>();

        return services;
    }

    /// <summary>
    /// Presentation layer servislerini ekle (ViewModels, Exception Handling, Validation, etc.)
    /// </summary>
    public static IServiceCollection AddPresentationServices(this IServiceCollection services)
    {
        // ViewModels
        services.AddTransient<MainWindowViewModel>();
        services.AddTransient<SettingsViewModel>();
        services.AddTransient<ImportProgressViewModel>();

        // Cross-Cutting Concerns
        services.AddSingleton<IExceptionHandler, ExceptionHandler>();
        services.AddSingleton<IValidationService, ValidationService>();
        services.AddSingleton<IHealthCheckService, HealthCheckService>();

        // Repositories
        services.AddScoped<IPlaylistRepository, PlaylistRepository>();
        services.AddScoped<ITrackRepository, TrackRepository>();

        return services;
    }
}