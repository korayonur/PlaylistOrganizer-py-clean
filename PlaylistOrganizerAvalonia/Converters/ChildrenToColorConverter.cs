using System;
using System.Globalization;
using Avalonia.Data.Converters;
using Avalonia.Media;

namespace PlaylistOrganizerAvalonia.Converters;

public class ChildrenToColorConverter : IValueConverter
{
    public static readonly ChildrenToColorConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is int childrenCount)
        {
            // Children'ı olanlar için mavi (klasörler)
            return childrenCount > 0 ? Brushes.LightBlue : Brushes.Transparent;
        }
        return Brushes.Transparent;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
