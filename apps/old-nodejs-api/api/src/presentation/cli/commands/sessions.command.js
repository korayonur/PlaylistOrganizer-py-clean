'use strict';

const { getDatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');
const { formatSuccess, formatError, formatInfo, formatTable } = require('../utils/output');

/**
 * Sessions Command
 * İşlem geçmişini (import, rebuild, vb.) görüntüler
 */
async function sessionsCommand(options) {
    try {
        const limit = options.limit || 10;
        console.log(formatInfo(`📊 Son ${limit} işlem geçmişi getiriliyor...\n`));
        
        const dbManager = getDatabaseManager();
        dbManager.initialize();
        const sessionRepository = dbManager.getRepositories().importSessions;
        
        const sessions = await sessionRepository.findRecent(limit);
        
        if (sessions.length === 0) {
            console.log(formatInfo('ℹ️  Henüz işlem geçmişi yok'));
            return;
        }

        console.log(formatSuccess(`✅ ${sessions.length} işlem bulundu\n`));
        
        // İşlem tipini path'den çıkar
        const formatPath = (path) => {
            if (path.startsWith('rebuild-index:')) return '🔄 Rebuild Index';
            if (path.startsWith('import:')) return '📥 Import';
            if (path.includes('VirtualDJ')) return '📥 Import (VDJ)';
            return '📋 ' + (path.length > 40 ? path.substring(0, 37) + '...' : path);
        };

        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleString('tr-TR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const formatStatus = (total, added, errors) => {
            if (errors > 0) return '❌';
            if (total === 0) return '⚠️';
            const successRate = Math.round((added / total) * 100);
            if (successRate === 100) return '✅';
            if (successRate >= 90) return '⚡';
            return '⚠️';
        };

        // Tablo formatında göster - DETAYLI
        console.log(formatTable([
            ['ID', 'İşlem', 'Music', 'Tracks', 'Playlists', 'Index', 'Durum', 'Tarih'],
            ...sessions.map(s => [
                s.id.toString(),
                formatPath(s.path),
                (s.music_files_count || 0) > 0 ? s.music_files_count.toLocaleString() : '-',
                (s.tracks_count || 0) > 0 ? s.tracks_count.toLocaleString() : '-',
                (s.playlists_count || 0) > 0 ? s.playlists_count.toLocaleString() : '-',
                (s.index_count || 0) > 0 ? s.index_count.toLocaleString() : '-',
                formatStatus(s.total_files, s.added_files, s.error_files),
                formatDate(s.created_at)
            ])
        ]));

        console.log('');
        console.log(formatInfo('💡 İpucu: Daha fazla görmek için --limit kullanın'));
        console.log(formatInfo('   Örnek: node cli.js sessions --limit 20'));
        
    } catch (error) {
        console.log(formatError(`❌ Sessions komutu hatası: ${error.message}`));
        process.exit(1);
    }
}

module.exports = sessionsCommand;

