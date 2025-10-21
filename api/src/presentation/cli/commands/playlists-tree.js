'use strict';

const fs = require('fs');
const PlaylistRepository = require('../../../infrastructure/database/repositories/PlaylistRepository');
const PlaylistController = require('../../http/controllers/PlaylistController');
const { getDatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');
const { formatSuccess, formatError, formatInfo } = require('../utils/output');

/**
 * Playlists Tree Command
 * VirtualDJ tarzı tree yapısını console'da göster
 */
async function playlistsTreeCommand(options = {}) {
    try {
        const dbManager = getDatabaseManager();
        dbManager.initialize(); // Database'i başlat
        const playlistRepo = new PlaylistRepository(dbManager.db);
        
        // Tüm playlist'leri al
        console.log(formatInfo('📊 Playlist\'ler yükleniyor...'));
        
        const limit = options.baseFolder ? 10000 : 10000; // Tüm playlist'leri al
        const excludeEmpty = options.includeEmpty ? false : true; // Varsayılan: boş playlist'leri gösterme
        const playlists = await playlistRepo.findAll({ 
            limit, 
            orderBy: 'path', 
            order: 'ASC',
            excludeEmpty 
        });
        
        console.log(formatSuccess(`✅ ${playlists.length} playlist yüklendi\n`));
        
        // Base folder filtresi
        let filteredPlaylists = playlists;
        if (options.baseFolder) {
            const baseFolderName = options.baseFolder;
            filteredPlaylists = playlists.filter(p => 
                p.path.includes(`VirtualDJ/${baseFolderName}/`)
            );
            console.log(formatInfo(`🔍 ${baseFolderName} klasörü filtrelendi: ${filteredPlaylists.length} playlist\n`));
        }
        
        // Tree'yi oluştur
        const controller = new PlaylistController(dbManager);
        const tree = controller.buildPlaylistTree(filteredPlaylists);
        
        // Seçeneklere göre output
        if (options.format === 'json') {
            // JSON export
            const output = JSON.stringify(tree, null, 2);
            if (options.output) {
                fs.writeFileSync(options.output, output);
                console.log(formatSuccess(`✅ Tree exported to: ${options.output}`));
            } else {
                console.log(output);
            }
        } else {
            // ASCII tree görünümü
            console.log(formatSuccess('🌳 PLAYLIST TREE:\n'));
            const maxDepth = options.depth || 10;
            printTree(tree, 0, maxDepth);
        }
        
        // İstatistikler
        const stats = calculateStats(tree);
        console.log(formatInfo('\n📊 İSTATİSTİKLER:'));
        console.log(formatInfo(`Total Folders: ${stats.folders}`));
        console.log(formatInfo(`Total Playlists: ${stats.playlists}`));
        console.log(formatInfo(`Max Depth: ${stats.maxDepth}`));
        console.log(formatInfo(`Total Tracks: ${stats.totalTracks}`));
        
    } catch (error) {
        console.error(formatError(`❌ Tree komut hatası: ${error.message}`));
        console.error(error.stack);
        process.exit(1);
    }
}

/**
 * Tree'yi ASCII formatında yazdır
 * @param {Array} nodes - Tree node'ları
 * @param {number} level - Derinlik seviyesi
 * @param {number} maxDepth - Maksimum derinlik
 */
function printTree(nodes, level = 0, maxDepth = 10) {
    if (level >= maxDepth) return;
    
    const indent = '  '.repeat(level);
    
    nodes.forEach(node => {
        if (node.type === 'folder') {
            const count = node.playlistCount || 0;
            console.log(`${indent}📁 ${node.name} (${count})`);
            if (node.children && node.children.length > 0) {
                printTree(node.children, level + 1, maxDepth);
            }
        } else {
            const tracks = node.songCount || 0;
            console.log(`${indent}🎵 ${node.name} (${tracks} tracks)`);
        }
    });
}

/**
 * Tree istatistiklerini hesapla
 * @param {Array} nodes - Tree node'ları
 * @param {number} currentDepth - Mevcut derinlik
 * @returns {Object} İstatistikler
 */
function calculateStats(nodes, currentDepth = 1) {
    let stats = {
        folders: 0,
        playlists: 0,
        maxDepth: currentDepth,
        totalTracks: 0
    };
    
    nodes.forEach(node => {
        if (node.type === 'folder') {
            stats.folders++;
            if (node.children && node.children.length > 0) {
                const childStats = calculateStats(node.children, currentDepth + 1);
                stats.folders += childStats.folders;
                stats.playlists += childStats.playlists;
                stats.maxDepth = Math.max(stats.maxDepth, childStats.maxDepth);
                stats.totalTracks += childStats.totalTracks;
            }
        } else {
            stats.playlists++;
            stats.totalTracks += node.songCount || 0;
        }
    });
    
    return stats;
}

module.exports = playlistsTreeCommand;

