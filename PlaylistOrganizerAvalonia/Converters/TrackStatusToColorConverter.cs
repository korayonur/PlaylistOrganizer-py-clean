using System;
using System.Globalization;
using Avalonia.Data.Converters;
using Avalonia.Media;
using PlaylistOrganizerAvalonia.Domain.Enums;

namespace PlaylistOrganizerAvalonia.Converters;

public class TrackStatusToColorConverter : IValueConverter
{
    public static readonly TrackStatusToColorConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is TrackStatus status)
        {
            return status switch
            {
                TrackStatus.Found => new SolidColorBrush(Colors.Green),
                TrackStatus.Missing => new SolidColorBrush(Colors.Red),
                TrackStatus.Error => new SolidColorBrush(Colors.Orange),
                TrackStatus.Processing => new SolidColorBrush(Colors.Blue),
                _ => new SolidColorBrush(Colors.Gray)
            };
        }
        return new SolidColorBrush(Colors.Gray);
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
