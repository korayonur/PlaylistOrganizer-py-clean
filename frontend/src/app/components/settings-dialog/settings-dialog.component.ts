import { Component, Inject, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { ConfigService } from "../../services/config.service";

export interface Settings {
  music_folder: string;
  virtualdj_root: string;
  last_updated?: string;
}

interface IndexingResult {
  status: "success" | "error";
  message: string;
  data?: unknown;
}

interface SettingsResponse {
  music_folder: string;
  virtualdj_root: string;
  last_updated?: string;
}

interface ImportScanResponse {
  success: boolean;
  message?: string;
}

interface ImportStatusMetrics {
  status: string;
  database?: {
    musicFiles?: number;
    tracks?: number;
  };
  progress?: {
    total?: number;
    percentage?: number;
    added?: number;
  };
}

interface ImportStatusResponse {
  success: boolean;
  data?: ImportStatusMetrics;
}

interface SaveSettingsResponse {
  success: boolean;
  message?: string;
}

@Component({
  selector: "app-settings-dialog",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: "./settings-dialog.component.html",
  styleUrl: "./settings-dialog.component.scss",
})
export class SettingsDialogComponent implements OnInit, OnDestroy {
  settings: Settings = {
    music_folder: "",
    virtualdj_root: "",
  };
  isLoading = false;
  isIndexing = false;
  errorMessage = "";
  indexingResult: IndexingResult | null = null;

  // İlerleme takibi için değişkenler
  private statusInterval: ReturnType<typeof setInterval> | null = null;
  importProgress = 0;
  importStats = {
    musicFiles: 0,
    tracks: 0,
    totalFiles: 0,
  };

  constructor(
    private dialogRef: MatDialogRef<SettingsDialogComponent>,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private configService: ConfigService,
    @Inject(MAT_DIALOG_DATA) public data: unknown,
  ) {}

  private getApiUrl(): string {
    return this.configService.getApiUrl();
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading = true;
    this.errorMessage = "";
    this.http.get<SettingsResponse>(`${this.getApiUrl()}/database/settings`).subscribe({
      next: (response) => {
        this.settings = {
          music_folder: response.music_folder,
          virtualdj_root: response.virtualdj_root,
          last_updated: response.last_updated,
        };
        this.isLoading = false;
        console.log("Ayarlar yüklendi:", this.settings);
      },
      error: (error: HttpErrorResponse) => {
        console.error("Ayarlar yüklenirken hata oluştu:", error);
        this.errorMessage =
          error.error?.detail ||
          error.message ||
          "Ayarlar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.";
        this.isLoading = false;
      },
    });
  }

  indexDatabase(): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] [FRONTEND] [INIT] indexDatabase() çağrıldı`);

    this.isIndexing = true;
    this.indexingResult = null;
    this.importProgress = 0;
    this.importStats = { musicFiles: 0, tracks: 0, totalFiles: 0 };

    const apiUrl = `${this.getApiUrl()}/import/scan`;
    console.log(`[${timestamp}] [DEBUG] [FRONTEND] [API] Request gönderiliyor: ${apiUrl}`);

    // Import'u başlat
    this.http.post<ImportScanResponse>(apiUrl, {}).subscribe({
      next: (response) => {
        const responseTime = new Date().toISOString();
        console.log(`[${responseTime}] [INFO] [FRONTEND] [SUCCESS] Response alındı:`, response);

        if (response.success) {
          console.log(`[${responseTime}] [INFO] [FRONTEND] [POLL] Status polling başlatılıyor...`);
          // Polling başlat - her 1 saniyede durum kontrol et
          this.startStatusPolling();
        } else {
          console.log(
            `[${responseTime}] [ERROR] [FRONTEND] [FAIL] Import başlatılamadı:`,
            response,
          );
          this.isIndexing = false;
          this.indexingResult = {
            status: "error",
            message: "Import başlatılamadı",
            data: response,
          };
        }
      },
      error: (error: HttpErrorResponse) => {
        const errorTime = new Date().toISOString();
        console.error(`[${errorTime}] [ERROR] [FRONTEND] [API] Import scan error:`, error);
        this.isIndexing = false;
        this.indexingResult = {
          status: "error",
          message: error.message || "Import başlatılamadı",
          data: error,
        };
      },
    });
  }

  startStatusPolling(): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] [FRONTEND] [POLL] startStatusPolling() çağrıldı`);

    this.statusInterval = setInterval(() => {
      const pollTime = new Date().toISOString();
      console.log(
        `[${pollTime}] [DEBUG] [FRONTEND] [POLL] Polling tick - checkImportStatus çağrılıyor`,
      );
      this.checkImportStatus();
    }, 1000);

    console.log(
      `[${timestamp}] [INFO] [FRONTEND] [POLL] ✅ Polling başlatıldı, interval ID: ${this.statusInterval}`,
    );
  }

  checkImportStatus(): void {
    const timestamp = new Date().toISOString();
    const apiUrl = `${this.getApiUrl()}/import/status`;

    console.log(`[${timestamp}] [INFO] [FRONTEND] [POLL] Import status requested`, apiUrl);

    this.http.get<ImportStatusResponse>(apiUrl).subscribe({
      next: (response) => {
        const responseTime = new Date().toISOString();

        if (response.success && response.data) {
          // Backend response yapısına göre mapping
          const data = response.data;

          this.importStats = {
            musicFiles: data.database?.musicFiles ?? 0,
            tracks: data.database?.tracks ?? 0,
            totalFiles: data.progress?.total ?? 0,
          };

          // İlerleme yüzdesini al
          this.importProgress = data.progress?.percentage ?? 0;

          console.log(`[${responseTime}] [INFO] [FRONTEND] [STATUS] Import durumu:`, {
            status: data.status,
            progress: this.importProgress,
            stats: this.importStats,
          });

          // Tamamlandı mı?
          if (data.status === "completed") {
            console.log(`[${responseTime}] [INFO] [FRONTEND] [COMPLETE] Import tamamlandı!`);
            this.stopStatusPolling();
            this.isIndexing = false;
            this.indexingResult = {
              status: "success",
              message: `İndeksleme başarıyla tamamlandı! ${data.progress?.added ?? 0} dosya eklendi.`,
              data: data,
            };
            this.snackBar.open("Veritabanı başarıyla indekslendi", "Tamam", {
              duration: 3000,
            });
          }
        } else {
          console.log(`[${responseTime}] [WARN] [FRONTEND] [STATUS] Geçersiz response:`, response);
        }
      },
      error: (error: HttpErrorResponse) => {
        const errorTime = new Date().toISOString();
        console.error(`[${errorTime}] [ERROR] [FRONTEND] [STATUS] Status kontrolü hatası:`, error);
        this.stopStatusPolling();
        this.isIndexing = false;
        this.indexingResult = {
          status: "error",
          message: "Durum kontrolü sırasında hata oluştu",
          data: error,
        };
      },
    });
  }

  stopStatusPolling(): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] [FRONTEND] [POLL] stopStatusPolling() çağrıldı`);

    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
      console.log(`[${timestamp}] [INFO] [FRONTEND] [POLL] ✅ Polling durduruldu`);
    }
  }

  ngOnDestroy(): void {
    this.stopStatusPolling();
  }

  saveSettings(): void {
    this.isLoading = true;
    this.errorMessage = "";

    this.http
      .post<SaveSettingsResponse>(`${this.getApiUrl()}/database/settings`, this.settings)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log("Ayarlar kaydedildi:", response);
          this.snackBar.open("Ayarlar başarıyla kaydedildi", "Tamam", {
            duration: 3000,
          });
          this.dialogRef.close(response);
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading = false;
          console.error("Ayarlar kaydedilirken hata oluştu:", error);
          this.errorMessage =
            error.error?.detail ||
            error.message ||
            "Ayarlar kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.";
          this.snackBar.open("Ayarlar kaydedilemedi", "Tamam", {
            duration: 3000,
          });
        },
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
