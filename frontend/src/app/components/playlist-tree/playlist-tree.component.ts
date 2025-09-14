import { Component, EventEmitter, Output, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TreeNode, PlaylistMap, PlaylistResponse } from "../../models/tree-node.model";
import { PlaylistService } from "../../services/playlist.service";

@Component({
  selector: "app-playlist-tree",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="playlist-tree">
      <div class="search-container">
        <input
          type="text"
          [ngModel]="searchQuery()"
          (ngModelChange)="handleSearchChange($event)"
          placeholder="Playlist ara..."
          class="search-input"
          aria-label="Playlist arama kutusu"
        />
        <button
          *ngIf="searchQuery()"
          class="clear-button"
          (click)="clearSearch()"
          aria-label="Aramayı temizle"
        >
          <span class="material-icons">close</span>
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading">
        <span class="material-icons spin">refresh</span> Yükleniyor...
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="error">
        {{ error() }}
      </div>

      <!-- Tree Container -->
      <div class="tree-container" *ngIf="!loading() && !error()">
        <ng-container *ngTemplateOutlet="treeTemplate; context: { nodes: filteredNodes() }">
        </ng-container>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading() && !error() && filteredNodes().length === 0" class="empty-state">
        <span class="icon">🔍</span>
        <p class="message">Sonuç bulunamadı</p>
        <p class="sub-message">Farklı bir arama terimi deneyin</p>
      </div>

      <ng-template #treeTemplate let-nodes="nodes">
        <ul class="tree-list" role="tree">
          <li
            *ngFor="let node of nodes"
            class="tree-node"
            [class.expanded]="node.isExpanded"
            [class.selected]="node.isSelected"
            [class.matched]="searchQuery() && isNodeMatched(node)"
            role="treeitem"
            [attr.aria-expanded]="node.type === 'folder' ? node.isExpanded : undefined"
            [attr.aria-selected]="node.isSelected"
          >
            <div
              class="node-content"
              (click)="node.type === 'folder' ? toggleNode(node.id) : selectNode(node.id)"
              (keydown.enter)="node.type === 'folder' ? toggleNode(node.id) : selectNode(node.id)"
              (keydown.space)="node.type === 'folder' ? toggleNode(node.id) : selectNode(node.id)"
              tabindex="0"
            >
              <span class="icon">{{ getNodeIcon(node) }}</span>
              <span class="node-name">{{ node.name }}</span>
              <span class="count">{{
                node.type === "folder" ? node.children?.length || 0 : node.songCount || 0
              }}</span>
            </div>

            <ng-container *ngIf="node.type === 'folder' && node.isExpanded">
              <ng-container *ngTemplateOutlet="treeTemplate; context: { nodes: node.children }">
              </ng-container>
            </ng-container>
          </li>
        </ul>
      </ng-template>
    </div>
  `,
  styleUrls: ["./playlist-tree.component.scss"],
})
export class PlaylistTreeComponent {
  playlists = signal<PlaylistMap>({});
  searchQuery = signal<string>("");
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  stats = signal<{ totalNodes: number; folders: number; playlists: number }>({
    totalNodes: 0,
    folders: 0,
    playlists: 0,
  });

  // rootNodes'u computed signal olarak tanımla
  rootNodes = computed(() => {
    const map = this.playlists();
    const nodes = Object.values(map);

    // Folders ve MyLists node'larını bul
    const foldersNode = nodes.find(node => node.name === "Folders");
    const myListsNode = nodes.find(node => node.name === "MyLists");

    let rootNodes: TreeNode[] = [];

    // Folders'ın içeriğini al
    if (foldersNode && foldersNode.children) {
      rootNodes = [...foldersNode.children];
    }

    // MyLists'i ekle
    if (myListsNode) {
      rootNodes.push(myListsNode);
    }

    return rootNodes;
  });

  @Output() nodeSelect = new EventEmitter<TreeNode>();

  constructor(private readonly playlistService: PlaylistService) {
    this.loadPlaylists();
  }

  // Filtrelenmiş düğümleri hesapla
  filteredNodes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const allNodes = Object.values(this.playlists());

    if (!query) {
      // Arama yoksa sadece root düğümleri göster
      return this.rootNodes();
    }

    // Tüm düğümlerde arama yap ve eşleşenleri bul
    const matchingNodes = new Set<TreeNode>();
    const relevantParents = new Set<TreeNode>();

    // Önce eşleşen tüm düğümleri bul
    allNodes.forEach((node) => {
      if (node.name.toLowerCase().includes(query)) {
        matchingNodes.add(node);
      } else if (node.type === "folder") {
        // Alt düğümlerde arama yap
        const hasMatchingChild = this.hasMatchingDescendant(node);
        if (hasMatchingChild) {
          matchingNodes.add(node);
        }
      }
    });

    // Eşleşen düğümlerin parent'larını bul
    matchingNodes.forEach((node) => {
      let currentPath = node.path;
      while (currentPath.includes("/")) {
        currentPath = currentPath.substring(0, currentPath.lastIndexOf("/"));
        const parentNode = allNodes.find((n) => n.path === currentPath);
        if (parentNode) {
          relevantParents.add(parentNode);
        }
      }
    });

    // Filtrelenmiş ağacı oluştur
    const filteredTree: TreeNode[] = [];
    this.rootNodes().forEach((rootNode) => {
      if (matchingNodes.has(rootNode) || relevantParents.has(rootNode)) {
        // Root düğümün alt elemanlarını filtrele
        const filteredNode = this.filterNodeChildren(rootNode, matchingNodes, relevantParents);
        if (filteredNode) {
          filteredTree.push(filteredNode);
        }
      }
    });

    return filteredTree;
  });

  // Düğümün alt elemanlarını filtrele
  private filterNodeChildren(
    node: TreeNode,
    matchingNodes: Set<TreeNode>,
    relevantParents: Set<TreeNode>,
  ): TreeNode | null {
    if (!node.children) {
      return matchingNodes.has(node) ? node : null;
    }

    // Alt elemanları filtrele
    const filteredChildren = node.children
      .map((child) => this.filterNodeChildren(child, matchingNodes, relevantParents))
      .filter((child): child is TreeNode => child !== null);

    if (filteredChildren.length > 0 || matchingNodes.has(node) || relevantParents.has(node)) {
      return {
        ...node,
        children: filteredChildren,
        isExpanded: this.searchQuery().trim() !== "", // Sadece arama yapıldığında aç
      };
    }

    return null;
  }

  // Düğüm veya alt düğümlerinden herhangi biri eşleşiyor mu?
  isNodeMatched(node: TreeNode): boolean {
    const query = this.searchQuery().toLowerCase().trim();
    return node.name.toLowerCase().includes(query);
  }

  // Alt düğümlerden herhangi biri eşleşiyor mu?
  hasMatchingDescendant(node: TreeNode): boolean {
    if (!node.children) return false;

    const query = this.searchQuery().toLowerCase().trim();
    return node.children.some(
      (child) =>
        child.name.toLowerCase().includes(query) ||
        (child.type === "folder" && this.hasMatchingDescendant(child)),
    );
  }

  handleSearchChange(value: string) {
    this.searchQuery.set(value);

    // Arama yapıldığında ilgili klasörleri aç
    if (value.trim()) {
      const playlists = this.playlists();
      Object.values(playlists).forEach((node) => {
        if (node.type === "folder") {
          // Klasörün kendisi veya alt elemanları eşleşiyorsa aç
          if (this.isNodeMatched(node) || this.hasMatchingDescendant(node)) {
            node.isExpanded = true;
          }
        }
      });
      this.playlists.set({ ...playlists });
    } else {
      // Arama temizlendiğinde tüm klasörleri kapat
      const playlists = this.playlists();
      Object.values(playlists).forEach((node) => {
        if (node.type === "folder") {
          node.isExpanded = false;
        }
      });
      this.playlists.set({ ...playlists });
    }
  }

  loadPlaylists(): void {
    console.log('🔄 loadPlaylists başlatıldı');
    this.loading.set(true);
    this.error.set(null);

    this.playlistService.getPlaylists().subscribe({
      next: (response: PlaylistResponse) => {
        console.log('✅ API Response alındı:', response);
        if (!response.success) {
          console.error('❌ Response success false:', response);
          this.error.set("Sunucudan geçersiz yanıt alındı");
          this.loading.set(false);
          return;
        }

        // Map oluştur
        const map: PlaylistMap = {};
        const processNode = (node: TreeNode): TreeNode => {
          // Önce alt elemanları işle
          const children = node.children?.map(processNode);

          // Node'u map'e ekle
          const processedNode = {
            ...node,
            children,
            isExpanded: false, // Varsayılan olarak kapalı
            isSelected: false,
          };
          map[node.id] = processedNode;

          return processedNode;
        };

        // Root node'ları işle
        response.data.forEach(processNode);

        this.playlists.set(map);
        this.stats.set(response.stats);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ API Error:', error);
        this.error.set("Playlistler yüklenirken bir hata oluştu");
        this.loading.set(false);
      },
    });
  }

  toggleNode(id: string) {
    const playlists = this.playlists();
    const node = playlists[id];

    if (node && node.type === "folder") {
      // Seçili node'u güncelle
      Object.values(playlists).forEach((n) => (n.isSelected = false));
      node.isSelected = true;

      // Klasörü aç/kapat
      node.isExpanded = !node.isExpanded;

      this.playlists.set({ ...playlists });

      // Event'i yayınla
      this.nodeSelect.emit(node);
    }
  }

  selectNode(id: string) {
    const playlists = this.playlists();
    const node = playlists[id];
    
    if (node) {
      // Tüm node'ların seçimini kaldır
      Object.values(playlists).forEach(n => n.isSelected = false);
      
      // Seçili node'u güncelle
      node.isSelected = true;
      this.playlists.set({ ...playlists });

      // Event'i yayınla
      this.nodeSelect.emit(node);
    }
  }

  getNodeIcon(node: TreeNode): string {
    if (node.type === "folder") {
      return node.isExpanded ? "📂" : "📁";
    }
    return "🎵";
  }

  clearSearch() {
    this.searchQuery.set("");

    // Tüm klasörleri kapat
    const playlists = this.playlists();
    Object.values(playlists).forEach((node) => {
      if (node.type === "folder") {
        node.isExpanded = false;
      }
    });
    this.playlists.set({ ...playlists });
  }
}
