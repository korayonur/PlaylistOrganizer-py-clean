using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.IO;
using PlaylistOrganizerAvalonia.Domain.Enums;
using PlaylistOrganizerAvalonia.Shared.Services;

namespace PlaylistOrganizerAvalonia.Domain.Entities
{
    /// <summary>
    /// Track entity representing a track in a playlist
    /// </summary>
    [Table("tracks")]
    public class Track : BaseEntity
    {
        [Required]
        [MaxLength(1000)]
        public string Path { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string FileName { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string FileNameOnly { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string NormalizedFileName { get; set; } = string.Empty;

        public TrackStatus Status { get; set; } = TrackStatus.Missing;

        [Required]
        [MaxLength(1000)]
        public string PlaylistFilePath { get; set; } = string.Empty;

        public int TrackOrder { get; set; } = 0;

        public virtual ICollection<TrackWord> TrackWords { get; set; } = new List<TrackWord>();

        /// <summary>
        /// Check if track file exists on disk
        /// </summary>
        public bool ExistsOnDisk => File.Exists(Path);

        /// <summary>
        /// Check if track is found (has associated music file)
        /// </summary>
        public bool IsFound => Status == TrackStatus.Found;

        /// <summary>
        /// Check if track is missing
        /// </summary>
        public bool IsMissing => Status == TrackStatus.Missing;

        /// <summary>
        /// Get status color for UI display
        /// </summary>
        public string StatusColor
        {
            get
            {
                return Status switch
                {
                    TrackStatus.Found => "Green",
                    TrackStatus.Missing => "Red",
                    TrackStatus.Error => "Orange",
                    TrackStatus.Processing => "Blue",
                    _ => "Gray"
                };
            }
        }

        /// <summary>
        /// Get status text for UI display
        /// </summary>
        public string StatusText
        {
            get
            {
                return Status switch
                {
                    TrackStatus.Found => "Found",
                    TrackStatus.Missing => "Missing",
                    TrackStatus.Error => "Error",
                    TrackStatus.Processing => "Processing",
                    _ => "Unknown"
                };
            }
        }

        /// <summary>
        /// Get file extension
        /// </summary>
        public string? Extension => PathHelper.GetExtension(Path);

        /// <summary>
        /// Update track status based on file existence
        /// </summary>
        public void UpdateStatus()
        {
            if (ExistsOnDisk)
            {
                Status = TrackStatus.Found;
            }
            else
            {
                Status = TrackStatus.Missing;
            }
            Touch();
        }
    }

    /// <summary>
    /// Helper class for path operations
    /// </summary>
    public static class PathHelper
    {
        public static string GetExtension(string path)
        {
            return Path.GetExtension(path).ToLowerInvariant();
        }

        public static string GetFileName(string path)
        {
            return Path.GetFileName(path);
        }

        public static string GetFileNameWithoutExtension(string path)
        {
            return Path.GetFileNameWithoutExtension(path);
        }

        public static string NormalizeFileName(string fileName)
        {
            // Merkezi StringNormalizationService'i kullan
            return StringNormalizationService.NormalizeFileName(fileName);
        }
    }
}
