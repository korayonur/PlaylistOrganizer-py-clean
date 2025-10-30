using System;

namespace PlaylistOrganizerAvalonia.Domain.Entities
{
    /// <summary>
    /// Track word index entity (full-text search)
    /// </summary>
    public class TrackWord
    {
        public int Id { get; set; }
        public int TrackId { get; set; }
        public string Word { get; set; } = string.Empty;
        public int WordLength { get; set; }
        public int WordPosition { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
