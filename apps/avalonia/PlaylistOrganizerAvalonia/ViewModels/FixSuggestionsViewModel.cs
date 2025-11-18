using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Application.Services;
using PlaylistOrganizerAvalonia.Domain.Entities;

namespace PlaylistOrganizerAvalonia.ViewModels
{
    /// <summary>
    /// Fix Suggestions ViewModel
    /// </summary>
    public partial class FixSuggestionsViewModel : ViewModelBase
    {
        private readonly TrackFixService _trackFixService;
        private readonly ILogger<FixSuggestionsViewModel>? _logger;

        [ObservableProperty]
        private Track? _selectedTrack;

        [ObservableProperty]
        private ObservableCollection<TrackFixSuggestion> _suggestions = new();

        [ObservableProperty]
        private bool _isLoading;

        [ObservableProperty]
        private string? _errorMessage;

        public FixSuggestionsViewModel(
            TrackFixService trackFixService,
            ILogger<FixSuggestionsViewModel>? logger = null)
        {
            _trackFixService = trackFixService;
            _logger = logger;
        }

        /// <summary>
        /// Önerileri yükle
        /// </summary>
        [RelayCommand]
        private async Task LoadSuggestionsAsync()
        {
            if (SelectedTrack == null)
            {
                ErrorMessage = "Seçili track bulunamadı";
                return;
            }

            IsLoading = true;
            ErrorMessage = null;
            Suggestions.Clear();

            try
            {
                _logger?.LogInformation($"Loading fix suggestions for track: {SelectedTrack.Id}");

                var suggestions = await _trackFixService.GetFixSuggestionsAsync(SelectedTrack.Id);

                foreach (var suggestion in suggestions)
                {
                    Suggestions.Add(suggestion);
                }

                if (Suggestions.Count == 0)
                {
                    ErrorMessage = "Öneri bulunamadı";
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error loading fix suggestions");
                ErrorMessage = $"Hata: {ex.Message}";
            }
            finally
            {
                IsLoading = false;
            }
        }

        /// <summary>
        /// Öneriyi uygula
        /// </summary>
        [RelayCommand]
        private async Task ApplySuggestionAsync(TrackFixSuggestion? suggestion)
        {
            if (suggestion == null || string.IsNullOrEmpty(suggestion.SuggestedPath))
            {
                ErrorMessage = "Geçersiz öneri";
                return;
            }

            IsLoading = true;
            ErrorMessage = null;

            try
            {
                _logger?.LogInformation($"Applying fix suggestion: {suggestion.SuggestedPath}");

                var success = await _trackFixService.FixTrackAsync(suggestion.TrackId, suggestion.SuggestedPath);

                if (success)
                {
                    // Başarılı - öneriyi listeden kaldır
                    var itemToRemove = Suggestions.FirstOrDefault(s => s == suggestion);
                    if (itemToRemove != null)
                    {
                        Suggestions.Remove(itemToRemove);
                    }

                    // Eğer tüm öneriler uygulandıysa, dialog'u kapat
                    if (Suggestions.Count == 0)
                    {
                        CloseCommand.Execute(null);
                    }
                }
                else
                {
                    ErrorMessage = "Düzeltme uygulanamadı";
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error applying fix suggestion");
                ErrorMessage = $"Hata: {ex.Message}";
            }
            finally
            {
                IsLoading = false;
            }
        }

        /// <summary>
        /// Dialog kapatma eventi
        /// </summary>
        public event EventHandler? CloseRequested;

        /// <summary>
        /// Dialog'u kapat
        /// </summary>
        [RelayCommand]
        private void Close()
        {
            CloseRequested?.Invoke(this, EventArgs.Empty);
        }

        /// <summary>
        /// Confidence skoruna göre renk al
        /// </summary>
        public string GetConfidenceColor(int confidence)
        {
            return confidence switch
            {
                >= 90 => "#4CAF50", // Yeşil - Mükemmel
                >= 80 => "#2196F3", // Mavi - Çok yüksek
                >= 70 => "#FF9800", // Turuncu - Yüksek
                _ => "#FFC107"      // Sarı - Orta
            };
        }

        /// <summary>
        /// Confidence skoruna göre label al
        /// </summary>
        public string GetConfidenceLabel(int confidence)
        {
            return confidence switch
            {
                >= 90 => "Mükemmel Eşleşme",
                >= 80 => "Çok Yüksek Benzerlik",
                >= 70 => "Yüksek Benzerlik",
                _ => "Orta Benzerlik"
            };
        }
    }
}

