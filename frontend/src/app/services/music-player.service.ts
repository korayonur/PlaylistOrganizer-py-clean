import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, catchError, throwError } from "rxjs";
import { Song } from "../models/song.model";
import { PlayerState } from "../models/player-state.model";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: "root",
})
export class MusicPlayerService {
  private apiUrl = environment.apiUrl;
  private readonly audio: HTMLAudioElement;
  private readonly currentSong = new BehaviorSubject<Song | null>(null);
  private readonly playerState = new BehaviorSubject<PlayerState>("stopped");
  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly progressSubject = new BehaviorSubject<number>(0);

  constructor(private readonly http: HttpClient) {
    this.audio = new Audio();
    this.setupAudioEvents();
    console.log('MusicPlayer Service initialized with API URL:', this.apiUrl);
  }

  private setupAudioEvents() {
    this.audio.addEventListener("ended", () => {
      this.playerState.next("stopped");
    });

    this.audio.addEventListener("pause", () => {
      if (!this.audio.ended) {
        this.playerState.next("paused");
      }
    });

    this.audio.addEventListener("play", () => {
      this.playerState.next("playing");
    });

    this.audio.addEventListener("error", () => {
      this.playerState.next("error");
      throw new Error("Müzik çalma hatası");
    });

    this.audio.addEventListener("loadstart", () => {
      this.playerState.next("loading");
    });

    this.audio.addEventListener("canplay", () => {
      if (this.playerState.value === "loading") {
        this.playerState.next("ready");
      }
    });

    this.audio.addEventListener("waiting", () => {
      this.playerState.next("loading");
    });

    this.audio.ontimeupdate = () => {
      if (this.audio.duration) {
        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressSubject.next(progress);
      }
    };
  }

  getCurrentSong(): Observable<Song | null> {
    return this.currentSong.asObservable();
  }

  getPlayerState(): Observable<PlayerState> {
    return this.playerState.asObservable();
  }

  play(song: Song): Observable<void> {
    return new Observable<void>((observer) => {
      if (this.currentSong.value?.filePath === song.filePath) {
        if (this.audio.paused) {
          this.audio
            .play()
            .then(() => observer.complete())
            .catch((error) => observer.error(error));
        }
        return;
      }

      this.http
        .post(`${this.apiUrl}/stream`, { filePath: song.filePath }, { responseType: "blob" })
        .subscribe({
          next: (blob) => {
            this.audio.pause();
            this.audio.currentTime = 0;

            this.audio.src = URL.createObjectURL(blob);
            this.currentSong.next(song);

            this.audio
              .play()
              .then(() => observer.complete())
              .catch((error) => observer.error(error));
          },
          error: (error) => observer.error(error),
        });
    }).pipe(
      catchError((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "Müzik çalma hatası";
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.currentSong.next(null);
      this.playerState.next("stopped");
    }
  }

  seek(time: number): void {
    if (this.audio && time >= 0 && time <= this.audio.duration) {
      this.audio.currentTime = time;
    }
  }

  setVolume(volume: number): void {
    if (this.audio && volume >= 0 && volume <= 1) {
      this.audio.volume = volume;
    }
  }

  toggleMute(): void {
    if (this.audio) {
      this.audio.muted = !this.audio.muted;
    }
  }

  isPlaying(song: Song): boolean {
    return this.currentSong.value === song && !this.audio.paused;
  }

  isLoading(): Observable<boolean> {
    return this.isLoadingSubject.asObservable();
  }

  getProgress(): Observable<number> {
    return this.progressSubject.asObservable();
  }

  getDuration(): number {
    return this.audio?.duration || 0;
  }

  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }
}
