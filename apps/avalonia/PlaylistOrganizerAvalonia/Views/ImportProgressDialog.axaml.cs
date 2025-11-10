using Avalonia.Controls;
using Avalonia.Markup.Xaml;
using PlaylistOrganizerAvalonia.ViewModels;

namespace PlaylistOrganizerAvalonia.Views
{
    public partial class ImportProgressDialog : Window
    {
        private readonly ImportProgressViewModel _viewModel;

        public ImportProgressDialog()
        {
            InitializeComponent();
            _viewModel = new ImportProgressViewModel();
            DataContext = _viewModel;
            
            // CloseCommand için window kapatma callback
            _viewModel.CloseRequested += (s, e) => Close(true);
            
            // Dialog açıldığında otomatik import başlat
            Loaded += async (s, e) => 
            {
                await _viewModel.StartImportAsync();
            };
        }

        private void InitializeComponent()
        {
            AvaloniaXamlLoader.Load(this);
        }
    }
}