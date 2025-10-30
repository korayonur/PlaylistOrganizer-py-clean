using Microsoft.Extensions.Logging;

namespace PlaylistOrganizerAvalonia.Application.Common
{
    /// <summary>
    /// Base service class with common logging functionality
    /// </summary>
    public abstract class BaseService
    {
        protected readonly ILogger _logger;

        protected BaseService(ILogger logger)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Log error with exception
        /// </summary>
        protected void LogError(Exception ex, string message)
            => _logger.LogError(ex, message);

        /// <summary>
        /// Log information message
        /// </summary>
        protected void LogInfo(string message)
            => _logger.LogInformation(message);
        
        /// <summary>
        /// Log information message with parameter
        /// </summary>
        protected void LogInformation(string message)
            => _logger.LogInformation(message);

        /// <summary>
        /// Log debug message
        /// </summary>
        protected void LogDebug(string message)
            => _logger.LogDebug(message);

        /// <summary>
        /// Log warning message with exception
        /// </summary>
        protected void LogWarning(Exception ex, string message)
            => _logger.LogWarning(ex, message);

        /// <summary>
        /// Log warning message
        /// </summary>
        protected void LogWarning(string message)
            => _logger.LogWarning(message);
    }
}
