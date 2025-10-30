import { Component, EventEmitter, Input, Output, signal, WritableSignal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Song, SimilarFile, SearchInfo } from "../../models/song.model";
import { MusicPlayerService } from "../../services/music-player.service";
import { HttpClient } from "@angular/common/http";
import { DialogService, DialogResult } from "../../shared/services/dialog.service";
import { ConfigService } from "../../services/config.service";
import {
  PlaylistService,
  TrackSearchResponse,
  TrackSearchResultResponse,
  BulkFixPreviewResponse,
  BulkFixConfirmResponse,
} from "../../services/playlist.service";

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

interface TrackSearchState {
  loading: boolean;
  success?: boolean;
  result?: TrackSearchResultResponse;
  error?: string;
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

  // Benzerlik skoru filtresi
  similarityThreshold = 0.7;
  showSimilarityFilter = false;

  // Track fix accordion state
  expandedTrackPath: string | null = null;
  searchResultForTrack: Map<string, TrackSearchState> = new Map();
  fixLoadingForTrack: Map<string, boolean> = new Map();

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
  @Output() selectSimilarFile = new EventEmitter<{
    song: Song;
    similarFile: SimilarFile;
  }>();
  @Output() reloadCurrentPlaylist = new EventEmitter<void>();

  @Input() set isLoading(value: boolean) {
    this.loading.set(value);
  }

  constructor(
    private readonly musicPlayer: MusicPlayerService,
    private readonly http: HttpClient,
    private dialogService: DialogService,
    private configService: ConfigService,
    private playlistService: PlaylistService,
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

  isPreviewPlaying(song: Song, previewPath: string): boolean {
    const previewSong = this.createPreviewSong(song, previewPath);
    return this.musicPlayer.isPlaying(previewSong);
  }

  togglePreviewTrack(song: Song, previewPath: string): void {
    const previewSong = this.createPreviewSong(song, previewPath);

    if (this.musicPlayer.isPlaying(previewSong)) {
      this.musicPlayer.pause();
      return;
    }

    this.musicPlayer.play(previewSong).subscribe({
      complete: () => {
        this.error = null;
      },
      error: () => {
        this.error = "Müzik çalma sırasında bir hata oluştu";
      },
    });
  }

  trackByWord(index: number, word: string): string {
    return `${index}-${word}`;
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
          // Repair event removed - using Fix Suggestions system instead
        }
      });
  }

  searchFiles() {
    return this.http.post<ApiSearchResponse>(`${this.getApiUrl()}/search/files`, {
      // ...
    });
  }

  // Benzerlik skoru filtresi fonksiyonları
  toggleSimilarityFilter(): void {
    this.showSimilarityFilter = !this.showSimilarityFilter;

    // Filtre açıldığında otomatik seçim yap
    if (this.showSimilarityFilter) {
      this.autoSelectBySimilarity();
    }
  }

  onSimilarityThresholdChange(value: number): void {
    this.similarityThreshold = value;

    // Eşik değiştiğinde otomatik seçim güncelle
    if (this.showSimilarityFilter) {
      this.autoSelectBySimilarity();
    }
  }

  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.similarityThreshold = +target.value;

    // Slider değiştiğinde otomatik seçim güncelle
    if (this.showSimilarityFilter) {
      this.autoSelectBySimilarity();
    }
  }

  // Benzerlik skoruna göre otomatik seçim yap
  autoSelectBySimilarity(): void {
    const songs = this._songs();

    // Eşik değerini karşılayan şarkıları seç
    songs.forEach((song) => {
      if (song.similarFiles && song.similarFiles.length > 0) {
        const bestMatch = song.similarFiles[0];
        if (bestMatch.similarity >= this.similarityThreshold) {
          // Şarkıyı seçili olarak işaretle (eğer böyle bir özellik varsa)
          // Bu kısım mevcut song-grid yapısına göre ayarlanabilir
        }
      }
    });
  }

  // Seçili şarkı sayısını döndür
  getSelectedSongsCount(): number {
    const songs = this.filteredSongs;
    return songs.filter(
      (song) =>
        song.similarFiles &&
        song.similarFiles.length > 0 &&
        song.similarFiles[0].similarity >= this.similarityThreshold,
    ).length;
  }

  getSimilarityColor(similarity: number): string {
    if (similarity >= 1.0) return "#4caf50"; // Yeşil - Mükemmel
    if (similarity >= 0.85) return "#2196f3"; // Mavi - Çok yüksek
    if (similarity >= 0.7) return "#ff9800"; // Turuncu - Yüksek
    if (similarity >= 0.5) return "#ffc107"; // Sarı - Orta
    return "#9e9e9e"; // Gri - Düşük
  }

  getSimilarityLabel(similarity: number): string {
    if (similarity >= 1.0) return "Mükemmel Eşleşme";
    if (similarity >= 0.85) return "Çok Yüksek Benzerlik";
    if (similarity >= 0.7) return "Yüksek Benzerlik";
    if (similarity >= 0.5) return "Orta Benzerlik";
    return "Düşük Benzerlik";
  }

  // Filtrelenmiş şarkıları döndür
  get filteredSongs(): Song[] {
    let songs = this._songs();

    if (this.showSimilarityFilter) {
      songs = songs.filter((song) => {
        if (!song.similarFiles || song.similarFiles.length === 0) {
          return false;
        }

        // En iyi eşleşmenin benzerlik skorunu kontrol et
        const bestMatch = song.similarFiles[0];
        return bestMatch.similarity >= this.similarityThreshold;
      });
    }

    return songs;
  }

  // Track fix metodları
  async searchForMissingTrack(song: Song) {
    // Toggle accordion
    if (this.expandedTrackPath === song.filePath) {
      this.expandedTrackPath = null;
      return;
    }

    this.expandedTrackPath = song.filePath;
    this.searchResultForTrack.set(song.filePath, { loading: true });

    // Dosya adını al (path'siz)
    const fileName = song.filePath.split("/").pop();
    if (!fileName) {
      this.searchResultForTrack.set(song.filePath, {
        loading: false,
        success: false,
        error: "Geçersiz dosya adı",
      });
      return;
    }

    // API call: /api/track/search-by-filename
    this.playlistService.searchTrackByFilename(fileName).subscribe({
      next: (response: TrackSearchResponse) => {
        if (response.success && response.result) {
          this.searchResultForTrack.set(song.filePath, {
            loading: false,
            result: response.result,
            success: true,
          });
        } else if (response.success) {
          this.searchResultForTrack.set(song.filePath, {
            loading: false,
            success: true,
          });
        } else {
          this.searchResultForTrack.set(song.filePath, {
            loading: false,
            success: false,
            error: response.message ?? "Arama başarısız",
          });
        }
      },
      error: (error: unknown) => {
        console.error("Track search failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Arama başarısız";
        this.searchResultForTrack.set(song.filePath, {
          loading: false,
          success: false,
          error: errorMessage,
        });
      },
    });
  }

  async fixTrack(song: Song, newPath: string) {
    // 1. Önce preview (hangi playlist'ler etkilenecek?)
    this.fixLoadingForTrack.set(song.filePath, true);

    this.playlistService.bulkFixTrack(song.filePath, newPath).subscribe({
      next: (previewResponse: BulkFixPreviewResponse) => {
        if (!previewResponse.success) {
          this.fixLoadingForTrack.set(song.filePath, false);
          alert("Ön izleme başarısız.");
          return;
        }

        // 2. Kullanıcıya sor (dialog)
        const message =
          `Bu dosya ${previewResponse.totalPlaylists} playlist'te kullanılıyor:\n\n` +
          previewResponse.affectedPlaylists
            .slice(0, 10)
            .map((playlist) => `- ${playlist.name}`)
            .join("\n") +
          (previewResponse.totalPlaylists > 10
            ? `\n... ve ${previewResponse.totalPlaylists - 10} tane daha`
            : "") +
          `\n\nTümü güncellensin mi?`;

        if (confirm(message)) {
          // 3. Confirm ile fix et
          this.confirmFix(song.filePath, newPath);
        } else {
          this.fixLoadingForTrack.set(song.filePath, false);
        }
      },
      error: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "Ön izleme başarısız";
        alert("Preview başarısız: " + errorMessage);
        this.fixLoadingForTrack.set(song.filePath, false);
      },
    });
  }

  async confirmFix(oldPath: string, newPath: string) {
    this.playlistService.bulkFixTrackConfirm(oldPath, newPath).subscribe({
      next: (result: BulkFixConfirmResponse) => {
        alert(`Başarılı!\n${result.filesUpdated} playlist güncellendi.`);
        this.fixLoadingForTrack.set(oldPath, false);
        this.expandedTrackPath = null;

        // Playlist'i yeniden yükle
        this.reloadCurrentPlaylist.emit();
      },
      error: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "Fix başarısız";
        alert("Fix başarısız: " + errorMessage);
        this.fixLoadingForTrack.set(oldPath, false);
      },
    });
  }

  private createPreviewSong(baseSong: Song, filePath: string): Song {
    return {
      ...baseSong,
      filePath,
      isFileExists: true,
      status: "exists",
    };
  }

  getResultScorePercent(result: TrackSearchResultResponse): number {
    if (!result?.score) {
      return 0;
    }
    const rawPercent = (result.score / 1000) * 100;
    return Math.max(0, Math.min(100, rawPercent));
  }

  getMatchedWords(song: Song, result: TrackSearchResultResponse): string[] {
    if (!result?.track_path) {
      return [];
    }

    const originalPath =
      song.status === "updated" ? song.originalPath ?? song.filePath : song.filePath;
    const originalFileName = this.extractFileName(originalPath);
    const candidateFileName = this.extractFileName(result.track_path);

    if (!originalFileName || !candidateFileName) {
      return [];
    }

    const originalWords = new Set(this.tokenizeFileName(originalFileName));
    if (originalWords.size === 0) {
      return [];
    }

    const candidateWords = this.tokenizeFileName(candidateFileName);
    const matched: string[] = [];

    for (const word of candidateWords) {
      if (originalWords.has(word) && !matched.includes(word)) {
        matched.push(word);
      }
    }

    return matched;
  }

  getMatchTooltip(song: Song, result: TrackSearchResultResponse): string {
    const matched = this.getMatchedWords(song, result);
    if (matched.length === 0) {
      return "Eşleşen kelime bulunamadı";
    }
    return `Eşleşen kelimeler: ${matched.join(", ")}`;
  }

  private extractFileName(fullPath?: string | null): string | null {
    if (!fullPath) {
      return null;
    }
    const parts = fullPath.split(/[/\\]/);
    return parts.length ? parts[parts.length - 1] : null;
  }

  private tokenizeFileName(fileName: string): string[] {
    return fileName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\.[^/.]+$/, "")
      .replace(/[_\-]+/g, " ")
      .replace(/[^a-z0-9\s]+/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }
}
