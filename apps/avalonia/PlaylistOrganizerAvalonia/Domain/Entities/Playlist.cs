using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PlaylistOrganizerAvalonia.Domain.Enums;

namespace PlaylistOrganizerAvalonia.Domain.Entities
{
    /// <summary>
    /// Playlist entity representing a collection of tracks
    /// </summary>
    [Table("playlists")]
    public class Playlist : BaseEntity
    {
        [Required]
        [MaxLength(1000)]
        public string Path { get; set; } = string.Empty;

        /// <summary>
        /// Computed name from path (filename without extension)
        /// </summary>
        [NotMapped]
        public string Name => System.IO.Path.GetFileNameWithoutExtension(Path);

        [Required]
        public PlaylistType Type { get; set; }

        public int TrackCount { get; set; } = 0;

        /// <summary>
        /// ParentId computed from path hierarchy (not in DB)
        /// </summary>
        [NotMapped]
        public int? ParentId { get; set; } = null;

        // Navigation properties
        [ForeignKey("ParentId")]
        public virtual Playlist? Parent { get; set; }

        public virtual ICollection<Playlist> Children { get; set; } = new List<Playlist>();
        public virtual ICollection<Track> Tracks { get; set; } = new List<Track>();

        /// <summary>
        /// Check if this is a root playlist (no parent)
        /// </summary>
        public bool IsRoot => ParentId == null;

        /// <summary>
        /// Check if this is a folder type
        /// </summary>
        public bool IsFolder => Type == PlaylistType.Folder || Type == PlaylistType.VDJFolder || Type == PlaylistType.Root;

        /// <summary>
        /// Check if this is a leaf playlist (has tracks)
        /// </summary>
        public bool IsLeaf => TrackCount > 0;

        /// <summary>
        /// Get full hierarchical path
        /// </summary>
        public string FullPath
        {
            get
            {
                if (IsRoot)
                    return Name;

                var pathParts = new List<string> { Name };
                var current = Parent;

                while (current != null && !current.IsRoot)
                {
                    pathParts.Insert(0, current.Name);
                    current = current.Parent;
                }

                return string.Join("/", pathParts);
            }
        }

        /// <summary>
        /// Get display icon based on type
        /// </summary>
        public string Icon
        {
            get
            {
                return Type switch
                {
                    PlaylistType.Root => "🏠",
                    PlaylistType.VDJFolder => "📂",
                    PlaylistType.Folder => "📁",
                    PlaylistType.Playlist => "🎵",
                    _ => "❓"
                };
            }
        }

        /// <summary>
        /// Get display color based on type
        /// </summary>
        public string Color
        {
            get
            {
                return Type switch
                {
                    PlaylistType.Root => "Gold",
                    PlaylistType.VDJFolder => "LightBlue",
                    PlaylistType.Folder => "LightGray",
                    PlaylistType.Playlist => "Orange",
                    _ => "Gray"
                };
            }
        }
    }
}
