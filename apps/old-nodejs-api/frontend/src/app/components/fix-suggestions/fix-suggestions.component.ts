import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatChipsModule } from "@angular/material/chips";
import { MatTooltipModule } from "@angular/material/tooltip";
import {
  SimilarityService,
  FixSuggestion,
  ApplyResponse,
  SuggestionsFilters,
} from "../../services/similarity.service";
import { firstValueFrom } from "rxjs";

@Component({
  selector: "app-fix-suggestions",
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: "./fix-suggestions.component.html",
  styleUrls: ["./fix-suggestions.component.scss"],
})
export class FixSuggestionsComponent implements OnInit {
  suggestions: FixSuggestion[] = [];
  filteredSuggestions: FixSuggestion[] = [];
  paginatedSuggestions: FixSuggestion[] = [];
  selectedPaths = new Set<string>(); // YENİ SİSTEM: ID yerine path kullan

  isLoading = false;
  error: string | null = null;

  // Filtreler
  activeTypeFilter: string | null = null;

  // Sıralama
  sortColumn: string | null = null;
  sortDirection: "asc" | "desc" = "desc";

  // İstatistikler
  stats = {
    total: 0,
    exact: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  // Pagination
  currentPage = 1;
  pageSize = 50; // 50 kayıtlık sayfalama
  totalPages = 0;
  hasMoreData = false;
  totalRecords = 0;

  constructor(
    private dialogRef: MatDialogRef<FixSuggestionsComponent>,
    private similarityService: SimilarityService,
    private changeDetector: ChangeDetectorRef,
  ) {
    this.dialogRef.addPanelClass(["fix-suggestions-dialog", "modern-dialog"]);
    this.dialogRef.updateSize("95vw", "90vh");
  }

  ngOnInit() {
    this.loadSuggestions();
  }

  async loadSuggestions(resetPagination = true) {
    this.isLoading = true;
    this.error = null;

    if (resetPagination) {
      this.currentPage = 1;
      // State'i temizle - cache problemi çözümü
      this.suggestions = [];
      this.filteredSuggestions = [];
      this.stats = {
        total: 0,
        exact: 0,
        high: 0,
        medium: 0,
        low: 0,
      };
    }

    try {
      const offset = 0; // Tüm sonuçlar için offset 0
      const filters: SuggestionsFilters = { offset }; // limit kaldırıldı - tüm veri çekilecek

      if (this.activeTypeFilter) {
        filters.type = this.activeTypeFilter;
      }

      const response = await firstValueFrom(this.similarityService.getSuggestions(filters));

      if (response.success) {
        if (resetPagination) {
          this.suggestions = response.data;
          this.stats = {
            total: response.total,
            exact: response.stats.exact,
            high: response.stats.high,
            medium: response.stats.medium,
            low: response.stats.low,
          };
        } else {
          // Pagination için verileri ekle
          this.suggestions = [...this.suggestions, ...response.data];
        }

        // Pagination bilgilerini güncelle (tüm sonuçlar için)
        this.totalPages = 1; // Tüm sonuçlar tek sayfada
        this.hasMoreData = false; // Daha fazla veri yok

        this.applyFilters();
      } else {
        this.error = "Fix önerileri yüklenemedi";
      }
    } catch (error) {
      console.error("Fix önerileri yükleme hatası:", error);
      const message =
        error instanceof Error ? error.message : "Fix önerileri yüklenirken bir hata oluştu";
      this.error = message;
    } finally {
      this.isLoading = false;
      this.changeDetector.detectChanges();
    }
  }

  applyFilters() {
    // Client-side filtreleme artık gerekmez, backend hallediyor
    // Sadece sorting kalsın
    this.filteredSuggestions = [...this.suggestions];
    this.sortSuggestions();
    this.updatePagination();
  }

  sortSuggestions() {
    if (this.sortColumn) {
      this.filteredSuggestions.sort((a, b) => {
        let compare = 0;

        switch (this.sortColumn) {
          case "track": {
            compare = a.track_fileName.localeCompare(b.track_fileName);
            break;
          }
          case "musicFile": {
            compare = a.music_file_name.localeCompare(b.music_file_name);
            break;
          }
          case "similarity": {
            compare = a.similarity_score - b.similarity_score;
            break;
          }
          case "type": {
            const typeOrder = { exact: 0, high: 1, medium: 2, low: 3 };
            compare = typeOrder[a.match_type] - typeOrder[b.match_type];
            break;
          }
          default: {
            // Varsayılan: match_type + similarity
            const defaultTypeOrder = { exact: 0, high: 1, medium: 2, low: 3 };
            const typeCompare = defaultTypeOrder[a.match_type] - defaultTypeOrder[b.match_type];
            if (typeCompare !== 0) return typeCompare;
            compare = b.similarity_score - a.similarity_score;
            break;
          }
        }

        return this.sortDirection === "asc" ? compare : -compare;
      });
    } else {
      // Varsayılan sıralama: match_type + similarity
      const typeOrder = { exact: 0, high: 1, medium: 2, low: 3 };

      this.filteredSuggestions.sort((a, b) => {
        // Önce match_type'a göre
        const typeCompare = typeOrder[a.match_type] - typeOrder[b.match_type];
        if (typeCompare !== 0) return typeCompare;

        // Aynı type ise similarity_score'a göre (yüksek → düşük)
        return b.similarity_score - a.similarity_score;
      });
    }
  }

  sortByColumn(column: "track" | "musicFile" | "similarity" | "type") {
    if (this.sortColumn === column) {
      // Aynı kolona tekrar tıklandı, direction'ı değiştir
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      // Yeni kolon seçildi
      this.sortColumn = column;
      this.sortDirection = "asc";
    }

    this.sortSuggestions();
    this.updatePagination();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) {
      return "unfold_more"; // Sıralanmamış
    }
    return this.sortDirection === "asc" ? "keyboard_arrow_up" : "keyboard_arrow_down";
  }

  async filterByType(type: string | null) {
    if (this.activeTypeFilter === type) {
      this.activeTypeFilter = null;
    } else {
      this.activeTypeFilter = type;
    }
    await this.loadSuggestions(true); // Backend'den yükle ve pagination reset et
  }

  isTypeFilterActive(type: string): boolean {
    return this.activeTypeFilter === type;
  }

  toggleSelection(suggestion: FixSuggestion) {
    if (this.selectedPaths.has(suggestion.track_path)) {
      this.selectedPaths.delete(suggestion.track_path);
    } else {
      this.selectedPaths.add(suggestion.track_path);
    }
  }

  isSelected(suggestion: FixSuggestion): boolean {
    return this.selectedPaths.has(suggestion.track_path);
  }

  selectAll() {
    this.filteredSuggestions.forEach((s) => this.selectedPaths.add(s.track_path));
  }

  selectByType(type: string) {
    this.suggestions
      .filter((s) => s.match_type === type)
      .forEach((s) => this.selectedPaths.add(s.track_path));
  }

  clearSelection() {
    this.selectedPaths.clear();
  }

  hasSelection(): boolean {
    return this.selectedPaths.size > 0;
  }

  async applySelected() {
    if (!this.hasSelection()) return;

    const count = this.selectedPaths.size;
    const confirmed = confirm(
      `${count} fix önerisini uygulamak istediğinizden emin misiniz?\n\n` +
        `Bu işlem:\n` +
        `• Track path'lerini güncelleyecek\n` +
        `• M3U/VDJFOLDER dosyalarını güncelleyecek`,
    );

    if (!confirmed) return;

    this.isLoading = true;
    this.error = null;

    try {
      // Seçili suggestion'ları bul
      const selectedSuggestions = this.suggestions.filter((s) =>
        this.selectedPaths.has(s.track_path),
      );

      const response = await firstValueFrom(
        this.similarityService.applySuggestions(selectedSuggestions),
      );

      if (response.success) {
        this.showSuccessMessage(response);

        // Uygulanan önerileri listeden kaldır
        this.suggestions = this.suggestions.filter((s) => !this.selectedPaths.has(s.track_path));
        this.selectedPaths.clear();
        this.applyFilters();

        // İstatistikleri güncelle (yeniden yükle)
        await this.loadSuggestions(true);
      } else {
        this.error = "Fix önerileri uygulanamadı";
      }
    } catch (error) {
      console.error("Fix uygulama hatası:", error);
      const message =
        error instanceof Error ? error.message : "Fix önerileri uygulanırken bir hata oluştu";
      this.error = message;
    } finally {
      this.isLoading = false;
      this.changeDetector.detectChanges();
    }
  }

  getSimilarityColor(score: number): string {
    if (score >= 0.9) return "#4caf50"; // Yeşil - Exact
    if (score >= 0.7) return "#2196f3"; // Mavi - High
    if (score >= 0.5) return "#ff9800"; // Turuncu - Medium
    return "#ffc107"; // Sarı - Low
  }

  getSimilarityLabel(type: string): string {
    const labels: Record<string, string> = {
      exact: "Mükemmel Eşleşme",
      high: "Yüksek Benzerlik",
      medium: "Orta Benzerlik",
      low: "Düşük Benzerlik",
    };
    return labels[type] || type;
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      exact: "check_circle",
      high: "stars",
      medium: "info",
      low: "help_outline",
    };
    return icons[type] || "info";
  }

  private showSuccessMessage(response: ApplyResponse) {
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

    messageContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">✅</span>
        <div>
          <div style="font-weight: bold; margin-bottom: 4px;">Fix Başarılı!</div>
          <div>${response.applied} öneri uygulandı</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">
            Tracks: ${response.tracks_updated} | M3U: ${response.m3u_files_updated} | VDJ: ${response.vdjfolder_files_updated}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(messageContainer);

    setTimeout(() => {
      if (messageContainer.parentNode) {
        messageContainer.parentNode.removeChild(messageContainer);
      }
    }, 5000);
  }

  close() {
    this.dialogRef.close();
  }

  updatePagination() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedSuggestions = this.filteredSuggestions.slice(startIndex, endIndex);
    this.totalPages = Math.ceil(this.filteredSuggestions.length / this.pageSize);
    this.hasMoreData = this.currentPage < this.totalPages;
    this.totalRecords = this.filteredSuggestions.length;
  }

  loadMoreSuggestions() {
    if (this.hasMoreData) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, startPage + maxVisible - 1);

    // Sağdan eksik varsa soldan tamamla
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // İlk sayfa
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push(-1); // -1 = "..." göstergesi
    }

    // Ortadaki sayfalar
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Son sayfa
    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) pages.push(-1); // -1 = "..."
      pages.push(this.totalPages);
    }

    return pages;
  }

  getFilteredTotal(): number {
    if (this.activeTypeFilter) {
      // Aktif filtre varsa, o kategorinin toplamını döndür
      switch (this.activeTypeFilter) {
        case "exact":
          return this.stats.exact;
        case "high":
          return this.stats.high;
        case "medium":
          return this.stats.medium;
        case "low":
          return this.stats.low;
        default:
          return this.stats.total;
      }
    }
    return this.stats.total;
  }
}
