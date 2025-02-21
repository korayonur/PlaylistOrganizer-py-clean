export interface AppConfig {
  paths: {
    musicFolder: string;
    playlistFolder: string;
  };
  supportedFormats: {
    audio: string[];
    playlist: string[];
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  paths: {
    musicFolder: "/Users/koray/Music/KorayMusics",
    playlistFolder: "/Users/koray/Library/Application Support/VirtualDJ/Folders",
  },
  supportedFormats: {
    audio: [".mp3", ".m4a", ".flac", ".wav", ".aac", ".ogg", ".wma"],
    playlist: [".m3u", ".m3u8", ".pls", ".xspf"],
  },
};
