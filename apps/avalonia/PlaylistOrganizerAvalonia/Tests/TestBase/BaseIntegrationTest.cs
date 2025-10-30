using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Interfaces;
using PlaylistOrganizerAvalonia.Application.Services;
using PlaylistOrganizerAvalonia.Infrastructure.Database;
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.Tests.TestBase
{
    /// <summary>
    /// Base class for integration tests with centralized service configuration
    /// </summary>
    public abstract class BaseIntegrationTest
    {
        protected IServiceProvider ServiceProvider { get; }
        protected IDatabaseManager DatabaseManager { get; }

        protected BaseIntegrationTest()
        {
            ServiceProvider = CreateServiceProvider();
            DatabaseManager = ServiceProvider.GetRequiredService<IDatabaseManager>();
        }

        /// <summary>
        /// Create and configure service provider with all required services
        /// </summary>
        protected virtual IServiceProvider CreateServiceProvider()
        {
            var services = new ServiceCollection();

            // Logging
            services.AddLogging(builder => builder.AddConsole());

            // Configuration
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .Build();
            services.AddSingleton<IConfiguration>(configuration);

            // Infrastructure Services
            services.AddSingleton<IDatabaseManager, DatabaseManager>();
            services.AddSingleton<DatabaseMigrationService>();

            // Application Services
            services.AddSingleton<M3UParserService>();
            services.AddSingleton<VDJFolderParserService>();
            services.AddSingleton<FileScannerService>();
            services.AddSingleton<IWordIndexService, WordIndexService>();
            services.AddSingleton<DapperImportService>();

            return services.BuildServiceProvider();
        }

        /// <summary>
        /// Initialize database for testing
        /// </summary>
        protected async Task InitializeDatabaseAsync()
        {
            await DatabaseManager.InitializeDatabaseAsync();
        }

        /// <summary>
        /// Cleanup database before import (clear all tables)
        /// </summary>
        protected async Task CleanupDatabaseAsync()
        {
            await DatabaseManager.CleanTablesBeforeImportAsync();
        }
    }
}

