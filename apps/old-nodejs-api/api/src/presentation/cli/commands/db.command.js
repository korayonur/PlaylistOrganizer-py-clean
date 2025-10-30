'use strict';

const { getDatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');
const { formatSuccess, formatError, formatInfo, formatTable } = require('../utils/output');

/**
 * Database Commands
 * Database istatistikleri ve analiz
 */
async function dbStatsCommand(options) {
    try {
        console.log(formatInfo('📊 Database istatistikleri alınıyor...\n'));
        
        const dbManager = getDatabaseManager();
        dbManager.initialize(); // Database'i başlat
        const stats = dbManager.getStats();
        
        if (!stats) {
            console.log(formatError('❌ Database istatistikleri alınamadı'));
            process.exit(1);
        }

        console.log(formatSuccess('✅ Database İstatistikleri\n'));
        console.log(formatTable([
            ['Tablo', 'Kayıt Sayısı'],
            ['Music Files', stats.musicFiles.toLocaleString()],
            ['Tracks', stats.tracks.toLocaleString()],
            ['Playlists', stats.playlists.toLocaleString()],
            ['Playlist Tracks', stats.playlistTracks.toLocaleString()],
            ['Track Words', stats.trackWords.toLocaleString()],
            ['Music Words', stats.musicWords.toLocaleString()],
            ['Import Sessions', stats.importSessions.toLocaleString()]
        ]));
    } catch (error) {
        console.log(formatError(`❌ DB stats komutu hatası: ${error.message}`));
        process.exit(1);
    }
}

async function dbAnalyzeCommand(options) {
    try {
        console.log(formatInfo('🔍 Database analiz ediliyor...\n'));
        
        const dbManager = getDatabaseManager();
        dbManager.initialize(); // Database'i başlat
        const db = dbManager.getDatabase();
        
        // Unmatched tracks
        const unmatchedStmt = db.prepare(`
            SELECT COUNT(*) as count FROM tracks t
            LEFT JOIN music_files m ON t.normalizedFileName = m.normalizedFileName
            WHERE m.path IS NULL
        `);
        const unmatched = unmatchedStmt.get().count;
        
        // Orphan track words
        const orphanWordsStmt = db.prepare(`
            SELECT COUNT(*) as count FROM track_words tw
            LEFT JOIN tracks t ON tw.track_path = t.path
            WHERE t.path IS NULL
        `);
        const orphanWords = orphanWordsStmt.get().count;
        
        // Empty playlists
        const emptyPlaylistsStmt = db.prepare(`
            SELECT COUNT(*) as count FROM playlists WHERE track_count = 0
        `);
        const emptyPlaylists = emptyPlaylistsStmt.get().count;
        
        console.log(formatSuccess('✅ Database Analiz Sonuçları\n'));
        console.log(formatTable([
            ['Metrik', 'Değer', 'Durum'],
            ['Unmatched Tracks', unmatched.toLocaleString(), unmatched === 0 ? '✅' : '⚠️'],
            ['Orphan Track Words', orphanWords.toLocaleString(), orphanWords === 0 ? '✅' : '⚠️'],
            ['Empty Playlists', emptyPlaylists.toLocaleString(), emptyPlaylists === 0 ? '✅' : 'ℹ️']
        ]));
        
        if (unmatched > 0 || orphanWords > 0) {
            console.log(formatInfo('\n💡 Öneri: Index rebuild yaparak sorunları düzeltebilirsiniz'));
            console.log(formatInfo('   Komut: node cli.js rebuild-index'));
        }
    } catch (error) {
        console.log(formatError(`❌ DB analyze komutu hatası: ${error.message}`));
        process.exit(1);
    }
}

async function dbUpdateTrackCountsCommand() {
    try {
        console.log(formatInfo('🔄 Playlist track countları güncelleniyor...'));
        
        const { DatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');
        const ImportService = require('../../../application/services/ImportService');
        const WordIndexService = require('../../../application/services/WordIndexService');
        
        // Database'i başlat
        const dbManager = new DatabaseManager();
        await dbManager.initialize();
        
        // Servisleri başlat
        const wordIndexService = new WordIndexService(dbManager.db);
        const importService = new ImportService(dbManager.db, wordIndexService);
        
        // Track count'ları güncelle
        const updatedCount = await importService.updatePlaylistTrackCounts();
        
        console.log(formatSuccess(`✅ ${updatedCount} playlist track_count güncellendi`));
        
        // Güncellenmiş sayıları göster
        const playlistsWithTracks = dbManager.db.prepare(`
            SELECT name, track_count 
            FROM playlists 
            WHERE track_count > 0 
            ORDER BY track_count DESC 
            LIMIT 10
        `).all();
        
        if (playlistsWithTracks.length > 0) {
            console.log(formatInfo('\n📊 En çok track\'e sahip playlists:'));
            playlistsWithTracks.forEach(playlist => {
                console.log(formatInfo(`   ${playlist.name}: ${playlist.track_count} track`));
            });
        }
        
    } catch (error) {
        console.log(formatError(`❌ Track count güncelleme hatası: ${error.message}`));
        process.exit(1);
    }
}

module.exports = {
    dbStatsCommand,
    dbAnalyzeCommand,
    dbUpdateTrackCountsCommand
};

