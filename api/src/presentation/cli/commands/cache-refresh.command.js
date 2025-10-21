'use strict';

const { formatSuccess, formatError, formatInfo } = require('../utils/output');
const { showStage } = require('../utils/progress');

/**
 * Cache Refresh Command
 * Fix suggestions cache'ini yeniden oluşturur
 */
async function cacheRefreshCommand(options) {
    try {
        console.log(formatInfo('🔄 Cache refresh başlatılıyor...'));
        console.log(formatInfo('⚠️  Bu işlem birkaç dakika sürebilir'));
        console.log(formatInfo('📋 Logger sistemi aktif - api/logs/ klasörüne yazılıyor\n'));
        
        showStage('🗑️  Eski cache temizleniyor', 1, 3);
        showStage('📊 Yeni cache oluşturuluyor', 2, 3);
        showStage('✅ Cache kontrol ediliyor', 3, 3);
        
        console.log('');
        console.log(formatInfo('⏳ İşlem başlatıldı, detayları log dosyasından izleyebilirsiniz:'));
        console.log(formatInfo('   tail -f api/logs/api_dev.log\n'));
        
        // Database ve servisleri başlat
        const { DatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');
        const WordIndexService = require('../../../application/services/WordIndexService');
        const SimilarityService = require('../../../application/services/SimilarityService');
        
        const dbManager = new DatabaseManager();
        await dbManager.initialize();
        
        const db = dbManager.getDatabase();
        const wordIndexService = new WordIndexService(db);
        const similarityService = new SimilarityService(db, wordIndexService);
        
        // Eski cache'i sil
        console.log(formatInfo('🗑️  Eski cache siliniyor...'));
        await similarityService.cacheService.invalidate('fix-suggestions');
        console.log(formatSuccess('✅ Eski cache silindi'));
        
        // Yeni cache oluştur
        const limit = options.limit ? parseInt(options.limit) : null;
        console.log(formatInfo(`📊 Yeni cache oluşturuluyor (limit: ${limit || 'tümü'})...`));
        
        const result = await similarityService.generateSuggestions({
            limit,
            offset: 0
        });
        
        if (result && result.total > 0) {
            console.log('');
            console.log(formatSuccess('════════════════════════════════════════'));
            console.log(formatSuccess('✅ Cache başarıyla yenilendi!'));
            console.log(formatSuccess('════════════════════════════════════════'));
            console.log('');
            console.log(formatInfo(`📊 Cache İstatistikleri:`));
            console.log(formatInfo(`   Toplam Öneri: ${result.total.toLocaleString()}`));
            console.log(formatInfo(`   Cache'de: ${result.count.toLocaleString()}`));
            console.log('');
            console.log(formatInfo(`🎯 Match Type Dağılımı:`));
            console.log(formatInfo(`   Exact: ${result.stats.exact.toLocaleString()}`));
            console.log(formatInfo(`   High: ${result.stats.high.toLocaleString()}`));
            console.log(formatInfo(`   Medium: ${result.stats.medium.toLocaleString()}`));
            console.log(formatInfo(`   Low: ${result.stats.low.toLocaleString()}`));
            console.log('');
            console.log(formatInfo('💡 Cache dosyası: api/cache/fix-suggestions.json'));
            console.log(formatInfo('🌐 API endpoint: GET /api/similarity/suggestions'));
        } else {
            console.log(formatError(`❌ Cache refresh hatası: ${result.message}`));
            if (result.error) {
                console.log(formatError(`   Detay: ${result.error}`));
            }
            process.exit(1);
        }
    } catch (error) {
        console.log(formatError(`❌ Cache refresh komutu hatası: ${error.message}`));
        console.error(error);
        process.exit(1);
    }
}

module.exports = cacheRefreshCommand;
