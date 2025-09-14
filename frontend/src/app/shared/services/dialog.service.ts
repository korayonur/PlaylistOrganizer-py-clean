import { Injectable } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable } from "rxjs";
import { MultisearchDialogComponent } from "../../components/multisearch-dialog/multisearch-dialog.component";
import { ConfigService } from "../../services/config.service";

export interface DialogResult<T = unknown> {
  success: boolean;
  data?: T;
}

export interface DialogConfig {
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
  panelClass?: string[];
  data?: Record<string, unknown>;
}

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "warning" | "error" | "info";
}

export interface InfoDialogConfig {
  title: string;
  message: string;
  buttonText?: string;
  type?: "success" | "error" | "warning" | "info";
}

export interface FormDialogConfig<T> {
  title: string;
  component: new (...args: unknown[]) => T;
  data?: Record<string, unknown>;
  width?: string;
  height?: string;
}

@Injectable({
  providedIn: "root",
})
export class DialogService {
  private getApiUrl(): string {
    return this.configService.getApiUrl();
  }

  constructor(
    private dialog: MatDialog,
    private configService: ConfigService
  ) {}

  /**
   * Çoklu arama dialogunu açar
   * @param paths Aranacak dosya yolları
   * @param playlistPath Playlist yolu
   * @param category Kategori
   * @returns Dialog referansı
   */
  openMultisearchDialog(
    paths: string[],
    playlistPath: string,
    category: string,
  ): Observable<DialogResult<string[]>> {
    console.log("[DialogService] Multisearch dialog açılıyor:", {
      paths: paths.length,
      playlistPath,
      category,
    });

    const dialogConfig: MatDialogConfig = {
      width: "90vw",
      height: "90vh",
      maxWidth: "100vw",
      maxHeight: "100vh",
      panelClass: ["multisearch-dialog-panel", "modern-dialog"],
      data: { paths, playlistPath, category },
    };

    console.log("[DialogService] Dialog config hazırlandı:", dialogConfig);
    const dialogRef = this.dialog.open(MultisearchDialogComponent, dialogConfig);
    return dialogRef.afterClosed();
  }

  /**
   * Hata dialogunu açar
   * @param title Dialog başlığı
   * @param message Hata mesajı
   * @returns Dialog referansı
   */
  openErrorDialog(title: string, message: string): Observable<DialogResult<void>> {
    const dialogConfig: MatDialogConfig = {
      width: "400px",
      data: { title, message },
    };

    const dialogRef = this.dialog.open(MultisearchDialogComponent, dialogConfig);
    return dialogRef.afterClosed();
  }

  /**
   * Onay dialogunu açar
   * @param title Dialog başlığı
   * @param message Onay mesajı
   * @returns Dialog referansı
   */
  openConfirmDialog(title: string, message: string): Observable<DialogResult<boolean>> {
    const dialogConfig: MatDialogConfig = {
      width: "400px",
      data: { title, message },
    };

    const dialogRef = this.dialog.open(MultisearchDialogComponent, dialogConfig);
    return dialogRef.afterClosed();
  }

  /**
   * Onay diyaloğu açar
   * @param config Onay diyaloğu konfigürasyonu
   * @returns Diyalog sonucu (true/false)
   */
  confirm(config: ConfirmDialogConfig): Observable<boolean> {
    const dialogConfig: MatDialogConfig = {
      width: "400px",
      data: {
        title: config.title,
        message: config.message,
        confirmText: config.confirmText,
        cancelText: config.cancelText,
        type: config.type,
      },
    };

    // TODO: Onay diyaloğu component'i oluşturulduğunda implement edilecek
    const dialogRef = this.dialog.open(MultisearchDialogComponent, dialogConfig);
    return dialogRef.afterClosed();
  }

  /**
   * Bilgi diyaloğu açar
   * @param config Bilgi diyaloğu konfigürasyonu
   */
  info(config: InfoDialogConfig): Observable<void> {
    const dialogConfig: MatDialogConfig = {
      width: "400px",
      data: {
        title: config.title,
        message: config.message,
        buttonText: config.buttonText,
        type: config.type,
      },
    };

    // TODO: Bilgi diyaloğu component'i oluşturulduğunda implement edilecek
    const dialogRef = this.dialog.open(MultisearchDialogComponent, dialogConfig);
    return dialogRef.afterClosed();
  }

  /**
   * Form diyaloğu açar
   * @param config Form diyaloğu konfigürasyonu
   * @returns Form sonucu
   */
  form<T>(config: FormDialogConfig<T>): Observable<T> {
    const dialogConfig: MatDialogConfig = {
      width: config.width || "400px",
      height: config.height,
      data: config.data,
    };

    // TODO: Generic form diyaloğu component'i oluşturulduğunda implement edilecek
    const dialogRef = this.dialog.open(config.component, dialogConfig);
    return dialogRef.afterClosed();
  }
}
