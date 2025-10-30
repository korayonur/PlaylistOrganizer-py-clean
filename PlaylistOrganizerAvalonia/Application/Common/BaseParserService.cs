using System.IO;
using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Shared.Services;

namespace PlaylistOrganizerAvalonia.Application.Common
{
    /// <summary>
    /// Base service class for parser services
    /// </summary>
    public abstract class BaseParserService : BaseService
    {
        protected BaseParserService(ILogger logger) : base(logger) { }

        /// <summary>
        /// Normalize file name using centralized service
        /// </summary>
        protected string NormalizeFileName(string fileName)
        {
            return StringNormalizationService.NormalizeFileName(fileName);
        }

        /// <summary>
        /// Read file content asynchronously with error handling
        /// </summary>
        protected async Task<string> ReadFileAsync(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException($"File not found: {filePath}");

            try
            {
                LogDebug($"Reading file: {filePath}");
                var content = await File.ReadAllTextAsync(filePath);
                LogDebug($"Successfully read file: {filePath} ({content.Length} characters)");
                return content;
            }
            catch (Exception ex)
            {
                LogError(ex, $"Failed to read file: {filePath}");
                throw;
            }
        }

        /// <summary>
        /// Validate file path
        /// </summary>
        protected bool IsValidFilePath(string filePath)
        {
            return !string.IsNullOrEmpty(filePath) && File.Exists(filePath);
        }

        /// <summary>
        /// Get file extension in lowercase
        /// </summary>
        protected string GetFileExtension(string filePath)
        {
            return Path.GetExtension(filePath).ToLowerInvariant();
        }
    }
}
