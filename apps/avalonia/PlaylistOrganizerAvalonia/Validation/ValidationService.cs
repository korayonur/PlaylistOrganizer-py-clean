using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using System.Linq;
using PlaylistOrganizerAvalonia.Domain.Entities;

namespace PlaylistOrganizerAvalonia.Validation;

/// <summary>
/// Validation service interface - Clean Architecture
/// </summary>
public interface IValidationService
{
    CustomValidationResult ValidatePlaylist(Playlist playlist);
    CustomValidationResult ValidateTrack(Track track);
    CustomValidationResult ValidateModel<T>(T model);
}

/// <summary>
/// Custom validation result to avoid conflict with System.ComponentModel.DataAnnotations.ValidationResult
/// </summary>
public class CustomValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    
    public CustomValidationResult(bool isValid = true)
    {
        IsValid = isValid;
    }
    
    public void AddError(string error)
    {
        Errors.Add(error);
        IsValid = false;
    }
}

/// <summary>
/// Validation service implementation
/// </summary>
public class ValidationService : IValidationService
{
    public CustomValidationResult ValidatePlaylist(Playlist playlist)
    {
        var result = new CustomValidationResult();
        
        if (playlist == null)
        {
            result.AddError("Playlist cannot be null");
            return result;
        }
        
        if (string.IsNullOrWhiteSpace(playlist.Name))
        {
            result.AddError("Playlist name is required");
        }
        
        if (playlist.Name?.Length > 255)
        {
            result.AddError("Playlist name cannot exceed 255 characters");
        }
        
        if (playlist.Id <= 0)
        {
            result.AddError("Playlist ID must be greater than 0");
        }
        
        if (playlist.TrackCount < 0)
        {
            result.AddError("Track count cannot be negative");
        }
        
        return result;
    }
    
    public CustomValidationResult ValidateTrack(Track track)
    {
        var result = new CustomValidationResult();
        
        if (track == null)
        {
            result.AddError("Track cannot be null");
            return result;
        }
        
        if (string.IsNullOrWhiteSpace(track.FileName))
        {
            result.AddError("Track file name is required");
        }
        
        if (string.IsNullOrWhiteSpace(track.Path))
        {
            result.AddError("Track path is required");
        }
        
        if (track.Id <= 0)
        {
            result.AddError("Track ID must be greater than 0");
        }
        
        return result;
    }
    
    public CustomValidationResult ValidateModel<T>(T model)
    {
        var result = new CustomValidationResult();
        
        if (model == null)
        {
            result.AddError("Model cannot be null");
            return result;
        }
        
        var context = new ValidationContext(model);
        var validationResults = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
        
        bool isValid = Validator.TryValidateObject(model, context, validationResults, true);
        
        if (!isValid)
        {
            foreach (var validationResult in validationResults)
            {
                foreach (var memberName in validationResult.MemberNames)
                {
                    result.AddError($"{memberName}: {validationResult.ErrorMessage}");
                }
            }
        }
        
        return result;
    }
}
