import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Song } from "../../models/song.model";

@Component({
  selector: "app-stats-panel",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-panel">
      <div class="stat-group">
        <button
          class="stat-item"
          [class.active]="currentFilter === 'all'"
          (click)="setFilter('all')"
        >
          <div class="stat-label">Toplam</div>
          <div class="stat-value">{{ songs.length }}</div>
        </button>
        <button
          class="stat-item"
          [class.active]="currentFilter === 'exists'"
          (click)="setFilter('exists')"
        >
          <div class="stat-label">Bulunan</div>
          <div class="stat-value success">{{ foundCount }}</div>
        </button>
        <button
          class="stat-item"
          [class.active]="currentFilter === 'missing'"
          (click)="setFilter('missing')"
        >
          <div class="stat-label">Eksik</div>
          <div class="stat-value danger">{{ missingCount }}</div>
        </button>
      </div>
      <div class="action-buttons">
        <!-- Fix Suggestions Butonu -->
        <button
          class="fix-suggestions-button"
          (click)="openFixSuggestions.emit()"
          [disabled]="loading"
        >
          <span class="fix-icon">🔧</span>
          Fix Önerileri
        </button>

        <button class="settings-button" (click)="openSettings.emit()" [disabled]="loading">
          <span class="settings-icon">⚙️</span>
          <strong>Ayarlar</strong>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .stats-panel {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
      }

      .stat-group {
        display: flex;
        gap: 2rem;
        flex: 1;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        padding: 0.5rem 1rem;
        border: none;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: var(--border-radius-sm);
        min-width: 100px;

        &:hover {
          background: var(--surface-color-light);
        }

        &.active {
          background: var(--surface-color-light);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);

          .stat-label {
            color: var(--accent-color);
          }
        }
      }

      .stat-label {
        font-size: 0.9rem;
        color: var(--text-muted);
        font-weight: 500;
        transition: color 0.2s ease;
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 600;

        &.success {
          color: var(--success-color);
        }

        &.danger {
          color: var(--danger-color);
        }
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .fix-suggestions-button {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: var(--border-radius-sm);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        box-shadow: 0 4px 15px rgba(240, 147, 251, 0.3);

        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(240, 147, 251, 0.4);
        }

        &:active {
          transform: translateY(0);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .fix-icon {
        font-size: 1.2em;
      }

      .settings-button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: var(--border-radius-sm);
        background: var(--accent-color);
        color: white;
        cursor: pointer;
        transition: all var(--transition-fast);
        font-weight: 500;
        display: flex;
        align-items: center;
        margin-left: 10px;

        &:hover:not(:disabled) {
          background: var(--hover-color);
          transform: translateY(-1px);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      }
    `,
  ],
})
export class StatsPanelComponent {
  @Input() songs: Song[] = [];
  @Input() loading = false;
  @Input() currentFilter: "all" | "exists" | "missing" = "all";
  @Input() autoFilterMissing = false; // Tree checkbox durumu
  @Output() filterChange = new EventEmitter<"all" | "exists" | "missing">();
  @Output() openSettings = new EventEmitter<void>();
  @Output() openFixSuggestions = new EventEmitter<void>();

  get foundCount(): number {
    return this.songs.filter((song) => song.isFileExists).length;
  }

  get missingCount(): number {
    return this.songs.filter((song) => !song.isFileExists).length;
  }

  setFilter(filter: "all" | "exists" | "missing") {
    // Tree checkbox işaretliyse ve "all" seçilmeye çalışılıyorsa, izin verme
    if (this.autoFilterMissing && filter === "all") {
      return; // Otomatik missing filter aktif, all'a izin yok
    }
    this.filterChange.emit(filter);
  }
}
