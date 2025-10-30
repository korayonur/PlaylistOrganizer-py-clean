import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Song, SimilarFile } from "../../../models/song.model";

@Component({
  selector: "app-search-result",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="search-results">
      <!-- Başlık -->
      <div class="search-results-header">
        <span class="material-icons">{{ getHeaderIcon() }}</span>
        <span class="header-text">{{ song.searchMessage || "Arama Sonucu" }}</span>
      </div>

      <!-- İçerik -->
      <div class="search-results-content">
        <!-- Benzer Dosya Detayları -->
        @if (song.similarFiles && song.similarFiles.length > 0) {
          <div class="similar-files-list">
            @for (file of song.similarFiles; track file.path) {
              <div class="similar-file-item">
                <div class="file-info">
                  <div class="file-path">{{ file.path }}</div>
                  <div class="file-meta">
                    @if (file.similarity === 100) {
                      <span class="match-type">{{ file.analysisText }}</span>
                    } @else {
                      <span class="similarity">Benzerlik: {{ file.similarity }}%</span>
                      <span class="analysis-type">{{ file.analysisText }}</span>
                    }
                  </div>
                </div>
                <button
                  class="action-btn accept"
                  (click)="onSelectFile(file)"
                  title="Bu dosyayı kullan"
                >
                  <span class="material-icons">check_circle</span>
                </button>
              </div>
            }
          </div>
        }

        <!-- Aksiyon Butonları -->
        <div class="result-actions">
          <button
            class="action-btn retry"
            (click)="onRetry()"
            [disabled]="song.isSearching"
            title="Tekrar Ara"
          >
            <span class="material-icons">{{ song.isSearching ? "sync" : "refresh" }}</span>
            <span>{{ song.isSearching ? "Aranıyor..." : "Tekrar Ara" }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        margin-top: 0.5rem;
      }

      .search-results {
        background: var(--surface-card);
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .search-results-header {
        background: var(--surface-section);
        padding: 0.75rem 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-bottom: 1px solid var(--surface-border);
      }

      .search-results-content {
        padding: 1rem;
      }

      .similar-files-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .similar-file-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: var(--surface-ground);
        border-radius: 4px;
        gap: 1rem;
      }

      .file-info {
        flex: 1;
        min-width: 0;
      }

      .file-path {
        font-size: 0.9rem;
        color: var(--text-color);
        margin-bottom: 0.25rem;
        word-break: break-all;
      }

      .file-meta {
        display: flex;
        gap: 1rem;
        font-size: 0.8rem;
        color: var(--text-color-secondary);
      }

      .similarity {
        color: var(--primary-color);
        font-weight: 500;
      }

      .match-type {
        color: var(--green-500);
        font-weight: 500;
      }

      .analysis-type {
        font-style: italic;
      }

      .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: var(--text-color);
        cursor: pointer;
        transition: all 0.2s;

        &.accept {
          color: var(--green-500);
          &:hover {
            background: var(--green-50);
          }
        }

        &.retry {
          padding: 0.5rem 1rem;
          background: var(--primary-color);
          color: var(--primary-color-text);

          &:hover {
            background: var(--primary-600);
          }

          &:disabled {
            background: var(--surface-300);
            cursor: not-allowed;
          }
        }
      }

      .result-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1rem;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .action-btn:disabled .material-icons {
        animation: spin 1s linear infinite;
      }
    `,
  ],
})
export class SearchResultComponent {
  @Input({ required: true }) song!: Song;
  @Output() retry = new EventEmitter<void>();
  @Output() selectFile = new EventEmitter<SimilarFile>();

  getHeaderIcon(): string {
    if (this.song.isSearching) return "sync";
    if (this.song.searchError) return "search_off";
    if (this.song.similarFiles?.length) return "folder_open";
    return "search";
  }

  onRetry(): void {
    if (!this.song.isSearching) {
      this.retry.emit();
    }
  }

  onSelectFile(file: SimilarFile): void {
    this.selectFile.emit(file);
  }
}
