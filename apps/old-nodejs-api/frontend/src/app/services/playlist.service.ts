import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Observable, catchError, map, retry, throwError } from "rxjs";
import { PlaylistResponse } from "../models/tree-node.model";
import { Song } from "../models/song.model";
import { FileExistsResponse } from "../models/file-exists-response.model";
import { PlaylistError } from "../models/playlist-error.model";
import { ConfigService } from "./config.service";

export interface TrackSearchResultResponse {
  score?: number;
  track_path: string;
  fileName: string;
  match_count?: number;
  track_source?: string;
  track_source_file?: string;
  match_type?: string;
}

export interface TrackSearchResponse {
  success: boolean;
  result?: TrackSearchResultResponse;
  message?: string;
}

export interface BulkFixPreviewResponse {
  success: boolean;
  totalPlaylists: number;
  affectedPlaylists: {
    name: string;
    path: string;
    songCount: number;
  }[];
}

export interface BulkFixConfirmResponse {
  success: boolean;
  filesUpdated: number;
}

@Injectable({
  providedIn: "root",
})
export class PlaylistService {
  constructor(
    private readonly http: HttpClient,
    private readonly configService: ConfigService,
  ) {
    // Servis başlatıldığında API URL'ini kontrol et
    console.log("PlaylistService initialized with API URL:", this.getApiUrl());
  }

  private getApiUrl(): string {
    return this.configService.getApiUrl();
  }

  /**
   * Playlist root path'ini config'den al
   */
  get playlistsRoot(): string {
    return this.configService.getPlaylistFolder();
  }

  getPlaylists(onlyWithMissing = false): Observable<PlaylistResponse> {
    const url = `${this.getApiUrl()}/playlists/list?onlyWithMissing=${onlyWithMissing}`;
    console.log(
      "🎵 PlaylistService getPlaylists - Calling API:",
      url,
      "onlyWithMissing:",
      onlyWithMissing,
    );
    console.log("🎵 ConfigService API URL:", this.configService.getApiUrl());
    return this.http.get<PlaylistResponse>(url).pipe(
      retry(3),
      map((response) => {
        if (!response["success"]) {
          throw new PlaylistError("PLY-500", "Geçersiz playlist yanıt formatı");
        }
        return response;
      }),
      catchError(this.handleError),
    );
  }

  getPlaylistContent(path: string): Observable<Song[]> {
    const url = `${this.getApiUrl()}/playlistsongs/read`;
    console.log("getPlaylistContent - Calling API:", url);
    interface PlaylistSongResponse {
      success: boolean;
      songs: {
        file: string;
        isFileExists: boolean;
      }[];
      stats?: {
        total: number;
        exists: number;
        missing: number;
      };
    }

    return this.http
      .post<PlaylistSongResponse>(url, {
        playlistPath: path,
      })
      .pipe(
        retry(3),
        map((response) => {
          if (!response.success) {
            throw new PlaylistError("PLY-500", "Playlist okuma hatası");
          }

          console.log("Playlist stats:", response.stats);

          return response.songs.map(
            (song, index) =>
              ({
                id: `song-${index}-${Date.now()}`,
                filePath: song.file,
                isFileExists: song.isFileExists,
                status: song.isFileExists ? "exists" : "missing",
              }) as Song,
          );
        }),
        catchError(this.handleError),
      );
  }

  updateSongPath(playlistPath: string, oldPath: string, newPath: string): Observable<void> {
    const url = `${this.getApiUrl()}/playlistsong/update`;
    console.log("updateSongPath - Calling API:", url);
    return this.http
      .post<{
        success: boolean;
        message?: string;
      }>(url, {
        playlistPath,
        oldPath,
        newPath,
      })
      .pipe(
        retry(3),
        map((response) => {
          if (!response.success) {
            throw new PlaylistError("PLY-500", "Şarkı güncelleme hatası");
          }
        }),
        catchError(this.handleError),
      );
  }

  fileExists(path: string): Observable<FileExistsResponse> {
    const url = `${this.getApiUrl()}/files/exists`;
    console.log("fileExists - Calling API:", url);
    return this.http
      .post<{
        success: boolean;
        found: boolean;
      }>(url, { filePath: path })
      .pipe(
        retry(3),
        map((response) => {
          if (!response.success) {
            throw new PlaylistError("PLY-500", "Dosya kontrolü hatası");
          }
          return { exists: response.found, path };
        }),
        catchError(this.handleError),
      );
  }

  getFilePlaylists(filePath: string): Observable<{
    success: boolean;
    filePath: string;
    playlists: {
      name: string;
      path: string;
      songCount: number;
    }[];
    totalPlaylists: number;
  }> {
    const encodedPath = encodeURIComponent(filePath);
    const url = `${this.getApiUrl()}/files/playlists/${encodedPath}`;
    console.log("getFilePlaylists - Calling API:", url);

    return this.http
      .get<{
        success: boolean;
        filePath: string;
        playlists: {
          name: string;
          path: string;
          songCount: number;
        }[];
        totalPlaylists: number;
      }>(url)
      .pipe(
        retry(3),
        map((response) => {
          if (!response.success) {
            throw new PlaylistError("PLY-500", "Dosya playlist bilgisi alma hatası");
          }
          return response;
        }),
        catchError(this.handleError),
      );
  }

  getFilesPlaylistsBatch(filePaths: string[]): Observable<{
    success: boolean;
    results: {
      filePath: string;
      playlists: {
        name: string;
        path: string;
        songCount: number;
      }[];
      totalPlaylists: number;
    }[];
    totalFiles: number;
  }> {
    const url = `${this.getApiUrl()}/files/playlists/batch`;
    console.log("getFilesPlaylistsBatch - Calling API:", url, "with", filePaths.length, "files");

    return this.http
      .post<{
        success: boolean;
        results: {
          filePath: string;
          playlists: {
            name: string;
            path: string;
            songCount: number;
          }[];
          totalPlaylists: number;
        }[];
        totalFiles: number;
      }>(url, filePaths)
      .pipe(
        retry(3),
        map((response) => {
          if (!response.success) {
            throw new PlaylistError("PLY-500", "Batch playlist bilgisi alma hatası");
          }
          return response;
        }),
        catchError(this.handleError),
      );
  }

  /**
   * Dosya adı ile track arama
   */
  searchTrackByFilename(fileName: string): Observable<TrackSearchResponse> {
    const url = `${this.getApiUrl()}/track/search-by-filename`;
    console.log("searchTrackByFilename - Calling API:", url);
    return this.http
      .post<TrackSearchResponse>(url, { fileName, limit: 1 })
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Bulk fix preview - hangi playlist'ler etkilenecek?
   */
  bulkFixTrack(oldPath: string, newPath: string): Observable<BulkFixPreviewResponse> {
    const url = `${this.getApiUrl()}/track/bulk-fix`;
    console.log("bulkFixTrack - Calling API:", url);
    return this.http
      .post<BulkFixPreviewResponse>(url, { oldPath, newPath })
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Bulk fix onayla ve çalıştır
   */
  bulkFixTrackConfirm(oldPath: string, newPath: string): Observable<BulkFixConfirmResponse> {
    const url = `${this.getApiUrl()}/track/bulk-fix/confirm`;
    console.log("bulkFixTrackConfirm - Calling API:", url);
    return this.http
      .post<BulkFixConfirmResponse>(url, { oldPath, newPath })
      .pipe(retry(3), catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = "Bir hata oluştu";
    let errorCode = "PLY-500";

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
      errorCode = "PLY-400";
    } else {
      switch (error.status) {
        case 404:
          errorCode = "PLY-404";
          errorMessage = "Playlist bulunamadı";
          break;
        case 400:
          errorCode = "PLY-400";
          errorMessage = "Geçersiz istek";
          break;
        case 500:
          errorCode = "PLY-500";
          errorMessage = "Sunucu hatası";
          break;
        default:
          errorCode = `PLY-${error.status || 500}`;
          errorMessage = error.error?.message || "Bilinmeyen hata";
      }
    }

    return throwError(() => new PlaylistError(errorCode, errorMessage, error));
  }
}
