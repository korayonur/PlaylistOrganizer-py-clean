using Avalonia.Controls;
using Avalonia.Markup.Xaml;
using PlaylistOrganizerAvalonia.ViewModels;

namespace PlaylistOrganizerAvalonia.Views;

/// <summary>
/// Progress ve error handling için UI component
/// </summary>
public partial class ProgressOverlay : UserControl
{
    public ProgressOverlay()
    {
        InitializeComponent();
    }

    private void InitializeComponent()
    {
        AvaloniaXamlLoader.Load(this);
    }
}
