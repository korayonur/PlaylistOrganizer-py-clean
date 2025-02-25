import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Settings {
  music_folder: string;
  virtualdj_root: string;
  last_updated?: string;
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
  errorMessage = '';
  private apiUrl = environment.apiUrl;

  constructor(
    private dialogRef: MatDialogRef<SettingsDialogComponent>,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading = true;
    this.http.get<Settings>(`${this.apiUrl}/settings`).subscribe({
      next: (settings) => {
        this.settings = settings;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ayarlar yüklenirken hata oluştu:', error);
        this.errorMessage = 'Ayarlar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.';
        this.isLoading = false;
      }
    });
  }

  saveSettings(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.post<Settings>(`${this.apiUrl}/settings`, this.settings).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.snackBar.open('Ayarlar başarıyla kaydedildi', 'Tamam', {
          duration: 3000
        });
        this.dialogRef.close(response);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Ayarlar kaydedilirken hata oluştu:', error);
        this.errorMessage = error.error?.detail || 'Ayarlar kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.';
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
