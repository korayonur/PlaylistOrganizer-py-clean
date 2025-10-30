using System;
using System.Globalization;
using Avalonia.Data.Converters;
using PlaylistOrganizerAvalonia.Domain.Enums;

namespace PlaylistOrganizerAvalonia.Converters;

public class TrackStatusToIconConverter : IValueConverter
{
    public static readonly TrackStatusToIconConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is TrackStatus status)
        {
            return status switch
            {
                TrackStatus.Found => "✅",
                TrackStatus.Missing => "❌",
                TrackStatus.Error => "⚠️",
                TrackStatus.Processing => "⏳",
                _ => "❓"
            };
        }
        return "❓";
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
