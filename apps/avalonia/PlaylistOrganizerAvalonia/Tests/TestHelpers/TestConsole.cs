using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.Tests
{
    /// <summary>
    /// Basit console test uygulaması
    /// </summary>
    class Program
    {
        static async Task Main(string[] args)
        {
            // Bu dosya artık kullanılmıyor - Program.cs zaten test desteği var
            Console.WriteLine("🧪 Test için: dotnet run -- --test-import");
        }
    }
}
