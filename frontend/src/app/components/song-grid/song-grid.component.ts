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
  
  // Benzerlik skoru filtresi
  similarityThreshold = 0.7;
  showSimilarityFilter = false;
  
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
    songs.forEach(song => {
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
    return songs.filter(song => 
      song.similarFiles && 
      song.similarFiles.length > 0 && 
      song.similarFiles[0].similarity >= this.similarityThreshold
    ).length;
  }
  
  getSimilarityColor(similarity: number): string {
    if (similarity >= 1.0) return '#4caf50'; // Yeşil - Mükemmel
    if (similarity >= 0.85) return '#2196f3'; // Mavi - Çok yüksek
    if (similarity >= 0.7) return '#ff9800'; // Turuncu - Yüksek
    if (similarity >= 0.5) return '#ffc107'; // Sarı - Orta
    return '#9e9e9e'; // Gri - Düşük
  }
  
  getSimilarityLabel(similarity: number): string {
    if (similarity >= 1.0) return 'Mükemmel Eşleşme';
    if (similarity >= 0.85) return 'Çok Yüksek Benzerlik';
    if (similarity >= 0.7) return 'Yüksek Benzerlik';
    if (similarity >= 0.5) return 'Orta Benzerlik';
    return 'Düşük Benzerlik';
  }
  
  // Filtrelenmiş şarkıları döndür
  get filteredSongs(): Song[] {
    let songs = this._songs();
    
    if (this.showSimilarityFilter) {
      songs = songs.filter(song => {
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
}
