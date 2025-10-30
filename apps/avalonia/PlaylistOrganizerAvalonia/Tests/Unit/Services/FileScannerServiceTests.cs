using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;
using FluentAssertions;
using PlaylistOrganizerAvalonia.Application.Services;

namespace PlaylistOrganizerAvalonia.Tests
{
    /// <summary>
    /// File Scanner Service Tests
    /// </summary>
    public class FileScannerServiceTests
    {
        private readonly FileScannerService _scannerService;
        private readonly Mock<ILogger<FileScannerService>> _mockLogger;
        private readonly Mock<IConfiguration> _mockConfiguration;

        public FileScannerServiceTests()
        {
            _mockLogger = new Mock<ILogger<FileScannerService>>();
            _mockConfiguration = new Mock<IConfiguration>();
            
            // Mock configuration
            _mockConfiguration.Setup(c => c["ImportPaths:Music"]).Returns("/tmp/test/music");
            _mockConfiguration.Setup(c => c["ImportPaths:VirtualDJ"]).Returns("/tmp/test/vdj");
            _mockConfiguration.Setup(c => c["ImportPaths:PlaylistExtensions:0"]).Returns(".m3u");
            _mockConfiguration.Setup(c => c["ImportPaths:PlaylistExtensions:1"]).Returns(".vdjfolder");
            _mockConfiguration.Setup(c => c["ImportPaths:MusicExtensions:0"]).Returns(".mp3");
            _mockConfiguration.Setup(c => c["ImportPaths:MusicExtensions:1"]).Returns(".wav");
            
            _scannerService = new FileScannerService(_mockLogger.Object, _mockConfiguration.Object);
        }

        [Fact]
        public void Constructor_ShouldInitializeSuccessfully()
        {
            // Act & Assert
            _scannerService.Should().NotBeNull();
        }

        [Fact]
        public async Task ScanForPlaylistFilesAsync_WithValidDirectory_ShouldReturnFiles()
        {
            // Arrange
            var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            Directory.CreateDirectory(tempDir);
            
            var playlistFile1 = Path.Combine(tempDir, "playlist1.m3u");
            var playlistFile2 = Path.Combine(tempDir, "playlist2.vdjfolder");
            
            await File.WriteAllTextAsync(playlistFile1, "#EXTM3U\n/path/to/song.mp3");
            await File.WriteAllTextAsync(playlistFile2, "<?xml version=\"1.0\"?><VirtualDJ></VirtualDJ>");

            try
            {
                // Act
                var result = await _scannerService.ScanPlaylistFilesAsync();

                // Assert
                result.Should().NotBeNull();
                result.Should().HaveCount(2);
                result.Should().Contain(f => f.Name.EndsWith(".m3u"));
                result.Should().Contain(f => f.Name.EndsWith(".vdjfolder"));
            }
            finally
            {
                Directory.Delete(tempDir, true);
            }
        }

        [Fact]
        public async Task ScanForMusicFilesAsync_WithValidDirectory_ShouldReturnFiles()
        {
            // Arrange
            var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            Directory.CreateDirectory(tempDir);
            
            var musicFile1 = Path.Combine(tempDir, "song1.mp3");
            var musicFile2 = Path.Combine(tempDir, "song2.wav");
            
            await File.WriteAllTextAsync(musicFile1, "fake mp3 content");
            await File.WriteAllTextAsync(musicFile2, "fake wav content");

            try
            {
                // Act
                var result = await _scannerService.ScanMusicFilesAsync();

                // Assert
                result.Should().NotBeNull();
                result.Should().HaveCount(2);
                result.Should().Contain(f => f.Name.EndsWith(".mp3"));
                result.Should().Contain(f => f.Name.EndsWith(".wav"));
            }
            finally
            {
                Directory.Delete(tempDir, true);
            }
        }

        [Fact]
        public async Task ScanForPlaylistFilesAsync_WithEmptyDirectory_ShouldReturnEmptyList()
        {
            // Arrange
            var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            Directory.CreateDirectory(tempDir);

            try
            {
                // Act
                var result = await _scannerService.ScanPlaylistFilesAsync();

                // Assert
                result.Should().NotBeNull();
                result.Should().BeEmpty();
            }
            finally
            {
                Directory.Delete(tempDir, true);
            }
        }

        [Fact]
        public async Task ScanForPlaylistFilesAsync_WithInvalidDirectory_ShouldThrowException()
        {
            // Arrange
            var invalidPath = "/nonexistent/directory";

            // Act & Assert
            await Assert.ThrowsAsync<DirectoryNotFoundException>(() => 
                _scannerService.ScanPlaylistFilesAsync());
        }

        [Fact]
        public async Task ScanForPlaylistFilesAsync_WithNestedDirectories_ShouldScanRecursively()
        {
            // Arrange
            var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            var subDir = Path.Combine(tempDir, "subdir");
            
            Directory.CreateDirectory(tempDir);
            Directory.CreateDirectory(subDir);
            
            var playlistFile1 = Path.Combine(tempDir, "playlist1.m3u");
            var playlistFile2 = Path.Combine(subDir, "playlist2.m3u");
            
            await File.WriteAllTextAsync(playlistFile1, "#EXTM3U\n/path/to/song.mp3");
            await File.WriteAllTextAsync(playlistFile2, "#EXTM3U\n/path/to/song2.mp3");

            try
            {
                // Act
                var result = await _scannerService.ScanPlaylistFilesAsync();

                // Assert
                result.Should().NotBeNull();
                result.Should().HaveCount(2);
            }
            finally
            {
                Directory.Delete(tempDir, true);
            }
        }

        [Fact]
        public async Task ScanForPlaylistFilesAsync_WithExcludedExtensions_ShouldFilterCorrectly()
        {
            // Arrange
            var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            Directory.CreateDirectory(tempDir);
            
            var playlistFile = Path.Combine(tempDir, "playlist.m3u");
            var otherFile = Path.Combine(tempDir, "other.txt");
            
            await File.WriteAllTextAsync(playlistFile, "#EXTM3U\n/path/to/song.mp3");
            await File.WriteAllTextAsync(otherFile, "some content");

            try
            {
                // Act
                var result = await _scannerService.ScanPlaylistFilesAsync();

                // Assert
                result.Should().NotBeNull();
                result.Should().HaveCount(1);
                result.Should().OnlyContain(f => f.Name.EndsWith(".m3u"));
            }
            finally
            {
                Directory.Delete(tempDir, true);
            }
        }
    }
}
