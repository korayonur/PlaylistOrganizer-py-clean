'use strict';

const { Command } = require('commander');
const { formatHeader, formatInfo } = require('./utils/output');

// Commands
const importCommand = require('./commands/import.command');
const searchCommand = require('./commands/search.command');
const rebuildCommand = require('./commands/rebuild.command');
const { dbStatsCommand, dbAnalyzeCommand, dbUpdateTrackCountsCommand } = require('./commands/db.command');
const sessionsCommand = require('./commands/sessions.command');
const { similaritySuggestionsCommand, similarityStatisticsCommand, similarityUnmatchedCommand } = require('./commands/similarity.command');

// Logger'ı başlat
const { getLogger } = require('../../shared/logger');
getLogger();

/**
 * CLI Setup
 */
function setupCLI() {
    const program = new Command();

    program
        .name('playlist-organizer')
        .description('Playlist Organizer CLI - Müzik ve playlist yönetimi')
        .version('2.0.0');

    // Import komutu
    program
        .command('import')
        .description('VirtualDJ ve müzik klasörlerini import et')
        .action(importCommand);

    // Search komutu
    program
        .command('search <query>')
        .description('Kelime bazlı track arama')
        .option('-l, --limit <number>', 'Sonuç limiti', '10')
        .action(searchCommand);

    // Rebuild index komutu
    program
        .command('rebuild-index')
        .description('Kelime index\'ini yeniden oluştur')
        .action(rebuildCommand);

    // Database stats komutu
    program
        .command('db:stats')
        .description('Database istatistiklerini göster')
        .action(dbStatsCommand);

    // Database analyze komutu
    program
        .command('db:analyze')
        .description('Database analiz et ve sorunları tespit et')
        .action(dbAnalyzeCommand);

    // Database track count güncelleme komutu
    program
        .command('db:update-track-counts')
        .description('Playlist track count\'larını güncelle')
        .action(dbUpdateTrackCountsCommand);

    // Sessions komutu (import, rebuild-index vb. işlem geçmişi)
    program
        .command('sessions')
        .description('İşlem geçmişini görüntüle (import, rebuild-index vb.)')
        .option('-l, --limit <number>', 'Gösterilecek kayıt sayısı', '10')
        .action(sessionsCommand);

    // Similarity (Fix Önerileri) komutları
    program
        .command('similarity:suggestions')
        .description('Fix önerilerini listele')
        .option('-l, --limit <number>', 'Gösterilecek öneri sayısı (belirtilmezse tüm sonuçlar)')
        .option('-o, --offset <number>', 'Başlangıç offset', '0')
        .option('-t, --type <type>', 'Öneri tipi (exact/high/medium/low)')
        .action(similaritySuggestionsCommand);

    program
        .command('similarity:stats')
        .description('Similarity istatistiklerini göster')
        .action(similarityStatisticsCommand);

    program
        .command('similarity:unmatched')
        .description('Eşleşmemiş trackları listele')
        .option('-l, --limit <number>', 'Gösterilecek track sayısı', '20')
        .action(similarityUnmatchedCommand);

    return program;
}

module.exports = setupCLI;

