'use strict';

const SearchByFilenameUseCase = require('../../../application/use-cases/search/SearchByFilenameUseCase');
const BulkFixTrackPathUseCase = require('../../../application/use-cases/track/BulkFixTrackPathUseCase');

/**
 * Track Fix Controller
 * Eksik dosyalar için arama ve bulk fix işlemleri
 */
class TrackFixController {
    constructor(dbManager, wordIndexService) {
        this.dbManager = dbManager;
        this.searchByFilenameUseCase = new SearchByFilenameUseCase(dbManager.db, wordIndexService);
        this.bulkFixUseCase = new BulkFixTrackPathUseCase(dbManager);
    }

    /**
     * POST /api/track/search-by-filename
     * Dosya adı ile track arama
     */
    async searchByFilename(req, res) {
        try {
            const { fileName, limit = 1 } = req.body;
            
            if (!fileName || fileName.trim() === '') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'fileName gerekli' 
                });
            }
            
            console.log(`[TrackFix] Dosya adı ile arama: "${fileName}"`);
            
            const results = await this.searchByFilenameUseCase.execute(fileName.trim(), limit);
            
            res.json({
                success: true,
                query: fileName.trim(),
                result: results[0] || null, // Tek sonuç döndür
                total: results.length,
                message: results.length > 0 ? 'Sonuç bulundu' : 'Sonuç bulunamadı'
            });
            
        } catch (error) {
            console.error('[TrackFix] Search error:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    /**
     * POST /api/track/bulk-fix
     * Bulk fix preview - hangi playlist'ler etkilenecek?
     */
    async bulkFix(req, res) {
        try {
            const { oldPath, newPath } = req.body;
            
            if (!oldPath || !newPath) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'oldPath ve newPath gerekli' 
                });
            }
            
            console.log(`[TrackFix] Bulk fix preview: "${oldPath}" → "${newPath}"`);
            
            // Önce etkilenen playlist'leri göster (dry-run)
            const affectedPlaylists = await this.bulkFixUseCase.findAffectedPlaylists(oldPath);
            
            res.json({
                success: true,
                affectedPlaylists: affectedPlaylists.map(p => ({
                    name: p.name,
                    path: p.path,
                    type: p.type
                })),
                totalPlaylists: affectedPlaylists.length,
                message: `${affectedPlaylists.length} playlist etkilenecek`
            });
            
        } catch (error) {
            console.error('[TrackFix] Preview error:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    /**
     * POST /api/track/bulk-fix/confirm
     * Bulk fix onayla ve çalıştır
     */
    async bulkFixConfirm(req, res) {
        try {
            const { oldPath, newPath } = req.body;
            
            if (!oldPath || !newPath) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'oldPath ve newPath gerekli' 
                });
            }
            
            console.log(`[TrackFix] Bulk fix confirm: "${oldPath}" → "${newPath}"`);
            
            const result = await this.bulkFixUseCase.execute(oldPath, newPath);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: `Başarılı! ${result.filesUpdated} playlist güncellendi`,
                    ...result
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Bilinmeyen hata',
                    ...result
                });
            }
            
        } catch (error) {
            console.error('[TrackFix] Fix error:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }
}

module.exports = TrackFixController;
