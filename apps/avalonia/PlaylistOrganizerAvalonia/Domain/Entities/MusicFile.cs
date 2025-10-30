using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.IO;

namespace PlaylistOrganizerAvalonia.Domain.Entities
{
    /// <summary>
    /// Music file entity representing a physical audio/video file
    /// </summary>
    [Table("music_files")]
    public class MusicFile : BaseEntity
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

        [MaxLength(10)]
        public string? Extension { get; set; }

        public long? Size { get; set; }

        public long? ModifiedTime { get; set; }

        // Navigation properties
        public virtual ICollection<Track> Tracks { get; set; } = new List<Track>();
        public virtual ICollection<MusicWord> MusicWords { get; set; } = new List<MusicWord>();

        /// <summary>
        /// Check if file exists on disk
        /// </summary>
        public bool ExistsOnDisk => File.Exists(Path);

        /// <summary>
        /// Get file size formatted string
        /// </summary>
        public string SizeFormatted => Size.HasValue ? FormatBytes(Size.Value) : "Unknown";

        /// <summary>
        /// Get modified time as DateTime
        /// </summary>
        public DateTime? ModifiedDateTime => ModifiedTime.HasValue
            ? DateTimeOffset.FromUnixTimeSeconds(ModifiedTime.Value).DateTime
            : null;

        private static string FormatBytes(long bytes)
        {
            string[] suffixes = { "B", "KB", "MB", "GB", "TB", "PB", "EB" };
            int counter = 0;
            decimal number = bytes;
            while (Math.Round(number / 1024) >= 1 && counter < suffixes.Length - 1)
            {
                number /= 1024;
                counter++;
            }
            return $"{number:n1} {suffixes[counter]}";
        }
    }
}
