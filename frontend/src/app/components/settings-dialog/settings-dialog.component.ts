import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ConfigService } from '../../services/config.service';

export interface Settings {
  music_folder: string;
  virtualdj_root: string;
  last_updated?: string;
}

interface IndexingResult {
  status: 'success' | 'error';
  message: string;
  data?: any;
}

@Component({
  selector: 'app-settings-dialog',
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
    MatSnackBarModule
  ],
  templateUrl: './settings-dialog.component.html',
  styleUrl: './settings-dialog.component.scss'
})
export class SettingsDialogComponent implements OnInit {
  settings: Settings = {
    music_folder: '',
    virtualdj_root: ''
  };
  isLoading = false;
  isIndexing = false;
  errorMessage = '';
  indexingResult: IndexingResult | null = null;

  constructor(
    private dialogRef: MatDialogRef<SettingsDialogComponent>,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private configService: ConfigService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  private getApiUrl(): string {
    return this.configService.getApiUrl();
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.http.get<Settings>(`${this.getApiUrl()}/settings`).subscribe({
      next: (settings) => {
        this.settings = settings;
        this.isLoading = false;
        console.log('Ayarlar yüklendi:', settings);
      },
      error: (error) => {
        console.error('Ayarlar yüklenirken hata oluştu:', error);
        this.errorMessage = error.error?.detail || error.message || 'Ayarlar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.';
        this.isLoading = false;
      }
    });
  }

  indexDatabase(): void {
    this.isIndexing = true;
    this.indexingResult = null;
    
    const requestData = {
      musicFolder: this.settings.music_folder,
      virtualdjFolder: this.settings.virtualdj_root
    };
    
    this.http.post<any>(`${this.getApiUrl()}/index/create`, requestData).subscribe({
      next: (response) => {
        this.isIndexing = false;
        
        if (response.success) {
          this.indexingResult = {
            status: 'success',
            message: response.message || 'İndeksleme başarılı!',
            data: response
          };
          
          this.snackBar.open('Veritabanı başarıyla indekslendi', 'Tamam', {
            duration: 3000
          });
        } else {
          this.indexingResult = {
            status: 'error',
            message: response.message || 'İndeksleme sırasında bir hata oluştu.',
            data: response
          };
        }
      },
      error: (error) => {
        this.isIndexing = false;
        console.error('İndeksleme sırasında hata oluştu:', error);
        
        this.indexingResult = {
          status: 'error',
          message: error.error?.detail?.message || 'İndeksleme sırasında bir hata oluştu. Lütfen tekrar deneyin.',
          data: error
        };
      }
    });
  }

  saveSettings(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.post<any>(`${this.getApiUrl()}/settings`, this.settings).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Ayarlar kaydedildi:', response);
        this.snackBar.open('Ayarlar başarıyla kaydedildi', 'Tamam', {
          duration: 3000
        });
        this.dialogRef.close(response);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Ayarlar kaydedilirken hata oluştu:', error);
        this.errorMessage = error.error?.detail || error.message || 'Ayarlar kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.';
        this.snackBar.open('Ayarlar kaydedilemedi', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
