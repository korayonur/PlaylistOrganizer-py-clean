import {
  Component,
  Inject,
  ViewEncapsulation,
  OnInit,
  ChangeDetectorRef,
  AfterViewInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatBadgeModule } from "@angular/material/badge";
import { MatChipsModule } from "@angular/material/chips";
import { MatDividerModule } from "@angular/material/divider";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { SearchResponse, SearchResult, SearchInfo, SearchStats } from "../../models/api.model";
import { firstValueFrom } from "rxjs";
import { provideAnimations } from "@angular/platform-browser/animations";
import { signal } from "@angular/core";
import { ConfigService } from "../../services/config.service";
import { PlaylistService } from "../../services/playlist.service";

interface GlobalMissingFile {
  originalPath: string;
  playlistName: string;
  playlistPath: string;
}

interface GlobalStats {
  playlists_checked: number;
  unique_missing_files: number;
  totalUpdated?: number;
  totalPlaylistsUpdated?: number;
}

interface GlobalUpdateResponse {
  success: boolean;
  totalUpdated: number;
  totalPlaylistsUpdated: number;
}

interface ServerSearchItem {
  originalPath?: string;
  found?: boolean;
  matchType: string;
  processTime?: number | string;
  foundPath?: string;
  bestMatch?: {
    path?: string;
  };
  searchInfo?: SearchInfo;
}

interface ServerSearchResponse {
  status: "success" | "error";
  data: ServerSearchItem[];
  stats: SearchStats;
}

interface RemoveFromAllResponse {
  success: boolean;
  totalRemovedCount: number;
  removedFromPlaylists: string[];
}

interface RemovedSongResult {
  songPath: string;
  removedFrom: string[];
  totalRemoved: number;
}

export interface DialogData {
  paths: string[];
  playlistPath: string;
  category: string;
  globalMissingFiles?: GlobalMissingFile[];
  globalStats?: GlobalStats;
}

// PlaylistInfo interface kaldırıldı - artık sadece son okunan playlist bilgisi kullanılıyor

@Component({
  selector: "app-multisearch-dialog",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatIconModule,
    MatTooltipModule,
    MatBadgeModule,
    MatChipsModule,
    MatDividerModule,
    MatExpansionModule,
    MatCheckboxModule,
  ],
  providers: [provideAnimations()],
  templateUrl: "./multisearch-dialog.component.html",
  styleUrls: ["./multisearch-dialog.component.scss"],
  encapsulation: ViewEncapsulation.None,
  host: {
    class: "app-multisearch-dialog",
    "[class.searching]": "isSearching",
    "[class.has-error]": "error !== null",
    "[class.has-results]": "searchResults?.items?.length > 0",
  },
})
export class MultisearchDialogComponent implements OnInit, AfterViewInit {
  searchForm: FormGroup;
  searchResults: SearchResponse | null = null;
  isLoading = false;
  error: string | null = null;
  isSearching = false;
  selectedItems = new Set<string>();
  playlistInfo = signal<{ name: string; path: string; category: string } | null>(null);
  globalMissingFiles: GlobalMissingFile[] = [];
  globalStats: GlobalStats | null = null;
  isGlobalMode = false;

  private getApiUrl(): string {
    return this.configService.getApiUrl();
  }
  activeFilters: Set<string> = new Set();
  filteredResults: SearchResult[] | null = null;

  // Benzerlik skoru filtresi
  similarityThreshold = 0.7; // Varsayılan eşik
  showSimilarityFilter = false;

  // Grup seçim durumlarını tutacak map
  private groupSelectionState = new Map<string, boolean>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private dialogRef: MatDialogRef<MultisearchDialogComponent>,
    private http: HttpClient,
    private changeDetector: ChangeDetectorRef,
    private fb: FormBuilder,
    private configService: ConfigService,
    private playlistService: PlaylistService,
  ) {
    // Form başlatma
    this.searchForm = this.fb.group({
      paths: [this.data.paths],
      options: this.fb.group({
        fuzzySearch: [true],
        batchSize: [100, [Validators.min(1), Validators.max(1000)]],
      }),
    });

    // Dialog yapılandırması
    this.dialogRef.addPanelClass(["multisearch-dialog-panel", "modern-dialog"]);
    this.dialogRef.updateSize("90vw", "90vh");

    // Global mode kontrolü
    if (this.data.playlistPath === "global") {
      this.isGlobalMode = true;

      // Veri zaten app.component.ts'den geliyor, tekrar API çağrısı yapma
      if (this.data.globalMissingFiles) {
        this.globalMissingFiles = this.data.globalMissingFiles;
        this.globalStats = this.data.globalStats ?? null;
      }

      this.playlistInfo.set({
        name: "Tüm Eksik Dosyalar",
        path: "global",
        category: "Global",
      });

      // Veri zaten yüklü, direkt sonuçları göster
      this.performGlobalSearch();
    } else {
      // Normal playlist mode
      if (this.data.playlistPath) {
        // VirtualDJ klasör yapısından playlist adını çıkar
        const pathParts = this.data.playlistPath.split("/");
        const folderIndex = pathParts.findIndex((part) => part === "Folders");
        const playlistName = pathParts
          .slice(folderIndex + 1)
          .map((part) => part.replace(".vdjfolder", "").replace(".subfolders", ""))
          .join(" / ");

        this.playlistInfo.set({
          name: playlistName,
          path: this.data.playlistPath,
          category: this.data.category || "Genel",
        });
      }
    }
  }

  ngOnInit() {
    // Global mode'da search() çağrılmaz, performGlobalSearch() kullanılır
    if (this.isGlobalMode) {
      return; // Global mode'da ngOnInit'te hiçbir şey yapma
    }

    if (this.data.paths && this.data.paths.length > 0) {
      this.search(this.data.paths).then(() => {
        // Arama tamamlandıktan sonra benzerDosya dışındaki tüm sonuçları seç
        if (this.searchResults?.data) {
          this.searchResults.data
            .filter((result) => result.found && result.matchType !== "benzerDosya")
            .forEach((result) => this.selectedItems.add(result.originalPath));
        }
      });
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.checkDialogStructure();
    }, 0);
  }

  private checkDialogStructure() {
    const hasRequiredSelectors = [
      ".mat-mdc-dialog-container",
      ".mdc-dialog__container",
      ".mdc-dialog__surface",
    ].every((selector) => !!document.querySelector(selector));

    if (hasRequiredSelectors) {
      this.changeDetector.detectChanges();
    }
  }

  trackByPath(index: number, result: SearchResult): string {
    return result.originalPath;
  }

  get stats() {
    return this.searchResults?.stats;
  }

  get generalStats() {
    if (!this.searchResults?.stats) {
      return { total: 0, processed: 0, matches: 0, notFound: 0 };
    }

    const found = this.searchResults.data?.filter((r) => r.found).length || 0;
    const notFound = this.searchResults.data?.filter((r) => !r.found).length || 0;

    return {
      total: this.searchResults.stats.totalProcessed,
      processed: this.searchResults.stats.totalProcessed,
      matches: found,
      notFound: notFound,
    };
  }

  getAverageProcessTime(): number {
    if (!this.searchResults?.stats) {
      return 0;
    }
    return this.searchResults.stats.averageProcessTime;
  }

  close(): void {
    this.dialogRef.close();
  }

  async search(paths: string[]): Promise<void> {
    if (!paths || paths.length === 0) return;

    this.isSearching = true;
    this.error = null;

    try {
      const formValue = this.searchForm.value;
      const response = await firstValueFrom(
        this.http.post<ServerSearchResponse>(`${this.getApiUrl()}/search/files`, {
          paths,
          options: {
            ...formValue.options,
            batchSize: this.isGlobalMode ? 50 : 100, // Global mode'da daha küçük batch
            fuzzySearch: true,
          },
        }),
      );

      if (response && response.status === "success") {
        // Backend'den gelen yeni veri yapısını eski yapıya dönüştür
        this.searchResults = this.transformSearchResponse(response);
        this.changeDetector.detectChanges();
      } else {
        this.error = "Arama başarısız oldu";
      }
    } catch (err) {
      this.error = "Arama sırasında bir hata oluştu";
    } finally {
      this.isSearching = false;
      this.changeDetector.detectChanges();
    }
  }

  getMatchStatus(result: SearchResult): "success" | "warning" | "error" {
    if (!result.found) return "error";
    switch (result.matchType) {
      case "tamYolEsleme":
        return "success";
      case "ayniKlasorFarkliUzanti":
        return "warning";
      case "farkliKlasor":
        return "warning";
      case "farkliKlasorveUzanti":
        return "warning";
      case "benzerDosya":
        return "error";
      default:
        return "error";
    }
  }

  getMatchStatusText(result: SearchResult): string {
    if (!result.found) return "Bulunamadı";
    switch (result.matchType) {
      case "tamYolEsleme":
        return "Tam Eşleşme";
      case "ayniKlasorFarkliUzanti":
        return "Aynı Klasör Farklı Uzantı";
      case "farkliKlasor":
        return "Farklı Klasör";
      case "farkliKlasorveUzanti":
        return "Farklı Klasör ve Uzantı";
      case "benzerDosya":
        return "Benzer Dosya";
      default:
        return "Bilinmeyen Durum";
    }
  }

  getMatchIcon(result: SearchResult): string {
    const status = this.getMatchStatus(result);
    switch (status) {
      case "success":
        return "check_circle";
      case "warning":
        return "warning";
      case "error":
        return "error";
    }
  }

  getPerformanceMetrics(): { totalTime: number; averageTime: number; efficiency: number } {
    if (!this.searchResults?.stats) {
      return { totalTime: 0, averageTime: 0, efficiency: 0 };
    }

    const { executionTime, averageProcessTime, totalProcessed } = this.searchResults.stats;

    // Bulunan dosya sayısını hesapla
    const found = this.searchResults.data?.filter((r) => r.found).length || 0;

    // Sıfıra bölme kontrolü
    const efficiency = totalProcessed > 0 ? (found / totalProcessed) * 100 : 0;

    return {
      totalTime: executionTime || 0,
      averageTime: averageProcessTime || 0,
      efficiency: Number(efficiency.toFixed(1)),
    };
  }

  getMatchDetails(result: SearchResult): {
    bestMatch: { score: number; range: string } | null;
    averageScore: number;
    matchCount: number;
  } {
    if (!result.found) {
      return { bestMatch: null, averageScore: 0, matchCount: 0 };
    }

    const score = this.getMatchTypeScore(result.matchType);
    return {
      bestMatch: {
        score,
        range: result.foundPath || "N/A",
      },
      averageScore: score,
      matchCount: 1,
    };
  }

  getMatchTypeScore(matchType: SearchResult["matchType"]): number {
    switch (matchType) {
      case "tamYolEsleme":
        return 1.0;
      case "ayniKlasorFarkliUzanti":
        return 0.9;
      case "farkliKlasor":
        return 0.8;
      case "farkliKlasorveUzanti":
        return 0.7;
      case "benzerDosya":
        return 0.6;
      default:
        return 0;
    }
  }

  isSelected(result: SearchResult): boolean {
    return this.selectedItems.has(result.originalPath);
  }

  toggleSelection(result: SearchResult): void {
    if (this.isSelected(result)) {
      this.selectedItems.delete(result.originalPath);
    } else {
      this.selectedItems.add(result.originalPath);
    }
  }

  selectAll(): void {
    if (!this.searchResults?.data) return;
    this.searchResults.data
      .filter((result) => result.found)
      .forEach((result) => this.selectedItems.add(result.originalPath));
  }

  clearSelection(): void {
    this.selectedItems.clear();
  }

  hasSelectedItems(): boolean {
    return this.selectedItems.size > 0;
  }

  getSelectedCount(): number {
    return this.selectedItems.size;
  }

  async saveSelected(): Promise<void> {
    if (!this.searchResults?.data || !this.hasSelectedItems()) return;

    const selectedResults = this.searchResults.data.filter(
      (result) => this.isSelected(result) && result.found,
    );

    const items = selectedResults.map((result) => ({
      oldPath: result.originalPath,
      newPath: result.foundPath,
    }));

    // Onay mesajı kaldırıldı - doğrudan işleme başla

    this.isSearching = true;
    this.error = null;

    try {
      let globalUpdateStats: GlobalUpdateResponse | null = null;
      const updatedPaths = new Set<string>(); // Güncellenen dosyaları takip et

      // Global mode'da sadece global güncelleme yap
      if (this.isGlobalMode) {
        const globalResponse = await firstValueFrom(
          this.http.post<GlobalUpdateResponse>(`${this.getApiUrl()}/playlistsong/global-update`, {
            items,
            updateAllPlaylists: true,
          }),
        );

        globalUpdateStats = globalResponse;

        // Güncellenen dosyaları işaretle
        selectedResults.forEach((result) => updatedPaths.add(result.originalPath));
      } else {
        // Normal mode'da önce mevcut playlist'i güncelle
        const playlistPath = this.getPlaylistPath();
        if (playlistPath && playlistPath !== "global") {
          await firstValueFrom(
            this.http.post(`${this.getApiUrl()}/playlistsong/update`, {
              playlistPath,
              items,
            }),
          );
        }

        // Sonra global güncelleme yap
        const globalResponse = await firstValueFrom(
          this.http.post<GlobalUpdateResponse>(`${this.getApiUrl()}/playlistsong/global-update`, {
            items,
            updateAllPlaylists: true,
          }),
        );

        globalUpdateStats = globalResponse;

        // Güncellenen dosyaları işaretle
        selectedResults.forEach((result) => updatedPaths.add(result.originalPath));
      }

      // Local olarak güncellenen dosyaları arayüzden kaldır
      if (updatedPaths.size > 0) {
        this.removeUpdatedSongsFromUI(Array.from(updatedPaths));
      }

      // Global stats'i güncelle - benzersiz eksik dosya sayısını azalt
      if (this.globalStats && selectedResults.length > 0) {
        this.globalStats.unique_missing_files = Math.max(
          0,
          this.globalStats.unique_missing_files - selectedResults.length,
        );
        console.log(
          `📊 Global stats güncellendi: ${selectedResults.length} dosya işlendi, kalan benzersiz eksik dosya: ${this.globalStats.unique_missing_files}`,
        );
      }

      // Modern mesaj sistemi
      this.showSaveSuccessMessage(selectedResults.length, globalUpdateStats);

      // Seçimi temizle
      this.clearSelection();

      // Dialog'u kapat (isteğe bağlı)
      // this.dialogRef.close({
      //   success: true,
      //   data: selectedResults,
      //   globalStats: globalStats
      // });
    } catch (err) {
      console.error("Kaydetme hatası:", err);
      this.error = "Seçili öğeler kaydedilirken bir hata oluştu";
      this.showSaveErrorMessage();
    } finally {
      this.isSearching = false;
    }
  }

  getPlaylistName(): string {
    return this.playlistInfo()?.name || "Playlist";
  }

  getPlaylistCategory(): string {
    return this.playlistInfo()?.category || "Genel";
  }

  getPlaylistPath(): string {
    return this.playlistInfo()?.path || "";
  }

  // loadGlobalMissingFiles fonksiyonu kaldırıldı - veri zaten app.component.ts'den geliyor

  async performGlobalSearch(): Promise<void> {
    if (!this.globalMissingFiles || this.globalMissingFiles.length === 0) {
      this.isSearching = false;
      return;
    }

    // Debug: Veriyi kontrol et
    console.log("Global missing files:", this.globalMissingFiles[0]);
    console.log("Playlist name:", this.globalMissingFiles[0]?.playlistName);
    console.log("Playlist path:", this.globalMissingFiles[0]?.playlistPath);

    // Loading göstergesini başlat
    this.isSearching = true;
    this.error = null;

    // 1. Önce global-missing API'si çalıştı (zaten çalıştı)
    // 2. Şimdi benzerlik algoritması çalıştır (466 dosya için toplu arama)
    const paths = this.globalMissingFiles.map((file) => file.originalPath);

    try {
      const formValue = this.searchForm.value;
      const response = await firstValueFrom(
        this.http.post<ServerSearchResponse>(`${this.getApiUrl()}/search/files`, {
          paths,
          options: {
            ...formValue.options,
            batchSize: 50, // Global mode'da daha küçük batch
            fuzzySearch: true,
          },
        }),
      );

      if (response && response.status === "success") {
        // Backend'den gelen yeni veri yapısını eski yapıya dönüştür
        const transformedResponse = this.transformSearchResponse(response);

        // Benzerlik sonuçlarını playlist bilgileriyle birleştir
        this.searchResults = {
          ...transformedResponse,
          data: transformedResponse.data.map((result) => {
            const originalFile = this.globalMissingFiles.find(
              (f) => f.originalPath === result.originalPath,
            );
            return {
              ...result,
              // Her dosya için son okunan playlist bilgisini ekle
              lastPlaylistName: originalFile?.playlistName,
              lastPlaylistPath: originalFile
                ? this.getShortPlaylistPath(originalFile.playlistPath)
                : undefined,
            };
          }),
        };
      } else {
        // Hata durumunda sadece eksik dosyaları göster
        this.searchResults = {
          status: "success",
          data: this.globalMissingFiles.map((file) => ({
            originalPath: file.originalPath,
            found: false,
            matchType: "benzerDosya" as const,
            algoritmaYontemi: "Eksik Dosya",
            processTime: "0",
            lastPlaylistName: file.playlistName,
            lastPlaylistPath: this.getShortPlaylistPath(file.playlistPath),
          })),
          stats: {
            totalProcessed: this.globalMissingFiles.length,
            executionTime: 0,
            averageProcessTime: 0,
            matchDetails: {
              tamYolEsleme: { count: 0, time: "0", algoritmaYontemi: "Tam Yol Eşleşme" },
              ayniKlasorFarkliUzanti: {
                count: 0,
                time: "0",
                algoritmaYontemi: "Aynı Klasör Farklı Uzantı",
              },
              farkliKlasorveUzanti: {
                count: 0,
                time: "0",
                algoritmaYontemi: "Farklı Klasör Farklı Uzantı",
              },
              farkliKlasor: { count: 0, time: "0", algoritmaYontemi: "Farklı Klasör Aynı Ad" },
              benzerDosya: {
                count: this.globalMissingFiles.length,
                time: "0",
                algoritmaYontemi: "Eksik Dosya",
              },
            },
            foundCount: 0,
            notFoundCount: this.globalMissingFiles.length,
          },
        };
      }
    } catch (error) {
      console.error("Global search error:", error);
      this.error = "Global arama sırasında hata oluştu";

      // Hata durumunda sadece eksik dosyaları göster
      this.searchResults = {
        status: "success",
        data: this.globalMissingFiles.map((file) => ({
          originalPath: file.originalPath,
          found: false,
          matchType: "benzerDosya" as const,
          algoritmaYontemi: "Eksik Dosya",
          processTime: "0",
          lastPlaylistName: file.playlistName,
          lastPlaylistPath: this.getShortPlaylistPath(file.playlistPath),
        })),
        stats: {
          totalProcessed: this.globalMissingFiles.length,
          executionTime: 0,
          averageProcessTime: 0,
          matchDetails: {
            tamYolEsleme: { count: 0, time: "0", algoritmaYontemi: "Tam Yol Eşleşme" },
            ayniKlasorFarkliUzanti: {
              count: 0,
              time: "0",
              algoritmaYontemi: "Aynı Klasör Farklı Uzantı",
            },
            farkliKlasorveUzanti: {
              count: 0,
              time: "0",
              algoritmaYontemi: "Farklı Klasör Farklı Uzantı",
            },
            farkliKlasor: { count: 0, time: "0", algoritmaYontemi: "Farklı Klasör Aynı Ad" },
            benzerDosya: {
              count: this.globalMissingFiles.length,
              time: "0",
              algoritmaYontemi: "Eksik Dosya",
            },
          },
          foundCount: 0,
          notFoundCount: this.globalMissingFiles.length,
        },
      };
    }

    // Loading state'ini kapat
    this.isSearching = false;
  }

  filterResults(type: string) {
    if (this.activeFilters.has(type)) {
      this.activeFilters.delete(type);
    } else {
      this.activeFilters.add(type);
    }

    if (this.activeFilters.size === 0) {
      this.filteredResults = this.searchResults?.data || null;
    } else {
      this.filteredResults =
        this.searchResults?.data?.filter((result) => this.activeFilters.has(result.matchType)) ||
        null;
    }
  }

  isFilterActive(type: string): boolean {
    return this.activeFilters.has(type);
  }

  get displayResults(): SearchResult[] {
    let results = this.filteredResults || this.searchResults?.data || [];

    // Benzerlik skoru filtresi uygula
    if (this.showSimilarityFilter) {
      results = results.filter((result) => {
        if (!result.found || !result.searchInfo?.bestMatchSimilarity) {
          return false;
        }

        // En iyi eşleşmenin benzerlik skorunu kontrol et
        return result.searchInfo.bestMatchSimilarity >= this.similarityThreshold;
      });
    }

    return results;
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
    if (!this.searchResults?.data) return;

    // Önce mevcut seçimleri temizle
    this.selectedItems.clear();

    // Filtrelenmiş sonuçları al
    const filteredResults = this.displayResults;

    // Eşik değerini karşılayan sonuçları seç
    filteredResults.forEach((result) => {
      if (result.found && result.searchInfo?.bestMatchSimilarity) {
        if (result.searchInfo.bestMatchSimilarity >= this.similarityThreshold) {
          this.selectedItems.add(result.originalPath);
        }
      }
    });

    // Grup seçim durumlarını güncelle
    this.updateGroupSelectionStates();
  }

  // Grup seçim durumlarını güncelle
  updateGroupSelectionStates(): void {
    if (!this.searchResults?.data) return;

    // Her grup için seçim durumunu kontrol et
    const groupTypes = [
      "tamYolEsleme",
      "ayniKlasorFarkliUzanti",
      "farkliKlasor",
      "farkliKlasorveUzanti",
      "benzerDosya",
    ];

    groupTypes.forEach((groupType) => {
      const groupResults = (this.searchResults?.data ?? []).filter(
        (result: SearchResult) => result.matchType === groupType && result.found,
      );

      if (groupResults.length === 0) {
        this.groupSelectionState.set(groupType, false);
        return;
      }

      // Bu gruptaki tüm sonuçlar seçili mi kontrol et
      const allSelected = groupResults.every((result: SearchResult) =>
        this.selectedItems.has(result.originalPath),
      );

      this.groupSelectionState.set(groupType, allSelected);
    });
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

  // Grup seçimini değiştir
  toggleGroupSelection(groupType: string, event: Event) {
    event.stopPropagation(); // Tıklama olayının filtrelemeyi tetiklemesini engelle

    const currentState = this.isGroupSelected(groupType);
    this.groupSelectionState.set(groupType, !currentState);

    if (this.searchResults?.data) {
      const groupResults = this.searchResults.data.filter(
        (result: SearchResult) => result.matchType === groupType,
      );

      if (!currentState) {
        groupResults.forEach((result: SearchResult) => {
          if (result.found) {
            this.selectedItems.add(result.originalPath);
          }
        });
      } else {
        groupResults.forEach((result: SearchResult) => {
          this.selectedItems.delete(result.originalPath);
        });
      }
    }
  }

  // Bir grubun seçili olup olmadığını kontrol et
  isGroupSelected(groupType: string): boolean {
    if (!this.searchResults?.data) return false;

    const groupResults = this.searchResults.data.filter(
      (result: SearchResult) => result.matchType === groupType,
    );

    // Gruptaki tüm dosyalar seçili mi kontrol et
    return (
      groupResults.length > 0 &&
      groupResults.every((result: SearchResult) => this.selectedItems.has(result.originalPath))
    );
  }

  // Backend'den gelen yeni veri yapısını eski yapıya dönüştür
  private transformSearchResponse(response: ServerSearchResponse): SearchResponse {
    const transformedData = response.data.map((item) => {
      const result: SearchResult = {
        originalPath: item.searchInfo?.inputValue || item.originalPath || "",
        found: item.found || false,
        matchType: this.mapMatchType(item.matchType),
        algoritmaYontemi: this.getAlgorithmMethod(item.matchType, item.searchInfo),
        processTime: item.processTime?.toString() || "0",
        foundPath: item.bestMatch?.path || item.foundPath || "",
        searchInfo: item.searchInfo,
      };
      return result;
    });

    return {
      status: response.status,
      data: transformedData,
      stats: response.stats,
    };
  }

  // Match type'ı eski formata dönüştür
  private mapMatchType(
    matchType: string,
  ):
    | "tamYolEsleme"
    | "farkliKlasor"
    | "ayniKlasorFarkliUzanti"
    | "farkliKlasorveUzanti"
    | "benzerDosya" {
    switch (matchType) {
      case "benzerDosya":
        return "benzerDosya";
      case "tamYolEsleme":
        return "tamYolEsleme";
      case "ayniKlasorFarkliUzanti":
        return "ayniKlasorFarkliUzanti";
      case "farkliKlasor":
        return "farkliKlasor";
      case "farkliKlasorveUzanti":
        return "farkliKlasorveUzanti";
      default:
        return "benzerDosya";
    }
  }

  // Algoritma yöntemini belirle
  private getAlgorithmMethod(matchType: string, searchInfo: SearchInfo | undefined): string {
    if (searchInfo?.searchStage) {
      return searchInfo.searchStage;
    }

    switch (matchType) {
      case "benzerDosya":
        return "Benzer Dosya Arama";
      case "tamYolEsleme":
        return "Tam Yol Eşleşme";
      case "ayniKlasorFarkliUzanti":
        return "Aynı Klasör Farklı Uzantı";
      case "farkliKlasor":
        return "Farklı Klasör";
      case "farkliKlasorveUzanti":
        return "Farklı Klasör ve Uzantı";
      default:
        return "Bilinmeyen Yöntem";
    }
  }

  // Global mode'da playlist bilgilerini yükleme işlemi kaldırıldı
  // Artık her dosya için sadece son okunan playlist bilgisi gösteriliyor

  // Playlist yolunu kısalt - VirtualDJ root'tan sonrasını göster
  getShortPlaylistPath(fullPath: string): string {
    const virtualDJRoot = this.configService
      .getConfig()
      .paths.playlistFolder.replace("/Folders", "");
    if (fullPath.startsWith(virtualDJRoot)) {
      return fullPath.substring(virtualDJRoot.length + 1); // +1 for the leading slash
    }
    return fullPath;
  }

  async removeFromAllPlaylists(): Promise<void> {
    if (!this.hasSelectedItems()) {
      return;
    }

    const selectedPaths = Array.from(this.selectedItems);
    // Onay mesajı kaldırıldı - doğrudan işleme başla

    this.isSearching = true;
    this.error = null;

    try {
      let totalRemoved = 0;
      const results: RemovedSongResult[] = [];
      const removedSongPaths = new Set<string>(); // Kaldırılan şarkıları takip et

      // Her seçili şarkı için ayrı ayrı kaldır
      for (const songPath of selectedPaths) {
        const response = await firstValueFrom(
          this.http.post<RemoveFromAllResponse>(
            `${this.getApiUrl()}/playlistsong/remove-from-all`,
            { songPath },
          ),
        );

        if (response && response.success) {
          totalRemoved += response.totalRemovedCount;
          results.push({
            songPath,
            removedFrom: response.removedFromPlaylists,
            totalRemoved: response.totalRemovedCount,
          });

          // Eğer şarkı kaldırıldıysa, local olarak da kaldır
          if (response.totalRemovedCount > 0) {
            removedSongPaths.add(songPath);
          }
        } else {
          console.error("Şarkı kaldırma hatası:", response);
        }
      }

      // Local olarak kaldırılan şarkıları arayüzden de kaldır
      if (removedSongPaths.size > 0) {
        this.removeSongsFromUI(Array.from(removedSongPaths));
      }

      // Modern mesaj sistemi - Toast benzeri
      this.showModernMessage(totalRemoved, results, removedSongPaths.size);

      // Sonuçları konsola yazdır
      console.log("Playlist kaldırma sonuçları:", results);

      // Seçimi temizle
      this.clearSelection();

      // Dialog'u kapat (isteğe bağlı)
      // this.dialogRef.close();
    } catch (error) {
      console.error("Playlist kaldırma hatası:", error);
      this.error = "Şarkılar playlist'lerden kaldırılırken hata oluştu";
    } finally {
      this.isSearching = false;
    }
  }

  // Local olarak şarkıları arayüzden kaldır
  private removeSongsFromUI(removedPaths: string[]): void {
    if (!this.searchResults?.data) return;

    // Kaldırılan şarkıları filtrele
    this.searchResults.data = this.searchResults.data.filter(
      (result) => !removedPaths.includes(result.originalPath),
    );

    // İstatistikleri güncelle
    if (this.searchResults.stats) {
      this.searchResults.stats.foundCount = this.searchResults.data.filter((r) => r.found).length;
      this.searchResults.stats.notFoundCount = this.searchResults.data.filter(
        (r) => !r.found,
      ).length;
    }

    // Seçili öğeleri temizle
    this.selectedItems.clear();

    // Change detection'ı tetikle
    this.changeDetector.detectChanges();
  }

  // Modern mesaj sistemi
  private showModernMessage(
    totalRemoved: number,
    results: RemovedSongResult[],
    removedFiles: number,
  ): void {
    // Toast benzeri mesaj oluştur
    const messageContainer = document.createElement("div");
    messageContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${totalRemoved > 0 ? "#4caf50" : "#ff9800"};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: 'Roboto', sans-serif;
      font-size: 14px;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;

    // CSS animasyonu ekle
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    if (totalRemoved > 0) {
      // Daha anlamlı mesaj oluştur
      const playlistCount = results.reduce(
        (sum, result) => sum + (result.removedFrom?.length || 0),
        0,
      );
      const fileCount = removedFiles;

      let messageText = "";
      if (fileCount === 1) {
        messageText = `1 dosya ${playlistCount} playlist'ten kaldırıldı`;
      } else {
        messageText = `${fileCount} dosya toplam ${playlistCount} playlist'ten kaldırıldı`;
      }

      messageContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">✅</span>
          <div>
            <div style="font-weight: bold; margin-bottom: 4px;">Başarılı!</div>
            <div>${messageText}</div>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Arayüzden de kaldırıldı</div>
          </div>
        </div>
      `;
    } else {
      messageContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">ℹ️</span>
          <div>
            <div style="font-weight: bold; margin-bottom: 4px;">Bilgi</div>
            <div>Seçilen dosyalar playlist'lerde bulunamadı</div>
          </div>
        </div>
      `;
    }

    // Mesajı DOM'a ekle
    document.body.appendChild(messageContainer);

    // 4 saniye sonra kaldır
    setTimeout(() => {
      messageContainer.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => {
        if (messageContainer.parentNode) {
          messageContainer.parentNode.removeChild(messageContainer);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 300);
    }, 4000);
  }

  // Güncellenen şarkıları arayüzden kaldır
  private removeUpdatedSongsFromUI(updatedPaths: string[]): void {
    if (!this.searchResults?.data) return;

    // Güncellenen şarkıları filtrele
    this.searchResults.data = this.searchResults.data.filter(
      (result) => !updatedPaths.includes(result.originalPath),
    );

    // İstatistikleri güncelle
    if (this.searchResults.stats) {
      this.searchResults.stats.foundCount = this.searchResults.data.filter((r) => r.found).length;
      this.searchResults.stats.notFoundCount = this.searchResults.data.filter(
        (r) => !r.found,
      ).length;
    }

    // Seçili öğeleri temizle
    this.selectedItems.clear();

    // Change detection'ı tetikle
    this.changeDetector.detectChanges();
  }

  // Kaydetme başarı mesajı
  private showSaveSuccessMessage(
    fileCount: number,
    updateStats: GlobalUpdateResponse | null,
  ): void {
    const messageContainer = document.createElement("div");
    messageContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: 'Roboto', sans-serif;
      font-size: 14px;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;

    // CSS animasyonu ekle
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    // Backend'den gelen gerçek verileri kullan
    const totalSongsUpdated = updateStats?.totalUpdated ?? 0; // Toplam güncellenen şarkı sayısı
    const playlistCount = updateStats?.totalPlaylistsUpdated ?? 0; // Güncellenen playlist sayısı
    const selectedFileCount = fileCount; // Seçilen dosya sayısı

    let messageText = "";
    if (selectedFileCount === 1) {
      messageText = `1 dosya seçildi, ${totalSongsUpdated} şarkı ${playlistCount} playlist'te güncellendi`;
    } else {
      messageText = `${selectedFileCount} dosya seçildi, ${totalSongsUpdated} şarkı ${playlistCount} playlist'te güncellendi`;
    }

    messageContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">✅</span>
        <div>
          <div style="font-weight: bold; margin-bottom: 4px;">Güncelleme Başarılı!</div>
          <div>${messageText}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Arayüzden de kaldırıldı</div>
        </div>
      </div>
    `;

    // Mesajı DOM'a ekle
    document.body.appendChild(messageContainer);

    // 5 saniye sonra kaldır
    setTimeout(() => {
      messageContainer.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => {
        if (messageContainer.parentNode) {
          messageContainer.parentNode.removeChild(messageContainer);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 300);
    }, 5000);
  }

  // Kaydetme hata mesajı
  private showSaveErrorMessage(): void {
    const messageContainer = document.createElement("div");
    messageContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: 'Roboto', sans-serif;
      font-size: 14px;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;

    // CSS animasyonu ekle
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    messageContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">❌</span>
        <div>
          <div style="font-weight: bold; margin-bottom: 4px;">Hata!</div>
          <div>Dosyalar güncellenirken bir hata oluştu</div>
        </div>
      </div>
    `;

    // Mesajı DOM'a ekle
    document.body.appendChild(messageContainer);

    // 5 saniye sonra kaldır
    setTimeout(() => {
      messageContainer.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => {
        if (messageContainer.parentNode) {
          messageContainer.parentNode.removeChild(messageContainer);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 300);
    }, 5000);
  }
}
