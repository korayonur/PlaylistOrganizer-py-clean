using Microsoft.Extensions.Logging;
using System;
using System.IO;

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
    void LogSqlDebug(string message);
}

/// <summary>
/// Console logging implementation
/// </summary>
public class ConsoleLoggingService : ILoggingService
{
    private readonly ILogger<ConsoleLoggingService> _logger;
    private readonly string? _filterDebugLogPath;
    private readonly string? _sqlDebugLogPath;

    public ConsoleLoggingService(ILogger<ConsoleLoggingService> logger)
    {
        _logger = logger;
        
        // Log dizini oluştur
        try
        {
            var logsDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs");
            if (!Directory.Exists(logsDir))
            {
                Directory.CreateDirectory(logsDir);
            }
            
            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            
            // Filter debug log dosyası için path oluştur
            _filterDebugLogPath = Path.Combine(logsDir, $"filter-debug-{timestamp}.log");
            Console.WriteLine($"[INFO] Filter debug log file will be written to: {_filterDebugLogPath}");
            
            // SQL debug log dosyası için path oluştur
            _sqlDebugLogPath = Path.Combine(logsDir, $"sql-debug-{timestamp}.log");
            Console.WriteLine($"[INFO] SQL debug log file will be written to: {_sqlDebugLogPath}");
        }
        catch (Exception ex)
        {
            // Log dizini oluşturulamazsa file logging devre dışı kalır
            _filterDebugLogPath = null;
            _sqlDebugLogPath = null;
            Console.WriteLine($"[WARN] Failed to create log directory: {ex.Message}");
            Console.WriteLine($"[WARN] StackTrace: {ex.StackTrace}");
        }
    }

    private void WriteToFile(string level, string message, Exception? exception = null, string? logPath = null)
    {
        var targetPath = logPath ?? _filterDebugLogPath;
        if (targetPath == null) return;

        try
        {
            var logLine = $"[{level}] {DateTime.Now:yyyy-MM-dd HH:mm:ss.fff} - {message}";
            if (exception != null)
            {
                logLine += $"\nException: {exception.Message}";
                if (exception.StackTrace != null)
                {
                    logLine += $"\nStack Trace: {exception.StackTrace}";
                }
            }
            logLine += Environment.NewLine;

            File.AppendAllText(targetPath, logLine);
        }
        catch (Exception ex)
        {
            // File yazma hatasını console'a yazdır
            Console.WriteLine($"[ERROR] Failed to write to log file '{targetPath}': {ex.Message}");
            Console.WriteLine($"[ERROR] Original message: {message}");
        }
    }
    
    private void WriteSqlToFile(string message)
    {
        if (_sqlDebugLogPath == null) return;
        WriteToFile("SQL", message, null, _sqlDebugLogPath);
    }

    public void LogInformation(string message)
    {
        _logger.LogInformation(message);
        var formattedMessage = $"[INFO] {DateTime.Now:HH:mm:ss} - {message}";
        Console.WriteLine(formattedMessage);
        WriteToFile("INFO", message);
    }

    public void LogWarning(string message)
    {
        _logger.LogWarning(message);
        var formattedMessage = $"[WARN] {DateTime.Now:HH:mm:ss} - {message}";
        Console.WriteLine(formattedMessage);
        WriteToFile("WARN", message);
    }

    public void LogError(string message, Exception? exception = null)
    {
        _logger.LogError(exception, message);
        var formattedMessage = $"[ERROR] {DateTime.Now:HH:mm:ss} - {message}";
        Console.WriteLine(formattedMessage);
        if (exception != null)
        {
            Console.WriteLine($"Exception: {exception.Message}");
            Console.WriteLine($"Stack Trace: {exception.StackTrace}");
        }
        WriteToFile("ERROR", message, exception);
    }

    public void LogDebug(string message)
    {
        _logger.LogDebug(message);
        var formattedMessage = $"[DEBUG] {DateTime.Now:HH:mm:ss} - {message}";
        Console.WriteLine(formattedMessage);
        WriteToFile("DEBUG", message);
    }

    public void LogCritical(string message, Exception? exception = null)
    {
        _logger.LogCritical(exception, message);
        var formattedMessage = $"[CRITICAL] {DateTime.Now:HH:mm:ss} - {message}";
        Console.WriteLine(formattedMessage);
        if (exception != null)
        {
            Console.WriteLine($"Exception: {exception.Message}");
            Console.WriteLine($"Stack Trace: {exception.StackTrace}");
        }
        WriteToFile("CRITICAL", message, exception);
    }

    public void LogSqlDebug(string message)
    {
        var formattedMessage = $"[SQL DEBUG] {DateTime.Now:HH:mm:ss} - {message}";
        Console.WriteLine(formattedMessage);
        WriteSqlToFile(message);
    }
}
