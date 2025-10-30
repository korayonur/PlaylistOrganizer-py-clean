const { formatSuccess, formatError, formatInfo, formatTable } = require('../utils/output');

/**
 * Similarity (Fix Önerileri) CLI Komutları
 */

async function similaritySuggestionsCommand(options) {
    try {
        console.log(formatInfo('🔧 Fix önerileri alınıyor...'));

        const { DatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');
        const WordIndexService = require('../../../application/services/WordIndexService');
        const SimilarityService = require('../../../application/services/SimilarityService');

        // Database'i başlat
        const dbManager = new DatabaseManager();
        await dbManager.initialize();

        // Servisleri başlat
        const db = dbManager.getDatabase();
        const wordIndexService = new WordIndexService(db);
        const similarityService = new SimilarityService(db, wordIndexService);

        // Önerileri al - parseInt ile number'a çevir
        const limit = options.limit ? parseInt(options.limit) : null;
        const offset = parseInt(options.offset) || 0;
        const type = options.type; // exact/high/medium/low

        const result = await similarityService.generateSuggestions({
            limit,
            offset,
            type
        });

        if (result.suggestions.length === 0) {
            console.log(formatInfo('ℹ️  Hiç fix önerisi bulunamadı'));
            return;
        }

        console.log(formatSuccess(`\n✅ ${result.total} öneri bulundu (${result.count} gösteriliyor)`));
        console.log(formatInfo(`📊 Stats: Exact: ${result.stats.exact}, High: ${result.stats.high}, Medium: ${result.stats.medium}, Low: ${result.stats.low}`));

        // Tabloyu hazırla
        const tableHeaders = ['#', 'Track', 'Music File', 'Type', 'Score', 'Words'];
        const tableRows = result.suggestions.map((s, index) => [
            (index + 1).toString(),
            s.track_fileName.substring(0, 50),
            s.music_file_name.substring(0, 50),
            s.match_type,
            s.similarity_score.toFixed(2),
            s.matched_words.toString()
        ]);

        console.log('\n' + formatTable([tableHeaders, ...tableRows]));

    } catch (error) {
        console.log(formatError(`❌ Fix önerileri hatası: ${error.message}`));
        console.error(error);
        process.exit(1);
    }
}

async function similarityStatisticsCommand() {
    try {
        console.log(formatInfo('📊 Similarity istatistikleri alınıyor...'));

        const { DatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');
        const WordIndexService = require('../../../application/services/WordIndexService');
        const SimilarityService = require('../../../application/services/SimilarityService');

        // Database'i başlat
        const dbManager = new DatabaseManager();
        await dbManager.initialize();

        // Servisleri başlat
        const wordIndexService = new WordIndexService(dbManager.db);
        const similarityService = new SimilarityService(dbManager.db, wordIndexService);

        // İstatistikleri al
        const stats = similarityService.getStatistics();

        console.log(formatSuccess('\n✅ İstatistikler:'));
        console.log(formatInfo(`\n📊 Track İstatistikleri:`));
        console.log(formatInfo(`   Toplam Tracks: ${stats.total_tracks}`));
        console.log(formatInfo(`   Eşleşen Tracks: ${stats.matched_tracks}`));
        console.log(formatInfo(`   Eşleşmemiş Tracks: ${stats.unmatched_tracks}`));
        
        console.log(formatInfo(`\n🎵 Playlist İstatistikleri:`));
        console.log(formatInfo(`   Toplam Playlists: ${stats.total_playlists}`));
        
        if (stats.playlist_types.length > 0) {
            console.log(formatInfo(`\n📁 Playlist Tipleri:`));
            stats.playlist_types.forEach(pt => {
                console.log(formatInfo(`   ${pt.type}: ${pt.count}`));
            });
        }

        if (stats.top_playlists.length > 0) {
            console.log(formatInfo(`\n🔝 En Çok Track'e Sahip Playlists:`));
            stats.top_playlists.forEach(p => {
                console.log(formatInfo(`   ${p.name}: ${p.track_count} track`));
            });
        }

    } catch (error) {
        console.log(formatError(`❌ İstatistik hatası: ${error.message}`));
        console.error(error);
        process.exit(1);
    }
}

async function similarityUnmatchedCommand(options) {
    try {
        console.log(formatInfo('📋 Eşleşmemiş tracklar alınıyor...'));

        const { DatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');
        const WordIndexService = require('../../../application/services/WordIndexService');
        const SimilarityService = require('../../../application/services/SimilarityService');

        // Database'i başlat
        const dbManager = new DatabaseManager();
        await dbManager.initialize();

        // Servisleri başlat
        const wordIndexService = new WordIndexService(dbManager.db);
        const similarityService = new SimilarityService(dbManager.db, wordIndexService);

        // Eşleşmemiş trackları al
        const limit = options.limit || 20;
        const tracks = similarityService.getUnmatchedTracks(limit);

        if (tracks.length === 0) {
            console.log(formatSuccess('✅ Tüm tracklar eşleşmiş!'));
            return;
        }

        console.log(formatInfo(`\n📋 ${tracks.length} eşleşmemiş track bulundu:`));

        // Tabloyu hazırla
        const tableHeaders = ['#', 'File Name', 'Playlists', 'Source'];
        const tableRows = tracks.map((t, index) => [
            (index + 1).toString(),
            t.fileName.substring(0, 60),
            (t.playlist_count || 0).toString(),
            t.track_source || 'unknown'
        ]);

        console.log('\n' + formatTable([tableHeaders, ...tableRows]));

    } catch (error) {
        console.log(formatError(`❌ Eşleşmemiş track hatası: ${error.message}`));
        console.error(error);
        process.exit(1);
    }
}

module.exports = {
    similaritySuggestionsCommand,
    similarityStatisticsCommand,
    similarityUnmatchedCommand
};

