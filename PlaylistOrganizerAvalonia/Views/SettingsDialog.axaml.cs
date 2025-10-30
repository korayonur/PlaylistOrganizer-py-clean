using Avalonia.Controls;
using Avalonia.Markup.Xaml;
using PlaylistOrganizerAvalonia.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace PlaylistOrganizerAvalonia.Views
{
    public partial class SettingsDialog : Window
    {
        public SettingsDialog()
        {
            InitializeComponent();
            
            // Set DataContext
            DataContext = new SettingsViewModel();
        }

        private void InitializeComponent()
        {
            AvaloniaXamlLoader.Load(this);
        }
    }
}
