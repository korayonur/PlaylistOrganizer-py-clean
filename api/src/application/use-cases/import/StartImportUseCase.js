'use strict';

const ImportService = require('../../services/ImportService');
const { DatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');
const WordIndexService = require('../../services/WordIndexService');

/**
 * Start Import Use Case
 * Import işlemini başlatır
 */
class StartImportUseCase {
    constructor() {
        // Database ve servisleri initialize et
        this.dbManager = null;
        this.wordIndexService = null;
        this.importService = null;
    }

    async initialize() {
        if (!this.dbManager) {
            this.dbManager = new DatabaseManager();
            await this.dbManager.initialize();
            this.wordIndexService = new WordIndexService(this.dbManager.db);
            this.importService = new ImportService(this.dbManager.db, this.wordIndexService);
        }
    }

    /**
     * Import başlat
     * @returns {Promise<Object>} Import sonucu
     */
    async execute() {
        try {
            await this.initialize();
            
            console.log('🚀 Import başlatılıyor...');
            console.log('📊 Session tracking aktif - import_sessions tablosuna kaydedilecek\n');
            
            const result = await this.importService.scanAndImport();
            
            if (result.success) {
                console.log(`\n✅ Import tamamlandı!`);
                console.log(`📊 Session ID: ${result.data.sessionId}`);
                console.log(`📈 Toplam: ${result.data.totalFiles} dosya`);
                console.log(`✅ Eklenen: ${result.data.added} dosya`);
                console.log(`⏭️  Atlanan: ${result.data.skipped} dosya`);
                console.log(`❌ Hata: ${result.data.errors} dosya`);
                
                // Cache'i invalidate et
                try {
                    const CacheService = require('../../services/CacheService');
                    const cacheService = new CacheService();
                    await cacheService.invalidate('fix-suggestions');
                    console.log('🗑️  Cache invalidated - yeni veri için cache yenilenecek');
                } catch (cacheError) {
                    console.log('⚠️  Cache invalidation hatası:', cacheError.message);
                }
                
                console.log('');
                console.log(formatInfo('💡 İşlem geçmişini görmek için: node cli.js sessions'));
            } else {
                console.error(`❌ Import hatası: ${result.message}`);
            }
            
            return result;
        } catch (error) {
            console.error(`❌ Import use case hatası: ${error.message}`);
            return {
                success: false,
                message: 'Import başlatma hatası',
                error: error.message
            };
        }
    }
}

function formatInfo(text) {
    return `\x1b[36m${text}\x1b[0m`;
}

module.exports = StartImportUseCase;

