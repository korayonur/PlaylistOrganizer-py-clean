import { Injectable, signal } from "@angular/core";
import { AppConfig, DEFAULT_CONFIG } from "../shared/config/app.config";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class ConfigService {
  private readonly config = signal<AppConfig>(DEFAULT_CONFIG);
  private configLoaded = false;

  constructor(private http: HttpClient) {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const savedConfig = localStorage.getItem("app_config");
      if (savedConfig) {
        this.config.set({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
      }
    } catch (error) {
      console.error("Ayarlar yüklenirken hata:", error);
    }
  }

  /**
   * Backend'den config bilgilerini yükle
   */
  loadConfigFromBackend(): Observable<void> {
    return this.http.get<any>(`${environment.apiUrl}/database/config`).pipe(
      map(response => {
        if (response.success) {
          const backendConfig: AppConfig = {
            paths: {
              musicFolder: response.data.paths.music,
              playlistFolder: response.data.paths.virtualDJ + '/Folders'
            },
            supportedFormats: {
              audio: response.data.extensions.music,
              playlist: response.data.extensions.playlist
            }
          };
          this.config.set(backendConfig);
          localStorage.setItem('app_config', JSON.stringify(backendConfig));
          this.configLoaded = true;
          console.log('✅ Backend config başarıyla yüklendi:', backendConfig);
        }
      }),
      catchError(err => {
        console.warn('⚠️ Backend config yüklenemedi, varsayılan kullanılıyor:', err);
        this.configLoaded = false;
        return of(void 0);
      })
    );
  }

  /**
   * Config'in backend'den yüklenip yüklenmediğini kontrol et
   */
  isConfigLoadedFromBackend(): boolean {
    return this.configLoaded;
  }

  saveConfig(newConfig: Partial<AppConfig>): void {
    try {
      const updatedConfig = { ...this.config(), ...newConfig };
      this.config.set(updatedConfig);
      localStorage.setItem("app_config", JSON.stringify(updatedConfig));
    } catch (error) {
      console.error("Ayarlar kaydedilirken hata:", error);
    }
  }

  getConfig(): AppConfig {
    return this.config();
  }

  getMusicFolder(): string {
    return this.expandPath(this.config().paths.musicFolder);
  }

  getPlaylistFolder(): string {
    return this.expandPath(this.config().paths.playlistFolder);
  }

  private expandPath(path: string): string {
    // ~ karakterini home dizini ile değiştir
    if (path.startsWith("~")) {
      return path.replace("~", this.getHomeDir());
    }
    return path;
  }

  private getHomeDir(): string {
    // İşletim sistemine göre home dizinini belirle
    // Browser ortamında process kullanılamaz, varsayılan değer döndür
    return "/home/user";
  }

  getSupportedAudioFormats(): string[] {
    return this.config().supportedFormats.audio;
  }

  getSupportedPlaylistFormats(): string[] {
    return this.config().supportedFormats.playlist;
  }

  getApiUrl(): string {
    return environment.apiUrl;
  }
}
