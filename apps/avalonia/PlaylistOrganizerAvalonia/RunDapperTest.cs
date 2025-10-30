using System;
using System.Threading.Tasks;

namespace PlaylistOrganizerAvalonia
{
    public class DapperTestEntry
    {
        public static async Task Main(string[] args)
        {
            Console.WriteLine("🧪 Dapper Import Test Runner");
            Console.WriteLine("=".PadRight(50, '='));
            
            await PlaylistOrganizerAvalonia.Tests.DapperImportTest.TestDapperImportAsync();
        }
    }
}

