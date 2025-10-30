'use strict';

const fs = require('fs');
const path = require('path');
const { getDatabaseManager } = require('../../infrastructure/persistence/DatabaseManager');
const config = require('../../shared/config');
const WordIndexService = require('./WordIndexService');

/**
 * Import Service - Clean Architecture
 */
class ImportService {
    constructor(db, wordIndexService) {
        this.db = db;
        this.wordIndexService = wordIndexService;
        this.config = config;
    }

    /**
     * Import öncesi tabloları temizle
     */
    clearImportTables() {
        try {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [INFO] [IMPORT] [CLEAR] Tablolar temizleniyor...`);
            
            // Import öncesi tablo sayılarını logla
            const musicFilesCount = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
            const tracksCount = this.db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;
            const sessionsCount = this.db.prepare('SELECT COUNT(*) as count FROM import_sessions').get().count;
            
            // temp_tracks tablosu henüz oluşturulmamış olabilir
            let tempTracksCount = 0;
            try {
                tempTracksCount = this.db.prepare('SELECT COUNT(*) as count FROM temp_tracks').get().count;
            } catch (error) {
                tempTracksCount = 0; // Tablo yok, 0 olarak kabul et
            }
            
            console.log(`[${timestamp}] [DEBUG] [IMPORT] [CLEAR] Öncesi: music_files=${musicFilesCount}, tracks=${tracksCount}, temp_tracks=${tempTracksCount}, sessions=${sessionsCount}`);
            
            // ⚠️ ÖNEMLI: Foreign key constraint'leri geçici olarak kapat
            this.db.exec('PRAGMA foreign_keys = OFF');
            console.log(`[${timestamp}] [DEBUG] [IMPORT] [CLEAR] 🔓 Foreign keys kapatıldı`);
            
            // Temp tabloları import sırasında oluşturulacak, burada temizlemeye gerek yok
            
            // YENİ YAPI: Önce ilişki tablosunu temizle
            this.db.prepare('DELETE FROM playlist_tracks').run();
            console.log(`[${timestamp}] [DEBUG] [IMPORT] [CLEAR] ✅ playlist_tracks temizlendi`);
            
            // Sonra playlist'leri temizle
            this.db.prepare('DELETE FROM playlists').run();
            console.log(`[${timestamp}] [DEBUG] [IMPORT] [CLEAR] ✅ playlists temizlendi`);
            
            // Tracks'leri sil
            this.db.prepare('DELETE FROM tracks').run();
            console.log(`[${timestamp}] [DEBUG] [IMPORT] [CLEAR] ✅ tracks temizlendi`);
            
            // track_words temizle
            this.db.prepare('DELETE FROM track_words').run();
            console.log(`[${timestamp}] [DEBUG] [IMPORT] [CLEAR] ✅ track_words temizlendi`);
            
            // music_files'ı sil
            this.db.prepare('DELETE FROM music_files').run();
            console.log(`[${timestamp}] [DEBUG] [IMPORT] [CLEAR] ✅ music_files temizlendi`);
            
            // music_words temizle
            this.db.prepare('DELETE FROM music_words').run();
            console.log(`[${timestamp}] [DEBUG] [IMPORT] [CLEAR] ✅ music_words temizlendi`);
            
            // ⚠️ UYARI: import_sessions TEMİZLENMEZ - import geçmişi korunur!
            console.log(`[${timestamp}] [DEBUG] [IMPORT] [CLEAR] ℹ️  import_sessions korundu (geçmiş kayıtları)`);
            
            // Foreign key constraint'leri tekrar aç
            this.db.exec('PRAGMA foreign_keys = ON');
            console.log(`[${timestamp}] [DEBUG] [IMPORT] [CLEAR] 🔒 Foreign keys açıldı`);
            
            console.log(`[${timestamp}] [INFO] [IMPORT] [CLEAR] 🎉 Tüm tablolar temizlendi`);
        } catch (error) {
            const timestamp = new Date().toISOString();
            console.error(`[${timestamp}] [ERROR] [IMPORT] [CLEAR] ❌ Tablo temizleme hatası: ${error.message}`);
            // Foreign key'leri tekrar aç
            try {
                this.db.exec('PRAGMA foreign_keys = ON');
            } catch (fkError) {
                // Ignore
            }
            throw error;
        }
    }

    /**
     * VirtualDJ klasörünü tara ve import et
     * @param {Function} progressCallback - Progress callback (opsiyonel)
     * @returns {Promise<Object>} Import sonucu
     */
    async scanAndImport(progressCallback = null) {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        
        // Progress helper
        const reportProgress = (stage, current, total, message = '') => {
            if (progressCallback) {
                progressCallback({ stage, current, total, percentage: Math.round((current / total) * 100), message });
            }
        };
        
        // Config'den path'leri al
        const importPaths = this.config.getImportPaths();
        const virtualDJPath = importPaths.virtualDJ;
        const musicPath = importPaths.music;
        
        try {
            console.log(`[${timestamp}] [INFO] [IMPORT] [START] Import başlatılıyor: VirtualDJ + Müzik klasörleri`);
            console.log(`[${timestamp}] [DEBUG] [IMPORT] [CONFIG] VirtualDJ="${virtualDJPath}", Music="${musicPath}"`);
            
            // 0. Import öncesi tabloları temizle
            console.log(`[${timestamp}] [INFO] [IMPORT] [CLEAR] Import öncesi tablolar temizleniyor...`);
            this.clearImportTables();
            
            // 1. VirtualDJ klasörünü tara (playlist'ler için - M3U ve VDJFOLDER sadece burada)
            console.log(`[${timestamp}] [INFO] [IMPORT] [SCAN] VirtualDJ klasörü taranıyor: ${virtualDJPath}`);
            const virtualDJResult = await this.scanDirectoryAsync(virtualDJPath);
            
            // 2. Müzik klasörünü tara (müzik dosyaları için)
            console.log(`📁 Müzik klasörü taranıyor: ${musicPath}`);
            const musicResult = await this.scanDirectoryAsync(musicPath);
            
            // 3. Sonuçları birleştir
            const scanResult = {
                musicFiles: musicResult.musicFiles,
                tracks: virtualDJResult.tracks,
                playlistFiles: virtualDJResult.playlistFiles || []
            };
            
            console.log(`🔍 DEBUG: virtualDJResult.tracks.length = ${virtualDJResult.tracks.length}`);
            console.log(`🔍 DEBUG: musicResult.musicFiles.length = ${musicResult.musicFiles.length}`);
            console.log(`🔍 DEBUG: virtualDJResult.playlistFiles.length = ${(virtualDJResult.playlistFiles || []).length}`);
            
            // M3U ve VDJFOLDER dosya sayılarını ayrı ayrı say
            const m3uCount = virtualDJResult.tracks.filter(track => track.source === 'm3u').length;
            const vdjfolderCount = virtualDJResult.tracks.filter(track => track.source === 'vdjfolder').length;
            console.log(`📊 Playlist dosya türleri: M3U=${m3uCount}, VDJFOLDER=${vdjfolderCount}`);
            
            const totalFiles = scanResult.musicFiles.length + scanResult.tracks.length;
            console.log(`📊 Tarama sonucu: ${scanResult.musicFiles.length} müzik dosyası, ${scanResult.tracks.length} track bulundu`);

            // 2. Import session oluştur
            const sessionId = this.createSession(virtualDJPath, totalFiles);
            console.log(`✅ Session oluşturuldu: ID=${sessionId}`);

            let added = 0;
            let skipped = 0;
            let errors = 0;
            
            // Detaylı tracking için sayıları sakla
            let musicFilesAdded = 0;
            let tracksAdded = 0;
            let playlistsAdded = 0;

                   // 3. Müzik dosyalarını asenkron toplu import et
                   console.log(`🎵 Müzik dosyaları asenkron toplu import ediliyor... (${scanResult.musicFiles.length} dosya)`);
                   
                   if (scanResult.musicFiles.length > 0) {
                       const result = await this.bulkAddFilesAsync(scanResult.musicFiles);
                       added += result.added;
                       skipped += result.skipped;
                       errors += result.errors;
                       // Mevcut toplam music_files sayısını al (eklenen değil)
                       musicFilesAdded = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;
                       console.log(`✅ Müzik dosyaları asenkron toplu import tamamlandı: ${result.added} eklendi, ${result.skipped} atlandı, ${result.errors} hata`);
                   }

                   // 3.5. YENİ: Playlist'leri import et
                   console.log(`📁 Playlist'ler import ediliyor... (${scanResult.playlistFiles.length} playlist)`);
                   
                   if (scanResult.playlistFiles.length > 0) {
                       const playlists = await this.bulkAddPlaylistsAsync(scanResult.playlistFiles);
                       // Mevcut toplam playlist sayısını al (eklenen değil)
                       playlistsAdded = this.db.prepare('SELECT COUNT(*) as count FROM playlists').get().count;
                       console.log(`✅ ${playlists.length} playlist eklendi`);
                   }

                   // 4. Tracks'leri asenkron toplu import et
                   console.log(`🎧 Tracks asenkron toplu import ediliyor... (${scanResult.tracks.length} track)`);
                   
                   if (scanResult.tracks.length > 0) {
                       const result = await this.bulkAddTracksAsync(scanResult.tracks);
                       added += result.added;
                       skipped += result.skipped;
                       errors += result.errors;
                       // Mevcut toplam track sayısını al (eklenen değil)
                       tracksAdded = this.db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;
                       console.log(`✅ Tracks asenkron toplu import tamamlandı: ${result.added} eklendi, ${result.skipped} atlandı, ${result.errors} hata`);
                   }

            // 5. Session'ı güncelle - DETAYLI
            // Index sayılarını hesapla
            const trackWordsCount = this.db.prepare('SELECT COUNT(*) as count FROM track_words').get().count;
            const musicWordsCount = this.db.prepare('SELECT COUNT(*) as count FROM music_words').get().count;
            const playlistTracksCount = this.db.prepare('SELECT COUNT(*) as count FROM playlist_tracks').get().count;
            const totalIndexCount = trackWordsCount + musicWordsCount + playlistTracksCount;
            
            // Playlist track count'larını güncelle
            await this.updatePlaylistTrackCounts();
            
            this.updateSession(sessionId, {
                operation_type: 'import',
                processed_files: totalFiles,
                added_files: added,
                skipped_files: skipped,
                error_files: errors,
                
                // YENİ DETAYLAR:
                music_files_count: musicFilesAdded,
                tracks_count: tracksAdded,
                playlists_count: playlistsAdded,
                index_count: totalIndexCount
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
     * Klasörü asenkron olarak tara ve dosyaları bul (batch processing ile)
     * @param {string} dirPath - Taranacak klasör yolu
     * @returns {Promise<Object>} Tarama sonucu
     */
    async scanDirectoryAsync(dirPath) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [INFO] [SCAN] [ASYNC] Klasör taranıyor: ${dirPath}`);
        
        const result = {
            musicFiles: [],
            tracks: [],
            playlistFiles: []  // YENİ: Playlist dosya listesi
        };
        
        const isVirtualDJFolder = dirPath.includes('VirtualDJ');
        const BATCH_SIZE = 100; // Her batch'te 100 dosya işle
        
        try {
            const items = fs.readdirSync(dirPath);
            console.log(`[${timestamp}] [DEBUG] [SCAN] [ASYNC] ${items.length} dosya bulundu, batch processing başlatılıyor...`);
            
            // Dosyaları batch'ler halinde işle
            for (let i = 0; i < items.length; i += BATCH_SIZE) {
                const batch = items.slice(i, i + BATCH_SIZE);
                console.log(`[${timestamp}] [DEBUG] [SCAN] [BATCH] Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(items.length/BATCH_SIZE)} işleniyor (${batch.length} dosya)`);
                
                // Batch'i işle
                for (const item of batch) {
                    const itemPath = path.join(dirPath, item);
                    
                    // Dışlanacak klasörleri kontrol et
                    if (config.isExcludedPath(itemPath)) {
                        console.log(`[${timestamp}] [SKIP] [EXCLUDED] Dışlanan klasör: ${itemPath}`);
                        continue;
                    }
                    
                    const stats = fs.statSync(itemPath);
                    
                    if (stats.isDirectory()) {
                        // Alt klasörü recursive olarak tara
                        const subResult = await this.scanDirectoryAsync(itemPath);
                        result.musicFiles.push(...subResult.musicFiles);
                        result.tracks.push(...subResult.tracks);
                        if (subResult.playlistFiles) result.playlistFiles.push(...subResult.playlistFiles);
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
                        // ⚠️ Playlist dosyalarını SADECE VirtualDJ klasöründe tara
                        if (isVirtualDJFolder) {
                            console.log(`🔍 Playlist dosyası bulundu: ${path.basename(itemPath)}`);
                            
                            // YENİ: Playlist dosya bilgisini topla (normalizasyon için)
                            if (!result.playlistFiles) result.playlistFiles = [];
                            result.playlistFiles.push({
                                path: itemPath,
                                extension: path.extname(itemPath).toLowerCase()
                            });
                            
                            const playlistTracks = this.parsePlaylistFile(itemPath);
                            result.tracks.push(...playlistTracks);
                        } else {
                            console.log(`⚠️ Playlist dosyası atlandı (VirtualDJ dışı): ${itemPath}`);
                        }
                    }
                }
                
                // CPU'yu serbest bırak - diğer işlemlerin çalışmasına izin ver
                if (i + BATCH_SIZE < items.length) {
                    await new Promise(resolve => setImmediate(resolve));
                }
            }
            
        } catch (error) {
            console.error(`❌ Klasör tarama hatası: ${dirPath} - ${error.message}`);
        }
        
        console.log(`📊 Klasör tarama tamamlandı: ${dirPath} - ${result.musicFiles.length} müzik dosyası, ${result.tracks.length} track`);
        return result;
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
        
        // VirtualDJ klasörü mü kontrol et
        const importPaths = this.config.getImportPaths();
        const isVirtualDJFolder = dirPath.startsWith(importPaths.virtualDJ);
        
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
                    // ⚠️ Playlist dosyalarını SADECE VirtualDJ klasöründe tara
                    if (isVirtualDJFolder) {
                        console.log(`🔍 Playlist dosyası bulundu: ${path.basename(itemPath)}`);
                        const playlistTracks = this.parsePlaylistFile(itemPath);
                        result.tracks.push(...playlistTracks);
                    } else {
                        console.log(`⚠️ Playlist dosyası atlandı (VirtualDJ dışı): ${itemPath}`);
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Klasör tarama hatası: ${dirPath} - ${error.message}`);
        }
        
        console.log(`📊 Klasör tarama tamamlandı: ${dirPath} - ${result.musicFiles.length} müzik dosyası, ${result.tracks.length} track`);
        return result;
    }

    /**
     * Medya dosyası mı kontrol et
     * @param {string} filePath - Dosya yolu
     * @returns {boolean}
     */
    isMediaFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.config.isMusicExtension(ext);
    }

    /**
     * Playlist dosyası mı kontrol et
     * @param {string} filePath - Dosya yolu
     * @returns {boolean}
     */
    isPlaylistFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.config.isPlaylistExtension(ext);
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

                // HTML decode yap
                const decodedPath = this.htmlDecode(line);
                const normalizedName = this.normalizeFileName(path.basename(decodedPath));
                const filteredName = normalizedName; // wordSimilarity kaldırıldı, direkt kullan
                tracks.push({
                    originalPath: decodedPath,
                    normalizedName: filteredName,
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
                let songPath = match[1];
                if (songPath && songPath.trim()) {
                    // HTML decode yap
                    songPath = this.htmlDecode(songPath);
                    
                    const normalizedName = this.normalizeFileName(path.basename(songPath));
                    const filteredName = normalizedName; // wordSimilarity kaldırıldı, direkt kullan
                    tracks.push({
                        originalPath: songPath,
                        normalizedName: filteredName,
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
     * HTML decode fonksiyonu
     * @param {string} str - HTML encoded string
     * @returns {string} Decoded string
     */
    htmlDecode(str) {
        if (!str) return str;
        
        return str
            .replace(/&apos;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    }

    /**
     * Dosya adını normalize et - WordIndexService.normalize kullan
     * Bu sayede tüm sistem tek bir normalize fonksiyonu kullanır
     * @param {string} fileName - Dosya adı
     * @returns {string} Normalize edilmiş dosya adı
     */
    normalizeFileName(fileName) {
        // WordIndexService'deki normalize fonksiyonunu kullan
        // Bu fonksiyon tüm dünya dilleri + apostrof desteği sağlar
        return this.wordIndexService.normalize(fileName);
    }

    /**
     * Playlist track count'larını güncelle
     * @returns {number} Güncellenen playlist sayısı
     */
    async updatePlaylistTrackCounts() {
        try {
            console.log('🔄 Playlist track countları güncelleniyor...');
            
            // playlist_tracks tablosundan gerçek sayıları hesapla ve playlists tablosunu güncelle
            const updateStmt = this.db.prepare(`
                UPDATE playlists 
                SET track_count = (
                    SELECT COUNT(*)
                    FROM playlist_tracks pt
                    WHERE pt.playlist_id = playlists.id
                ),
                updated_at = CURRENT_TIMESTAMP
                WHERE id IN (
                    SELECT DISTINCT playlist_id 
                    FROM playlist_tracks
                )
            `);

            const result = updateStmt.run();
            console.log(`✅ ${result.changes} playlist track_count güncellendi`);
            
            return result.changes;
        } catch (error) {
            console.error(`❌ Track count güncelleme hatası: ${error.message}`);
            throw error;
        }
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
            let value = match[2];
            
            // HTML decode yap
            value = this.htmlDecode(value);
            
            metadata[key] = value;
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
            console.log(`📄 M3U dosyası işlendi: ${path.basename(filePath)} - ${playlistTracks.length} track`);
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
            console.log(`📄 VDJFOLDER dosyası işlendi: ${path.basename(filePath)} - ${playlistTracks.length} track`);
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
            // Session tracking için "import:" prefix ekle
            const sessionPath = `import:${path}`;
            
            const stmt = this.db.prepare(`
                INSERT INTO import_sessions (path, total_files, processed_files, added_files, skipped_files, error_files, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(sessionPath, totalFiles, 0, 0, 0, 0, new Date().toISOString());
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
     * Dosya adını normalize et - WordIndexService.normalize kullan
     * Bu sayede tüm sistem tek bir normalize fonksiyonu kullanır
     * @param {string} fileName - Dosya adı
     * @returns {string} Normalize edilmiş ad
     */
    normalizeFileName(fileName) {
        // WordIndexService'deki normalize fonksiyonunu kullan
        // Bu fonksiyon tüm dünya dilleri + apostrof desteği sağlar
        return this.wordIndexService.normalize(fileName);
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
     * Müzik dosyalarını asenkron olarak toplu import et (batch processing ile)
     * @param {Array} files - Dosya listesi
     * @returns {Promise<Object>} Sonuç
     */
    async bulkAddFilesAsync(files) {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        let added = 0;
        let skipped = 0;
        let errors = 0;

        try {
            console.log(`[${timestamp}] [INFO] [BULK] [ASYNC] Toplu müzik dosyası import başlatılıyor: ${files.length} dosya`);
            
            // Geçici tablo oluştur
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

            // Küçük batch size - CPU'yu serbest bırakmak için
            const batchSize = 100; // 100 dosya/batch
            const batches = [];
            
            for (let i = 0; i < files.length; i += batchSize) {
                batches.push(files.slice(i, i + batchSize));
            }

            console.log(`[${timestamp}] [DEBUG] [BULK] [ASYNC] ${batches.length} batch oluşturuldu (${batchSize} dosya/batch)`);

            // Geçici tabloya toplu insert (UNIQUE constraint hatalarını önlemek için INSERT OR REPLACE)
            const tempInsert = this.db.prepare(`
                INSERT OR REPLACE INTO temp_music_files 
                (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                const processedCount = (batchIndex + 1) * batchSize;
                const percentage = Math.min(100, Math.round((processedCount / files.length) * 100));
                
                console.log(`[${timestamp}] [DEBUG] [BULK] [BATCH] Batch ${batchIndex + 1}/${batches.length} işleniyor... (${batch.length} dosya) - %${percentage}`);
                
                // Batch'i işle
                for (const file of batch) {
                    try {
                        const fileNameOnly = path.basename(file.fileName, file.extension);
                        const normalizedFileName = this.normalizeFileName(file.fileName);
                        
                        tempInsert.run(
                            file.path,
                            file.fileName,
                            fileNameOnly,
                            normalizedFileName,
                            file.extension,
                            file.size,
                            file.modified.getTime(),
                            new Date().toISOString()
                        );
                        
                        // YENİ: music_words kelime indexi oluştur
                        this.wordIndexService.kelimeIndexiOlusturMusic(file.path, file.fileName);
                        
                        added++;
                    } catch (error) {
                        console.error(`❌ Dosya ekleme hatası: ${file.path} - ${error.message}`);
                        errors++;
                    }
                }
                
                // CPU'yu serbest bırak - diğer işlemlerin çalışmasına izin ver
                if (batchIndex < batches.length - 1) {
                    await new Promise(resolve => setImmediate(resolve));
                }
            }

            // Ana tabloya toplu insert
            console.log(`[${timestamp}] [INFO] [BULK] [ASYNC] Ana tabloya aktarılıyor...`);
            const result = this.db.exec(`
                INSERT OR IGNORE INTO music_files 
                (path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime, created_at)
                SELECT path, fileName, fileNameOnly, normalizedFileName, extension, size, modifiedTime, created_at 
                FROM temp_music_files
            `);

            // Sonuçları hesapla
            const totalInTemp = this.db.prepare('SELECT COUNT(*) as count FROM temp_music_files').get().count;
            added = totalInTemp;
            skipped = files.length - totalInTemp;

            // Geçici tabloyu temizle
            this.db.exec('DROP TABLE temp_music_files');

            const duration = Date.now() - startTime;
            console.log(`[${timestamp}] [INFO] [BULK] [ASYNC] ✅ Toplu müzik dosyası import tamamlandı: ${added} eklendi, ${skipped} atlandı, ${errors} hata (${duration}ms)`);

            return { added, skipped, errors, duration };

        } catch (error) {
            console.error(`[${timestamp}] [ERROR] [BULK] [ASYNC] ❌ Toplu müzik dosyası import hatası: ${error.message}`);
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

            // Geçici tabloya toplu insert (UNIQUE constraint hatalarını önlemek için INSERT OR REPLACE)
            const tempInsert = this.db.prepare(`
                INSERT OR REPLACE INTO temp_music_files 
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
            
            // Foreign key kontrolünü geçici olarak kapat
            this.db.exec('PRAGMA foreign_keys = OFF');
            
            // Geçici tablo oluştur - transaction dışında (tracks tablosu ile aynı schema)
            this.db.exec(`
                CREATE TEMPORARY TABLE IF NOT EXISTS temp_tracks (
                    path TEXT NOT NULL,
                    fileName TEXT NOT NULL,
                    fileNameOnly TEXT NOT NULL,
                    normalizedFileName TEXT NOT NULL,
                    source TEXT NOT NULL,
                    source_file TEXT,
                    created_at TEXT
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
                (path, fileName, fileNameOnly, normalizedFileName, source, source_file, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
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
                                track.source_file || '',
                                track.created_at || new Date().toISOString()
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
                    (path, fileName, fileNameOnly, normalizedFileName, source, source_file, created_at)
                    SELECT path, fileName, fileNameOnly, normalizedFileName, source, source_file, created_at 
                    FROM temp_tracks
                `);

            // Sonuçları hesapla
            const totalInTemp = this.db.prepare('SELECT COUNT(*) as count FROM temp_tracks').get().count;
            
            added = totalInTemp;
            skipped = tracks.length - totalInTemp;

            // Geçici tabloyu temizle
            this.db.exec('DROP TABLE temp_tracks');
            
            // Foreign key kontrolünü tekrar aç
            this.db.exec('PRAGMA foreign_keys = ON');

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
            // Foreign key kontrolünü tekrar aç
            try {
                this.db.exec('PRAGMA foreign_keys = ON');
            } catch (fkError) {
                // Ignore FK errors
            }
            return { added, skipped, errors: errors + 1, duration: Date.now() - startTime };
        }
    }

    /**
     * Tracks'leri asenkron olarak toplu import et (batch processing ile)
     * @param {Array} tracks - Track listesi
     * @returns {Promise<Object>} Sonuç
     */
    async bulkAddTracksAsync(tracks) {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        let added = 0;
        let skipped = 0;
        let errors = 0;

        try {
            console.log(`[${timestamp}] [INFO] [BULK] [ASYNC] Toplu track import başlatılıyor: ${tracks.length} track`);
            
            // Foreign key kontrolünü geçici olarak kapat
            this.db.exec('PRAGMA foreign_keys = OFF');
            
            // Geçici tablo oluştur (tracks tablosu ile aynı schema - YENİ YAPI)
            this.db.exec(`
                CREATE TEMPORARY TABLE IF NOT EXISTS temp_tracks (
                    path TEXT NOT NULL,
                    fileName TEXT NOT NULL,
                    fileNameOnly TEXT NOT NULL,
                    normalizedFileName TEXT NOT NULL,
                    created_at TEXT
                )
            `);

            // Küçük batch size - CPU'yu serbest bırakmak için
            const batchSize = 100; // 100 track/batch
            const batches = [];
            
            for (let i = 0; i < tracks.length; i += batchSize) {
                batches.push(tracks.slice(i, i + batchSize));
            }

            console.log(`[${timestamp}] [DEBUG] [BULK] [ASYNC] ${batches.length} batch oluşturuldu (${batchSize} track/batch)`);

            // Geçici tabloya toplu insert (id kolonu AUTO_INCREMENT olduğu için eklemiyor uz)
            const tempInsert = this.db.prepare(`
                INSERT INTO temp_tracks 
                (path, fileName, fileNameOnly, normalizedFileName, created_at)
                VALUES (?, ?, ?, ?, ?)
            `);

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                const processedCount = (batchIndex + 1) * batchSize;
                const percentage = Math.min(100, Math.round((processedCount / tracks.length) * 100));
                
                console.log(`[${timestamp}] [DEBUG] [BULK] [BATCH] Batch ${batchIndex + 1}/${batches.length} işleniyor... (${batch.length} track) - %${percentage}`);
                
                // Batch'i işle
                for (const track of batch) {
                    try {
                        const fileNameOnly = path.basename(track.fileName, track.extension || path.extname(track.fileName));
                        const normalizedFileName = this.normalizeFileName(track.fileName);
                        
                        tempInsert.run(
                            track.path,
                            track.fileName,
                            fileNameOnly,
                            normalizedFileName,
                            new Date().toISOString()
                        );
                        
                        // YENİ: track_words kelime indexi oluştur
                        this.wordIndexService.kelimeIndexiOlusturTrack(
                            track.path,
                            track.fileName,
                            track.source,
                            track.playlistPath || track.source_file || ''
                        );
                        
                        added++;
                    } catch (error) {
                        console.error(`❌ Track ekleme hatası: ${track.path} - ${error.message}`);
                        errors++;
                    }
                }
                
                // CPU'yu serbest bırak - diğer işlemlerin çalışmasına izin ver
                if (batchIndex < batches.length - 1) {
                    await new Promise(resolve => setImmediate(resolve));
                }
            }

            // Ana tabloya toplu insert (id kolonu hariç, AUTO_INCREMENT)
            console.log(`[${timestamp}] [INFO] [BULK] [ASYNC] Ana tabloya aktarılıyor...`);
            const result = this.db.exec(`
                INSERT OR IGNORE INTO tracks (path, fileName, fileNameOnly, normalizedFileName, created_at)
                SELECT path, fileName, fileNameOnly, normalizedFileName, created_at FROM temp_tracks
            `);

            // Sonuçları hesapla
            const totalInTemp = this.db.prepare('SELECT COUNT(*) as count FROM temp_tracks').get().count;
            added = totalInTemp;
            skipped = tracks.length - totalInTemp;

            // Geçici tabloyu temizle
            this.db.exec('DROP TABLE temp_tracks');

            // Foreign key kontrolünü tekrar aç
            this.db.exec('PRAGMA foreign_keys = ON');

            const duration = Date.now() - startTime;
            console.log(`[${timestamp}] [INFO] [BULK] [ASYNC] ✅ Toplu track import tamamlandı: ${added} eklendi, ${skipped} atlandı, ${errors} hata (${duration}ms)`);

            return { added, skipped, errors, duration };

        } catch (error) {
            console.error(`[${timestamp}] [ERROR] [BULK] [ASYNC] ❌ Toplu track import hatası: ${error.message}`);
            // Geçici tabloyu temizle
            try {
                this.db.exec('DROP TABLE IF EXISTS temp_tracks');
                this.db.exec('PRAGMA foreign_keys = ON');
            } catch (fkError) {
                // Ignore FK errors
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
            const dbStats = this.dbManager.getCounts();
            
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
                        tracks: dbStats.tracks,
                        playlists: dbStats.playlists,
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

    /**
     * YENİ: Playlist dosyalarını toplu olarak ekle
     * @param {Array} playlistFiles - Playlist dosya bilgileri
     * @returns {Promise<Array>} Eklenen playlist'ler
     */
    async bulkAddPlaylistsAsync(playlistFiles) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [INFO] [BULK] [PLAYLIST] ${playlistFiles.length} playlist import ediliyor...`);
        
        const insertPlaylist = this.db.prepare(`
            INSERT OR REPLACE INTO playlists (path, name, type, track_count, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const playlists = [];
        let totalTracksLinked = 0;
        
        for (const file of playlistFiles) {
            try {
                const name = path.basename(file.path, path.extname(file.path));
                const ext = path.extname(file.path).toLowerCase();
                const type = (ext === '.m3u' || ext === '.m3u8') ? 'm3u' : 'vdjfolder';
                
                const result = insertPlaylist.run(
                    file.path,
                    name,
                    type,
                    0, // track_count sonra güncellenecek
                    new Date().toISOString()
                );
                
                const playlistId = result.lastInsertRowid;
                
                playlists.push({
                    id: playlistId,
                    path: file.path,
                    name,
                    type
                });
                
                // YENİ: Playlist track'lerini parse et ve playlist_tracks tablosuna kaydet
                try {
                    const playlistTracks = this.parsePlaylistFile(file.path);
                    const linkedCount = this.savePlaylistTracks(playlistId, playlistTracks);
                    totalTracksLinked += linkedCount;
                } catch (trackError) {
                    console.error(`[${timestamp}] [ERROR] [PLAYLIST_TRACKS] ${file.path} track'leri kaydedilemedi: ${trackError.message}`);
                }
                
            } catch (error) {
                console.error(`❌ Playlist ekleme hatası: ${file.path} - ${error.message}`);
            }
        }
        
        console.log(`[${timestamp}] [INFO] [BULK] [PLAYLIST] ${playlists.length} playlist eklendi, ${totalTracksLinked} track ilişkilendirildi`);
        return playlists;
    }

    /**
     * Playlist ve track ilişkilendirmesini kaydet
     * @param {number} playlistId - Playlist ID
     * @param {Array} tracks - Track listesi (parsePlaylistFile'dan dönen format)
     * @returns {number} Kaydedilen track sayısı
     */
    savePlaylistTracks(playlistId, tracks) {
        const timestamp = new Date().toISOString();
        let savedCount = 0;
        let skippedCount = 0;
        
        try {
            const insertStmt = this.db.prepare(`
                INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, track_order)
                VALUES (?, ?, ?)
            `);
            
            const findTrackStmt = this.db.prepare(`
                SELECT id FROM tracks WHERE path = ?
            `);
            
            const insertTrackStmt = this.db.prepare(`
                INSERT OR IGNORE INTO tracks (path, fileName, fileNameOnly, normalizedFileName)
                VALUES (?, ?, ?, ?)
            `);
            
            const transaction = this.db.transaction((tracks) => {
                tracks.forEach((track, index) => {
                    if (!track.path) {
                        skippedCount++;
                        return;
                    }
                    
                    // Track'i bul
                    let trackRecord = findTrackStmt.get(track.path);
                    
                    if (!trackRecord) {
                        // Track yoksa oluştur
                        const result = insertTrackStmt.run(
                            track.path,
                            track.fileName || path.basename(track.path),
                            track.fileNameOnly || path.parse(track.path).name,
                            track.normalizedFileName || this.normalizeFileName(path.basename(track.path))
                        );
                        
                        // lastInsertRowid kontrolü - eğer 0 ise track zaten var (INSERT OR IGNORE)
                        if (result.lastInsertRowid > 0) {
                            trackRecord = { id: result.lastInsertRowid };
                        } else {
                            // Tekrar dene
                            trackRecord = findTrackStmt.get(track.path);
                        }
                    }
                    
                    if (trackRecord) {
                        // İlişkilendirmeyi kaydet (track_order 1'den başlar)
                        const result = insertStmt.run(playlistId, trackRecord.id, index + 1);
                        if (result.changes > 0) {
                            savedCount++;
                        }
                    } else {
                        skippedCount++;
                    }
                });
            });
            
            transaction(tracks);
            
            if (savedCount > 0 || skippedCount > 0) {
                console.log(`[${timestamp}] [DEBUG] [PLAYLIST_TRACKS] Playlist ${playlistId}: ${savedCount} track kaydedildi, ${skippedCount} atlandı`);
            }
            
            return savedCount;
            
        } catch (error) {
            console.error(`[${timestamp}] [ERROR] [PLAYLIST_TRACKS] Playlist ${playlistId} track kaydetme hatası: ${error.message}`);
            return 0;
        }
    }
}

module.exports = ImportService;