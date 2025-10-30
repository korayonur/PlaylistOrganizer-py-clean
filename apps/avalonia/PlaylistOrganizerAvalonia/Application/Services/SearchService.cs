using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Common;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// Arama servisi - playlist ve track arama işlemleri
    /// </summary>
    public class SearchService : BaseDatabaseService
    {
        public SearchService(ILogger<SearchService> logger, IDatabaseManager databaseManager) 
            : base(logger, databaseManager) { }

        /// <summary>
        /// Playlist arama (isim ve yol bazında)
        /// </summary>
        /// <param name="searchTerm">Arama terimi</param>
        /// <param name="searchInPath">Yol içinde arama yapılsın mı</param>
        /// <returns>Bulunan playlist'ler</returns>
        public async Task<List<Playlist>> SearchPlaylistsAsync(string searchTerm, bool searchInPath = true)
        {
            try
            {
                LogInfo($"Playlist arama başlatıldı: '{searchTerm}'");

                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return new List<Playlist>();
                }

                return await ExecuteDatabaseOperationAsync(async () =>
                {
                    var allPlaylists = await DatabaseManager.GetPlaylistsAsync();
                    var searchTermLower = searchTerm.ToLowerInvariant();

                    var results = allPlaylists.Where(p =>
                    {
                        // İsim içinde arama
                        if (p.Name.ToLowerInvariant().Contains(searchTermLower))
                            return true;

                        // Yol içinde arama (opsiyonel)
                        if (searchInPath && p.Path.ToLowerInvariant().Contains(searchTermLower))
                            return true;

                        return false;
                    }).ToList();

                    LogInfo($"Playlist arama tamamlandı: {results.Count} sonuç bulundu");
                    return results;
                }, "Playlist search");
            }
            catch (Exception ex)
            {
                LogError(ex, "Playlist arama sırasında hata oluştu");
                return new List<Playlist>();
            }
        }

        /// <summary>
        /// Track arama (dosya adı ve yol bazında)
        /// </summary>
        /// <param name="searchTerm">Arama terimi</param>
        /// <param name="playlistId">Belirli playlist içinde arama (opsiyonel)</param>
        /// <returns>Bulunan track'ler</returns>
        public async Task<List<Track>> SearchTracksAsync(string searchTerm, int? playlistId = null)
        {
            try
            {
                LogInfo($"Track arama başlatıldı: '{searchTerm}'");

                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return new List<Track>();
                }

                return await ExecuteDatabaseOperationAsync(async () =>
                {
                    List<Track> tracks;
                    
                    if (playlistId.HasValue)
                    {
                        tracks = await DatabaseManager.GetTracksForPlaylistAsync(playlistId.Value);
                    }
                    else
                    {
                        // Tüm track'leri getir (bu metod DatabaseManager'da yoksa eklenmeli)
                        tracks = new List<Track>(); // Placeholder
                    }

                    var searchTermLower = searchTerm.ToLowerInvariant();
                    var results = tracks.Where(t =>
                    {
                        // Dosya adı içinde arama
                        if (t.FileName.ToLowerInvariant().Contains(searchTermLower))
                            return true;

                        // Yol içinde arama
                        if (t.Path.ToLowerInvariant().Contains(searchTermLower))
                            return true;

                        return false;
                    }).ToList();

                    LogInfo($"Track arama tamamlandı: {results.Count} sonuç bulundu");
                    return results;
                }, "Track search");
            }
            catch (Exception ex)
            {
                LogError(ex, "Track arama sırasında hata oluştu");
                return new List<Track>();
            }
        }
    }
}