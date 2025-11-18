using Avalonia.Controls;
using Avalonia.Interactivity;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.ViewModels;

namespace PlaylistOrganizerAvalonia.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }

    private void OnTrackSelectionChanged(object? sender, SelectionChangedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel viewModel)
            return;

        if (sender is ListBox listBox && listBox.SelectedItem is Track selectedTrack)
        {
            // Sadece bulunan track'ler için oynat
            if (selectedTrack.Status == Domain.Enums.TrackStatus.Found)
            {
                viewModel.PlayTrackCommand.Execute(selectedTrack);
            }
        }
    }
}