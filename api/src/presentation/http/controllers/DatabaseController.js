class DatabaseController {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }

    async getStatus(req, res) {
        try {
            console.log('[API] Database status alınıyor...');
            
            const stats = {
                music_files: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count,
                tracks: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM tracks').get().count,
                playlists: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM playlists').get().count,
                playlist_tracks: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM playlist_tracks').get().count,
                track_words: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM track_words').get().count,
                music_words: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM music_words').get().count,
                import_sessions: this.dbManager.db.prepare('SELECT COUNT(*) as count FROM import_sessions').get().count
            };

            // Matched/unmatched hesapla
            const matchedTracks = this.dbManager.db.prepare(`
                SELECT COUNT(DISTINCT t.id) as count
                FROM tracks t
                INNER JOIN music_files m ON t.normalizedFileName = m.normalizedFileName
            `).get().count;

            const unmatchedTracks = this.dbManager.db.prepare(`
                SELECT COUNT(DISTINCT t.id) as count
                FROM tracks t
                LEFT JOIN music_files m ON t.normalizedFileName = m.normalizedFileName
                WHERE m.path IS NULL
            `).get().count;

            res.json({
                success: true,
                data: {
                    stats,
                    matched: matchedTracks,
                    unmatched: unmatchedTracks,
                    total_index: stats.track_words + stats.music_words + stats.playlist_tracks
                }
            });
        } catch (error) {
            console.error('[API] Database status hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Database status alınırken hata oluştu'
            });
        }
    }

    async getSettings(req, res) {
        try {
            console.log('[API] Database settings alınıyor...');
            
            // Frontend'in beklediği format (direkt properties, data wrapper yok)
            const settings = {
                music_folder: '/Users/koray/Music',
                virtualdj_root: '/Users/koray/Library/Application Support/VirtualDJ',
                last_updated: new Date().toISOString()
            };

            res.json(settings);
        } catch (error) {
            console.error('[API] Database settings hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Database settings alınırken hata oluştu'
            });
        }
    }

    async getConfig(req, res) {
        try {
            console.log('[API] Database config alınıyor...');
            
            // Frontend'in beklediği config formatı
            const config = {
                paths: {
                    music: '/Users/koray/Music',
                    virtualDJ: '/Users/koray/Library/Application Support/VirtualDJ'
                },
                extensions: {
                    music: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'],
                    playlist: ['m3u', 'vdjfolder']
                },
                version: '2.0.0'
            };

            res.json({
                success: true,
                data: config
            });
        } catch (error) {
            console.error('[API] Database config hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Database config alınırken hata oluştu'
            });
        }
    }

    async updateSettings(req, res) {
        try {
            const { key, value } = req.body;
            
            console.log(`[API] Database settings güncelleniyor: ${key} = ${value}`);
            
            // Şimdilik sadece log'la, gerçek implementasyon daha sonra
            console.log(`[API] Setting updated: ${key} = ${value}`);
            
            res.json({
                success: true,
                data: {
                    message: 'Settings güncellendi',
                    key,
                    value
                }
            });
        } catch (error) {
            console.error('[API] Database settings güncelleme hatası:', error);
            res.status(500).json({
                success: false,
                error: 'Database settings güncellenirken hata oluştu'
            });
        }
    }
}

module.exports = DatabaseController;
