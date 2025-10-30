'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Bulk Fix Track Path Use Case
 * Global playlist fix logic - m3u ve vdjfolder dosyalarını günceller
 */
class BulkFixTrackPathUseCase {
    constructor(dbManager) {
        this.db = dbManager.db;
        this.trackRepo = dbManager.getRepositories().tracks;
        this.playlistRepo = dbManager.getRepositories().playlists;
    }

    /**
     * Track path'ini global olarak düzelt
     * @param {string} oldPath - Eski dosya yolu
     * @param {string} newPath - Yeni dosya yolu
     * @returns {Promise<Object>} Fix sonuçları
     */
    async execute(oldPath, newPath) {
        try {
            console.log(`🔧 Bulk fix başlatılıyor: "${oldPath}" → "${newPath}"`);
            
            // 1. Database'de bu track'i kullanan TÜM playlist'leri bul
            const affectedPlaylists = await this.findAffectedPlaylists(oldPath);
            console.log(`📋 ${affectedPlaylists.length} playlist etkilenecek`);
            
            if (affectedPlaylists.length === 0) {
                return {
                    success: true,
                    message: 'Bu track hiçbir playlist\'te kullanılmıyor',
                    affectedPlaylists: 0,
                    filesUpdated: 0,
                    filesFailed: 0,
                    details: []
                };
            }
            
            // 2. Her playlist dosyasını (m3u/vdjfolder) fiziksel olarak güncelle
            const fileUpdateResults = await this.updatePlaylistFiles(affectedPlaylists, oldPath, newPath);
            
            // 3. Database'deki track path'ini güncelle
            await this.updateTrackInDatabase(oldPath, newPath);
            
            console.log(`✅ Bulk fix tamamlandı: ${fileUpdateResults.updated} dosya güncellendi`);
            
            return {
                success: true,
                affectedPlaylists: affectedPlaylists.length,
                filesUpdated: fileUpdateResults.updated,
                filesFailed: fileUpdateResults.failed,
                details: fileUpdateResults.details
            };
            
        } catch (error) {
            console.error(`❌ BulkFixTrackPathUseCase hatası: ${error.message}`);
            return {
                success: false,
                error: error.message,
                affectedPlaylists: 0,
                filesUpdated: 0,
                filesFailed: 0,
                details: []
            };
        }
    }

    /**
     * Track'i kullanan playlist'leri bul
     * @param {string} trackPath - Track dosya yolu
     * @returns {Promise<Array>} Etkilenen playlist'ler
     */
    async findAffectedPlaylists(trackPath) {
        try {
            // tracks → playlist_tracks → playlists JOIN
            const stmt = this.db.prepare(`
                SELECT DISTINCT p.id, p.path, p.name, p.type
                FROM playlists p
                INNER JOIN playlist_tracks pt ON p.id = pt.playlist_id
                INNER JOIN tracks t ON pt.track_id = t.id
                WHERE t.path = ?
            `);
            
            const playlists = stmt.all(trackPath);
            console.log(`🔍 Etkilenen playlist'ler bulundu: ${playlists.length}`);
            
            return playlists;
            
        } catch (error) {
            console.error(`❌ findAffectedPlaylists hatası: ${error.message}`);
            return [];
        }
    }

    /**
     * Playlist dosyalarını güncelle
     * @param {Array} playlists - Güncellenecek playlist'ler
     * @param {string} oldPath - Eski dosya yolu
     * @param {string} newPath - Yeni dosya yolu
     * @returns {Promise<Object>} Güncelleme sonuçları
     */
    async updatePlaylistFiles(playlists, oldPath, newPath) {
        const results = { updated: 0, failed: 0, details: [] };
        
        console.log(`📝 ${playlists.length} playlist dosyası güncelleniyor...`);
        
        for (const playlist of playlists) {
            try {
                // Dosya var mı kontrol et
                if (!fs.existsSync(playlist.path)) {
                    console.log(`⚠️ Dosya bulunamadı: ${playlist.path}`);
                    results.failed++;
                    results.details.push({
                        playlist: playlist.name,
                        path: playlist.path,
                        status: 'failed',
                        error: 'Dosya bulunamadı'
                    });
                    continue;
                }
                
                // Dosyayı oku
                const content = fs.readFileSync(playlist.path, 'utf8');
                
                // Tüm oldPath instance'larını newPath ile değiştir
                const updatedContent = content.replaceAll(oldPath, newPath);
                
                // Değişiklik var mı kontrol et
                if (content !== updatedContent) {
                    // Dosyayı yaz
                    fs.writeFileSync(playlist.path, updatedContent, 'utf8');
                    results.updated++;
                    results.details.push({
                        playlist: playlist.name,
                        path: playlist.path,
                        status: 'success',
                        changes: (content.match(new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
                    });
                    console.log(`✅ Güncellendi: ${playlist.name} (${(content.match(new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length} değişiklik)`);
                } else {
                    console.log(`ℹ️ Değişiklik yok: ${playlist.name}`);
                    results.details.push({
                        playlist: playlist.name,
                        path: playlist.path,
                        status: 'no_changes',
                        changes: 0
                    });
                }
                
            } catch (error) {
                console.error(`❌ Dosya güncelleme hatası (${playlist.name}): ${error.message}`);
                results.failed++;
                results.details.push({
                    playlist: playlist.name,
                    path: playlist.path,
                    status: 'failed',
                    error: error.message
                });
            }
        }
        
        console.log(`📊 Dosya güncelleme tamamlandı: ${results.updated} başarılı, ${results.failed} başarısız`);
        return results;
    }

    /**
     * Database'deki track path'ini güncelle
     * @param {string} oldPath - Eski dosya yolu
     * @param {string} newPath - Yeni dosya yolu
     */
    async updateTrackInDatabase(oldPath, newPath) {
        try {
            // tracks tablosunda path güncelle
            const stmt = this.db.prepare(`
                UPDATE tracks SET path = ? WHERE path = ?
            `);
            
            const result = stmt.run(newPath, oldPath);
            console.log(`🗄️ Database güncellendi: ${result.changes} track güncellendi`);
            
        } catch (error) {
            console.error(`❌ Database güncelleme hatası: ${error.message}`);
            throw error;
        }
    }
}

module.exports = BulkFixTrackPathUseCase;
