using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using PlaylistOrganizerAvalonia.Infrastructure.Services;

namespace PlaylistOrganizerAvalonia.HealthChecks;

/// <summary>
/// Health check service interface - Clean Architecture
/// </summary>
public interface IHealthCheckService
{
    Task<HealthCheckResult> CheckDatabaseHealthAsync();
    Task<HealthCheckResult> CheckFileSystemHealthAsync();
    Task<HealthCheckResult> CheckApplicationHealthAsync();
    Task<HealthCheckResult> CheckOverallHealthAsync();
}

/// <summary>
/// Health check result
/// </summary>
public class HealthCheckResult
{
    public bool IsHealthy { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public TimeSpan Duration { get; set; }
    public Dictionary<string, object> Data { get; set; } = new();
}

/// <summary>
/// Health check service implementation
/// </summary>
public class HealthCheckService : IHealthCheckService
{
    private readonly IDatabaseManager _databaseManager;
    private readonly ILoggingService _loggingService;

    public HealthCheckService(IDatabaseManager databaseManager, ILoggingService loggingService)
    {
        _databaseManager = databaseManager;
        _loggingService = loggingService;
    }

    public async Task<HealthCheckResult> CheckDatabaseHealthAsync()
    {
        var startTime = DateTime.UtcNow;
        
        try
        {
            var isConnected = await _databaseManager.TestConnectionAsync();
            var duration = DateTime.UtcNow - startTime;
            
            return new HealthCheckResult
            {
                IsHealthy = isConnected,
                Status = isConnected ? "Healthy" : "Unhealthy",
                Message = isConnected ? "Database connection successful" : "Database connection failed",
                Duration = duration,
                Data = { ["ConnectionTest"] = isConnected }
            };
        }
        catch (Exception ex)
        {
            var duration = DateTime.UtcNow - startTime;
            _loggingService.LogError($"Database health check failed: {ex.Message}", ex);
            
            return new HealthCheckResult
            {
                IsHealthy = false,
                Status = "Unhealthy",
                Message = $"Database health check failed: {ex.Message}",
                Duration = duration,
                Data = { ["Exception"] = ex.Message }
            };
        }
    }

    public async Task<HealthCheckResult> CheckFileSystemHealthAsync()
    {
        var startTime = DateTime.UtcNow;
        
        try
        {
            var databasePath = "/Users/koray/projects/PlaylistOrganizer-py-backup/PlaylistOrganizerAvalonia/musicfiles.db";
            var fileExists = await Task.Run(() => File.Exists(databasePath));
            var fileSize = fileExists ? await Task.Run(() => new FileInfo(databasePath).Length) : 0;
            var duration = DateTime.UtcNow - startTime;
            
            return new HealthCheckResult
            {
                IsHealthy = fileExists,
                Status = fileExists ? "Healthy" : "Unhealthy",
                Message = fileExists ? "Database file exists and accessible" : "Database file not found",
                Duration = duration,
                Data = { 
                    ["FileExists"] = fileExists,
                    ["FileSize"] = fileSize,
                    ["FilePath"] = databasePath
                }
            };
        }
        catch (Exception ex)
        {
            var duration = DateTime.UtcNow - startTime;
            _loggingService.LogError($"File system health check failed: {ex.Message}", ex);
            
            return new HealthCheckResult
            {
                IsHealthy = false,
                Status = "Unhealthy",
                Message = $"File system health check failed: {ex.Message}",
                Duration = duration,
                Data = { ["Exception"] = ex.Message }
            };
        }
    }

    public async Task<HealthCheckResult> CheckApplicationHealthAsync()
    {
        var startTime = DateTime.UtcNow;
        
        try
        {
            // Check memory usage
            var memoryUsage = await Task.Run(() => GC.GetTotalMemory(false));
            var duration = DateTime.UtcNow - startTime;
            
            return new HealthCheckResult
            {
                IsHealthy = true,
                Status = "Healthy",
                Message = "Application is running normally",
                Duration = duration,
                Data = { 
                    ["MemoryUsage"] = memoryUsage,
                    ["Uptime"] = Environment.TickCount64
                }
            };
        }
        catch (Exception ex)
        {
            var duration = DateTime.UtcNow - startTime;
            _loggingService.LogError($"Application health check failed: {ex.Message}", ex);
            
            return new HealthCheckResult
            {
                IsHealthy = false,
                Status = "Unhealthy",
                Message = $"Application health check failed: {ex.Message}",
                Duration = duration,
                Data = { ["Exception"] = ex.Message }
            };
        }
    }

    public async Task<HealthCheckResult> CheckOverallHealthAsync()
    {
        var startTime = DateTime.UtcNow;
        
        try
        {
            var databaseHealth = await CheckDatabaseHealthAsync();
            var fileSystemHealth = await CheckFileSystemHealthAsync();
            var applicationHealth = await CheckApplicationHealthAsync();
            
            var overallHealthy = databaseHealth.IsHealthy && fileSystemHealth.IsHealthy && applicationHealth.IsHealthy;
            var duration = DateTime.UtcNow - startTime;
            
            return new HealthCheckResult
            {
                IsHealthy = overallHealthy,
                Status = overallHealthy ? "Healthy" : "Unhealthy",
                Message = overallHealthy ? "All systems are healthy" : "Some systems are unhealthy",
                Duration = duration,
                Data = { 
                    ["Database"] = databaseHealth.Status,
                    ["FileSystem"] = fileSystemHealth.Status,
                    ["Application"] = applicationHealth.Status
                }
            };
        }
        catch (Exception ex)
        {
            var duration = DateTime.UtcNow - startTime;
            _loggingService.LogError($"Overall health check failed: {ex.Message}", ex);
            
            return new HealthCheckResult
            {
                IsHealthy = false,
                Status = "Unhealthy",
                Message = $"Overall health check failed: {ex.Message}",
                Duration = duration,
                Data = { ["Exception"] = ex.Message }
            };
        }
    }
}
