using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using FluentAssertions;
using PlaylistOrganizerAvalonia.Application.Services;
using PlaylistOrganizerAvalonia.Domain.Entities;
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.Tests
{
    /// <summary>
    /// M3U Parser Service Tests
    /// </summary>
    public class M3UParserServiceTests
    {
        private readonly M3UParserService _parserService;
        private readonly Mock<ILogger<M3UParserService>> _mockLogger;

        public M3UParserServiceTests()
        {
            _mockLogger = new Mock<ILogger<M3UParserService>>();
            _parserService = new M3UParserService(_mockLogger.Object);
        }

        [Fact]
        public void Constructor_ShouldInitializeSuccessfully()
        {
            // Act & Assert
            _parserService.Should().NotBeNull();
        }

        [Fact]
        public async Task ParseM3UFileAsync_WithValidFile_ShouldReturnTracks()
        {
            // Arrange
            var testM3UContent = @"#EXTM3U
#EXTINF:123,Test Song 1
/path/to/song1.mp3
#EXTINF:456,Test Song 2
/path/to/song2.mp3";
            
            var tempFile = Path.GetTempFileName();
            await File.WriteAllTextAsync(tempFile, testM3UContent);

            try
            {
                // Act
                var result = await _parserService.ParseM3UFileAsync(tempFile);

                // Assert
                result.Should().NotBeNull();
                result.Should().HaveCount(2);
                result[0].OriginalPath.Should().Be("/path/to/song1.mp3");
                result[1].OriginalPath.Should().Be("/path/to/song2.mp3");
            }
            finally
            {
                File.Delete(tempFile);
            }
        }

        [Fact]
        public async Task ParseM3UFileAsync_WithEmptyFile_ShouldReturnEmptyList()
        {
            // Arrange
            var tempFile = Path.GetTempFileName();
            await File.WriteAllTextAsync(tempFile, "");

            try
            {
                // Act
                var result = await _parserService.ParseM3UFileAsync(tempFile);

                // Assert
                result.Should().NotBeNull();
                result.Should().BeEmpty();
            }
            finally
            {
                File.Delete(tempFile);
            }
        }

        [Fact]
        public async Task ParseM3UFileAsync_WithInvalidFile_ShouldThrowException()
        {
            // Arrange
            var invalidPath = "/nonexistent/file.m3u";

            // Act & Assert
            await Assert.ThrowsAsync<FileNotFoundException>(() => 
                _parserService.ParseM3UFileAsync(invalidPath));
        }

        [Fact]
        public async Task ParseM3UFileAsync_WithMetadata_ShouldParseCorrectly()
        {
            // Arrange
            var testM3UContent = @"#EXTM3U
#EXTINF:123,Artist - Title
#EXTVDJ:Genre=Electronic;BPM=128
/path/to/song.mp3";
            
            var tempFile = Path.GetTempFileName();
            await File.WriteAllTextAsync(tempFile, testM3UContent);

            try
            {
                // Act
                var result = await _parserService.ParseM3UFileAsync(tempFile);

                // Assert
                result.Should().NotBeNull();
                result.Should().HaveCount(1);
                result[0].OriginalPath.Should().Be("/path/to/song.mp3");
            }
            finally
            {
                File.Delete(tempFile);
            }
        }

        [Fact]
        public async Task ParseM3UFileAsync_WithSpecialCharacters_ShouldHandleCorrectly()
        {
            // Arrange
            var testM3UContent = @"#EXTM3U
#EXTINF:123,Şarkı - Türkçe Karakterler
/path/to/şarkı.mp3";
            
            var tempFile = Path.GetTempFileName();
            await File.WriteAllTextAsync(tempFile, testM3UContent);

            try
            {
                // Act
                var result = await _parserService.ParseM3UFileAsync(tempFile);

                // Assert
                result.Should().NotBeNull();
                result.Should().HaveCount(1);
                result[0].OriginalPath.Should().Be("/path/to/şarkı.mp3");
            }
            finally
            {
                File.Delete(tempFile);
            }
        }
    }
}
