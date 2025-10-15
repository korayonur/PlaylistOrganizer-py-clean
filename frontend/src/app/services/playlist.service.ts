import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Observable, catchError, map, retry, throwError } from "rxjs";
import { PlaylistResponse } from "../models/tree-node.model";
import { Song } from "../models/song.model";
import { FileExistsResponse } from "../models/file-exists-response.model";
import { PlaylistError } from "../models/playlist-error.model";
import { environment } from '../../environments/environment';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: "root",
})
export class PlaylistService {
  constructor(
    private readonly http: HttpClient,
    private readonly configService: ConfigService
  ) {
    // Servis başlatıldığında API URL'ini kontrol et
    console.log('PlaylistService initialized with API URL:', this.getApiUrl());
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

  getPlaylists(): Observable<PlaylistResponse> {
    const url = `${this.getApiUrl()}/playlists/list`;
    console.log('🎵 PlaylistService getPlaylists - Calling API:', url);
    console.log('🎵 ConfigService API URL:', this.configService.getApiUrl());
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
    console.log('getPlaylistContent - Calling API:', url);
    interface PlaylistSongResponse {
      success: boolean;
      songs: {
        file: string;
        isFileExists: boolean;
      }[];
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
    console.log('updateSongPath - Calling API:', url);
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
    console.log('fileExists - Calling API:', url);
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
    playlists: Array<{
      name: string;
      path: string;
      songCount: number;
    }>;
    totalPlaylists: number;
  }> {
    const encodedPath = encodeURIComponent(filePath);
    const url = `${this.getApiUrl()}/files/playlists/${encodedPath}`;
    console.log('getFilePlaylists - Calling API:', url);
    
    return this.http.get<{
      success: boolean;
      filePath: string;
      playlists: Array<{
        name: string;
        path: string;
        songCount: number;
      }>;
      totalPlaylists: number;
    }>(url).pipe(
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
    results: Array<{
      filePath: string;
      playlists: Array<{
        name: string;
        path: string;
        songCount: number;
      }>;
      totalPlaylists: number;
    }>;
    totalFiles: number;
  }> {
    const url = `${this.getApiUrl()}/files/playlists/batch`;
    console.log('getFilesPlaylistsBatch - Calling API:', url, 'with', filePaths.length, 'files');
    
    return this.http.post<{
      success: boolean;
      results: Array<{
        filePath: string;
        playlists: Array<{
          name: string;
          path: string;
          songCount: number;
        }>;
        totalPlaylists: number;
      }>;
      totalFiles: number;
    }>(url, filePaths).pipe(
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
