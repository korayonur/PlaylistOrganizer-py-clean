using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using PlaylistOrganizerAvalonia.Domain.Enums;

namespace PlaylistOrganizerAvalonia.Application.Models
{
    /// <summary>
    /// Playlist ağaç yapısını temsil eden model (JSON cache için)
    /// </summary>
    public class PlaylistTree
    {
        [JsonPropertyName("version")]
        public string Version { get; set; } = "1.0";

        [JsonPropertyName("lastUpdated")]
        public DateTime LastUpdated { get; set; }

        [JsonPropertyName("roots")]
        public List<PlaylistTreeNode> Roots { get; set; } = new List<PlaylistTreeNode>();
    }

    /// <summary>
    /// Playlist ağaç düğümü (hierarchical yapı)
    /// </summary>
    public class PlaylistTreeNode
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("path")]
        public string Path { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public PlaylistType Type { get; set; }

        [JsonPropertyName("trackCount")]
        public int TrackCount { get; set; }

        [JsonPropertyName("children")]
        public List<PlaylistTreeNode> Children { get; set; } = new List<PlaylistTreeNode>();

        /// <summary>
        /// Domain entity'ye dönüştür
        /// </summary>
        public Domain.Entities.Playlist ToPlaylistEntity()
        {
            return new Domain.Entities.Playlist
            {
                Path = this.Path,
                Type = this.Type,
                TrackCount = this.TrackCount,
                Children = new List<Domain.Entities.Playlist>()
            };
        }

        /// <summary>
        /// Domain entity'den oluştur
        /// </summary>
        public static PlaylistTreeNode FromPlaylistEntity(Domain.Entities.Playlist playlist)
        {
            var node = new PlaylistTreeNode
            {
                Name = playlist.Name,
                Path = playlist.Path,
                Type = playlist.Type,
                TrackCount = playlist.TrackCount
            };

            foreach (var child in playlist.Children)
            {
                node.Children.Add(FromPlaylistEntity(child));
            }

            return node;
        }
    }
}

