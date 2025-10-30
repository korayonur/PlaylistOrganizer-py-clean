using System;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Extensions.DependencyInjection;
using PlaylistOrganizerAvalonia.Application.Interfaces;
using PlaylistOrganizerAvalonia.Application.Services;
using PlaylistOrganizerAvalonia.Tests.TestBase;

namespace PlaylistOrganizerAvalonia.Tests
{
    public class DapperImportTest : BaseIntegrationTest
    {
        public static async Task TestDapperImportAsync()
        {
            var test = new DapperImportTest();
            await test.RunTestAsync();
        }

        private async Task RunTestAsync()
        {
            Console.WriteLine("🚀 Dapper ile Bulk Insert Import Test Başlatılıyor...");

            try
            {
                // Initialize database
                Console.WriteLine("🔧 Database başlatılıyor...");
                await InitializeDatabaseAsync();
                Console.WriteLine("✅ Database başlatıldı");

                var dapperImportService = ServiceProvider.GetRequiredService<DapperImportService>();

                Console.WriteLine("📊 Dapper Import başlatılıyor...");
                var result = await dapperImportService.ImportAllWithBulkInsertAsync();

                Console.WriteLine("\n✅ Dapper Import Tamamlandı!");
                Console.WriteLine($"   📊 Toplam Dosya: {result.TotalFiles}");
                Console.WriteLine($"   ✅ İşlenen: {result.ProcessedFiles}");
                Console.WriteLine($"   ➕ Eklenen: {result.AddedFiles}");
                Console.WriteLine($"   ⏭️ Atlanan: {result.SkippedFiles}");
                Console.WriteLine($"   ❌ Hata: {result.ErrorFiles}");
                Console.WriteLine($"   🎵 Müzik Dosyaları: {result.MusicFilesImported}");
                Console.WriteLine($"   📁 Playlist Dosyaları: {result.PlaylistFilesImported}");
                Console.WriteLine($"   🎶 Track'ler: {result.TracksImported}");

                // Database durumunu kontrol et
                Console.WriteLine("\n📊 Dapper Import Sonrası Database Durumu:");

                try
                {
                    var musicFilesCount = await DatabaseManager.GetMusicFilesCountAsync();
                    var playlistsCount = await DatabaseManager.GetPlaylistsCountAsync();
                    var tracksCount = await DatabaseManager.GetTracksCountAsync();

                    Console.WriteLine($"   🎵 Music Files: {musicFilesCount}");
                    Console.WriteLine($"   📁 Playlists: {playlistsCount}");
                    Console.WriteLine($"   🎶 Tracks: {tracksCount}");

                    // Tüm tablo kontrollerini yap
                    await ValidateAllTablesAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"   ❌ Database durumu kontrol edilemedi: {ex.Message}");
                }

                Console.WriteLine("\n🎉 Dapper import test başarıyla tamamlandı!");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Dapper import test hatası: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
            }
        }

        private async Task ValidateAllTablesAsync()
        {
            Console.WriteLine("\n🔍 Tüm tablolar kontrol ediliyor...");

            try
            {
                var connection = DatabaseManager.GetConnection();

                // Temel tablolar
                var musicFilesCount = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM music_files");
                var playlistsCount = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM playlists");
                var tracksCount = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM tracks");

                // İndeks tabloları
                var trackWordsCount = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM track_words");
                var musicWordsCount = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM music_words");

                // Track status dağılımı
                var availableTracks = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM tracks WHERE status = 'Found'");
                var missingTracks = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM tracks WHERE status = 'Missing'");

                // Playlist file path kontrolü (tracks'ten playlists'e GROUP BY kontrolü)
                var tracksWithPlaylistPath = await connection.QuerySingleAsync<int>("SELECT COUNT(*) FROM tracks WHERE playlist_file_path IS NOT NULL AND playlist_file_path != ''");
                var playlistsFromTracks = await connection.QuerySingleAsync<int>("SELECT COUNT(DISTINCT playlist_file_path) FROM tracks WHERE playlist_file_path IS NOT NULL");

                Console.WriteLine("\n📊 Tablo Detayları:");
                Console.WriteLine($"   ✅ music_files: {musicFilesCount}");
                Console.WriteLine($"   ✅ playlists: {playlistsCount}");
                Console.WriteLine($"   ✅ tracks: {tracksCount}");
                Console.WriteLine($"   ✅ track_words: {trackWordsCount}");
                Console.WriteLine($"   ✅ music_words: {musicWordsCount}");
                Console.WriteLine($"\n🎵 Track Status:");
                Console.WriteLine($"   ✅ Available (Found): {availableTracks}");
                Console.WriteLine($"   ❌ Missing: {missingTracks}");
                Console.WriteLine($"\n📁 Playlist İlişkileri:");
                Console.WriteLine($"   ✅ Playlist path'lı tracks: {tracksWithPlaylistPath}");
                Console.WriteLine($"   ✅ Distinct playlist paths: {playlistsFromTracks}");

                // Validasyonlar
                bool isValid = true;

                if (tracksWithPlaylistPath == 0)
                {
                    Console.WriteLine("   ❌ UYARI: Hiçbir track'te playlist_file_path yok!");
                    isValid = false;
                }

                if (playlistsFromTracks != playlistsCount)
                {
                    Console.WriteLine($"   ⚠️ UYARI: Playlist sayıları eşleşmiyor! (playlists: {playlistsCount}, distinct paths: {playlistsFromTracks})");
                }

                if (trackWordsCount == 0)
                {
                    Console.WriteLine("   ❌ UYARI: track_words tablosu boş!");
                    isValid = false;
                }

                if (musicWordsCount == 0)
                {
                    Console.WriteLine("   ❌ UYARI: music_words tablosu boş!");
                    isValid = false;
                }

                if (isValid)
                {
                    Console.WriteLine("\n✅ Tüm tablolar dolu ve geçerli!");
                }
                else
                {
                    Console.WriteLine("\n⚠️ Bazı tablolar boş veya ilişkiler eksik!");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Tablo validasyonu hatası: {ex.Message}");
            }
        }
    }
}
