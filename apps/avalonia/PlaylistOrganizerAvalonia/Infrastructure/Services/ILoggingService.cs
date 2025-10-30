using Microsoft.Extensions.Logging;
using System;

namespace PlaylistOrganizerAvalonia.Infrastructure.Services;

/// <summary>
/// Logging service interface - Clean Architecture
/// </summary>
public interface ILoggingService
{
    void LogInformation(string message);
    void LogWarning(string message);
    void LogError(string message, Exception? exception = null);
    void LogDebug(string message);
    void LogCritical(string message, Exception? exception = null);
}

/// <summary>
/// Console logging implementation
/// </summary>
public class ConsoleLoggingService : ILoggingService
{
    private readonly ILogger<ConsoleLoggingService> _logger;

    public ConsoleLoggingService(ILogger<ConsoleLoggingService> logger)
    {
        _logger = logger;
    }

    public void LogInformation(string message)
    {
        _logger.LogInformation(message);
        Console.WriteLine($"[INFO] {DateTime.Now:HH:mm:ss} - {message}");
    }

    public void LogWarning(string message)
    {
        _logger.LogWarning(message);
        Console.WriteLine($"[WARN] {DateTime.Now:HH:mm:ss} - {message}");
    }

    public void LogError(string message, Exception? exception = null)
    {
        _logger.LogError(exception, message);
        Console.WriteLine($"[ERROR] {DateTime.Now:HH:mm:ss} - {message}");
        if (exception != null)
        {
            Console.WriteLine($"Exception: {exception.Message}");
            Console.WriteLine($"Stack Trace: {exception.StackTrace}");
        }
    }

    public void LogDebug(string message)
    {
        _logger.LogDebug(message);
        Console.WriteLine($"[DEBUG] {DateTime.Now:HH:mm:ss} - {message}");
    }

    public void LogCritical(string message, Exception? exception = null)
    {
        _logger.LogCritical(exception, message);
        Console.WriteLine($"[CRITICAL] {DateTime.Now:HH:mm:ss} - {message}");
        if (exception != null)
        {
            Console.WriteLine($"Exception: {exception.Message}");
            Console.WriteLine($"Stack Trace: {exception.StackTrace}");
        }
    }
}
