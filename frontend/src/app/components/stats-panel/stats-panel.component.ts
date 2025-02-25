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
        <button
          class="repair-button"
          [disabled]="loading || missingCount === 0"
          (click)="repair.emit()"
        >
          {{ loading ? "Onarılıyor..." : "Eksik Dosyaları Onar" }}
        </button>
        
        <button
          class="settings-button"
          (click)="openSettings.emit()"
          [disabled]="loading"
        >
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
      }

      .repair-button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: var(--border-radius-sm);
        background: var(--accent-color);
        color: var(--text-color);
        cursor: pointer;
        transition: all var(--transition-fast);
        font-weight: 500;

        &:hover:not(:disabled) {
          background: var(--hover-color);
          transform: translateY(-1px);
        }

        &:disabled {
          background: var(--text-muted);
          cursor: not-allowed;
          transform: none;
        }
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

      .settings-icon {
        margin-right: 0.5rem;
      }
    `,
  ],
})
export class StatsPanelComponent {
  @Input() songs: Song[] = [];
  @Input() loading = false;
  @Input() currentFilter: "all" | "exists" | "missing" = "all";
  @Output() filterChange = new EventEmitter<"all" | "exists" | "missing">();
  @Output() repair = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();

  get foundCount(): number {
    return this.songs.filter((song) => song.isFileExists).length;
  }

  get missingCount(): number {
    return this.songs.filter((song) => !song.isFileExists).length;
  }

  setFilter(filter: "all" | "exists" | "missing") {
    this.filterChange.emit(filter);
  }
}
