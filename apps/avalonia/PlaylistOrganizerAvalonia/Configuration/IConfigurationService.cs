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
    
    // Lemon Squeezy Configuration
    string GetLemonSqueezyApiKey();
    string GetLemonSqueezyApiUrl();
    string GetLemonSqueezyCheckoutUrl();
    
    // RSA Public Key Configuration (for token signature verification)
    // Client-Only Mode: If both UseMockRsaKey=false and RsaPublicKeyPem=null, signature verification is disabled
    string? GetRsaPublicKeyPem();
    bool GetUseMockRsaKey();
    bool IsProductionEnvironment();
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
    
    // Lemon Squeezy Configuration
    public string GetLemonSqueezyApiKey()
    {
        // Önce environment variable'dan oku (production için güvenli)
        var envKey = Environment.GetEnvironmentVariable("LEMONSQUEEZY_API_KEY");
        if (!string.IsNullOrEmpty(envKey))
        {
            return envKey;
        }
        
        // Sonra configuration'dan oku (development için fallback)
        return _configuration["LemonSqueezy:ApiKey"] ?? string.Empty;
    }
    
    public string GetLemonSqueezyApiUrl()
    {
        return _configuration["LemonSqueezy:ApiUrl"] ?? "https://api.lemonsqueezy.com/v1";
    }
    
    public string GetLemonSqueezyCheckoutUrl()
    {
        return _configuration["LemonSqueezy:CheckoutUrl"] ?? string.Empty;
    }
    
    // RSA Public Key Configuration
    public string? GetRsaPublicKeyPem()
    {
        return _configuration["Security:RsaPublicKeyPem"];
    }
    
    public bool GetUseMockRsaKey()
    {
        // Production environment'da ve public key varsa mock key kullanma
        var env = GetApplicationEnvironment();
        var publicKey = GetRsaPublicKeyPem();
        
        // Production'da public key varsa mock key kullanma
        if (env == "Production" && !string.IsNullOrEmpty(publicKey))
        {
            return false;
        }
        
        // Debug/Development'da veya public key yoksa mock key kullan (test için)
        return _configuration.GetValue<bool>("Security:UseMockRsaKey", true);
    }
    
    public bool IsProductionEnvironment()
    {
        var env = GetApplicationEnvironment();
        return env == "Production";
    }
    
    private string GetApplicationEnvironment()
    {
        return _configuration["Application:Environment"] ?? "Development";
    }
}
