using System;
using System.Globalization;
using Avalonia.Data.Converters;
using Avalonia;
using System.Reflection;

namespace PlaylistOrganizerAvalonia.Converters;

public class ChildrenToVisibilityConverter : IValueConverter
{
    public static readonly ChildrenToVisibilityConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        string? param = parameter?.ToString();

        // Handle nullable int (ParentId binding from tree view items)
        if (value is int intValue)
        {
            if (param == "root")
            {
                // Root ikonu için: ParentId == 0 veya null
                return intValue == 0;
            }
            else if (param == "notroot")
            {
                // Normal ikon için: ParentId != 0
                return intValue != 0;
            }
        }
        
        // Handle null value (ParentId is null)
        if (value == null)
        {
            if (param == "root")
            {
                return true; // Root: ParentId is null
            }
            else if (param == "notroot")
            {
                return false;
            }
        }

        // Handle Nullable<int> explicitly using GetValueOrDefault
        if (value is Nullable<int>)
        {
            int? nullableInt = value as int?;
            if (!nullableInt.HasValue)
            {
                return param == "root";
            }
            else
            {
                if (param == "root")
                    return nullableInt.Value == 0;
                else if (param == "notroot")
                    return nullableInt.Value != 0;
            }
        }

        // Handle Playlist object (SelectedPlaylist binding)
        // SelectedPlaylist is used to show playlist info in the right panel
        if (value != null)
        {
            var valueType = value.GetType();
            var typeName = valueType.Name;
            
            if (typeName == "Playlist")
            {
                // For SelectedPlaylist object, check if playlist is root or not
                var parentIdProp = valueType.GetProperty("ParentId");
                if (parentIdProp != null)
                {
                    var parentIdValue = parentIdProp.GetValue(value);
                    
                    if (parentIdValue == null || (parentIdValue is int intParentId && intParentId == 0))
                    {
                        // This is a root playlist
                        return param == "root";
                    }
                    else
                    {
                        // This is not a root playlist
                        if (param == "notroot")
                            return true;
                        else if (param == "root")
                            return false;
                    }
                }
            }
        }

        // Handle int childrenCount for folder/playlist icons (legacy support)
        if (value is int childrenCount)
        {
            if (param == "folder")
            {
                // Klasör ikonu için: children'ı olanlar true
                return childrenCount > 0;
            }
            else if (param == "playlist")
            {
                // Playlist ikonu için: children'ı olmayanlar true
                return childrenCount == 0;
            }
        }

        return false;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
