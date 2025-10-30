namespace PlaylistOrganizerAvalonia.Application.Models
{
    /// <summary>
    /// Import progress bilgileri
    /// </summary>
    public class ImportProgress
    {
        public string CurrentStage { get; set; } = string.Empty;
        public int ProgressPercentage { get; set; }
        public int ProcessedFiles { get; set; }
        public int TotalFiles { get; set; }
        public int AddedFiles { get; set; }
        public int SkippedFiles { get; set; }
        public int ErrorFiles { get; set; }
        public string CurrentFile { get; set; } = string.Empty;
    }

    /// <summary>
    /// Import sonuç bilgileri
    /// </summary>
    public class ImportResult
    {
        public bool Success { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
        public int TotalFiles { get; set; }
        public int ProcessedFiles { get; set; }
        public int AddedFiles { get; set; }
        public int SkippedFiles { get; set; }
        public int ErrorFiles { get; set; }
        public int MusicFilesImported { get; set; }
        public int PlaylistFilesImported { get; set; }
        public int TracksImported { get; set; }
    }
}
