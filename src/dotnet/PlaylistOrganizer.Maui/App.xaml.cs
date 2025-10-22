using MauiApp = Microsoft.Maui.Controls.Application;

namespace PlaylistOrganizer.Maui;

public partial class App : MauiApp
{
	public App()
	{
		InitializeComponent();

		MainPage = new AppShell();
	}
}
