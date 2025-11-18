using Avalonia.Data.Converters;
using System;
using System.Globalization;

namespace PlaylistOrganizerAvalonia.Views.Converters
{
    public class BoolToStatusConverter : IValueConverter
    {
        public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            if (value is bool isPlaying)
            {
                return isPlaying ? "Çalıyor" : "Durdu";
            }
            return "Durdu";
        }

        public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
