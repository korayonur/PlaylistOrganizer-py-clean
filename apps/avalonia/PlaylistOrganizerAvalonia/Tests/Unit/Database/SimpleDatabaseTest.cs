using System;
using System.Threading.Tasks;
using System.IO;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.Tests
{
    /// <summary>
    /// Basit database test
    /// </summary>
    public class SimpleDatabaseTest
    {
        public static async Task TestDatabaseAsync()
        {
            Console.WriteLine("🚀 Basit Database Test Başlatılıyor...");
            
            // Service provider oluştur
            var services = new ServiceCollection();
            services.AddLogging(builder => builder.AddConsole());
            
            // Configuration ekle
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .Build();
            services.AddSingleton<IConfiguration>(configuration);
            
            services.AddSingleton<IDatabaseManager, DatabaseManager>();
            
            var serviceProvider = services.BuildServiceProvider();
            
            try
            {
                // Database manager'ı al
                var databaseManager = serviceProvider.GetRequiredService<IDatabaseManager>();
                
                // Database bağlantısını test et
                Console.WriteLine("📊 Database bağlantısı test ediliyor...");
                var connectionTest = await databaseManager.TestConnectionAsync();
                Console.WriteLine($"✅ Database bağlantısı: {(connectionTest ? "BAŞARILI" : "BAŞARISIZ")}");
                
                // Mevcut veri sayılarını kontrol et
                Console.WriteLine("\n📈 Mevcut Database Durumu:");
                var playlists = await databaseManager.GetPlaylistsAsync();
                Console.WriteLine($"   📁 Playlists: {playlists.Count}");
                
                if (playlists.Count > 0)
                {
                    var firstPlaylist = playlists[0];
                    Console.WriteLine($"   📁 İlk Playlist: {firstPlaylist.Name} (ID: {firstPlaylist.Id})");
                    
                    var tracks = await databaseManager.GetTracksForPlaylistAsync(firstPlaylist.Id);
                    Console.WriteLine($"   🎵 İlk Playlist Track'leri: {tracks.Count}");
                    
                    if (tracks.Count > 0)
                    {
                        var firstTrack = tracks[0];
                        Console.WriteLine($"   🎵 İlk Track: {firstTrack.FileName} (Status: {firstTrack.Status})");
                    }
                }
                
                Console.WriteLine("\n🎉 Database test başarıyla tamamlandı!");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Hata oluştu: {ex.Message}");
                Console.WriteLine($"   Detay: {ex}");
            }
            finally
            {
                serviceProvider.Dispose();
            }
        }
    }
}
