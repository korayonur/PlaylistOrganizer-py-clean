const fs = require('fs').promises;
const path = require('path');
const FuzzySearchService = require('./FuzzySearchService');
const CacheService = require('./CacheService');

/**
 * Similarity Service - Fix Önerileri Sistemi
 * Eşleşmemiş track'lar için music_files'da eş bulur
 * FuzzySearchService kullanır
 */
class SimilarityService {
    constructor(db, wordIndexService) {
        this.db = db;
        this.fuzzySearchService = new FuzzySearchService(db, wordIndexService);
        this.cacheService = new CacheService();
    }


    /**
     * Eşleşmemiş track'lerin toplam sayısını getir
     */
    getUnmatchedTracksCount() {
        return this.db.prepare('SELECT COUNT(*) as total FROM v_unmatched_tracks_indexed').get().total;
    }

    /**
     * Eşleşmemiş track'leri getir - View-based sayfalama
     */
    getUnmatchedTracksPaginated(limit = null, offset = 0) {
        const startRow = parseInt(offset);
        const endRow = limit ? startRow + parseInt(limit) : null;
        
        const query = limit 
            ? `SELECT track_path as path, track_normalized as normalizedFileName, 
                      track_fileName as fileName, track_source, track_source_file, 
                      playlists, playlist_count
               FROM v_unmatched_tracks_indexed
               WHERE row_num > ? AND row_num <= ?`
            : `SELECT track_path as path, track_normalized as normalizedFileName, 
                      track_fileName as fileName, track_source, track_source_file, 
                      playlists, playlist_count
               FROM v_unmatched_tracks_indexed
               WHERE row_num > ?`;
        
        const params = limit ? [startRow, endRow] : [startRow];
        return this.db.prepare(query).all(...params);
    }


    /**
     * Fix önerileri oluştur - Cache sistemi ile
     */
    async generateSuggestions(filters = {}) {
        const {
            type,
            min_similarity,
            limit = null, // Limit yok - tüm sonuçlar
            offset = 0
        } = filters;

        // 1. CACHE KONTROLÜ
        const cacheKey = 'fix-suggestions';
        const cachedData = await this.cacheService.get(cacheKey);
        
        if (cachedData) {
            console.log('⚡ Cache\'den yüklendi!');
            return this.applyFilters(cachedData, filters);
        }

        // 2. CACHE YOK - YENİ VERİ OLUŞTUR
        console.log('🔄 Cache yok, yeni veri oluşturuluyor...');
        
        // 3. ÖNCE TOPLAM KAYIT SAYISINI ÇEK
        const totalCount = this.getUnmatchedTracksCount();
        console.log(`📊 Toplam eşleşmemiş track: ${totalCount}`);
        
        // 2. SAYFALAMA HESAPLA (1-100, 101-200, 201-300...)
        if (limit) {
            const pageStart = offset + 1; // 1-based
            const pageEnd = offset + limit;
            console.log(`📄 Sayfa: ${pageStart}-${pageEnd} (toplam ${totalCount})`);
        } else {
            console.log(`📄 Tüm sonuçlar: ${offset + 1}-${totalCount} (toplam ${totalCount})`);
        }
        
        // 3. ROW_NUMBER İLE SADECE O SAYFADAKİ KAYITLARI ÇEK
        const unmatchedTracks = this.getUnmatchedTracksPaginated(limit, offset);
        
        console.log(`🔧 ${unmatchedTracks.length} eşleşmemiş track için öneri oluşturuluyor...`);
        
        // PERFORMANS OPTİMİZASYONU: Batch arama kullan - sadece en iyi sonuç
        const batchResults = await this.fuzzySearchService.batchSearch(unmatchedTracks, {
            resultsPerTrack: 1, // Sadece en iyi sonuç
            minScore: 150 // Artırıldı: 100 → 150 (daha kaliteli öneriler)
        });
        
        const allSuggestions = [];
        for (const result of batchResults) {
            const track = result.track;
            const bestMatch = result.matches[0];
            
            // match_type hesapla similarity_score'a göre
            let match_type;
            if (bestMatch.similarity_score >= 0.9) {
                match_type = 'exact';
            } else if (bestMatch.similarity_score >= 0.7) {
                match_type = 'high';
            } else if (bestMatch.similarity_score >= 0.5) {
                match_type = 'medium';
            } else {
                match_type = 'low';
            }

            allSuggestions.push({
                track_path: track.path,
                track_fileName: track.fileName,
                track_normalized: track.normalizedFileName,
                track_source: track.track_source || 'unknown',
                track_source_file: track.track_source_file || '',
                playlists: track.playlists || '',
                playlist_count: track.playlist_count || 0,
                music_file_path: bestMatch.music_file_path,
                music_file_name: bestMatch.music_file_name,
                music_file_normalized: bestMatch.music_file_normalized,
                similarity_score: bestMatch.similarity_score,
                match_type: match_type,
                matched_words: bestMatch.matched_words || [],
                score: bestMatch.score || bestMatch.similarity_score * 400, // Detaylı puan
                source: 'search_service'
            });
        }
        
        // PERFORMANS OPTİMİZASYONU: Önce sırala, sonra filtrele
        // Score'a göre yüksekten düşüğe sırala
        allSuggestions.sort((a, b) => b.score - a.score);
        
        // Filtrele
        let filtered = allSuggestions;
        if (type) {
            filtered = filtered.filter(s => s.match_type === type);
        }
        if (min_similarity) {
            filtered = filtered.filter(s => s.similarity_score >= min_similarity);
        }
        
        // Artık pagination gerekmiyor - zaten sadece o sayfadaki kayıtlar geldi
        const finalSuggestions = filtered;
        
        // Stats hesapla
        const stats = {
            exact: allSuggestions.filter(s => s.match_type === 'exact').length,
            high: allSuggestions.filter(s => s.match_type === 'high').length,
            medium: allSuggestions.filter(s => s.match_type === 'medium').length,
            low: allSuggestions.filter(s => s.match_type === 'low').length
        };

        console.log(`✅ ${allSuggestions.length} öneri oluşturuldu (exact: ${stats.exact}, high: ${stats.high}, medium: ${stats.medium}, low: ${stats.low})`);

        // 9. SIRALAMA UYGULA
        const sortedSuggestions = this.sortSuggestions(allSuggestions);
        
        // 10. CACHE'E KAYDET (SIRALI)
        const fullData = {
            suggestions: sortedSuggestions,
            total: totalCount,
            count: sortedSuggestions.length,
            hasMore: false, // Tüm veri cache'de
            stats,
            filters: {}
        };
        
        await this.cacheService.set(cacheKey, fullData);
        
        // 11. FİLTRE UYGULA VE DÖNDÜR
        return this.applyFilters(fullData, filters);
    }

    /**
     * Önerileri sırala: Match type + Score
     */
    sortSuggestions(suggestions) {
        const typeOrder = { exact: 1, high: 2, medium: 3, low: 4 };
        return suggestions.sort((a, b) => {
            // Önce match_type'a göre sırala
            if (typeOrder[a.match_type] !== typeOrder[b.match_type]) {
                return typeOrder[a.match_type] - typeOrder[b.match_type];
            }
            // Aynı type'da score'a göre sırala (yüksekten düşüğe)
            return b.score - a.score;
        });
    }

    /**
     * Cache verisine filtre uygula
     */
    applyFilters(cachedData, filters) {
        const { type, min_similarity, limit = null, offset = 0 } = filters;
        
        let filteredSuggestions = [...cachedData.suggestions];
        
        // TİP FİLTRESİ
        if (type) {
            filteredSuggestions = filteredSuggestions.filter(s => s.match_type === type);
        }
        
        // BENZERLİK FİLTRESİ
        if (min_similarity) {
            filteredSuggestions = filteredSuggestions.filter(s => s.similarity_score >= min_similarity);
        }
        
        // LİMİT VE OFFSET
        if (limit) {
            filteredSuggestions = filteredSuggestions.slice(offset, offset + limit);
        } else if (offset > 0) {
            filteredSuggestions = filteredSuggestions.slice(offset);
        }
        
        return {
            suggestions: filteredSuggestions,
            total: cachedData.total,
            count: filteredSuggestions.length,
            hasMore: limit ? (offset + limit < cachedData.total) : false,
            stats: cachedData.stats,
            filters,
            cached: true,
            cached_at: cachedData.cached_at
        };
    }

    /**
     * İstatistikler
     */
    getStatistics() {
        const unmatchedCount = this.db.prepare(`
            SELECT COUNT(DISTINCT track_path) as count FROM v_unmatched_tracks
        `).get().count;
        
        const totalTracks = this.db.prepare(`
            SELECT COUNT(DISTINCT path) as count FROM tracks
        `).get().count;
        
        const totalPlaylists = this.db.prepare(`
            SELECT COUNT(*) as count FROM playlists
        `).get().count;
        
        const playlistTypes = this.db.prepare(`
            SELECT type, COUNT(*) as count 
            FROM playlists 
            GROUP BY type
        `).all();
        
        const topPlaylists = this.db.prepare(`
            SELECT name, track_count 
            FROM playlists 
            WHERE track_count > 0
            ORDER BY track_count DESC 
            LIMIT 5
        `).all();
        
        return {
            total_tracks: totalTracks,
            unmatched_tracks: unmatchedCount,
            matched_tracks: totalTracks - unmatchedCount,
            total_playlists: totalPlaylists,
            playlist_types: playlistTypes,
            top_playlists: topPlaylists
        };
    }

    /**
     * Fix önerilerini uygula
     */
    async applySuggestions(suggestions) {
        const results = {
            applied: 0,
            failed: 0,
            tracks_updated: 0,
            m3u_files_updated: 0,
            vdjfolder_files_updated: 0,
            errors: []
        };
        
        console.log(`\n🔧 ${suggestions.length} fix önerisi uygulanıyor...`);
        
        for (const suggestion of suggestions) {
            try {
                const result = await this.applyFixDirectly(
                    suggestion.track_path,
                    suggestion.music_path,
                    suggestion.source,
                    suggestion.source_file
                );
                
                if (result.success) {
                    results.applied++;
                    results.tracks_updated++;
                    
                    if (result.fileUpdated) {
                        if (suggestion.source === 'm3u') {
                            results.m3u_files_updated++;
                        } else if (suggestion.source === 'vdjfolder') {
                            results.vdjfolder_files_updated++;
                        }
                    }
                } else {
                    results.failed++;
                    results.errors.push({
                        track_path: suggestion.track_path,
                        error: result.error
                    });
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    track_path: suggestion.track_path,
                    error: error.message
                });
                console.error(`❌ Fix hatası: ${suggestion.track_path} - ${error.message}`);
            }
        }
        
        console.log(`\n📊 Sonuç: ${results.applied} başarılı, ${results.failed} başarısız`);
        
        return results;
    }

    /**
     * Track path'ini güncelle ve source file'ı düzelt
     */
    async applyFixDirectly(trackPath, musicPath, source, sourceFile) {
        // 1. Track path'ini güncelle
        const trackUpdated = this.updateTrackPath(trackPath, musicPath, source, sourceFile);
        
        if (!trackUpdated) {
            return { success: false, error: 'Track güncellenemedi' };
        }
        
        // 2. Source file'ı güncelle
        const fileUpdated = await this.updateSourceFile({
            track_path: trackPath,
            music_file_path: musicPath,
            track_source_file: sourceFile
        });
        
        return {
            success: true,
            trackUpdated,
            fileUpdated
        };
    }

    /**
     * Track path'ini güncelle
     */
    updateTrackPath(oldPath, newPath, source, sourceFile) {
        const result = this.db.prepare(`
            UPDATE tracks 
            SET path = ?, updated_at = CURRENT_TIMESTAMP
            WHERE path = ? AND source = ? AND source_file = ?
        `).run(newPath, oldPath, source, sourceFile);

        if (result.changes === 0) {
            console.warn(`⚠️ Track güncellenemedi: ${oldPath} (source: ${source}, file: ${sourceFile})`);
            return false;
        }

        console.log(`✅ Track path güncellendi: ${oldPath} → ${newPath}`);
        return true;
    }

    /**
     * M3U veya VDJFOLDER dosyasında path güncelle
     */
    async updateSourceFile(suggestion) {
        const sourceFile = suggestion.track_source_file;
        const oldPath = suggestion.track_path;
        const newPath = suggestion.music_file_path;
        const ext = path.extname(sourceFile).toLowerCase();

        try {
            if (ext === '.m3u' || ext === '.m3u8') {
                return await this.updateM3UFile(sourceFile, oldPath, newPath);
            } else if (ext === '.vdjfolder') {
                return await this.updateVDJFolder(sourceFile, oldPath, newPath);
            }
            return false;
        } catch (error) {
            console.error(`❌ Source file güncellenemedi: ${sourceFile}`, error.message);
            return false;
        }
    }

    /**
     * M3U dosyasını güncelle
     */
    async updateM3UFile(filePath, oldPath, newPath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n');
            let updated = false;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() === oldPath || lines[i].trim() === oldPath.trim()) {
                    lines[i] = newPath;
                    updated = true;
                }
            }

            if (updated) {
                await fs.writeFile(filePath, lines.join('\n'), 'utf8');
                console.log(`✅ M3U file güncellendi: ${filePath}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`❌ M3U file güncellenemedi: ${filePath}`, error.message);
            return false;
        }
    }

    /**
     * VDJFolder dosyasını güncelle
     */
    async updateVDJFolder(filePath, oldPath, newPath) {
        try {
            let content = await fs.readFile(filePath, 'utf8');
            
            // XML formatında path güncelle
            const regex = new RegExp(`<FilePath>${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</FilePath>`, 'g');
            const newContent = content.replace(regex, `<FilePath>${newPath}</FilePath>`);
            
            if (newContent !== content) {
                await fs.writeFile(filePath, newContent, 'utf8');
                console.log(`✅ VDJFolder güncellendi: ${filePath}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`❌ VDJFolder güncellenemedi: ${filePath}`, error.message);
            return false;
        }
    }
}

module.exports = SimilarityService;

