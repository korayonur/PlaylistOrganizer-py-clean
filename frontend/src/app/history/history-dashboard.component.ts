import { Component, OnDestroy, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { HistoryApiService, HistoryScanStatusResponse } from "../services/history-api.service";

@Component({
  selector: "app-history-dashboard",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="history-dashboard">
      <header>
        <div>
          <h2>History Fix Paneli</h2>
          <p>VirtualDJ history dosyalarını tarayıp eksik kayıtları yönetin.</p>
        </div>
        <button (click)="triggerScan()" [disabled]="status() === 'running' || loading()">
          {{ status() === 'running' ? ("Taranıyor... %" + progress()) : "History Tarama" }}
        </button>
      </header>

      <section *ngIf="status() === 'running'" class="progress">
        <div class="bar">
          <div class="fill" [style.width.%]="progress()"></div>
        </div>
        <div class="meta">
          %{{ progress() }} · {{ processed() }} / {{ totalFiles() }} dosya · Mod: {{ mode() === 'import' ? 'İçe Aktarım' : 'Tarama + Eşleştirme' }}
          <span *ngIf="lastFile()">· Son: {{ lastFile() }}</span>
        </div>
      </section>

      <section class="grid">
        <article class="card">
          <h3>Son Taranan Dosyalar</h3>
          <div *ngIf="historyFiles().length === 0" class="empty">Henüz veri yok</div>
          <ul>
            <li *ngFor="let item of historyFiles()">
              <div class="path">{{ item.file_name }}</div>
              <div class="meta">
                <span>{{ item.total_tracks }} parça</span>
                <span class="missing" *ngIf="item.missing_tracks > 0">{{ item.missing_tracks }} eksik</span>
              </div>
            </li>
          </ul>
        </article>

        <article class="card">
          <h3>Eksik Kayıtlar</h3>
          <div *ngIf="missingItems().length === 0" class="empty">Eksik kayıt yok</div>
          <ul>
            <li *ngFor="let item of missingItems()">
              <div class="path">{{ item.original_path || item.track_original_path }}</div>
              <div class="meta">
                <span>{{ item.status }}</span>
                <span *ngIf="item.similarity">Skor: {{ item.similarity | number: '1.0-2' }}</span>
              </div>
            </li>
          </ul>
        </article>
      </section>

      <footer *ngIf="error()" class="error">{{ error() }}</footer>
    </div>
  `,
  styles: [
    `
      .history-dashboard {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        min-width: 520px;
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      header button {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        border: none;
        background: linear-gradient(135deg, #2196f3 0%, #00bcd4 100%);
        color: #fff;
        font-weight: 600;
        cursor: pointer;
      }

      header button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
      }

      .progress {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .progress .bar {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 999px;
        height: 8px;
        overflow: hidden;
      }

      .progress .fill {
        background: linear-gradient(135deg, #00bcd4 0%, #2196f3 100%);
        height: 100%;
        transition: width 0.3s ease;
      }

      .progress .meta {
        font-size: 0.8rem;
        color: var(--text-muted, #9aa5b1);
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .card {
        background: var(--surface-color, #1f2933);
        border-radius: 12px;
        padding: 1rem;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.2);
        min-height: 220px;
      }

      .card h3 {
        margin-bottom: 0.75rem;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      li {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        background: rgba(255, 255, 255, 0.04);
        padding: 0.75rem;
        border-radius: 8px;
      }

      .path {
        font-size: 0.95rem;
        font-weight: 500;
        word-break: break-word;
      }

      .meta {
        font-size: 0.8rem;
        display: flex;
        gap: 0.75rem;
        color: var(--text-muted, #9aa5b1);
      }

      .missing {
        color: var(--danger-color, #ff6b6b);
        font-weight: 500;
      }

      .empty {
        font-size: 0.9rem;
        color: var(--text-muted, #94a3b8);
      }

      .error {
        color: var(--danger-color, #ff6b6b);
        font-weight: 500;
      }
    `,
  ],
})
export class HistoryDashboardComponent implements OnDestroy {
  loading = signal(false);
  error = signal<string | null>(null);
  historyFiles = signal<any[]>([]);
  missingItems = signal<any[]>([]);
  status = signal<"idle" | "running" | "completed" | "error">("idle");
  progress = signal(0);
  processed = signal(0);
  totalFiles = signal(0);
  lastFile = signal<string | null>(null);
  mode = signal<"import" | "full">("full");

  private pollHandle: any = null;
  private pollInFlight = false;
  private lastJobId: string | null = null;

  constructor(private readonly historyApi: HistoryApiService) {
    this.refresh();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      status: this.historyApi.getHistoryScanStatus().pipe(
        catchError((err) => {
          console.error("History scan status error", err);
          return of({
            status: "idle",
            progress: 0,
            processed: 0,
            totalFiles: 0,
            summaries: [],
            options: { performMatching: true }
          } as HistoryScanStatusResponse);
        })
      ),
      files: this.historyApi.getHistoryFiles({ limit: 10 }),
      missing: this.historyApi.getMissing({ status: "pending", limit: 10 }),
    }).subscribe({
      next: ({ status, files, missing }) => {
        this.updateStatus(status);
        this.historyFiles.set(files.items ?? []);
        this.missingItems.set(missing.items ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error("History dashboard error", err);
        this.error.set(err.message ?? "History verileri alınamadı");
        this.loading.set(false);
      },
    });
  }

  triggerScan(): void {
    this.loading.set(true);
    this.historyApi.scanHistory().subscribe({
      next: (response) => {
        this.loading.set(false);
        this.updateStatus(response);
        if (response.status === "running") {
          this.startPolling();
        } else {
          this.refresh();
        }
      },
      error: (err) => {
        this.error.set(err.message ?? "History taraması başarısız");
        this.loading.set(false);
      },
    });
  }

  private updateStatus(status: HistoryScanStatusResponse): void {
    if (!status) {
      return;
    }

    this.status.set(status.status ?? "idle");
    this.progress.set(Math.max(0, Math.min(100, Math.round(status.progress ?? 0))));
    this.processed.set(status.processed ?? 0);
    this.totalFiles.set(status.totalFiles ?? 0);
    this.lastFile.set(status.lastFile ?? null);
    this.lastJobId = status.jobId ?? this.lastJobId;
    const jobOptions = status.options ?? {};
    const matchingEnabled = jobOptions.performMatching !== false;
    this.mode.set(matchingEnabled ? "full" : "import");

    if (status.status === "running") {
      this.startPolling();
    } else if (status.status === "completed") {
      this.stopPolling();
    } else if (status.status === "error") {
      this.stopPolling();
      this.error.set(status.error ?? "History taraması sırasında hata oluştu");
    }
  }

  private startPolling(): void {
    if (this.pollHandle) {
      return;
    }

    this.pollHandle = setInterval(() => {
      if (this.pollInFlight) {
        return;
      }
      this.pollInFlight = true;
      this.historyApi.getHistoryScanStatus().subscribe({
        next: (response) => {
          this.pollInFlight = false;
          this.updateStatus(response);
          if (response.status === "completed") {
            this.stopPolling();
            this.refresh();
          }
        },
        error: (err) => {
          console.error("History scan status hata", err);
          this.pollInFlight = false;
          this.stopPolling();
          this.error.set(err.message ?? "History tarama durumu alınamadı");
        }
      });
    }, 1500);
  }

  private stopPolling(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    this.pollInFlight = false;
  }
}
