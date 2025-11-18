using Avalonia.Controls;
using PlaylistOrganizerAvalonia.ViewModels;

namespace PlaylistOrganizerAvalonia.Views
{
    public partial class FixSuggestionsDialog : Window
    {
        public FixSuggestionsDialog()
        {
            InitializeComponent();
        }

        public FixSuggestionsDialog(FixSuggestionsViewModel viewModel) : this()
        {
            DataContext = viewModel;
            
            // CloseRequested event'ine dialog kapatma işlevi ekle
            viewModel.CloseRequested += (s, e) => Close();
        }
    }
}

