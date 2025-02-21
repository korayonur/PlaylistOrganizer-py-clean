import { Component, Input, Output, EventEmitter } from "@angular/core";
import { TreeNode } from "../../../models/tree-node.model";

@Component({
  selector: "app-playlist-card",
  standalone: true,
  template: `
    <div
      class="playlist-card"
      role="button"
      tabindex="0"
      [class.selected]="playlist.isSelected"
      (click)="playlistSelect.emit()"
      (keydown.enter)="playlistSelect.emit()"
      (keydown.space)="playlistSelect.emit()"
      [attr.aria-label]="'Çalma listesi: ' + playlist.name"
    >
      <div class="playlist-name">{{ playlist.name }}</div>
      <div class="playlist-path">{{ playlist.path }}</div>
    </div>
  `,
  styles: [
    `
      .playlist-card {
        padding: 10px;
        margin: 5px;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .playlist-card:hover,
      .playlist-card:focus {
        background-color: #f0f0f0;
      }
      .playlist-card.selected {
        background-color: #e0e0e0;
        border-color: #999;
      }
      .playlist-name {
        font-weight: bold;
        margin-bottom: 5px;
      }
      .playlist-path {
        font-size: 0.9em;
        color: #666;
      }
    `,
  ],
})
export class PlaylistCardComponent {
  @Input({ required: true }) playlist!: TreeNode;
  @Output() playlistSelect = new EventEmitter<void>();
}
