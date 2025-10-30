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
    musicFolder: "/Users/koray/Music/KorayMusics", // Backend'den yüklenemezse fallback olarak kullanılır
    playlistFolder: "/Users/koray/Library/Application Support/VirtualDJ/Folders", // Backend'den yüklenemezse fallback olarak kullanılır
  },
  supportedFormats: {
    audio: [".mp3", ".m4a", ".flac", ".wav", ".aac", ".ogg", ".wma"], // Backend'den yüklenemezse fallback olarak kullanılır
    playlist: [".m3u", ".m3u8", ".pls", ".xspf"], // Backend'den yüklenemezse fallback olarak kullanılır
  },
};
