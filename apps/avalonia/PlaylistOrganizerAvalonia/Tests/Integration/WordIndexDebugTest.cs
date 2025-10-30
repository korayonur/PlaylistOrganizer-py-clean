using System;
using System.IO;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Interfaces;
using PlaylistOrganizerAvalonia.Application.Services;
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.Tests
{
    public class WordIndexDebugTest
    {
        public static async Task TestWordIndexingAsync()
        {
            Console.WriteLine("🔍 Word Indexing Debug Test");
            Console.WriteLine("=".PadRight(50, '='));

            var services = new ServiceCollection();
            services.AddLogging(builder => builder.AddConsole().SetMinimumLevel(LogLevel.Debug));

            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .Build();
            services.AddSingleton<IConfiguration>(configuration);

            services.AddSingleton<IDatabaseManager, DatabaseManager>();
            services.AddSingleton<IWordIndexService, WordIndexService>();

            var serviceProvider = services.BuildServiceProvider();

            try
            {
                var databaseManager = serviceProvider.GetRequiredService<IDatabaseManager>();
                var wordIndexService = serviceProvider.GetRequiredService<IWordIndexService>();

                // Mevcut durum
                Console.WriteLine("\n📊 BAŞLANGIÇ DURUMU:");
                var connection = databaseManager.GetConnection();
                var tracksCount = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM tracks");
                var musicFilesCount = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM music_files");
                var trackWordsCount = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM track_words");
                var musicWordsCount = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM music_words");

                Console.WriteLine($"  Tracks: {tracksCount}");
                Console.WriteLine($"  Music Files: {musicFilesCount}");
                Console.WriteLine($"  Track Words: {trackWordsCount}");
                Console.WriteLine($"  Music Words: {musicWordsCount}");

                // Word indexing'i temizle
                Console.WriteLine("\n🧹 Mevcut index'leri temizliyorum...");
                await connection.ExecuteAsync("DELETE FROM track_words");
                await connection.ExecuteAsync("DELETE FROM music_words");
                Console.WriteLine("  ✅ Index'ler temizlendi");

                // Word indexing başlat
                Console.WriteLine("\n🚀 Word indexing başlatılıyor...");
                Console.WriteLine("  (Her batch için progress gösterilecek)");
                Console.WriteLine("");

                var startTime = DateTime.Now;
                await wordIndexService.IndexAllAsync();
                var duration = DateTime.Now - startTime;

                // Final durum
                Console.WriteLine("\n📊 FİNAL DURUM:");
                trackWordsCount = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM track_words");
                musicWordsCount = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM music_words");

                Console.WriteLine($"  Track Words: {trackWordsCount}");
                Console.WriteLine($"  Music Words: {musicWordsCount}");
                Console.WriteLine($"  Süre: {duration.TotalSeconds:F1} saniye");

                // Validasyon
                if (trackWordsCount == 0)
                {
                    Console.WriteLine("\n❌ UYARI: track_words tablosu boş!");
                }

                if (musicWordsCount == 0)
                {
                    Console.WriteLine("\n❌ UYARI: music_words tablosu boş!");
                }

                if (trackWordsCount > 0 && musicWordsCount > 0)
                {
                    Console.WriteLine("\n🎉 Word indexing test başarıyla tamamlandı!");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n❌ Word indexing test hatası: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
            }
        }
    }
}

