using System;
using System.Globalization;
using Avalonia.Data.Converters;

namespace PlaylistOrganizerAvalonia.Converters;

/// <summary>
/// Object değerler için value converter'lar
/// </summary>
public static class ObjectConverters
{
    /// <summary>
    /// Bir değerin sıfır olup olmadığını kontrol eden converter
    /// </summary>
    public static readonly IValueConverter IsZero = new IsZeroConverter();
}

/// <summary>
/// Sayısal değerin sıfır olup olmadığını kontrol eden converter
/// </summary>
public class IsZeroConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value == null)
            return true;

        // int, long, double, float, decimal gibi sayısal tipleri kontrol et
        if (value is int intValue)
            return intValue == 0;
        
        if (value is long longValue)
            return longValue == 0;
        
        if (value is double doubleValue)
            return Math.Abs(doubleValue) < double.Epsilon;
        
        if (value is float floatValue)
            return Math.Abs(floatValue) < float.Epsilon;
        
        if (value is decimal decimalValue)
            return decimalValue == 0;
        
        if (value is short shortValue)
            return shortValue == 0;
        
        if (value is byte byteValue)
            return byteValue == 0;

        // ICollection veya IEnumerable için Count kontrolü
        if (value is System.Collections.ICollection collection)
            return collection.Count == 0;

        // TryParse ile string'den sayıya çevirmeyi dene
        if (value is string stringValue)
        {
            if (int.TryParse(stringValue, out int parsedInt))
                return parsedInt == 0;
        }

        return false;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

