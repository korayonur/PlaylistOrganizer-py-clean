'use strict';

const WordIndexService = require('../../services/WordIndexService');
const { getDatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');
const ImportSession = require('../../../domain/entities/ImportSession');

/**
 * Rebuild Index Use Case
 * Kelime index'ini yeniden oluşturur
 */
class RebuildIndexUseCase {
    constructor(db, wordIndexService) {
        this.db = db;
        this.wordIndexService = wordIndexService;
        const dbManager = getDatabaseManager();
        this.sessionRepository = dbManager.getRepositories().importSessions;
    }

    /**
     * Index'i yeniden oluştur
     * @returns {Promise<Object>} İşlem sonucu
     */
    async execute() {
        let sessionId = null;
        
        try {
            console.log('🔄 Index yeniden oluşturuluyor...');
            const startTime = Date.now();
            
            // Session oluştur
            const sessionEntity = ImportSession.create('rebuild-index:all', 0);
            const session = await this.sessionRepository.create(sessionEntity);
            sessionId = session.id;
            console.log(`📊 Session oluşturuldu: ID=${sessionId}`);
            
            // Index rebuild
            await this.wordIndexService.tumIndexiYenidenOlustur();
            
            const duration = Date.now() - startTime;
            const minutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);
            
            // Session güncelle
            const db = getDatabaseManager().getDatabase();
            const stats = {
                tracks: db.prepare('SELECT COUNT(*) as count FROM tracks').get().count,
                musicFiles: db.prepare('SELECT COUNT(*) as count FROM music_files').get().count,
                trackWords: db.prepare('SELECT COUNT(*) as count FROM track_words').get().count,
                musicWords: db.prepare('SELECT COUNT(*) as count FROM music_words').get().count,
                playlistTracks: db.prepare('SELECT COUNT(*) as count FROM playlist_tracks').get().count
            };
            
            // Session'ı detaylı güncelle
            session.operation_type = 'rebuild-index';
            session.total_files = stats.tracks + stats.musicFiles;
            session.processed_files = stats.tracks + stats.musicFiles;
            session.added_files = stats.trackWords + stats.musicWords + stats.playlistTracks;
            session.skipped_files = 0;
            session.error_files = 0;
            
            // YENİ DETAYLAR:
            session.music_files_count = stats.musicFiles;
            session.tracks_count = stats.tracks;
            session.playlists_count = db.prepare('SELECT COUNT(*) as count FROM playlists').get().count;
            session.index_count = stats.trackWords + stats.musicWords + stats.playlistTracks;
            
            await this.sessionRepository.update(session);
            
            console.log(`✅ Index rebuild tamamlandı (${minutes}m ${seconds}s)`);
            console.log(`📊 Session güncellendi: ID=${sessionId}`);
            
            return {
                success: true,
                message: 'Index başarıyla yeniden oluşturuldu',
                sessionId,
                duration: {
                    ms: duration,
                    minutes,
                    seconds
                },
                stats
            };
        } catch (error) {
            console.error(`❌ Rebuild index use case hatası: ${error.message}`);
            
            // Hata durumunda session'ı error ile güncelle
            if (sessionId) {
                try {
                    const errorSession = await this.sessionRepository.findById(sessionId);
                    if (errorSession) {
                        errorSession.error_files = 1;
                        await this.sessionRepository.update(errorSession);
                    }
                } catch (updateError) {
                    console.error(`❌ Session güncelleme hatası: ${updateError.message}`);
                }
            }
            
            return {
                success: false,
                message: 'Index rebuild hatası',
                error: error.message
            };
        }
    }
}

module.exports = RebuildIndexUseCase;

