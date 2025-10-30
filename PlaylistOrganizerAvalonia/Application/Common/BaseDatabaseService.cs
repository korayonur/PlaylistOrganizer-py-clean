using Microsoft.Extensions.Logging;
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.Application.Common
{
    /// <summary>
    /// Base service class for services that need database access
    /// </summary>
    public abstract class BaseDatabaseService : BaseService
    {
        protected readonly IDatabaseManager DatabaseManager;

        protected BaseDatabaseService(ILogger logger, IDatabaseManager databaseManager)
            : base(logger)
        {
            DatabaseManager = databaseManager ?? throw new ArgumentNullException(nameof(databaseManager));
        }

        /// <summary>
        /// Execute database operation with error handling
        /// </summary>
        protected async Task<T> ExecuteDatabaseOperationAsync<T>(Func<Task<T>> operation, string operationName)
        {
            try
            {
                LogDebug($"Starting database operation: {operationName}");
                var result = await operation();
                LogDebug($"Completed database operation: {operationName}");
                return result;
            }
            catch (Exception ex)
            {
                LogError(ex, $"Database operation failed: {operationName}");
                throw;
            }
        }

        /// <summary>
        /// Execute database operation without return value
        /// </summary>
        protected async Task ExecuteDatabaseOperationAsync(Func<Task> operation, string operationName)
        {
            try
            {
                LogDebug($"Starting database operation: {operationName}");
                await operation();
                LogDebug($"Completed database operation: {operationName}");
            }
            catch (Exception ex)
            {
                LogError(ex, $"Database operation failed: {operationName}");
                throw;
            }
        }
    }
}
