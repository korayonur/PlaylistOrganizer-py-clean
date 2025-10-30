using System;
using System.IO;
using System.Threading.Tasks;
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.Exceptions;

/// <summary>
/// Global exception handler - Clean Architecture
/// </summary>
public interface IExceptionHandler
{
    Task HandleExceptionAsync(Exception exception, string context = "");
    void HandleException(Exception exception, string context = "");
}

/// <summary>
/// Exception handler implementation
/// </summary>
public class ExceptionHandler : IExceptionHandler
{
    private readonly ILoggingService _loggingService;

    public ExceptionHandler(ILoggingService loggingService)
    {
        _loggingService = loggingService;
    }

    public async Task HandleExceptionAsync(Exception exception, string context = "")
    {
        await Task.Run(() => HandleException(exception, context));
    }

    public void HandleException(Exception exception, string context = "")
    {
        var contextInfo = string.IsNullOrEmpty(context) ? "" : $" Context: {context}";
        
        switch (exception)
        {
            case ArgumentNullException argNullEx:
                _loggingService.LogError($"Argument null exception{contextInfo}: {argNullEx.ParamName}", argNullEx);
                break;
            case ArgumentException argEx:
                _loggingService.LogError($"Argument exception{contextInfo}: {argEx.Message}", argEx);
                break;
            case InvalidOperationException invalidOpEx:
                _loggingService.LogError($"Invalid operation{contextInfo}: {invalidOpEx.Message}", invalidOpEx);
                break;
            case System.Data.Common.DbException dbEx:
                _loggingService.LogError($"Database exception{contextInfo}: {dbEx.Message}", dbEx);
                break;
            case FileNotFoundException fileEx:
                _loggingService.LogError($"File not found{contextInfo}: {fileEx.FileName}", fileEx);
                break;
            case UnauthorizedAccessException authEx:
                _loggingService.LogError($"Unauthorized access{contextInfo}: {authEx.Message}", authEx);
                break;
            case OutOfMemoryException memoryEx:
                _loggingService.LogCritical($"Out of memory{contextInfo}: {memoryEx.Message}", memoryEx);
                break;
            default:
                _loggingService.LogError($"Unexpected exception{contextInfo}: {exception.Message}", exception);
                break;
        }
    }
}

/// <summary>
/// Custom exceptions for the application
/// </summary>
public class PlaylistOrganizerException : Exception
{
    public PlaylistOrganizerException(string message) : base(message) { }
    public PlaylistOrganizerException(string message, Exception innerException) : base(message, innerException) { }
}

public class DatabaseConnectionException : PlaylistOrganizerException
{
    public DatabaseConnectionException(string message) : base(message) { }
    public DatabaseConnectionException(string message, Exception innerException) : base(message, innerException) { }
}

public class PlaylistNotFoundException : PlaylistOrganizerException
{
    public PlaylistNotFoundException(int playlistId) : base($"Playlist with ID {playlistId} not found") { }
}

public class TrackNotFoundException : PlaylistOrganizerException
{
    public TrackNotFoundException(int trackId) : base($"Track with ID {trackId} not found") { }
}
