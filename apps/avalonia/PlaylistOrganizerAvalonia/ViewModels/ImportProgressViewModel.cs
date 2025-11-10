using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Services;
using PlaylistOrganizerAvalonia.Application.Models;

namespace PlaylistOrganizerAvalonia.ViewModels
{
    public partial class ImportProgressViewModel : ObservableObject
    {
        private readonly ILogger<ImportProgressViewModel> _logger;
        private readonly DapperImportService _importService;
        
        public event EventHandler? CloseRequested;

        [ObservableProperty]
        private string _currentStage = "Hazırlanıyor...";

        [ObservableProperty]
        private int _progressPercentage = 0;

        [ObservableProperty]
        private int _musicFilesCount = 0;

        [ObservableProperty]
        private int _playlistFilesCount = 0;

        [ObservableProperty]
        private int _tracksCount = 0;

        [ObservableProperty]
        private string _currentFile = string.Empty;

        [ObservableProperty]
        private bool _canCancel = true;

        [ObservableProperty]
        private bool _isCompleted = false;

        [ObservableProperty]
        private bool _isImporting = false;

        private bool _cancellationRequested = false;

        public ImportProgressViewModel()
        {
            var serviceProvider = App.ServiceProvider;
            _logger = serviceProvider.GetRequiredService<ILogger<ImportProgressViewModel>>();
            _importService = serviceProvider.GetRequiredService<DapperImportService>();
        }

        [RelayCommand]
        public async Task StartImportAsync()
        {
            if (_isImporting) return;

            _isImporting = true;
            _canCancel = true;
            _isCompleted = false;
            _cancellationRequested = false;

            try
            {
                _logger.LogInformation("Import işlemi başlatılıyor...");

                var progress = new Progress<ImportProgress>(OnProgressChanged);
                var result = await _importService.ImportAllWithBulkInsertAsync(progress);

                if (result.Success)
                {
                    _currentStage = "Import başarıyla tamamlandı!";
                    _progressPercentage = 100;
                    _isCompleted = true;
                    _canCancel = false;
                    
                    _logger.LogInformation($"Import tamamlandı: {result.MusicFilesImported} müzik, {result.PlaylistFilesImported} playlist");
                    
                    // UI thread'de güncelle
                    Avalonia.Threading.Dispatcher.UIThread.Post(() =>
                    {
                        CurrentStage = _currentStage;
                        ProgressPercentage = _progressPercentage;
                        IsCompleted = _isCompleted;
                        CanCancel = _canCancel;
                    });
                    
                    // 2 saniye bekle, sonra dialog'u kapat (kullanıcı sonucu görebilsin)
                    await Task.Delay(2000);
                    CloseRequested?.Invoke(this, EventArgs.Empty);
                }
                else
                {
                    _currentStage = $"Import hatası: {result.ErrorMessage}";
                    _canCancel = false;
                    
                    _logger.LogError($"Import başarısız: {result.ErrorMessage}");
                }
            }
            catch (Exception ex)
            {
                _currentStage = $"Import hatası: {ex.Message}";
                _canCancel = false;
                
                _logger.LogError(ex, "Import işlemi sırasında hata oluştu");
            }
            finally
            {
                _isImporting = false;
            }
        }

        [RelayCommand]
        private void CancelImport()
        {
            if (!_canCancel) return;

            _cancellationRequested = true;
            _canCancel = false;
            _currentStage = "Import iptal ediliyor...";
            
            _logger.LogInformation("Import işlemi iptal edildi");
        }

        private void OnProgressChanged(ImportProgress progress)
        {
            if (_cancellationRequested) return;

            // UI thread'de güncelle
            Avalonia.Threading.Dispatcher.UIThread.Post(() =>
            {
                CurrentStage = progress.CurrentStage;
                ProgressPercentage = progress.ProgressPercentage;
                
                if (!string.IsNullOrEmpty(progress.CurrentFile))
                {
                    CurrentFile = progress.CurrentFile;
                }

                // Sahneye gore sayaclari guncelle
                var stage = progress.CurrentStage?.ToLowerInvariant() ?? string.Empty;
                if (stage.Contains("müzik dosyaları") || stage.Contains("muzik dosyalari"))
                {
                    // Tarama veya import asamasinda toplami goster
                    MusicFilesCount = progress.TotalFiles > 0 ? progress.TotalFiles : MusicFilesCount;
                }
                else if (stage.Contains("playlist") && (stage.Contains("tara") || stage.Contains("parse") || stage.Contains("import")))
                {
                    PlaylistFilesCount = progress.TotalFiles > 0 ? progress.TotalFiles : PlaylistFilesCount;
                }
                else if (stage.Contains("track") && (stage.Contains("import") || stage.Contains("parse")))
                {
                    // Track sayisini toplam islenecek ya da su ana kadar islenen ile guncelle
                    TracksCount = progress.TotalFiles > 0 ? progress.TotalFiles : (progress.ProcessedFiles > 0 ? progress.ProcessedFiles : TracksCount);
                }
            });
        }

        partial void OnProgressPercentageChanged(int value)
        {
            // Progress değiştiğinde ek işlemler yapılabilir
        }

        partial void OnIsCompletedChanged(bool value)
        {
            if (value)
            {
                CanCancel = false;
            }
        }

        [RelayCommand]
        private void Close()
        {
            // Dialog kapatma isteği
            CloseRequested?.Invoke(this, EventArgs.Empty);
        }
    }
}