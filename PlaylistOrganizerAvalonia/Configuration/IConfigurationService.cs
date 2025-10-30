using Microsoft.Extensions.Configuration;
using System;

namespace PlaylistOrganizerAvalonia.Configuration;

/// <summary>
/// Configuration service interface - Clean Architecture
/// </summary>
public interface IConfigurationService
{
    string GetConnectionString();
    string GetDatabasePath();
    bool GetEnableLogging();
    string GetLogLevel();
    int GetMaxRetryAttempts();
    TimeSpan GetTimeout();
}

/// <summary>
/// Configuration service implementation
/// </summary>
public class ConfigurationService : IConfigurationService
{
    private readonly IConfiguration _configuration;

    public ConfigurationService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GetConnectionString()
    {
        return _configuration.GetConnectionString("DefaultConnection") 
               ?? "Data Source=playlistorganizer.db";
    }

    public string GetDatabasePath()
    {
        return _configuration["Database:Path"] 
               ?? "/Users/koray/projects/PlaylistOrganizer-py-backup/PlaylistOrganizerAvalonia/playlistorganizer.db";
    }

    public bool GetEnableLogging()
    {
        return _configuration.GetValue<bool>("Logging:Enabled", true);
    }

    public string GetLogLevel()
    {
        return _configuration["Logging:Level"] ?? "Information";
    }

    public int GetMaxRetryAttempts()
    {
        return _configuration.GetValue<int>("Database:MaxRetryAttempts", 3);
    }

    public TimeSpan GetTimeout()
    {
        var timeoutSeconds = _configuration.GetValue<int>("Database:TimeoutSeconds", 30);
        return TimeSpan.FromSeconds(timeoutSeconds);
    }
}
