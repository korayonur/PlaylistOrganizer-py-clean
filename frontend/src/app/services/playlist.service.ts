import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Observable, catchError, map, retry, throwError } from "rxjs";
import { PlaylistResponse } from "../models/tree-node.model";
import { Song } from "../models/song.model";
import { FileExistsResponse } from "../models/file-exists-response.model";
import { PlaylistError } from "../models/playlist-error.model";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: "root",
})
export class PlaylistService {
  private apiUrl = environment.apiUrl;
  private readonly PLAYLISTS_ROOT = "/Users/koray/Library/Application Support/VirtualDJ/Folders";

  constructor(private readonly http: HttpClient) {
    // Servis başlatıldığında API URL'ini kontrol et
    console.log('PlaylistService initialized with API URL:', this.apiUrl);
  }

  getPlaylists(): Observable<PlaylistResponse> {
    const url = `${this.apiUrl}/playlists/list`;
    console.log('getPlaylists - Calling API:', url);
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
    const url = `${this.apiUrl}/playlistsongs/read`;
    console.log('getPlaylistContent - Calling API:', url);
    interface PlaylistSongResponse {
      success: boolean;
      songs: {
        path: string;
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
            (song) =>
              ({
                filePath: song.path,
                isFileExists: song.isFileExists,
                status: song.isFileExists ? "exists" : "missing",
              }) as Song,
          );
        }),
        catchError(this.handleError),
      );
  }

  updateSongPath(playlistPath: string, oldPath: string, newPath: string): Observable<void> {
    const url = `${this.apiUrl}/playlistsong/update`;
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
    const url = `${this.apiUrl}/files/exists`;
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
