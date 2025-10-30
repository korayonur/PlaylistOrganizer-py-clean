using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Common;
using PlaylistOrganizerAvalonia.Application.Interfaces;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.Infrastructure.Services;
using PlaylistOrganizerAvalonia.Shared.Services;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// Word indexing service for full-text search
    /// </summary>
    public class WordIndexService : BaseDatabaseService, IWordIndexService
    {
        public WordIndexService(ILogger<WordIndexService> logger, IDatabaseManager databaseManager)
            : base(logger, databaseManager)
        {
        }

        public async Task IndexAllAsync()
        {
            LogInfo("🔍 Word indexing başlıyor...");

            var tracksCount = await IndexTracksAsync();
            var musicFilesCount = await IndexMusicFilesAsync();

            LogInfo($"✅ Word indexing tamamlandı: {tracksCount} track, {musicFilesCount} music file indexlendi");
        }

        public async Task<int> IndexTracksAsync()
        {
            LogInfo("📝 Track kelimeleri indexleniyor...");

            // Tüm track'leri oku
            var tracks = await DatabaseManager.QueryAsync<Track>("SELECT * FROM tracks");
            LogInfo($"  {tracks.Count()} track okundu");

            var currentTime = DateTime.UtcNow;
            var trackWords = new List<TrackWord>();

            foreach (var track in tracks)
            {
                // NormalizedFileName'i kelimelere ayır
                var words = track.NormalizedFileName
                    .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                    .Where(w => w.Length > 0)
                    .ToList();

                for (int i = 0; i < words.Count; i++)
                {
                    trackWords.Add(new TrackWord
                    {
                        TrackId = track.Id,
                        Word = words[i],
                        WordLength = words[i].Length,
                        WordPosition = i + 1,
                        CreatedAt = currentTime
                    });
                }
            }

            LogInfo($"  {trackWords.Count} kelime oluşturuldu");

            // Batch insert (DatabaseManager içinde batch'leniyor ve transaction kullanıyor)
            await DatabaseManager.BulkInsertTrackWordsAsync(trackWords);

            return trackWords.Count;
        }

        public async Task<int> IndexMusicFilesAsync()
        {
            LogInfo("📝 Music file kelimeleri indexleniyor...");

            // Tüm music_file'ları oku
            var musicFiles = await DatabaseManager.QueryAsync<MusicFile>("SELECT * FROM music_files");
            LogInfo($"  {musicFiles.Count()} music file okundu");

            var currentTime = DateTime.UtcNow;
            var musicWords = new List<MusicWord>();

            foreach (var musicFile in musicFiles)
            {
                // NormalizedFileName'i kelimelere ayır
                var words = musicFile.NormalizedFileName
                    .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                    .Where(w => w.Length > 0)
                    .ToList();

                for (int i = 0; i < words.Count; i++)
                {
                    musicWords.Add(new MusicWord
                    {
                        MusicFileId = musicFile.Id,
                        Word = words[i],
                        WordLength = words[i].Length,
                        WordPosition = i + 1,
                        CreatedAt = currentTime
                    });
                }
            }

            LogInfo($"  {musicWords.Count} kelime oluşturuldu");

            // Batch insert (DatabaseManager içinde batch'leniyor ve transaction kullanıyor)
            await DatabaseManager.BulkInsertMusicWordsAsync(musicWords);

            return musicWords.Count;
        }
    }
}
