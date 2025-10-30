using System.Threading.Tasks;

namespace PlaylistOrganizerAvalonia.Application.Interfaces
{
    /// <summary>
    /// Word indexing service interface for full-text search
    /// </summary>
    public interface IWordIndexService
    {
        /// <summary>
        /// Index all tracks and music files
        /// </summary>
        Task IndexAllAsync();

        /// <summary>
        /// Index tracks and return count
        /// </summary>
        Task<int> IndexTracksAsync();

        /// <summary>
        /// Index music files and return count
        /// </summary>
        Task<int> IndexMusicFilesAsync();
    }
}

