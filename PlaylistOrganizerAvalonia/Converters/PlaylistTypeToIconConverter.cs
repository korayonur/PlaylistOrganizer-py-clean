using System;
using System.Globalization;
using Avalonia.Data.Converters;
using PlaylistOrganizerAvalonia.Domain.Enums;

namespace PlaylistOrganizerAvalonia.Converters;

/// <summary>
/// PlaylistType ve ParentId'ye göre ikon döndüren converter
/// </summary>
public class PlaylistTypeToIconConverter : IValueConverter
{
    public static readonly PlaylistTypeToIconConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is PlaylistType playlistType)
        {
            return playlistType switch
            {
                PlaylistType.Playlist => "🎵",           // M3U Playlist - Müzik notu
                PlaylistType.VDJFolder => "📂",     // VDJ Folder - Açık klasör
                PlaylistType.Folder => "📁",       // Folder - Klasör
                PlaylistType.Root => "🏠",         // Root - Ev ikonu
                _ => "📄"                          // Default - Dosya
            };
        }
        return "📄";
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

/// <summary>
/// PlaylistType ve ParentId'ye göre renk döndüren converter
/// </summary>
public class PlaylistTypeToColorConverter : IValueConverter
{
    public static readonly PlaylistTypeToColorConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is PlaylistType playlistType)
        {
            return playlistType switch
            {
                PlaylistType.Playlist => "Orange",        // M3U Playlist - Turuncu
                PlaylistType.VDJFolder => "LightBlue", // VDJ Folder - Açık mavi
                PlaylistType.Folder => "LightGray",      // Folder - Açık gri
                PlaylistType.Root => "Gold",            // Root - Altın
                _ => "White"                        // Default - Beyaz
            };
        }
        return "White";
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

/// <summary>
/// Root klasör için özel ikon converter
/// </summary>
public class RootFolderIconConverter : IValueConverter
{
    public static readonly RootFolderIconConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is PlaylistType playlistType)
        {
            return playlistType switch
            {
                PlaylistType.Root => "🏠",     // Root klasör - Ev ikonu
                PlaylistType.Playlist => "🎵",           // M3U Playlist - Müzik notu
                PlaylistType.VDJFolder => "📂",     // VDJ Folder - Açık klasör
                PlaylistType.Folder => "📁",       // Folder - Klasör
                _ => "📄"                          // Default - Dosya
            };
        }
        return "📄";
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}