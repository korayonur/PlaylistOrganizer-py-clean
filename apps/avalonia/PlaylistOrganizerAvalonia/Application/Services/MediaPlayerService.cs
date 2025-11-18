using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// Cross-platform media player service for playing audio files
    /// </summary>
    public class MediaPlayerService
    {
        private readonly ILogger<MediaPlayerService> _logger;
        private Process? _currentPlayerProcess;

        public MediaPlayerService(ILogger<MediaPlayerService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Play an audio file using the system's default media player
        /// </summary>
        public void PlayFile(string filePath)
        {
            if (string.IsNullOrEmpty(filePath))
            {
                _logger.LogWarning("PlayFile called with empty file path");
                return;
            }

            if (!File.Exists(filePath))
            {
                _logger.LogWarning($"File not found: {filePath}");
                return;
            }

            try
            {
                // Stop current player if playing
                Stop();

                _logger.LogDebug($"Playing file: {filePath}");

                if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                {
                    // Windows: Use start command
                    _currentPlayerProcess = Process.Start(new ProcessStartInfo
                    {
                        FileName = "cmd",
                        Arguments = $"/c start \"\" \"{filePath}\"",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    });
                }
                else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
                {
                    // macOS: Use open command with full path - quote the path for spaces
                    _currentPlayerProcess = Process.Start(new ProcessStartInfo
                    {
                        FileName = "/usr/bin/open",
                        Arguments = $"\"{filePath}\"", // Quote path to handle spaces
                        UseShellExecute = false
                    });
                }
                else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
                {
                    // Linux: Try xdg-open first, fallback to other players
                    try
                    {
                        _currentPlayerProcess = Process.Start(new ProcessStartInfo
                        {
                            FileName = "xdg-open",
                            Arguments = $"\"{filePath}\"",
                            UseShellExecute = false
                        });
                    }
                    catch
                    {
                        // Fallback to common Linux players
                        var players = new[] { "vlc", "mplayer", "mpv", "totem" };
                        foreach (var player in players)
                        {
                            try
                            {
                                _currentPlayerProcess = Process.Start(new ProcessStartInfo
                                {
                                    FileName = player,
                                    Arguments = $"\"{filePath}\"",
                                    UseShellExecute = false
                                });
                                break;
                            }
                            catch
                            {
                                continue;
                            }
                        }
                    }
                }

                if (_currentPlayerProcess != null)
                {
                    _logger.LogDebug($"Media player started: PID={_currentPlayerProcess.Id}");
                }
                else
                {
                    _logger.LogWarning("Failed to start media player");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error playing file: {filePath}");
            }
        }

        /// <summary>
        /// Stop the current media player
        /// </summary>
        public void Stop()
        {
            try
            {
                if (_currentPlayerProcess != null && !_currentPlayerProcess.HasExited)
                {
                    _logger.LogDebug($"Stopping media player: PID={_currentPlayerProcess.Id}");
                    _currentPlayerProcess.Kill();
                    _currentPlayerProcess.Dispose();
                    _currentPlayerProcess = null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error stopping media player");
            }
        }

        /// <summary>
        /// Check if a file is currently playing
        /// </summary>
        public bool IsPlaying => _currentPlayerProcess != null && !_currentPlayerProcess.HasExited;

        public void Pause()
        {
            _logger.LogDebug("Pausing media player...");
            // Sistem player'ında pause desteği yok, sadece log
            _logger.LogDebug("Pause not supported for system player");
        }

        /// <summary>
        /// Dispose resources
        /// </summary>
        public void Dispose()
        {
            Stop();
        }
    }
}

