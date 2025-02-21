export interface TreeNode {
  id: string; // Base64 encoded path
  name: string; // Display name
  path: string; // File system path
  type: "folder" | "playlist";
  children?: TreeNode[];
  isExpanded?: boolean;
  isSelected?: boolean;
  songCount?: number; // Playlist içindeki şarkı sayısı
}

export interface PlaylistResponse {
  success: boolean;
  data: TreeNode[];
  stats: {
    totalNodes: number;
    folders: number;
    playlists: number;
  };
}

export interface PlaylistMap {
  [id: string]: TreeNode;
}
