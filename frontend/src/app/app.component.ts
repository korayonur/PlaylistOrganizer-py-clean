import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TreeNode } from "./models/tree-node.model";
import { Song } from "./models/song.model";
import { PlaylistService } from "./services/playlist.service";
import { PlaylistTreeComponent } from "./components/playlist-tree/playlist-tree.component";
import { StatsPanelComponent } from "./components/stats-panel/stats-panel.component";
import { SongGridComponent } from "./components/song-grid/song-grid.component";
import { firstValueFrom } from "rxjs";
import { MatDialog } from "@angular/material/dialog";
import { MultisearchDialogComponent } from "./components/multisearch-dialog/multisearch-dialog.component";
import { SettingsDialogComponent } from "./components/settings-dialog/settings-dialog.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule, 
    PlaylistTreeComponent, 
    StatsPanelComponent, 
    SongGridComponent
  ],
  template: `
    <div class="app">
      <div class="sidebar">
        <app-playlist-tree (nodeSelect)="handleNodeSelect($event)"> </app-playlist-tree>
      </div>

      <div class="content">
        <div class="stats">
          <app-stats-panel
            [songs]="playlistContent()"
            [loading]="loading()"
            [currentFilter]="currentFilter()"
            (filterChange)="setFilter($event)"
            (repair)="handleMissingFiles()"
            (openSettings)="openSettingsDialog()"
          >
          </app-stats-panel>
        </div>

        <div class="main">
          @if (error()) {
            <div class="error-message">
              {{ error() }}
            </div>
          }
          @if (loading()) {
            <div class="loading"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>
          }
          <app-song-grid
            [songs]="filteredSongs()"
            [isLoading]="loading()"
            (accept)="handleAcceptAlternative()"
            (reject)="handleRejectAlternative()"
            (repair)="handleMissingFiles()"
          >
          </app-song-grid>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .app {
        display: grid;
        grid-template-columns: 300px 1fr;
        height: 100vh;
        padding: 1rem;
        gap: 1rem;
        background-color: var(--background-color);
      }

      .sidebar {
        background: var(--surface-color);
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-sm);
        overflow: hidden;
      }

      .content {
        display: grid;
        grid-template-rows: auto 1fr;
        gap: 1rem;
        overflow: hidden;
      }

      .stats {
        background: var(--surface-color);
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-sm);
        padding: 1rem;
      }

      .main {
        background: var(--surface-color);
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-sm);
        padding: 1rem;
        position: relative;
        overflow: hidden;

        .error-message {
          background: var(--danger-color);
          color: var(--text-color);
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: var(--border-radius-sm);
          border: 1px solid var(--border-color);
        }

        .loading {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(30, 35, 41, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 1.1em;
          color: var(--accent-color);

          i {
            font-size: 1.2em;
          }
        }
      }
    `,
  ],
})
export class AppComponent {
  selectedPlaylist = signal<TreeNode | null>(null);
  playlistContent = signal<Song[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  currentFilter = signal<"all" | "exists" | "missing">("all");

  constructor(
    private playlistService: PlaylistService,
    private dialog: MatDialog,
  ) {}

  filteredSongs() {
    const songs = this.playlistContent();
    switch (this.currentFilter()) {
      case "exists":
        return songs.filter((song) => song.isFileExists);
      case "missing":
        return songs.filter((song) => !song.isFileExists);
      default:
        return songs;
    }
  }

  setFilter(filter: "all" | "exists" | "missing") {
    this.currentFilter.set(filter);
  }

  handleNodeSelect(node: TreeNode) {
    this.selectedPlaylist.set(node);
    if (node.type !== "folder") {
      this.currentFilter.set("all");
      this.loadPlaylistContent(node.path);
    } else {
      this.playlistContent.set([]);
    }
  }

  private async loadPlaylistContent(path: string) {
    try {
      this.loading.set(true);
      this.error.set(null);

      const content = await firstValueFrom(this.playlistService.getPlaylistContent(path));
      this.playlistContent.set(content || []);
      this.loading.set(false);
    } catch (error) {
      this.error.set("Playlist içeriği yüklenirken bir hata oluştu");
      this.loading.set(false);
    }
  }

  async handleMissingFiles() {
    const currentSongs = this.playlistContent();
    this.loading.set(true);
    this.error.set(null);

    try {
      const missingPaths = currentSongs
        .filter((song) => !song.isFileExists)
        .map((song) => song.filePath);

      if (missingPaths.length === 0) {
        this.error.set("Onarılacak eksik dosya bulunamadı");
        return;
      }

      const selectedPlaylist = this.selectedPlaylist();
      if (!selectedPlaylist) {
        this.error.set("Playlist seçili değil");
        return;
      }

      const dialogRef = this.dialog.open(MultisearchDialogComponent, {
        width: "1400px",
        maxWidth: "95vw",
        data: {
          paths: missingPaths,
          playlistPath: selectedPlaylist.path,
          category: selectedPlaylist.type,
        },
      });

      const result = await dialogRef.afterClosed().toPromise();

      if (result?.success) {
        const currentPlaylist = this.selectedPlaylist();
        if (currentPlaylist) {
          await this.loadPlaylistContent(currentPlaylist.path);
        }
      }
    } catch (error) {
      this.error.set("Eksik dosyalar kontrol edilirken bir hata oluştu");
    } finally {
      this.loading.set(false);
    }
  }

  handleAcceptAlternative(): void {
    // TODO: Implement
  }

  handleRejectAlternative(): void {
    // TODO: Implement
  }

  openSettingsDialog(): void {
    const dialogRef = this.dialog.open(SettingsDialogComponent, {
      width: '500px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Ayarlar değiştiğinde gerekli işlemleri yap
        // Örneğin, mevcut playlist'i yeniden yükle
        const currentPlaylist = this.selectedPlaylist();
        if (currentPlaylist && currentPlaylist.type !== 'folder') {
          this.loadPlaylistContent(currentPlaylist.path);
        }
      }
    });
  }
}
