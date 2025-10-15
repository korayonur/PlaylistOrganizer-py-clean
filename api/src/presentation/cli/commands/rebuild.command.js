'use strict';

const RebuildIndexUseCase = require('../../../application/use-cases/search/RebuildIndexUseCase');
const { DatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');
const WordIndexService = require('../../../application/services/WordIndexService');
const { formatSuccess, formatError, formatInfo } = require('../utils/output');
const { showStage } = require('../utils/progress');

/**
 * Rebuild Index Command
 * Kelime index'ini yeniden oluşturur
 */
async function rebuildCommand(options) {
    try {
        console.log(formatInfo('🔄 Index yeniden oluşturuluyor...'));
        console.log(formatInfo('⚠️  Bu işlem birkaç dakika sürebilir'));
        console.log(formatInfo('📋 Logger sistemi aktif - api/logs/ klasörüne yazılıyor\n'));
        
        showStage('🧹 Eski indexler temizleniyor', 1, 4);
        showStage('📊 Tracks indexleri oluşturuluyor', 2, 4);
        showStage('🎵 Music files indexleri oluşturuluyor', 3, 4);
        showStage('🔗 Playlist ilişkileri oluşturuluyor', 4, 4);
        
        console.log('');
        console.log(formatInfo('⏳ İşlem başlatıldı, detayları log dosyasından izleyebilirsiniz:'));
        console.log(formatInfo('   tail -f api/logs/console_' + new Date().toISOString().split('T')[0] + '.log\n'));
        
        // Database ve servisleri başlat
        const dbManager = new DatabaseManager();
        await dbManager.initialize();
        const wordIndexService = new WordIndexService(dbManager.db);
        
        const useCase = new RebuildIndexUseCase(dbManager.db, wordIndexService);
        const result = await useCase.execute();
        
        if (result.success) {
            console.log('');
            console.log(formatSuccess('════════════════════════════════════════'));
            console.log(formatSuccess('✅ Index başarıyla yeniden oluşturuldu!'));
            console.log(formatSuccess('════════════════════════════════════════'));
            console.log('');
            console.log(formatInfo(`📊 Session ID: ${result.sessionId}`));
            console.log(formatInfo(`⏱️  Süre: ${result.duration.minutes}m ${result.duration.seconds}s`));
            console.log('');
            console.log(formatInfo(`📈 İstatistikler:`));
            console.log(formatInfo(`   Track Words: ${result.stats.trackWords.toLocaleString()}`));
            console.log(formatInfo(`   Music Words: ${result.stats.musicWords.toLocaleString()}`));
            console.log(formatInfo(`   Playlist Tracks: ${result.stats.playlistTracks.toLocaleString()}`));
            console.log('');
            console.log(formatInfo('💡 İşlem geçmişini görmek için:'));
            console.log(formatInfo('   node cli.js sessions'));
        } else {
            console.log(formatError(`❌ Rebuild hatası: ${result.message}`));
            if (result.error) {
                console.log(formatError(`   Detay: ${result.error}`));
            }
            process.exit(1);
        }
    } catch (error) {
        console.log(formatError(`❌ Rebuild komutu hatası: ${error.message}`));
        process.exit(1);
    }
}

module.exports = rebuildCommand;

