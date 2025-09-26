'use strict';

const fs = require('fs');
const path = require('path');
const { normalizeFileName } = require('../../shared/utils');
// const { getLogger } = require('../../shared/logger'); // Artık gerek yok - console.log kullanıyoruz
const { getDatabase } = require('../../shared/database');

/**
 * Import Service - Basitleştirilmiş
 */
class ImportService {
    constructor() {
        this.dbManager = getDatabase();
        this.db = this.dbManager.getDatabase();
        // this.logger = getLogger().module('ImportService'); // Artık gerek yok - console.log kullanıyoruz
    }

    /**
     * VirtualDJ klasörünü tara ve import et
     * @returns {Promise<Object>} Import sonucu
     */
    async scanAndImport() {
        const virtualDJPath = '/Users/koray/Library/Application Support/VirtualDJ';
        const musicPath = '/Users/koray/Music/KorayMusics';
        
        try {
            console.log(`🚀 Import başlatılıyor: VirtualDJ + Müzik klasörleri`);
            
            // 1. VirtualDJ klasörünü tara (playlist'ler için)
            console.log(`📁 VirtualDJ klasörü taranıyor: ${virtualDJPath}`);
            const virtualDJResult = this.scanDirectory(virtualDJPath);
            
            // 2. Müzik klasörünü tara (müzik dosyaları için)
            console.log(`📁 Müzik klasörü taranıyor: ${musicPath}`);
            const musicResult = this.scanDirectory(musicPath);
            
            // 3. Sonuçları birleştir
            const scanResult = {
                musicFiles: musicResult.musicFiles,
                tracks: virtualDJResult.tracks
            };
            
            const totalFiles = scanResult.musicFiles.length + scanResult.tracks.length;
            console.log(`📊 Tarama sonucu: ${scanResult.musicFiles.length} müzik dosyası, ${scanResult.tracks.length} track bulundu`);

            // 2. Import session oluştur
            const sessionId = this.createSession(virtualDJPath, totalFiles);
            console.log(`✅ Session oluşturuldu: ID=${sessionId}`);

            let added = 0;
            let skipped = 0;
            let errors = 0;

                   // 3. Müzik dosyalarını toplu import et
                   console.log(`🎵 Müzik dosyaları toplu import ediliyor... (${scanResult.musicFiles.length} dosya)`);
                   
                   if (scanResult.musicFiles.length > 0) {
                       const result = await this.bulkAddFiles(scanResult.musicFiles);
                       added += result.added;
                       skipped += result.skipped;
                       errors += result.errors;
                       console.log(`✅ Müzik dosyaları toplu import tamamlandı: ${result.added} eklendi, ${result.skipped} atlandı, ${result.errors} hata`);
                   }

                   // 4. Tracks'leri toplu import et
                   console.log(`🎧 Tracks toplu import ediliyor... (${scanResult.tracks.length} track)`);
                   
                   if (scanResult.tracks.length > 0) {
                       const result = await this.bulkAddTracks(scanResult.tracks);
                       added += result.added;
                       skipped += result.skipped;
                       errors += result.errors;
                       console.log(`✅ Tracks toplu import tamamlandı: ${result.added} eklendi, ${result.skipped} atlandı, ${result.errors} hata`);
                   }

            // 5. Session'ı güncelle
            this.updateSession(sessionId, {
                processed_files: totalFiles,
                added_files: added,
                skipped_files: skipped,
                error_files: errors
            });

            console.log(`🎉 Import tamamlandı! Toplam: ${totalFiles}, Eklenen: ${added}, Atlanan: ${skipped}, Hata: ${errors}`);

            return {
                success: true,
                data: {
                    sessionId,
                    path: virtualDJPath,
                    totalFiles: totalFiles,
                    added,
                    skipped,
                    errors,
                    isComplete: true
                },
                message: 'VirtualDJ import başarıyla tamamlandı'
            };

        } catch (error) {
            console.log(`💥 Import hatası: ${error.message}`);
            console.error(`💥 Import hatası: ${error.message}`);
            return {
                success: false,
                message: 'Import hatası',
                error: error.message
            };
        }
    }

    /**
     * Klasörü tara
     * @param {string} dirPath - Klasör yolu
     * @returns {Object} Dosya listesi (müzik dosyaları ve tracks ayrı)
     */
    scanDirectory(dirPath) {
        const result = {
            musicFiles: [],
            tracks: []
        };
        
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    // Alt klasörleri de tara
                    const subResult = this.scanDirectory(itemPath);
                    result.musicFiles.push(...subResult.musicFiles);
                    result.tracks.push(...subResult.tracks);
                } else if (this.isMediaFile(itemPath)) {
                    result.musicFiles.push({
                        path: itemPath,
                        fileName: item,
                        extension: path.extname(item).toLowerCase(),
                        size: stats.size,
                        modified: stats.mtime,
                        created: stats.birthtime
                    });
                } else if (this.isPlaylistFile(itemPath)) {
                    // Playlist dosyalarını parse et ve tracks olarak ekle
                    const playlistTracks = this.parsePlaylistFile(itemPath);
                    result.tracks.push(...playlistTracks);
                }
            }
        } catch (error) {
            console.error(`❌ Klasör tarama hatası: ${dirPath} - ${error.message}`);
        }
        
        return result;
    }

    /**
     * Medya dosyası mı kontrol et
     * @param {string} filePath - Dosya yolu
     * @returns {boolean}
     */
    isMediaFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mediaExtensions = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.wma', '.mp4', '.avi', '.mkv', '.mov'];
        return mediaExtensions.includes(ext);
    }

    /**
     * Playlist dosyası mı kontrol et
     * @param {string} filePath - Dosya yolu
     * @returns {boolean}
     */
    isPlaylistFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const playlistExtensions = ['.m3u', '.m3u8', '.pls', '.xspf', '.vdj', '.vdjfolder', '.vdjplaylist'];
        return playlistExtensions.includes(ext);
    }

    /**
     * M3U dosyasını parse et
     * @param {string} filePath - M3U dosya yolu
     * @returns {Array} Track listesi
     */
    parseM3UFile(filePath) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const lines = fileContent.split(/\r?\n/);
            const tracks = [];
            let currentMetadata = null;

            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line) continue;

                if (line.startsWith('#EXTVDJ')) {
                    currentMetadata = this.parseExtVDJ(line);
                    continue;
                }

                if (line.toLowerCase().includes('.vdjcache')) {
                    continue;
                }

                // Tam yol kontrolü - eğer tam yol değilse atla
                if (!path.isAbsolute(line)) {
                    console.log(`⚠️ M3U'da tam yol olmayan satır atlandı: ${line}`);
                    continue;
                }

                const normalizedName = this.normalizeFileName(path.basename(line));
                tracks.push({
                    originalPath: line,
                    normalizedName,
                    metadata: currentMetadata
                });
                currentMetadata = null;
            }

            return tracks;
        } catch (error) {
            console.error(`❌ M3U parse hatası: ${filePath} - ${error.message}`);
            return [];
        }
    }

    /**
     * VDJFOLDER dosyasını parse et (XML format)
     * @param {string} filePath - VDJFOLDER dosya yolu
     * @returns {Array} Track listesi
     */
    parseVDJFolderFile(filePath) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const tracks = [];

            // XML'den song elementlerini çıkar
            const songRegex = /<song[^>]*path="([^"]*)"[^>]*>/g;
            let match;

            while ((match = songRegex.exec(fileContent)) !== null) {
                const songPath = match[1];
                if (songPath && songPath.trim()) {
                    const normalizedName = this.normalizeFileName(path.basename(songPath));
                    tracks.push({
                        originalPath: songPath,
                        normalizedName,
                        metadata: null
                    });
                }
            }

            return tracks;
        } catch (error) {
            console.error(`❌ VDJFOLDER parse hatası: ${filePath} - ${error.message}`);
            return [];
        }
    }

    /**
     * Dosya adını normalize et
     * @param {string} fileName - Dosya adı
     * @returns {string} Normalize edilmiş dosya adı
     */
    normalizeFileName(fileName) {
        const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
        return nameWithoutExt
            .normalize('NFKC')
            .replace(/[ğĞ]/g, 'g')
            .replace(/[ıİI]/g, 'i')
            .replace(/[şŞ]/g, 's')
            .replace(/[çÇ]/g, 'c')
            .replace(/[üÜ]/g, 'u')
            .replace(/[öÖ]/g, 'o')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * VirtualDJ metadata'sını parse et
     * @param {string} line - EXTVDJ satırı
     * @returns {Object|null} Metadata objesi
     */
    parseExtVDJ(line) {
        const metadata = {};
        const regex = /<([^>]+)>([^<]*)<\/[^>]+>/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            const key = match[1];
            metadata[key] = match[2];
        }

        return Object.keys(metadata).length > 0 ? metadata : null;
    }

    /**
     * Playlist dosyasını parse et
     * @param {string} filePath - Playlist dosya yolu
     * @returns {Array} Track listesi
     */
    parsePlaylistFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const tracks = [];

        if (ext === '.m3u' || ext === '.m3u8') {
            const playlistTracks = this.parseM3UFile(filePath);
            return playlistTracks.map(track => ({
                path: track.originalPath,
                fileName: path.basename(track.originalPath),
                fileNameOnly: path.basename(track.originalPath, path.extname(track.originalPath)),
                normalizedFileName: track.normalizedName,
                extension: path.extname(track.originalPath).toLowerCase(),
                source: 'm3u',
                source_file: filePath,
                metadata: track.metadata
            }));
        } else if (ext === '.vdjfolder') {
            const playlistTracks = this.parseVDJFolderFile(filePath);
            return playlistTracks.map(track => ({
                path: track.originalPath,
                fileName: path.basename(track.originalPath),
                fileNameOnly: path.basename(track.originalPath, path.extname(track.originalPath)),
                normalizedFileName: track.normalizedName,
                extension: path.extname(track.originalPath).toLowerCase(),
                source: 'vdjfolder',
                source_file: filePath,
                metadata: track.metadata
            }));
        }

        return tracks;
    }

    /**
     * Import session oluştur
     * @param {string} path - Klasör yolu
     * @param {number} totalFiles - Toplam dosya sayısı
     * @returns {number} Session ID
     */
    createSession(path, totalFiles) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO import_sessions (path, total_files, processed_files, added_files, skipped_files, error_files, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(path, totalFiles, 0, 0, 0, 0, new Date().toISOString());
            return result.lastInsertRowid;
        } catch (error) {
            console.error(`❌ Session oluşturma hatası: ${error.message}`);
            throw error;
        }
    }

    /**
     * Session güncelle
     * @param {number} sessionId - Session ID
     * @param {Object} updates - Güncelleme verileri
     */
    updateSession(sessionId, updates) {
        try {
            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);
            values.push(sessionId);

            const stmt = this.db.prepare(`
                UPDATE import_sessions 
                SET ${fields}
                WHERE id = ?
            `);
            
            stmt.run(...values);
        } catch (error) {
            console.error(`❌ Session güncelleme hatası: ${error.message}`);
        }
    }

    /**
     * Dosya ekle
     * @param {Object} fileData - Dosya verisi
     * @returns {Object} Sonuç
     */
    addFile(fileData) {
        try {
            
            // Duplicate kontrolü
            const existingFile = this.db.prepare(`
                SELECT id FROM music_files WHERE path = ?
            `).get(fileData.path);

            if (existingFile) {
                return { success: false, message: 'Dosya zaten mevcut' };
            }

            // fileNameOnly oluştur (uzantısız dosya adı)
            const fileNameOnly = path.parse(fileData.fileName).name;
            
            // Normalize edilmiş dosya adı oluştur
            const normalizedFileName = this.normalizeFileName(fileData.fileName);

            // Dosya ekle - Database schema'ya uygun
            const stmt = this.db.prepare(`
                INSERT INTO music_files (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                fileData.path,
                fileData.fileName,
                fileNameOnly,
                normalizedFileName,
                fileData.extension,
                fileData.size,
                fileData.modified.getTime(), // Unix timestamp
                fileData.created.toISOString() // created_at
            );

            return { success: true, message: 'Dosya eklendi' };
        } catch (error) {
            console.error(`❌ Dosya ekleme hatası: ${fileData.path} - ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * Track ekle
     * @param {Object} trackData - Track verisi
     * @returns {Object} Sonuç
     */
    addTrack(trackData) {
        try {
            // Duplicate kontrolü
            const existingTrack = this.db.prepare(`
                SELECT id FROM tracks WHERE path = ? AND source = ?
            `).get(trackData.path, trackData.source);

            if (existingTrack) {
                return { success: false, message: 'Track zaten mevcut' };
            }

            // Track ekle
            const stmt = this.db.prepare(`
                INSERT INTO tracks (path, fileName, fileNameOnly, normalizedFileName, source, source_file)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                trackData.path,
                trackData.fileName,
                trackData.fileNameOnly,
                trackData.normalizedFileName,
                trackData.source,
                trackData.source_file
            );

            return { success: true, message: 'Track eklendi' };
        } catch (error) {
            console.error(`❌ Track ekleme hatası: ${error.message}`);
            throw error;
        }
    }

    /**
     * Dosya adını normalize et - Shared utils kullan
     * @param {string} fileName - Dosya adı
     * @returns {string} Normalize edilmiş ad
     */
    normalizeFileName(fileName) {
        return normalizeFileName(fileName);
    }

    /**
     * Import istatistikleri
     * @returns {Object} İstatistikler
     */
    getImportStats() {
        try {
            const musicFilesCount = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
            const sessionsCount = this.db.prepare('SELECT COUNT(*) as count FROM import_sessions').get().count;
            const dbSize = fs.statSync(this.dbManager.dbPath).size;

            return {
                success: true,
                data: {
                    musicFiles: musicFilesCount,
                    sessions: sessionsCount,
                    dbSize
                }
            };
        } catch (error) {
            console.error(`❌ İstatistik alma hatası: ${error.message}`);
            return {
                success: false,
                message: 'İstatistik alma hatası',
                error: error.message
            };
        }
    }

    /**
     * Son import oturumları
     * @param {number} limit - Maksimum sayı
     * @returns {Object} Oturum listesi
     */
    getRecentSessions(limit = 10) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM import_sessions 
                ORDER BY created_at DESC 
                LIMIT ?
            `);
            const sessions = stmt.all(limit);

            return {
                success: true,
                data: sessions
            };
        } catch (error) {
            console.error(`❌ Oturum listesi alma hatası: ${error.message}`);
            return {
                success: false,
                message: 'Oturum listesi alma hatası',
                error: error.message
            };
        }
    }

    /**
     * Klasör vs veritabanı kontrolü
     * @param {string} dirPath - Klasör yolu
     * @returns {Object} Karşılaştırma sonucu
     */
    checkDirectory(dirPath) {
        try {
            const files = this.scanDirectory(dirPath);
            const dbCount = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;

            return {
                success: true,
                data: {
                    directoryFiles: files.musicFiles.length,
                    databaseFiles: dbCount,
                    difference: files.musicFiles.length - dbCount,
                    isComplete: files.musicFiles.length === dbCount
                }
            };
        } catch (error) {
            console.error(`❌ Klasör kontrol hatası: ${error.message}`);
            return {
                success: false,
                message: 'Klasör kontrol hatası',
                error: error.message
            };
        }
    }

    /**
     * Import durumunu kontrol et
     * @param {string} dirPath - Klasör yolu
     * @returns {Object} Durum bilgisi
     */
    async checkImportStatus(dirPath) {
        try {
            const sessions = this.db.prepare(`
                SELECT * FROM import_sessions 
                WHERE path = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `).get(dirPath);

            if (!sessions) {
                return {
                    success: true,
                    data: {
                        status: 'not_started',
                        message: 'Bu klasör için import başlatılmamış'
                    }
                };
            }

            return {
                success: true,
                data: {
                    status: sessions.processed_files === sessions.total_files ? 'completed' : 'in_progress',
                    session: sessions,
                    progress: {
                        total: sessions.total_files,
                        processed: sessions.processed_files,
                        added: sessions.added_files,
                        skipped: sessions.skipped_files,
                        errors: sessions.error_files,
                        percentage: Math.round((sessions.processed_files / sessions.total_files) * 100)
                    }
                }
            };
        } catch (error) {
            console.error(`❌ Import durum kontrolü hatası: ${error.message}`);
            return {
                success: false,
                message: 'Import durum kontrolü hatası',
                error: error.message
            };
        }
    }

    /**
     * Import doğrulama
     * @param {string} dirPath - Klasör yolu
     * @returns {Object} Doğrulama sonucu
     */
    async verifyImport(dirPath) {
        try {
            const files = this.scanDirectory(dirPath);
            const dbCount = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
            const tracksCount = this.db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;

            return {
                success: true,
                data: {
                    directoryFiles: files.musicFiles.length,
                    directoryTracks: files.tracks.length,
                    databaseFiles: dbCount,
                    databaseTracks: tracksCount,
                    isComplete: files.musicFiles.length === dbCount,
                    message: files.musicFiles.length === dbCount ? 'Import tamamlanmış' : 'Import eksik'
                }
            };
        } catch (error) {
            console.error(`❌ Import doğrulama hatası: ${error.message}`);
            return {
                success: false,
                message: 'Import doğrulama hatası',
                error: error.message
            };
        }
    }

    /**
     * Import session'ı sil
     * @param {number} sessionId - Session ID
     * @returns {Object} Sonuç
     */
    deleteSession(sessionId) {
        try {
            const stmt = this.db.prepare('DELETE FROM import_sessions WHERE id = ?');
            const result = stmt.run(sessionId);

            return {
                success: true,
                data: {
                    deleted: result.changes,
                    message: result.changes > 0 ? 'Session silindi' : 'Session bulunamadı'
                }
            };
        } catch (error) {
            console.error(`❌ Session silme hatası: ${error.message}`);
            return {
                success: false,
                message: 'Session silme hatası',
                error: error.message
            };
        }
    }

    /**
     * Tüm import session'larını temizle
     * @returns {Object} Sonuç
     */
    clearAllSessions() {
        try {
            const stmt = this.db.prepare('DELETE FROM import_sessions');
            const result = stmt.run();

            return {
                success: true,
                data: {
                    deleted: result.changes,
                    message: `${result.changes} session silindi`
                }
            };
        } catch (error) {
            console.error(`❌ Session temizleme hatası: ${error.message}`);
            return {
                success: false,
                message: 'Session temizleme hatası',
                error: error.message
            };
        }
    }

    /**
     * Toplu müzik dosyası ekleme (SQL optimizasyonu ile)
     * @param {Array} files - Müzik dosyaları array'i
     * @returns {Object} Sonuç
     */
    async bulkAddFiles(files) {
        const startTime = Date.now();
        let added = 0;
        let skipped = 0;
        let errors = 0;

        try {
            console.log(`🚀 Toplu müzik dosyası import başlatılıyor: ${files.length} dosya`);
            
            // Geçici tablo oluştur - transaction dışında
            this.db.exec(`
                CREATE TEMPORARY TABLE IF NOT EXISTS temp_music_files (
                    path TEXT PRIMARY KEY,
                    fileName TEXT NOT NULL,
                    fileNameOnly TEXT NOT NULL,
                    normalizedFileName TEXT NOT NULL,
                    extension TEXT,
                    size INTEGER,
                    modifiedTime INTEGER,
                    created_at TEXT
                )
            `);

            // Batch size (her seferde 5000 dosya - daha büyük batch)
            const batchSize = 5000;
            const batches = [];
            
            for (let i = 0; i < files.length; i += batchSize) {
                batches.push(files.slice(i, i + batchSize));
            }

            console.log(`📦 ${batches.length} batch oluşturuldu (${batchSize} dosya/batch)`);

            // Geçici tabloya toplu insert
            const tempInsert = this.db.prepare(`
                INSERT INTO temp_music_files 
                (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                    if (batchIndex % 5 === 0 || batchIndex === batches.length - 1) {
                        console.log(`⚡ Batch ${batchIndex + 1}/${batches.length} işleniyor... (${batch.length} dosya)`);
                    }
                
                // Her batch arasında kısa bir bekleme
                if (batchIndex > 0) {
                    await new Promise(resolve => setImmediate(resolve));
                }

                // Transaction ile toplu insert
                const insertMany = this.db.transaction((files) => {
                    for (const file of files) {
                        try {
                            // fileNameOnly oluştur
                            const fileNameOnly = path.parse(file.fileName).name;
                            
                            // Normalize edilmiş dosya adı oluştur
                            const normalizedFileName = this.normalizeFileName(file.fileName);
                            
                            tempInsert.run(
                                file.path,
                                file.fileName,
                                fileNameOnly,
                                normalizedFileName,
                                file.extension,
                                file.size,
                                file.modified.getTime(),
                                file.created.toISOString()
                            );
                        } catch (error) {
                            errors++;
                            console.error(`❌ Temp insert hatası: ${file.path} - ${error.message}`);
                        }
                    }
                });

                insertMany(batch);
            }

                // Geçici tablodan ana tabloya SQL ile duplicate kontrolü ile insert
                console.log(`🔄 Geçici tablodan ana tabloya aktarılıyor...`);
                const result = this.db.exec(`
                    INSERT OR IGNORE INTO music_files 
                    SELECT * FROM temp_music_files
                `);

            // Sonuçları hesapla
            const totalInTemp = this.db.prepare('SELECT COUNT(*) as count FROM temp_music_files').get().count;
            const totalInMain = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
            
            added = totalInTemp;
            skipped = files.length - totalInTemp;

            // Geçici tabloyu temizle
            this.db.exec('DROP TABLE temp_music_files');

            const duration = Date.now() - startTime;
            console.log(`✅ Toplu müzik dosyası import tamamlandı: ${added} eklendi, ${skipped} atlandı, ${errors} hata (${duration}ms)`);

            return { added, skipped, errors, duration };

        } catch (error) {
            console.error(`❌ Toplu müzik dosyası import hatası: ${error.message}`);
            // Geçici tabloyu temizle
            try {
                this.db.exec('DROP TABLE IF EXISTS temp_music_files');
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
            return { added, skipped, errors: errors + 1, duration: Date.now() - startTime };
        }
    }

    /**
     * Toplu track ekleme (SQL optimizasyonu ile)
     * @param {Array} tracks - Track'ler array'i
     * @returns {Object} Sonuç
     */
    async bulkAddTracks(tracks) {
        const startTime = Date.now();
        let added = 0;
        let skipped = 0;
        let errors = 0;

        try {
            console.log(`🚀 Toplu track import başlatılıyor: ${tracks.length} track`);
            
            // Geçici tablo oluştur - transaction dışında
            this.db.exec(`
                CREATE TEMPORARY TABLE IF NOT EXISTS temp_tracks (
                    path TEXT NOT NULL,
                    fileName TEXT NOT NULL,
                    fileNameOnly TEXT NOT NULL,
                    normalizedFileName TEXT NOT NULL,
                    source TEXT NOT NULL,
                    source_file TEXT NOT NULL,
                    created_at TEXT,
                    updated_at TEXT,
                    PRIMARY KEY (path, source, source_file)
                )
            `);

            // Batch size (her seferde 5000 track - daha büyük batch)
            const batchSize = 5000;
            const batches = [];
            
            for (let i = 0; i < tracks.length; i += batchSize) {
                batches.push(tracks.slice(i, i + batchSize));
            }

            console.log(`📦 ${batches.length} batch oluşturuldu (${batchSize} track/batch)`);

            // Geçici tabloya toplu insert
            const tempInsert = this.db.prepare(`
                INSERT OR IGNORE INTO temp_tracks 
                (path, fileName, fileNameOnly, normalizedFileName, source, source_file, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                    if (batchIndex % 5 === 0 || batchIndex === batches.length - 1) {
                        console.log(`⚡ Batch ${batchIndex + 1}/${batches.length} işleniyor... (${batch.length} track)`);
                    }
                
                // Her batch arasında kısa bir bekleme
                if (batchIndex > 0) {
                    await new Promise(resolve => setImmediate(resolve));
                }

                // Transaction ile toplu insert
                const insertMany = this.db.transaction((tracks) => {
                    for (const track of tracks) {
                        try {
                            tempInsert.run(
                                track.path,
                                track.fileName,
                                track.fileNameOnly,
                                track.normalizedFileName,
                                track.source,
                                track.source_file,
                                track.created_at || new Date().toISOString(),
                                new Date().toISOString() // updated_at
                            );
                        } catch (error) {
                            errors++;
                            console.error(`❌ Temp track insert hatası: ${track.path} - ${error.message}`);
                        }
                    }
                });

                insertMany(batch);
            }

                // Geçici tablodan ana tabloya SQL ile duplicate kontrolü ile insert
                console.log(`🔄 Geçici tablodan ana tabloya aktarılıyor...`);
                const result = this.db.exec(`
                    INSERT OR IGNORE INTO tracks 
                    SELECT * FROM temp_tracks
                `);

            // Sonuçları hesapla
            const totalInTemp = this.db.prepare('SELECT COUNT(*) as count FROM temp_tracks').get().count;
            
            added = totalInTemp;
            skipped = tracks.length - totalInTemp;

            // Geçici tabloyu temizle
            this.db.exec('DROP TABLE temp_tracks');

            const duration = Date.now() - startTime;
            console.log(`✅ Toplu track import tamamlandı: ${added} eklendi, ${skipped} atlandı, ${errors} hata (${duration}ms)`);

            return { added, skipped, errors, duration };

        } catch (error) {
            console.error(`❌ Toplu track import hatası: ${error.message}`);
            // Geçici tabloyu temizle
            try {
                this.db.exec('DROP TABLE IF EXISTS temp_tracks');
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
            return { added, skipped, errors: errors + 1, duration: Date.now() - startTime };
        }
    }

    /**
     * Import durumunu al (tüm tablo sayıları + progress)
     * @returns {Object} Import durumu ve database istatistikleri
     */
    async getImportStatus() {
        try {
            // Database istatistikleri
            const dbStats = this.dbManager.getStats();
            
            // Son import session'ı al
            const lastSession = this.db.prepare(`
                SELECT * FROM import_sessions 
                ORDER BY created_at DESC 
                LIMIT 1
            `).get();

            // Progress hesapla
            let progress = {
                total: 0,
                processed: 0,
                added: 0,
                skipped: 0,
                errors: 0,
                percentage: 0
            };

            if (lastSession) {
                progress = {
                    total: lastSession.total_files || 0,
                    processed: lastSession.processed_files || 0,
                    added: lastSession.added_files || 0,
                    skipped: lastSession.skipped_files || 0,
                    errors: lastSession.error_files || 0,
                    percentage: lastSession.total_files > 0 ? 
                        Math.round((lastSession.processed_files / lastSession.total_files) * 100) : 0
                };
            }

            // Status belirle
            let status = 'not_started';
            if (lastSession) {
                if (progress.percentage === 100) {
                    status = 'completed';
                } else if (progress.percentage > 0) {
                    status = 'in_progress';
                } else {
                    status = 'started';
                }
            }

            return {
                success: true,
                data: {
                    status,
                    progress,
                    database: {
                        musicFiles: dbStats.musicFiles,
                        tracks: dbStats.historyTracks,
                        importSessions: dbStats.import_sessions || 0,
                        dbSize: dbStats.dbSize
                    },
                    session: lastSession
                },
                message: 'Import durumu alındı'
            };

        } catch (error) {
            console.error(`❌ Import durum hatası: ${error.message}`);
            return {
                success: false,
                message: 'Import durum hatası',
                error: error.message
            };
        }
    }

    /**
     * Son import session'larını al
     * @param {number} limit - Maksimum session sayısı
     * @returns {Object} Session listesi
     */
    getRecentSessions(limit = 10) {
        try {
            const sessions = this.db.prepare(`
                SELECT * FROM import_sessions 
                ORDER BY created_at DESC 
                LIMIT ?
            `).all(limit);

            return {
                success: true,
                data: sessions,
                message: `${sessions.length} import session bulundu`
            };

        } catch (error) {
            console.error(`❌ Session listesi hatası: ${error.message}`);
            return {
                success: false,
                message: 'Session listesi hatası',
                error: error.message
            };
        }
    }
}

module.exports = new ImportService();