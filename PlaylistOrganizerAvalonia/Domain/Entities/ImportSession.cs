using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System;
using PlaylistOrganizerAvalonia.Domain.Enums;

namespace PlaylistOrganizerAvalonia.Domain.Entities
{
    /// <summary>
    /// Import session entity for tracking import operations
    /// </summary>
    [Table("import_sessions")]
    public class ImportSession : BaseEntity
    {
        [Required]
        public ImportSessionType SessionType { get; set; }

        [MaxLength(1000)]
        public string? SourcePath { get; set; }

        public int TotalFiles { get; set; } = 0;
        public int ProcessedFiles { get; set; } = 0;
        public int AddedFiles { get; set; } = 0;
        public int SkippedFiles { get; set; } = 0;
        public int ErrorFiles { get; set; } = 0;
        public int MusicFilesCount { get; set; } = 0;
        public int TracksCount { get; set; } = 0;
        public int PlaylistsCount { get; set; } = 0;
        public int IndexCount { get; set; } = 0;

        public ImportSessionStatus Status { get; set; } = ImportSessionStatus.Running;

        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }

        [MaxLength(2000)]
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Get progress percentage
        /// </summary>
        public double ProgressPercentage => TotalFiles > 0 ? (double)ProcessedFiles / TotalFiles * 100 : 0;

        /// <summary>
        /// Get duration
        /// </summary>
        public TimeSpan? Duration => CompletedAt?.Subtract(StartedAt) ?? DateTime.UtcNow.Subtract(StartedAt);

        /// <summary>
        /// Check if session is completed
        /// </summary>
        public bool IsCompleted => Status == ImportSessionStatus.Completed || Status == ImportSessionStatus.Failed || Status == ImportSessionStatus.Cancelled;

        /// <summary>
        /// Complete the session
        /// </summary>
        public void Complete(ImportSessionStatus status = ImportSessionStatus.Completed, string? errorMessage = null)
        {
            Status = status;
            CompletedAt = DateTime.UtcNow;
            ErrorMessage = errorMessage;
            Touch();
        }
    }
}
