using Microsoft.Maui.Controls;

namespace PlaylistOrganizer.Maui;

public partial class App : Microsoft.Maui.Controls.Application
{
	public App()
	{
		InitializeComponent();

		MainPage = new AppShell();
	}
}
