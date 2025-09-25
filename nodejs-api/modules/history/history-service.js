'use strict';

const fs = require('fs');
const path = require('path');
const { getLogger } = require('../../shared/logger');
const { getDatabase } = require('../../shared/database');
const { WordSimilaritySearch } = require('../../shared/utils');

/**
 * History Service - Basitleştirilmiş
 */
class HistoryService {
    constructor() {
        this.dbManager = getDatabase();
        this.db = this.dbManager.db;
        this.logger = getLogger().module('HistoryService');
    }


    /**
     * Tam yol eşleşmesi yap
     * @returns {number} Eşleştirilen track sayısı
     */
    performExactPathMatch() {
        const updateStmt = this.db.prepare(`
            UPDATE tracks 
            SET is_matched = 1, 
                matched_music_file_id = (
                    SELECT mf.id 
                    FROM music_files mf 
                    WHERE mf.path = tracks.path
                ),
                updated_at = CURRENT_TIMESTAMP
            WHERE tracks.path IN (
                SELECT mf.path 
                FROM music_files mf 
                WHERE mf.path = tracks.path
            ) AND tracks.is_matched = 0
        `);

        const result = updateStmt.run();
        return result.changes;
    }

    /**
     * Filename-only eşleşmesi yap
     * @returns {number} Eşleştirilen track sayısı
     */
    performFilenameMatch() {
        const updateStmt = this.db.prepare(`
            UPDATE tracks 
            SET is_matched = 1, 
                matched_music_file_id = (
                    SELECT mf.id 
                    FROM music_files mf 
                    WHERE mf.fileNameOnly = tracks.fileNameOnly
                    LIMIT 1
                ),
                updated_at = CURRENT_TIMESTAMP
            WHERE tracks.is_matched = 0 
            AND tracks.fileNameOnly IN (
                SELECT mf.fileNameOnly 
                FROM music_files mf 
                WHERE mf.fileNameOnly = tracks.fileNameOnly
            )
        `);

        const result = updateStmt.run();
        return result.changes;
    }

    /**
     * Benzerlik eşleşmesi yap (Levenshtein distance)
     * @param {number} threshold - Minimum benzerlik oranı (0.0-1.0)
     * @param {number} limit - Maksimum işlenecek track sayısı
     * @returns {number} Eşleştirilen track sayısı
     */
    performSimilarityMatch(threshold = 0.4, limit = 1000) {
        try {
            this.logger.info(`Benzerlik eşleşmesi başlatılıyor (threshold: ${threshold}, limit: ${limit})`);
            
            // Eşleşmemiş track'leri al
            const unmatchedTracks = this.db.prepare(`
                SELECT id, path, fileName, fileNameOnly, normalizedFileName
                FROM tracks 
                WHERE is_matched = 0 
                LIMIT ?
            `).all(limit);

            this.logger.info(`${unmatchedTracks.length} eşleşmemiş track bulundu`);

            let matchedCount = 0;
            const { normalizeFileName } = require('../../shared/utils');

            for (const track of unmatchedTracks) {
                try {
                    // Bu track için en benzer music_file'ı bul
                    const bestMatch = this.findBestSimilarityMatch(track, threshold);
                    
                    if (bestMatch) {
                        // Eşleşmeyi kaydet
                        const updateStmt = this.db.prepare(`
                            UPDATE tracks 
                            SET is_matched = 1, 
                                matched_music_file_id = ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `);
                        
                        updateStmt.run(bestMatch.id, track.id);
                        matchedCount++;
                        
                        this.logger.debug(`✅ Eşleşti: ${track.fileName} → ${bestMatch.fileName} (skor: ${bestMatch.similarity.toFixed(3)})`);
                    }
                } catch (error) {
                    this.logger.error(`Track eşleşme hatası (${track.fileName}):`, error);
                }
            }

            this.logger.info(`✅ ${matchedCount} track benzerlik eşleşmesi ile eşleştirildi`);
            return matchedCount;

        } catch (error) {
            this.logger.error('Benzerlik eşleşmesi hatası:', error);
            return 0;
        }
    }

    /**
     * Kelime çıkartmalı benzerlik eşleştirmesi yap
     * @param {number} threshold - Minimum benzerlik oranı (0.0-1.0)
     * @param {number} limit - Maksimum işlenecek track sayısı
     * @returns {number} Eşleştirilen track sayısı
     */
    performWordSimilarityMatch(threshold = 0.6, limit = 1000) {
        try {
            this.logger.info(`Kelime çıkartmalı benzerlik eşleştirmesi başlatılıyor (threshold: ${threshold}, limit: ${limit})`);

            // Eşleşmemiş track'leri al (anlamlı track'leri bul)
            const unmatchedTracks = this.db.prepare(`
                SELECT * FROM tracks 
                WHERE is_matched = 0 
                AND normalizedFileName LIKE '% %'
                AND LENGTH(normalizedFileName) > 15
                ORDER BY id 
                LIMIT ?
            `).all(limit);

            const fs = require('fs');
            fs.appendFileSync('/tmp/debug.log', `🔍 ${unmatchedTracks.length} eşleşmemiş track bulundu\n`);
            console.log(`🔍 ${unmatchedTracks.length} eşleşmemiş track bulundu`);
            this.logger.info(`${unmatchedTracks.length} eşleşmemiş track bulundu`);

            let matchedCount = 0;

            for (let i = 0; i < Math.min(unmatchedTracks.length, 5); i++) {
                const track = unmatchedTracks[i];
                fs.appendFileSync('/tmp/debug.log', `🔄 İşleniyor ${i+1}/${Math.min(unmatchedTracks.length, 5)}: ${track.normalizedFileName}\n`);
                console.log(`🔄 İşleniyor ${i+1}/${Math.min(unmatchedTracks.length, 5)}: ${track.normalizedFileName}`);
                this.logger.info(`İşleniyor ${i+1}/${Math.min(unmatchedTracks.length, 5)}: ${track.normalizedFileName}`);
                // Kademeli arama yap
                const searchResult = this.searchStepByStep(track.normalizedFileName);
                
                if (searchResult && searchResult.results.length > 0) {
                    fs.appendFileSync('/tmp/debug.log', `🔍 En iyi eşleşme aranıyor: ${searchResult.results.length} aday\n`);
                    
                    // En iyi eşleşmeyi bul
                    const bestMatch = this.findBestMatch(track.normalizedFileName, searchResult.results);
                    
                    fs.appendFileSync('/tmp/debug.log', `📊 En iyi eşleşme: ${bestMatch ? `skor=${bestMatch.score.toFixed(3)}, threshold=${threshold}` : 'bulunamadı'}\n`);
                    
                    if (bestMatch && bestMatch.score >= threshold) {
                        // Eşleşmeyi kaydet
                        const updateStmt = this.db.prepare(`
                            UPDATE tracks
                            SET is_matched = 1,
                                matched_music_file_id = ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `);

                        updateStmt.run(bestMatch.match.id, track.id);
                        matchedCount++;

                        fs.appendFileSync('/tmp/debug.log', `✅ Eşleşme kaydedildi: ${track.normalizedFileName} → ${bestMatch.match.normalizedFileName} (skor: ${bestMatch.score.toFixed(3)})\n`);
                        this.logger.debug(`✅ Kelime eşleşti: ${track.normalizedFileName} → ${bestMatch.match.normalizedFileName} (skor: ${bestMatch.score.toFixed(3)})`);
                    } else {
                        fs.appendFileSync('/tmp/debug.log', `❌ Eşleşme yetersiz: ${bestMatch ? bestMatch.score.toFixed(3) : 'bulunamadı'} < ${threshold}\n`);
                    }
                }
            }

            this.logger.info(`✅ ${matchedCount} track kelime çıkartmalı eşleşmesi ile eşleştirildi`);
            return matchedCount;

        } catch (error) {
            this.logger.error('Kelime çıkartmalı eşleşmesi hatası:', error);
            return 0;
        }
    }

    /**
     * Rakam filtreleme - baştaki rakamları kaldır
     * @param {string} text - Filtrelenecek metin
     * @returns {string} Filtrelenmiş metin
     */
    filterNumbers(text) {
        return text.replace(/^\d+\s*/, '').trim();
    }

    /**
     * Kelime kombinasyonları oluşturma (en uzundan başla)
     * @param {string[]} words - Kelime dizisi
     * @returns {string[]} Kombinasyon dizisi
     */
    generateWordCombinations(words) {
        const combinations = [];
        for (let i = words.length; i >= 1; i--) {
            for (let j = 0; j <= words.length - i; j++) {
                combinations.push(words.slice(j, j + i).join(' '));
            }
        }
        return combinations;
    }

    /**
     * Kademeli arama - en uzun kelime kombinasyonundan başla
     * @param {string} trackName - Aranacak track adı
     * @returns {Object|null} Arama sonucu
     */
    searchStepByStep(trackName) {
        try {
            const filteredName = this.filterNumbers(trackName);
            const words = filteredName.split(' ').filter(w => w.length > 0);
            const combinations = this.generateWordCombinations(words);

            fs.appendFileSync('/tmp/debug.log', `🔍 Kademeli arama: "${trackName}" → "${filteredName}" (${words.length} kelime)\n`);
            fs.appendFileSync('/tmp/debug.log', `📝 Kombinasyonlar: ${combinations.slice(0, 3).join(', ')}...\n`);
            console.log(`🔍 Kademeli arama: "${trackName}" → "${filteredName}" (${words.length} kelime)`);
            console.log(`📝 Kombinasyonlar: ${combinations.slice(0, 3).join(', ')}...`);
            this.logger.info(`Kademeli arama: "${trackName}" → "${filteredName}" (${words.length} kelime)`);
            this.logger.info(`Kombinasyonlar: ${combinations.slice(0, 3).join(', ')}...`);

            for (const combination of combinations) {
                const results = this.db.prepare(`
                    SELECT * FROM music_files 
                    WHERE normalizedFileName LIKE ?
                `).all(`%${combination}%`);

                if (results.length > 0) {
                    fs.appendFileSync('/tmp/debug.log', `✅ Bulundu: "${combination}" → ${results.length} sonuç\n`);
                    console.log(`✅ Bulundu: "${combination}" → ${results.length} sonuç`);
                    this.logger.info(`✅ Bulundu: "${combination}" → ${results.length} sonuç`);
                    return { combination, results };
                }
            }

            fs.appendFileSync('/tmp/debug.log', `❌ Bulunamadı: "${trackName}"\n`);
            console.log(`❌ Bulunamadı: "${trackName}"`);
            this.logger.info(`❌ Bulunamadı: "${trackName}"`);
            return null;

        } catch (error) {
            this.logger.error('Kademeli arama hatası:', error);
            return null;
        }
    }

    /**
     * En iyi eşleşmeyi bulma
     * @param {string} originalName - Orijinal track adı
     * @param {Array} candidates - Aday müzik dosyaları
     * @returns {Object|null} En iyi eşleşme
     */
    findBestMatch(originalName, candidates) {
        let bestMatch = null;
        let bestScore = 0;

        for (const candidate of candidates) {
            const score = this.calculateWordSimilarity(originalName, candidate.normalizedFileName);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = candidate;
            }
        }

        return bestMatch ? { match: bestMatch, score: bestScore } : null;
    }

    /**
     * Detaylı kelime çıkartmalı benzerlik hesaplama
     * @param {string} trackName - Track adı
     * @param {string} musicName - Müzik dosyası adı
     * @returns {number} Benzerlik oranı (0.0-1.0)
     */
    calculateWordSimilarity(trackName, musicName) {
        const trackWords = trackName.split(' ').filter(w => w.length > 0);
        const musicWords = musicName.split(' ').filter(w => w.length > 0);

        let matchedWords = 0;
        const usedMusicWords = new Set();

        for (const trackWord of trackWords) {
            let bestMatch = null;
            let bestScore = 0;

            for (let i = 0; i < musicWords.length; i++) {
                if (usedMusicWords.has(i)) continue;

                const musicWord = musicWords[i];
                const similarity = this.calculateSimilarity(trackWord, musicWord);

                if (similarity > 0.7 && similarity > bestScore) {
                    bestMatch = i;
                    bestScore = similarity;
                }
            }

            if (bestMatch !== null) {
                matchedWords++;
                usedMusicWords.add(bestMatch);
            }
        }

        return matchedWords / trackWords.length;
    }

    /**
     * Track için en iyi benzerlik eşleşmesini bul
     * @param {Object} track - Track objesi
     * @param {number} threshold - Minimum benzerlik oranı
     * @returns {Object|null} En iyi eşleşme veya null
     */
    findBestSimilarityMatch(track, threshold) {
        try {
            // Tüm music_files'ları al
            const musicFiles = this.db.prepare(`
                SELECT id, path, fileName, fileNameOnly, normalizedFileName
                FROM music_files
            `).all();

            let bestMatch = null;
            let bestScore = 0;

            const { normalizeFileName } = require('../../shared/utils');

            for (const musicFile of musicFiles) {
                // Benzerlik skorunu hesapla
                const similarity = this.calculateSimilarity(
                    track.normalizedFileName, 
                    musicFile.normalizedFileName
                );

                if (similarity >= threshold && similarity > bestScore) {
                    bestMatch = {
                        id: musicFile.id,
                        path: musicFile.path,
                        fileName: musicFile.fileName,
                        similarity: similarity
                    };
                    bestScore = similarity;
                }
            }

            return bestMatch;

        } catch (error) {
            this.logger.error('Benzerlik hesaplama hatası:', error);
            return null;
        }
    }

    /**
     * İki string arasındaki benzerliği hesapla (Levenshtein distance)
     * @param {string} str1 - İlk string
     * @param {string} str2 - İkinci string
     * @returns {number} Benzerlik oranı (0.0-1.0)
     */
    calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        const maxLength = Math.max(str1.length, str2.length);
        
        return maxLength === 0 ? 1 : 1 - (distance / maxLength);
    }

    /**
     * Levenshtein distance hesapla
     * @param {string} str1 - İlk string
     * @param {string} str2 - İkinci string
     * @returns {number} Distance değeri
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,  // substitution
                        matrix[i][j - 1] + 1,      // insertion
                        matrix[i - 1][j] + 1       // deletion
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Eşleştirme istatistiklerini al
     * @returns {Object} İstatistikler
     */
    getMatchStats() {
        const totalTracks = this.db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;
        const matchedTracks = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE is_matched = 1').get().count;
        const unmatchedTracks = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE is_matched = 0').get().count;
        const totalMusicFiles = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;

        return {
            totalTracks,
            matchedTracks,
            unmatchedTracks,
            totalMusicFiles,
            matchRate: totalTracks > 0 ? ((matchedTracks / totalTracks) * 100).toFixed(2) : 0
        };
    }

    /**
     * History dosyalarını tara ve import et
     * @param {string} historyRoot - History klasör yolu
     * @returns {Promise<Object>} Import sonucu
     */
    async scanAndImport(historyRoot) {
        try {
            this.logger.info(`History tarama başlatılıyor: ${historyRoot}`);

            // 1. History dosyalarını bul
            const historyFiles = this.scanHistoryFiles(historyRoot);
            this.logger.info(`${historyFiles.length} history dosyası bulundu`);

            let totalTracks = 0;
            let processedFiles = 0;

            // 2. Her dosyayı işle
            for (const historyFile of historyFiles) {
                try {
                    // Duplicate kontrolü
                    const isAlreadyProcessed = this.isFileProcessed(historyFile.filePath);
                    if (isAlreadyProcessed) {
                        this.logger.info(`⏭️ Skipping already processed file: ${historyFile.fileName}`);
                        processedFiles++;
                        continue;
                    }

                    this.logger.info(`🔍 Processing history file: ${historyFile.filePath}`);
                    const tracks = this.extractTracksFromFile(historyFile.filePath);
                    this.logger.info(`📊 Extracted ${tracks ? tracks.length : 0} tracks from ${historyFile.fileName}`);
                    
                    if (tracks && tracks.length > 0) {
                        this.insertTracks(tracks, historyFile.filePath);
                        totalTracks += tracks.length;
                        this.logger.info(`✅ Inserted ${tracks.length} tracks into database`);
                    }
                    processedFiles++;
                } catch (error) {
                    this.logger.error(`History dosyası işleme hatası: ${historyFile.filePath}`, { error: error.message });
                }
            }

            return {
                success: true,
                data: {
                processedFiles,
                totalTracks,
                    historyFiles: historyFiles.length
                },
                message: 'History import başarıyla tamamlandı'
            };

        } catch (error) {
            this.logger.error(`History scan hatası: ${error.message}`, { error: error.message });
            return {
                success: false,
                message: 'History scan hatası',
                error: error.message
            };
        }
    }

    /**
     * History dosyalarını tara
     * @param {string} historyRoot - History klasör yolu
     * @returns {Array} History dosya listesi
     */
    scanHistoryFiles(historyRoot) {
        const historyFiles = [];
        
        try {
            this.logger.info(`History klasörü taranıyor: ${historyRoot}`);
            const items = fs.readdirSync(historyRoot);
            this.logger.info(`${items.length} dosya/klasör bulundu`);
            
            for (const item of items) {
                const itemPath = path.join(historyRoot, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    this.logger.info(`Alt klasör taranıyor: ${itemPath}`);
                    // Alt klasörleri de tara
                    const subFiles = this.scanHistoryFiles(itemPath);
                    historyFiles.push(...subFiles);
                } else if (item.endsWith('.m3u')) {
                    this.logger.info(`M3U dosyası bulundu: ${itemPath}`);
                    historyFiles.push({
                        filePath: itemPath,
                        fileName: item,
                        size: stats.size,
                        modified: stats.mtime
                    });
                }
            }
        } catch (error) {
            this.logger.error(`History klasör tarama hatası: ${historyRoot}`, { error: error.message });
        }
        
        this.logger.info(`Toplam ${historyFiles.length} M3U dosyası bulundu`);
        return historyFiles;
    }

    /**
     * M3U dosyasından track'leri çıkar
     * @param {string} filePath - M3U dosya yolu
     * @returns {Array} Track listesi
     */
    extractTracksFromFile(filePath) {
        const tracks = [];
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                
                // M3U dosyasında # ile başlamayan satırlar dosya yolu
                if (trimmedLine && !trimmedLine.startsWith('#')) {
                    const fileName = path.basename(trimmedLine);
                    const fileNameOnly = path.parse(trimmedLine).name;
                    tracks.push({
                        path: trimmedLine,
                        normalizedFileName: this.normalizeFileName(fileNameOnly) // fileNameOnly'yi normalize et
                    });
                }
            }
        } catch (error) {
            this.logger.error(`M3U dosya okuma hatası: ${filePath}`, { error: error.message });
        }
        
        return tracks;
    }

    /**
     * Dosya adını normalize et
     * @param {string} fileName - Dosya adı
     * @returns {string} Normalize edilmiş ad
     */
    normalizeFileName(fileName) {
        const { normalizeFileName } = require('../../shared/utils');
        return normalizeFileName(fileName);
    }

    /**
     * Track'leri veritabanına ekle
     * @param {Array} tracks - Track listesi
     * @param {string} sourceFile - Kaynak dosya yolu
     */
    insertTracks(tracks, sourceFile) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO tracks (path, fileName, fileNameOnly, normalizedFileName, source, source_file, is_matched, created_at)
                VALUES (?, ?, ?, ?, 'history', ?, 0, ?)
            `);

            for (const track of tracks) {
                // fileName ve fileNameOnly oluştur
                const fileName = path.basename(track.path);
                const fileNameOnly = path.parse(track.path).name;
                stmt.run(track.path, fileName, fileNameOnly, track.normalizedFileName, sourceFile, new Date().toISOString());
            }
        } catch (error) {
            this.logger.error(`Track ekleme hatası: ${error.message}`, { error: error.message });
        }
    }

    /**
     * Dosyanın daha önce işlenip işlenmediğini kontrol et
     * @param {string} filePath - Dosya yolu
     * @returns {boolean}
     */
    isFileProcessed(filePath) {
        try {
            const stmt = this.db.prepare(`
                SELECT COUNT(*) as count FROM tracks 
                WHERE source = 'history' AND source_file = ?
            `);
            const result = stmt.get(filePath);
            return result.count > 0;
        } catch (error) {
            this.logger.error(`Dosya işlenme kontrolü hatası: ${error.message}`, { filePath });
            return false;
        }
    }

    /**
     * Otomatik track eşleştirme
     * @returns {Object} Eşleştirme sonuçları
     */
    async performAutoMatch() {
        try {
            this.logger.info('Otomatik track eşleştirme başlatılıyor...');

            // 1. Aşama: Tam yol eşleşmesi (path = path)
            const exactMatches = this.performExactPathMatch();
            this.logger.info(`✅ 1. Aşama: ${exactMatches} track tam yol eşleşmesi ile eşleştirildi`);

            // 2. Aşama: Dosya adı + uzantı eşleşmesi (fileName = fileName)
            const filenameMatches = this.performFilenameMatch();
            this.logger.info(`✅ 2. Aşama: ${filenameMatches} track dosya adı + uzantı eşleşmesi ile eşleştirildi`);

            // 3. Aşama: Dosya adı - uzantı eşleşmesi (fileNameOnly = fileNameOnly)
            const filenameOnlyMatches = this.performFilenameOnlyMatch();
            this.logger.info(`✅ 3. Aşama: ${filenameOnlyMatches} track dosya adı - uzantı eşleşmesi ile eşleştirildi`);

            // İstatistikler
            const stats = this.getMatchStats();

            const result = {
                success: true,
                data: {
                    exactMatches,
                    filenameMatches,
                    filenameOnlyMatches,
                    totalMatches: exactMatches + filenameMatches + filenameOnlyMatches,
                    stats
                },
                message: 'Otomatik eşleştirme başarıyla tamamlandı (3 aşama)'
            };

            this.logger.info('Auto-match result:', result);
            return result;

        } catch (error) {
            this.logger.error('Otomatik eşleştirme hatası:', error);
            return {
                success: false,
                message: 'Otomatik eşleştirme hatası',
                error: error.message
            };
        }
    }

    /**
     * Tam yol eşleşmesi yap
     * @returns {number} Eşleşen track sayısı
     */
    performExactPathMatch() {
        const updateStmt = this.db.prepare(`
            UPDATE tracks 
            SET is_matched = 1, 
                matched_music_file_id = (
                    SELECT mf.id 
                    FROM music_files mf 
                    WHERE mf.path = tracks.path
                ),
                updated_at = CURRENT_TIMESTAMP
            WHERE tracks.path IN (
                SELECT mf.path 
                FROM music_files mf 
                WHERE mf.path = tracks.path
            ) AND tracks.is_matched = 0
        `);
        const result = updateStmt.run();
        return result.changes;
    }

    /**
     * Filename-only eşleşmesi yap
     * @returns {number} Eşleşen track sayısı
     */
    performFilenameMatch() {
        const updateStmt = this.db.prepare(`
            UPDATE tracks 
            SET is_matched = 1, 
                matched_music_file_id = (
                    SELECT mf.id 
                    FROM music_files mf 
                    WHERE mf.fileName = tracks.fileName
                    LIMIT 1
                ),
                updated_at = CURRENT_TIMESTAMP
            WHERE tracks.is_matched = 0 
            AND tracks.fileName IN (
                SELECT mf.fileName 
                FROM music_files mf 
                WHERE mf.fileName = tracks.fileName
            )
        `);
        const result = updateStmt.run();
        return result.changes;
    }

    /**
     * Dosya adı - uzantı eşleşmesi yap (fileNameOnly = fileNameOnly)
     * @returns {number} Eşleşen track sayısı
     */
    performFilenameOnlyMatch() {
        const updateStmt = this.db.prepare(`
            UPDATE tracks 
            SET is_matched = 1, 
                matched_music_file_id = (
                    SELECT mf.id 
                    FROM music_files mf 
                    WHERE mf.fileNameOnly = tracks.fileNameOnly
                    LIMIT 1
                ),
                updated_at = CURRENT_TIMESTAMP
            WHERE tracks.is_matched = 0 
            AND tracks.fileNameOnly IN (
                SELECT mf.fileNameOnly 
                FROM music_files mf 
                WHERE mf.fileNameOnly = tracks.fileNameOnly
            )
        `);
        const result = updateStmt.run();
        return result.changes;
    }

    /**
     * Eşleştirme istatistikleri
     * @returns {Object} İstatistikler
     */
    getMatchStats() {
        const totalTracks = this.db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;
        const matchedTracks = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE is_matched = 1').get().count;
        const unmatchedTracks = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE is_matched = 0').get().count;
        const totalMusicFiles = this.db.prepare('SELECT COUNT(*) as count FROM music_files').get().count;

        return {
            totalTracks,
            matchedTracks,
            unmatchedTracks,
            totalMusicFiles,
            matchRate: totalTracks > 0 ? ((matchedTracks / totalTracks) * 100).toFixed(2) : 0
        };
    }

    /**
     * Test edilebilir kelime çıkartmalı arama
     * @param {string} searchQuery - Aranacak kelime
     * @param {number} threshold - Minimum benzerlik oranı (0.0-1.0)
     * @param {number} limit - Maksimum sonuç sayısı
     * @returns {Object} Arama sonucu
     */
    async performTestWordSimilaritySearch(searchQuery, threshold = 0.3, limit = 50) {
        try {
            this.logger.info(`Test kelime çıkartmalı arama başlatılıyor: "${searchQuery}" (threshold: ${threshold}, limit: ${limit})`);

            // Shared utils'den WordSimilaritySearch sınıfını kullan
            const wordSimilaritySearch = new WordSimilaritySearch(this.db);
            const result = await wordSimilaritySearch.performTestWordSimilaritySearch(searchQuery);

            return {
                success: true,
                data: result
            };

        } catch (error) {
            this.logger.error('Test kelime çıkartmalı arama hatası:', error);
            return {
                success: false,
                message: 'Test kelime çıkartmalı arama hatası',
                error: error.message
            };
        }
    }


    /**
     * History istatistikleri
     * @returns {Object} İstatistikler
     */
    getStats() {
        try {
            const totalTracks = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE source = ?').get('history').count;
            const matchedTracks = this.db.prepare('SELECT COUNT(*) as count FROM tracks WHERE source = ? AND is_matched = 1').get('history').count;
            const unmatchedTracks = totalTracks - matchedTracks;

            return {
                success: true,
                data: {
                    totalTracks,
                    matchedTracks,
                    unmatchedTracks,
                    matchRate: totalTracks > 0 ? (matchedTracks / totalTracks * 100).toFixed(2) : 0
                }
            };
        } catch (error) {
            this.logger.error(`History istatistik hatası: ${error.message}`, { error: error.message });
            return {
                success: false,
                message: 'History istatistik hatası',
                error: error.message
            };
        }
    }
}

module.exports = new HistoryService();