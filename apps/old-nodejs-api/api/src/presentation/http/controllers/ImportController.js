const StartImportUseCase = require('../../../application/use-cases/import/StartImportUseCase');
const GetImportStatusUseCase = require('../../../application/use-cases/import/GetImportStatusUseCase');

class ImportController {
    constructor(dbManager, wordIndexService) {
        this.startImportUseCase = new StartImportUseCase(dbManager.db, wordIndexService);
        this.getStatusUseCase = new GetImportStatusUseCase(dbManager.db);
    }

    async startImport(req, res) {
        try {
            const { path } = req.body || {};
            
            console.log(`[API] Import başlatılıyor: ${path || 'default path'}`);
            
            const result = await this.startImportUseCase.execute(path);
            
            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        sessionId: result.data.sessionId,
                        message: 'Import başarıyla başlatıldı',
                        path: result.data.path,
                        totalFiles: result.data.totalFiles
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.message || 'Import başlatılamadı'
                });
            }
        } catch (error) {
            console.error('[API] Import başlatma hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Import başlatma sırasında hata oluştu'
            });
        }
    }

    async getStatus(req, res) {
        try {
            const { path } = req.query || {};
            
            const result = await this.getStatusUseCase.execute(path);
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: result.message || 'Import durumu bulunamadı'
                });
            }
        } catch (error) {
            console.error('[API] Import durumu alma hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Import durumu alınırken hata oluştu'
            });
        }
    }
}

module.exports = ImportController;
