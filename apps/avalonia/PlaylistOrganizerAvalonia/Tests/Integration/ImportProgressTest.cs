using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using PlaylistOrganizerAvalonia.Application.Models;
using PlaylistOrganizerAvalonia.Application.Services;
using PlaylistOrganizerAvalonia.Tests.TestBase;

namespace PlaylistOrganizerAvalonia.Tests
{
    public class ImportProgressTest : BaseIntegrationTest
    {
        public static async Task TestImportWithProgressAsync()
        {
            var test = new ImportProgressTest();
            await test.RunTestAsync();
        }

        private async Task RunTestAsync()
        {
            Console.WriteLine("🚀 Import Progress Test");
            Console.WriteLine("=".PadRight(80, '='));
            Console.WriteLine();

            try
            {
                // Initialize database
                await InitializeDatabaseAsync();

                var importService = ServiceProvider.GetRequiredService<DapperImportService>();

                // Progress handler
                var progress = new Progress<ImportProgress>(p =>
                {
                    var barLength = 50;
                    var filled = (int)(barLength * p.ProgressPercentage / 100.0);
                    var bar = new string('█', filled) + new string('░', barLength - filled);
                    
                    Console.WriteLine($"\r[{bar}] {p.ProgressPercentage,3}% | {p.CurrentStage,-60}");
                    
                    if (!string.IsNullOrEmpty(p.CurrentFile))
                    {
                        Console.WriteLine($"  → İşleniyor: {p.CurrentFile}");
                    }
                    
                    if (p.ProcessedFiles > 0 && p.TotalFiles > 0)
                    {
                        Console.WriteLine($"  → İşlenen: {p.ProcessedFiles}/{p.TotalFiles}");
                    }
                });

                Console.WriteLine("📊 Import başlatılıyor...");
                Console.WriteLine();

                var startTime = DateTime.Now;
                var result = await importService.ImportAllWithBulkInsertAsync(progress);
                var duration = DateTime.Now - startTime;

                Console.WriteLine();
                Console.WriteLine();
                Console.WriteLine("=".PadRight(80, '='));
                Console.WriteLine("✅ Import Tamamlandı!");
                Console.WriteLine("=".PadRight(80, '='));
                Console.WriteLine($"  Süre: {duration.TotalSeconds:F1} saniye");
                Console.WriteLine($"  Müzik Dosyaları: {result.MusicFilesImported}");
                Console.WriteLine($"  Playlist Dosyaları: {result.PlaylistFilesImported}");
                Console.WriteLine($"  Track'ler: {result.TracksImported}");
                Console.WriteLine($"  Toplam Dosya: {result.TotalFiles}");
                Console.WriteLine($"  İşlenen: {result.ProcessedFiles}");
                Console.WriteLine($"  Hata: {result.ErrorFiles}");
            }
            catch (Exception ex)
            {
                Console.WriteLine();
                Console.WriteLine($"❌ HATA: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
            }
        }
    }
}
