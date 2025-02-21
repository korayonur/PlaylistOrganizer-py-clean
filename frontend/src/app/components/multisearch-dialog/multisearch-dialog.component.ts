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
import { SearchResponse, SearchResult } from "../../models/api.model";
import { firstValueFrom } from "rxjs";
import { provideAnimations } from "@angular/platform-browser/animations";
import { signal } from "@angular/core";
import { environment } from '../../../environments/environment';

export interface DialogData {
  paths: string[];
  playlistPath: string;
  category: string;
}

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
  private apiUrl = environment.apiUrl;
  activeFilters: Set<string> = new Set();
  filteredResults: SearchResult[] | null = null;

  // Grup seçim durumlarını tutacak map
  private groupSelectionState = new Map<string, boolean>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private dialogRef: MatDialogRef<MultisearchDialogComponent>,
    private http: HttpClient,
    private changeDetector: ChangeDetectorRef,
    private fb: FormBuilder,
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

    // Playlist bilgilerini ayarla
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

  ngOnInit() {
    if (this.data.paths && this.data.paths.length > 0) {
      this.search(this.data.paths).then(() => {
        // Arama tamamlandıktan sonra benzerDosya dışındaki tüm sonuçları seç
        if (this.searchResults?.results) {
          this.searchResults.results
            .filter(result => result.found && result.matchType !== 'benzerDosya')
            .forEach(result => this.selectedItems.add(result.originalPath));
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

    return {
      total: this.searchResults.stats.totalSearched,
      processed: this.searchResults.stats.found + this.searchResults.stats.notFound,
      matches: this.searchResults.stats.found,
      notFound: this.searchResults.stats.notFound
    };
  }

  getAverageProcessTime(): number {
    if (!this.searchResults?.stats) {
      return 0;
    }
    return this.searchResults.stats.executionTimeMs;
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
        this.http.post<SearchResponse>(`${this.apiUrl}/search/files`, {
          paths,
          options: {
            ...formValue.options,
            batchSize: 100,
            fuzzySearch: true,
          },
        }),
      );

      if (response) {
        this.searchResults = response;
        this.changeDetector.detectChanges();
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

    const { executionTimeMs, found, totalSearched } = this.searchResults.stats;
    const efficiency = (found / totalSearched) * 100;

    return {
      totalTime: executionTimeMs,
      averageTime: Number((executionTimeMs / totalSearched).toFixed(2)),
      efficiency,
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
    if (!this.searchResults?.results) return;
    this.searchResults.results
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
    if (!this.searchResults?.results || !this.hasSelectedItems()) return;

    const playlistPath = this.getPlaylistPath();
    if (!playlistPath) {
      this.error = "Playlist yolu belirtilmemiş";
      return;
    }

    const selectedResults = this.searchResults.results.filter(
      (result) => this.isSelected(result) && result.found,
    );

    const requestData = {
      playlistPath,
      items: selectedResults.map((result) => ({
        oldPath: result.originalPath,
        newPath: result.foundPath,
      })),
    };

    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/playlistsong/update`, requestData),
      );

      this.clearSelection();
      this.dialogRef.close({ success: true, data: selectedResults });
    } catch (err) {
      this.error = "Seçili öğeler kaydedilirken bir hata oluştu";
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

  filterResults(type: string) {
    if (this.activeFilters.has(type)) {
      this.activeFilters.delete(type);
    } else {
      this.activeFilters.add(type);
    }
    
    if (this.activeFilters.size === 0) {
      this.filteredResults = this.searchResults?.results || null;
    } else {
      this.filteredResults = this.searchResults?.results?.filter(result => 
        this.activeFilters.has(result.matchType)
      ) || null;
    }
  }

  isFilterActive(type: string): boolean {
    return this.activeFilters.has(type);
  }

  get displayResults(): SearchResult[] {
    return this.filteredResults || this.searchResults?.results || [];
  }

  // Grup seçimini değiştir
  toggleGroupSelection(groupType: string, event: Event) {
    event.stopPropagation(); // Tıklama olayının filtrelemeyi tetiklemesini engelle
    
    const currentState = this.isGroupSelected(groupType);
    this.groupSelectionState.set(groupType, !currentState);
    
    if (this.searchResults?.results) {
      const groupResults = this.searchResults.results.filter(
        (result: SearchResult) => result.matchType === groupType
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
    if (!this.searchResults?.results) return false;
    
    const groupResults = this.searchResults.results.filter(
      (result: SearchResult) => result.matchType === groupType
    );
    
    // Gruptaki tüm dosyalar seçili mi kontrol et
    return groupResults.length > 0 && groupResults.every(
      (result: SearchResult) => this.selectedItems.has(result.originalPath)
    );
  }
}
