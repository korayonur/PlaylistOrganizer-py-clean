'use strict';

const SearchTracksUseCase = require('../../../application/use-cases/search/SearchTracksUseCase');
const { DatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');
const WordIndexService = require('../../../application/services/WordIndexService');
const { formatSuccess, formatError, formatInfo, formatTable } = require('../utils/output');

/**
 * Search Command
 * Track arama
 */
async function searchCommand(query, options) {
    try {
        if (!query || query.trim().length === 0) {
            console.log(formatError('❌ Arama sorgusu boş olamaz'));
            console.log(formatInfo('Kullanım: node cli.js search "şarkı adı"'));
            process.exit(1);
        }

        const limit = options.limit || 10;
        console.log(formatInfo(`🔍 Arama yapılıyor: "${query}"`));
        
        // Database ve servisleri başlat
        const dbManager = new DatabaseManager();
        await dbManager.initialize();
        const wordIndexService = new WordIndexService(dbManager.db);
        
        const useCase = new SearchTracksUseCase(dbManager.db, wordIndexService);
        const result = await useCase.execute(query, limit);
        
        if (result.success && result.results.length > 0) {
            console.log(formatSuccess(`✅ ${result.count} sonuç bulundu\n`));
            
            // Tablo formatında göster
            console.log(formatTable([
                ['#', 'Dosya Adı', 'Normalize', 'Eşleşme', 'Puan'],
                ...result.results.map((r, i) => [
                    (i + 1).toString(),
                    r.fileName || r.track_path,
                    r.normalizedFileName || '-',
                    `${r.match_count} kelime`,
                    r.score ? Math.round(r.score) : '-'
                ])
            ]));
        } else if (result.success && result.results.length === 0) {
            console.log(formatInfo('ℹ️  Sonuç bulunamadı'));
        } else {
            console.log(formatError(`❌ Arama hatası: ${result.message}`));
            if (result.error) {
                console.log(formatError(`   Detay: ${result.error}`));
            }
            process.exit(1);
        }
    } catch (error) {
        console.log(formatError(`❌ Search komutu hatası: ${error.message}`));
        process.exit(1);
    }
}

module.exports = searchCommand;

