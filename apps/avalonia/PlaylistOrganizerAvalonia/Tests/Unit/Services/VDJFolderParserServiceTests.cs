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

namespace PlaylistOrganizerAvalonia.Tests
{
    /// <summary>
    /// VDJFolder Parser Service Tests
    /// </summary>
    public class VDJFolderParserServiceTests
    {
        private readonly VDJFolderParserService _parserService;
        private readonly Mock<ILogger<VDJFolderParserService>> _mockLogger;

        public VDJFolderParserServiceTests()
        {
            _mockLogger = new Mock<ILogger<VDJFolderParserService>>();
            _parserService = new VDJFolderParserService(_mockLogger.Object);
        }

        [Fact]
        public void Constructor_ShouldInitializeSuccessfully()
        {
            // Act & Assert
            _parserService.Should().NotBeNull();
        }

        [Fact]
        public async Task ParseVDJFolderAsync_WithValidFile_ShouldReturnTracks()
        {
            // Arrange
            var testVDJContent = @"<?xml version=""1.0"" encoding=""UTF-8""?>
<VirtualDJ>
    <Song>
        <File>/path/to/song1.mp3</File>
        <Title>Test Song 1</Title>
        <Artist>Test Artist</Artist>
    </Song>
    <Song>
        <File>/path/to/song2.mp3</File>
        <Title>Test Song 2</Title>
        <Artist>Test Artist</Artist>
    </Song>
</VirtualDJ>";
            
            var tempFile = Path.GetTempFileName();
            await File.WriteAllTextAsync(tempFile, testVDJContent);

            try
            {
                // Act
                var result = await _parserService.ParseVDJFolderAsync(tempFile);

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
        public async Task ParseVDJFolderAsync_WithEmptyFile_ShouldReturnEmptyList()
        {
            // Arrange
            var tempFile = Path.GetTempFileName();
            await File.WriteAllTextAsync(tempFile, "");

            try
            {
                // Act
                var result = await _parserService.ParseVDJFolderAsync(tempFile);

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
        public async Task ParseVDJFolderAsync_WithInvalidFile_ShouldThrowException()
        {
            // Arrange
            var invalidPath = "/nonexistent/file.vdjfolder";

            // Act & Assert
            await Assert.ThrowsAsync<FileNotFoundException>(() => 
                _parserService.ParseVDJFolderAsync(invalidPath));
        }

        [Fact]
        public async Task ParseVDJFolderAsync_WithInvalidXML_ShouldHandleGracefully()
        {
            // Arrange
            var invalidXML = @"<?xml version=""1.0"" encoding=""UTF-8""?>
<VirtualDJ>
    <Song>
        <File>/path/to/song.mp3</File>
        <!-- Missing closing tag -->
    </Song>
</VirtualDJ>";
            
            var tempFile = Path.GetTempFileName();
            await File.WriteAllTextAsync(tempFile, invalidXML);

            try
            {
                // Act
                var result = await _parserService.ParseVDJFolderAsync(tempFile);

                // Assert
                result.Should().NotBeNull();
                // Should handle gracefully, might return empty or partial results
            }
            finally
            {
                File.Delete(tempFile);
            }
        }

        [Fact]
        public async Task ParseVDJFolderAsync_WithMetadata_ShouldParseCorrectly()
        {
            // Arrange
            var testVDJContent = @"<?xml version=""1.0"" encoding=""UTF-8""?>
<VirtualDJ>
    <Song>
        <File>/path/to/song.mp3</File>
        <Title>Test Song</Title>
        <Artist>Test Artist</Artist>
        <Genre>Electronic</Genre>
        <BPM>128</BPM>
    </Song>
</VirtualDJ>";
            
            var tempFile = Path.GetTempFileName();
            await File.WriteAllTextAsync(tempFile, testVDJContent);

            try
            {
                // Act
                var result = await _parserService.ParseVDJFolderAsync(tempFile);

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
        public async Task ParseVDJFolderAsync_WithSpecialCharacters_ShouldHandleCorrectly()
        {
            // Arrange
            var testVDJContent = @"<?xml version=""1.0"" encoding=""UTF-8""?>
<VirtualDJ>
    <Song>
        <File>/path/to/şarkı.mp3</File>
        <Title>Şarkı - Türkçe Karakterler</Title>
        <Artist>Sanatçı</Artist>
    </Song>
</VirtualDJ>";
            
            var tempFile = Path.GetTempFileName();
            await File.WriteAllTextAsync(tempFile, testVDJContent);

            try
            {
                // Act
                var result = await _parserService.ParseVDJFolderAsync(tempFile);

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
