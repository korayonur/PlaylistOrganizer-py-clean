const GetPlaylistsUseCase = require('../../../application/use-cases/playlist/GetPlaylistsUseCase');
const GetPlaylistDetailUseCase = require('../../../application/use-cases/playlist/GetPlaylistDetailUseCase');

class PlaylistController {
    constructor(dbManager) {
        this.getPlaylistsUseCase = new GetPlaylistsUseCase(dbManager.db);
        this.getDetailUseCase = new GetPlaylistDetailUseCase(dbManager.db);
    }

    async getPlaylists(req, res) {
        try {
            // Tree yapısı için tüm playlist'leri almamız gerekiyor
            const { limit = 10000, offset = 0, onlyWithMissing = 'false' } = req.query;
            
            console.log(`[API] Playlists alınıyor: limit=${limit}, offset=${offset}, onlyWithMissing=${onlyWithMissing}`);
            
            const result = await this.getPlaylistsUseCase.execute({ 
                limit: parseInt(limit), 
                offset: parseInt(offset),
                onlyWithMissing: onlyWithMissing === 'true' || onlyWithMissing === true
            });
            
            if (result.success) {
                // Frontend'in beklediği format: tree structure
                const treeData = this.buildPlaylistTree(result.data);
                
                res.json({
                    success: true,
                    data: treeData, // Tree structure
                    stats: {
                        total: result.data.length,
                        limit: parseInt(limit),
                        offset: parseInt(offset)
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.message || 'Playlists alınamadı'
                });
            }
        } catch (error) {
            console.error('[API] Playlists alma hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Playlists alınırken hata oluştu'
            });
        }
    }

    async getPlaylistDetail(req, res) {
        try {
            const { id } = req.params;
            
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    error: 'Geçerli bir playlist ID gerekli'
                });
            }
            
            console.log(`[API] Playlist detayı alınıyor: ID=${id}`);
            
            const result = await this.getDetailUseCase.execute(parseInt(id));
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: result.message || 'Playlist bulunamadı'
                });
            }
        } catch (error) {
            console.error('[API] Playlist detay alma hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Playlist detayı alınırken hata oluştu'
            });
        }
    }

    /**
     * Path'i parse et ve hiyerarşik parçalara ayır
     * @param {string} fullPath - Full filesystem path
     * @returns {string[]} Hiyerarşik parçalar
     */
    extractPathParts(fullPath) {
        // 1. VirtualDJ sonrasını al
        const vdjIndex = fullPath.indexOf('VirtualDJ/');
        if (vdjIndex === -1) return [];
        
        const relativePath = fullPath.substring(vdjIndex + 'VirtualDJ/'.length);
        
        // 2. .subfolders/ → / (parent-child marker'ı normalize et)
        // 3. Dosya uzantısını kaldır
        // 4. Slash'lere böl
        const parts = relativePath
            .replace(/\.subfolders\//g, '/')  // Latin.subfolders/bachata → Latin/bachata
            .replace(/\.(vdjfolder|m3u8?)$/, '')  // uzantı kaldır
            .split('/')
            .filter(p => p && p.trim());
        
        return parts;
    }

    /**
     * Playlist'i tree'ye recursive olarak ekle
     * @param {Object} node - Mevcut node (object tree)
     * @param {string[]} parts - Kalan path parçaları
     * @param {Object} playlist - Playlist entity
     */
    insertIntoTree(node, parts, playlist) {
        if (parts.length === 0) return;
        
        const [current, ...remaining] = parts;
        
        if (remaining.length === 0) {
            // SON ELEMAN = PLAYLIST (leaf node)
            // EDGE CASE: Eğer bu node zaten folder ise, playlist olarak değiştirme!
            // Çünkü "PlayLists.vdjfolder" + "PlayLists.subfolders/" durumu var
            if (!node[current] || node[current].type !== 'folder') {
                node[current] = {
                    type: 'playlist',
                    id: playlist.id,
                    name: current,
                    path: playlist.path,
                    track_count: playlist.track_count || 0,
                    playlistType: playlist.type  // m3u or vdjfolder
                };
            }
            // Eğer zaten folder ise, playlist bilgisini kaydet ama folder olarak tut
            else {
                // Folder olarak kalacak ama playlist bilgisini de sakla
                node[current].playlistId = playlist.id;
                node[current].playlistPath = playlist.path;
                node[current].playlistTrackCount = playlist.track_count || 0;
            }
        } else {
            // ARA ELEMAN = FOLDER (branch node)
            if (!node[current]) {
                node[current] = {
                    type: 'folder',
                    name: current,
                    children: {},
                    count: 0
                };
            } else if (node[current].type === 'playlist') {
                // EDGE CASE: Eğer bu node playlist olarak eklenmişse ama şimdi folder gerekiyorsa
                // Playlist'i folder'a çevir ve playlist bilgisini sakla
                const existingPlaylist = { ...node[current] };
                node[current] = {
                    type: 'folder',
                    name: current,
                    children: {},
                    count: 0,
                    // Eski playlist bilgisini sakla
                    playlistId: existingPlaylist.id,
                    playlistPath: existingPlaylist.path,
                    playlistTrackCount: existingPlaylist.track_count
                };
            }
            
            if (node[current].type === 'folder') {
                node[current].count++;
                this.insertIntoTree(node[current].children, remaining, playlist);
            }
        }
    }

    /**
     * Object tree'yi Array tree'ye çevir (Frontend formatı)
     * @param {Object} objTree - Object formatında tree
     * @param {string} parentPath - Parent path (ID için)
     * @returns {Array} Array formatında tree
     */
    convertTreeToArray(objTree, parentPath = '/VirtualDJ') {
        return Object.entries(objTree).map(([name, node]) => {
            const currentPath = `${parentPath}/${name}`;
            const nodeId = Buffer.from(currentPath).toString('base64');
            
            if (node.type === 'folder') {
                return {
                    id: nodeId,
                    name: node.name,
                    path: currentPath,
                    type: 'folder',
                    children: this.convertTreeToArray(node.children, currentPath),
                    // Frontend için ekstra bilgi
                    playlistCount: node.count
                };
            } else {
                // Playlist node
                return {
                    id: node.id.toString(),  // Database ID
                    name: node.name,
                    path: node.path,
                    type: 'playlist',
                    songCount: node.track_count,
                    children: []
                };
            }
        }).sort((a, b) => {
            // Folder'lar önce, sonra playlists
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            // İsme göre sırala
            return a.name.localeCompare(b.name, 'tr-TR');
        });
    }

    /**
     * Playlist'leri hiyerarşik tree'ye dönüştür - PURE DATABASE PATH PARSING
     * @param {Array} playlists - Database'den gelen playlist'ler
     * @returns {Array} Root node'ları içeren tree
     */
    buildPlaylistTree(playlists) {
        console.log(`[TREE] Building tree for ${playlists.length} playlists...`);
        
        // 1. BASE KLASÖRLERI OLUŞTUR
        const tree = {
            // Folders geçici - children'ı root'a taşınacak
            '__folders_temp': { type: 'folder', name: '__folders_temp', children: {}, count: 0 },
            'History': { type: 'folder', name: 'History', children: {}, count: 0 },
            'MyLists': { type: 'folder', name: 'MyLists', children: {}, count: 0 },
            'Sideview': { type: 'folder', name: 'Sideview', children: {}, count: 0 }
        };
        
        // 2. HER PLAYLIST'İ TREE'YE EKLE
        playlists.forEach(playlist => {
            const parts = this.extractPathParts(playlist.path);
            if (parts.length === 0) {
                console.warn(`[TREE] Could not parse path: ${playlist.path}`);
                return;
            }
            
            // İlk part base folder (History, MyLists, Folders, etc.)
            const baseFolder = parts[0];
            
            // Folders ise geçici folder'a ekle
            if (baseFolder === 'Folders') {
                this.insertIntoTree(tree['__folders_temp'].children, parts.slice(1), playlist);
                tree['__folders_temp'].count++;
            } else {
                // Diğerleri normal
                if (!tree[baseFolder]) {
                    console.warn(`[TREE] Unknown base folder: ${baseFolder} in path: ${playlist.path}`);
                    return;
                }
                this.insertIntoTree(tree[baseFolder].children, parts.slice(1), playlist);
                tree[baseFolder].count++;
            }
        });
        
        // 3. Folders'ın children'ını root'a taşı (koray, PlayLists, Serato)
        const foldersChildren = tree['__folders_temp'].children;
        Object.keys(foldersChildren).forEach(childName => {
            tree[childName] = foldersChildren[childName];
        });
        delete tree['__folders_temp'];  // Geçici folder'ı sil
        
        // 4. OBJECT TREE'Yİ ARRAY TREE'YE ÇEVİR (Frontend için)
        const arrayTree = this.convertTreeToArray(tree);
        
        console.log(`[TREE] Tree built successfully: ${arrayTree.length} root folders`);
        return arrayTree;
    }
}

module.exports = PlaylistController;
