'use strict';

const StartImportUseCase = require('../../../application/use-cases/import/StartImportUseCase');
const { formatSuccess, formatError, formatInfo } = require('../utils/output');
const { showStage } = require('../utils/progress');

/**
 * Import Command
 * Import işlemini başlatır
 */
async function importCommand(options) {
    try {
        console.log(formatInfo('🚀 Import işlemi başlatılıyor...'));
        console.log(formatInfo('📊 Session tracking aktif'));
        console.log(formatInfo('📋 Logger sistemi aktif - api/logs/ klasörüne yazılıyor\n'));
        
        showStage('🔄 Tablolar temizleniyor', 1, 4);
        showStage('📂 Klasörler taranıyor', 2, 4);
        showStage('💾 Veriler import ediliyor', 3, 4);
        showStage('🔍 Indexler oluşturuluyor', 4, 4);
        
        console.log('');
        console.log(formatInfo('⏳ İşlem başlatıldı, detayları log dosyasından izleyebilirsiniz:'));
        console.log(formatInfo('   tail -f api/logs/console_' + new Date().toISOString().split('T')[0] + '.log\n'));
        
        const useCase = new StartImportUseCase();
        const result = await useCase.execute();
        
        if (result.success) {
            console.log('');
            console.log(formatSuccess('════════════════════════════════════════'));
            console.log(formatSuccess('✅ Import başarıyla tamamlandı!'));
            console.log(formatSuccess('════════════════════════════════════════'));
            console.log('');
            console.log(formatInfo(`📊 Session ID: ${result.data.sessionId}`));
            console.log(formatInfo(`📈 Toplam: ${result.data.totalFiles.toLocaleString()} dosya`));
            console.log(formatSuccess(`✅ Eklenen: ${result.data.added.toLocaleString()} dosya`));
            console.log(formatInfo(`⏭️  Atlanan: ${result.data.skipped.toLocaleString()} dosya`));
            console.log(formatError(`❌ Hata: ${result.data.errors} dosya`));
            console.log('');
            console.log(formatInfo('💡 İşlem geçmişini görmek için:'));
            console.log(formatInfo('   node cli.js sessions'));
            console.log('');
            console.log(formatInfo('💡 Database istatistiklerini görmek için:'));
            console.log(formatInfo('   node cli.js db:stats'));
        } else {
            console.log(formatError(`❌ Import hatası: ${result.message}`));
            if (result.error) {
                console.log(formatError(`   Detay: ${result.error}`));
            }
            process.exit(1);
        }
    } catch (error) {
        console.log(formatError(`❌ Import komutu hatası: ${error.message}`));
        process.exit(1);
    }
}

module.exports = importCommand;

