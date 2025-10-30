using System;
using System.Globalization;
using Avalonia.Data.Converters;
using Avalonia;

namespace PlaylistOrganizerAvalonia.Converters;

public class ChildrenToVisibilityConverter : IValueConverter
{
    public static readonly ChildrenToVisibilityConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is int childrenCount)
        {
            // Parameter ile kontrol et
            if (parameter?.ToString() == "folder")
            {
                // Klasör ikonu için: children'ı olanlar true
                return childrenCount > 0;
            }
            else if (parameter?.ToString() == "playlist")
            {
                // Playlist ikonu için: children'ı olmayanlar true
                return childrenCount == 0;
            }
            else if (parameter?.ToString() == "root")
            {
                // Root ikonu için: ParentId = 0 olanlar true
                return childrenCount == 0; // ParentId = 0 means root
            }
            else if (parameter?.ToString() == "notroot")
            {
                // Normal ikon için: ParentId != 0 olanlar true
                return childrenCount != 0; // ParentId != 0 means not root
            }
        }
        return false;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
