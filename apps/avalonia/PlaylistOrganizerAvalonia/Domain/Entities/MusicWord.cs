using System;

namespace PlaylistOrganizerAvalonia.Domain.Entities
{
    /// <summary>
    /// Music file word index entity (full-text search)
    /// </summary>
    public class MusicWord
    {
        public int Id { get; set; }
        public int MusicFileId { get; set; }
        public string Word { get; set; } = string.Empty;
        public int WordLength { get; set; }
        public int WordPosition { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
