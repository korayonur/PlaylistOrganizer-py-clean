import { Component, EventEmitter, Input, Output, signal, WritableSignal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Song, SimilarFile, SearchInfo } from "../../models/song.model";
import { MusicPlayerService } from "../../services/music-player.service";
import { HttpClient } from "@angular/common/http";
import { DialogService, DialogResult } from "../../shared/services/dialog.service";
import { ConfigService } from "../../services/config.service";

interface SearchResult {
  originalPath: string;
  status: "found" | "not_found" | "similar_found";
  type?: "error";
  error?: string;
  path?: string;
  foundPath?: string;
  matchType?: string;
  fileInfo?: {
    name: string;
    extension: string;
    location: string;
  };
  similarFiles?: {
    path: string;
    similarity: number;
    analysisType: string;
    line?: number;
    lineText?: string;
    locationMatch?: boolean;
    extensionMatch?: boolean;
  }[];
}

interface ApiSearchResponse {
  status: "success" | "error";
  message: string;
  data: {
    results?: SearchResult[];
    searchTime?: number;
    searchInfo?: SearchInfo;
  };
}

@Component({
  selector: "app-song-grid",
  templateUrl: "./song-grid.component.html",
  styleUrls: ["./song-grid.component.scss"],
  standalone: true,
  imports: [CommonModule],
})
export class SongGridComponent {
  private readonly _songs: WritableSignal<Song[]> = signal([]);
  loading = signal(false);
  private getApiUrl(): string {
    return this.configService.getApiUrl();
  }

  @Input() set songs(value: Song[]) {
    if (value) {
      // Mevcut şarkıların durumlarını koru
      const currentSongs = this._songs();
      const updatedSongs = value.map((newSong) => {
        const existingSong = currentSongs.find((s) => s.filePath === newSong.filePath);
        if (existingSong) {
          // Mevcut şarkının arama durumunu ve sonuçlarını koru
          return {
            ...newSong,
            isSearching: existingSong.isSearching,
            searchError: existingSong.searchError,
            similarFiles: existingSong.similarFiles,
            searchTime: existingSong.searchTime,
          };
        }
        return newSong;
      });
      this._songs.set(updatedSongs);
    }
  }

  get songs(): Song[] {
    return this._songs();
  }

  @Input() error: string | null = null;

  @Output() accept = new EventEmitter<Song>();
  @Output() reject = new EventEmitter<Song>();
  @Output() repair = new EventEmitter<void>();
  @Output() selectSimilarFile = new EventEmitter<{
    song: Song;
    similarFile: SimilarFile;
  }>();

  @Input() set isLoading(value: boolean) {
    this.loading.set(value);
  }

  constructor(
    private readonly musicPlayer: MusicPlayerService,
    private readonly http: HttpClient,
    private dialogService: DialogService,
    private configService: ConfigService,
  ) {}

  hasUpdatedSongs(): boolean {
    return this.songs.some((song) => song.status === "updated");
  }

  getStatusIcon(song: Song): string {
    if (song.status === "updated") return "update";
    return song.isFileExists ? "check_circle" : "error";
  }

  isPlaying(song: Song): boolean {
    return this.musicPlayer.isPlaying(song);
  }

  togglePlay(song: Song): void {
    if (this.isPlaying(song)) {
      this.musicPlayer.pause();
    } else {
      this.musicPlayer.play(song).subscribe({
        complete: () => {
          this.error = null;
        },
        error: () => {
          this.error = "Müzik çalma sırasında bir hata oluştu";
        },
      });
    }
  }

  onAccept(song: Song): void {
    this.accept.emit(song);
  }

  onReject(song: Song): void {
    this.reject.emit(song);
  }

  onSelectSimilarFile(song: Song, similarFile: SimilarFile): void {
    this.selectSimilarFile.emit({ song, similarFile });
  }

  getAnalysisTypeText(type: string): string {
    switch (type) {
      case "format":
        return "Format Analizi";
      case "location":
        return "Konum Analizi";
      case "name":
        return "İsim Analizi";
      case "levenshtein":
        return "Kelime Analizi";
      default:
        return "Diğer";
    }
  }

  searchSimilarFiles(song: Song) {
    // Şarkıyı bul
    const songIndex = this._songs().findIndex((s) => s.filePath === song.filePath);
    if (songIndex === -1) return;

    // Arama durumunu güncelle
    const updatedSong = {
      ...song,
      isSearching: true,
      searchError: undefined,
      searchMessage: undefined,
      similarFiles: undefined,
    };

    // State'i güncelle
    this._songs.update((songs) => {
      songs[songIndex] = updatedSong;
      return [...songs];
    });

    // API isteği gönder
    this.http
      .post<ApiSearchResponse>(`${this.getApiUrl()}/search/files`, {
        paths: [song.filePath],
        batchSize: 1,
      })
      .subscribe({
        next: (response) => {
          const result = response.data?.results?.[0];
          if (response.status === "success" && result) {
            if (result.type === "error" || result.status === "not_found") {
              this._songs.update((songs) => {
                songs[songIndex] = {
                  ...songs[songIndex],
                  isSearching: false,
                  searchError: "Benzer dosya bulunamadı",
                  searchMessage: response.message,
                  similarFiles: undefined,
                  searchTime: response.data.searchTime,
                  searchInfo: response.data.searchInfo,
                };
                return [...songs];
              });
            } else {
              let transformedFiles: SimilarFile[] = [];

              // Eğer dosya bulunduysa, onu benzer dosya olarak ekle
              if (result.status === "found" && result.foundPath) {
                transformedFiles = [
                  {
                    path: result.foundPath,
                    similarity: 100,
                    analysisType: "format",
                    analysisText: "Format Dönüşümü",
                    locationMatch: true,
                    extensionMatch: false,
                  },
                ];
              }
              // Benzer dosyalar varsa onları ekle
              else if (result.similarFiles?.length) {
                transformedFiles = result.similarFiles.map((file) => ({
                  path: file.path,
                  similarity: file.similarity,
                  analysisType: file.analysisType as
                    | "format"
                    | "location"
                    | "name"
                    | "levenshtein"
                    | "error",
                  analysisText: this.getAnalysisTypeText(file.analysisType),
                  line: file.line,
                  lineText: file.lineText,
                  locationMatch: file.locationMatch,
                  extensionMatch: file.extensionMatch,
                }));
              }

              this._songs.update((songs) => {
                songs[songIndex] = {
                  ...songs[songIndex],
                  isSearching: false,
                  searchError:
                    transformedFiles.length === 0 ? "Benzer dosya bulunamadı" : undefined,
                  searchMessage: response.message,
                  similarFiles: transformedFiles.length > 0 ? transformedFiles : undefined,
                  searchTime: response.data.searchTime,
                  searchInfo: response.data.searchInfo,
                };
                return [...songs];
              });
            }
          } else {
            this._songs.update((songs) => {
              songs[songIndex] = {
                ...songs[songIndex],
                isSearching: false,
                searchError: "Beklenmeyen bir hata oluştu",
                searchMessage: response.message,
                similarFiles: undefined,
                searchTime: response.data.searchTime || 0,
                searchInfo: response.data.searchInfo,
              };
              return [...songs];
            });
          }
        },
        error: () => {
          this._songs.update((songs) => {
            songs[songIndex] = {
              ...songs[songIndex],
              isSearching: false,
              searchError: "Beklenmeyen bir hata oluştu",
              searchMessage: "API hatası",
              similarFiles: undefined,
              searchTime: 0,
              searchInfo: undefined,
            };
            return [...songs];
          });
        },
      });
  }

  private getAnalysisText(type: string): string {
    const analysisTypes: Record<string, string> = {
      format: "Format Benzerliği",
      location: "Konum Benzerliği",
      name: "İsim Benzerliği",
      levenshtein: "Metin Benzerliği",
      error: "Hata",
    };
    return analysisTypes[type] || "Bilinmeyen Analiz";
  }

  openMultisearch(paths: string[]): void {
    this.dialogService
      .openMultisearchDialog(paths, "", "")
      .subscribe((result: DialogResult<string[]>) => {
        if (result?.success) {
          this.repair.emit();
        }
      });
  }

  searchFiles() {
    return this.http.post<ApiSearchResponse>(`${this.getApiUrl()}/search/files`, {
      // ...
    });
  }
}
