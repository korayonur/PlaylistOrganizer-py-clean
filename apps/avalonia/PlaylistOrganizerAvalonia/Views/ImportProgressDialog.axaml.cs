using Avalonia.Controls;
using Avalonia.Markup.Xaml;
using PlaylistOrganizerAvalonia.ViewModels;

namespace PlaylistOrganizerAvalonia.Views
{
    public partial class ImportProgressDialog : Window
    {
        public ImportProgressDialog()
        {
            InitializeComponent();
            DataContext = new ImportProgressViewModel();
            
            // Dialog açıldığında otomatik import başlat
            Loaded += async (s, e) => 
            {
                if (DataContext is ImportProgressViewModel vm)
                {
                    await vm.StartImportAsync();
                }
            };
        }

        private void InitializeComponent()
        {
            AvaloniaXamlLoader.Load(this);
        }
    }
}