'use strict';

const { getOptimizedDatabase } = require('./optimized_database_manager');
const { WordSimilaritySearch } = require('./nodejs-api/shared/utils');

/**
 * OPTİMİZE EDİLMİŞ M3U PATH FIXER
 * Performanslı algoritma ile eksik yolları düzeltir
 */
class M3UPathFixerOptimized {
    constructor() {
        this.db = getOptimizedDatabase();
        this.wordSimilaritySearch = new WordSimilaritySearch(this.db.db);
        this.stats = {
            total: 0,
            fixed: 0,
            failed: 0,
            skipped: 0,
            startTime: null,
            endTime: null
        };
    }

    /**
     * Ana fix işlemi
     */
    async fixMissingPaths(options = {}) {
        const {
            batchSize = 100,
            threshold = 0.7,
            maxRetries = 3,
            dryRun = false
        } = options;

        console.log('🚀 M3U Path Fix işlemi başlatılıyor...');
        this.stats.startTime = new Date();

        try {
            // 1. Invalid path'li kayıtları getir
            const invalidPathTracks = this.db.getM3UInvalidPathTracks(1000, 0);
            this.stats.total = invalidPathTracks.length;

            console.log(`📊 Toplam ${this.stats.total} invalid path'li kayıt bulundu`);

            if (this.stats.total === 0) {
                console.log('✅ Düzeltilecek kayıt bulunamadı');
                return this.getStats();
            }

            // 2. Batch'ler halinde işle
            const batches = this.createBatches(invalidPathTracks, batchSize);
            const results = [];

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                console.log(`📦 Batch ${i + 1}/${batches.length} işleniyor... (${batch.length} kayıt)`);

                const batchResults = await this.processBatch(batch, {
                    threshold,
                    maxRetries,
                    dryRun
                });

                results.push(...batchResults);
                this.updateStats(batchResults);

                // Progress göster
                const progress = ((i + 1) / batches.length * 100).toFixed(1);
                console.log(`📈 İlerleme: ${progress}% (${this.stats.fixed} düzeltildi, ${this.stats.failed} başarısız)`);
            }

            this.stats.endTime = new Date();
            console.log('✅ M3U Path Fix işlemi tamamlandı');

            return {
                success: true,
                stats: this.getStats(),
                results: results.slice(0, 100) // İlk 100 sonucu döndür
            };

        } catch (error) {
            console.error('❌ M3U Path Fix hatası:', error);
            return {
                success: false,
                error: error.message,
                stats: this.getStats()
            };
        }
    }

    /**
     * Batch oluştur
     */
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Batch işle
     */
    async processBatch(batch, options) {
        const { threshold, maxRetries, dryRun } = options;
        const results = [];

        for (const track of batch) {
            try {
                const result = await this.fixSingleTrack(track, {
                    threshold,
                    maxRetries,
                    dryRun
                });
                results.push(result);
            } catch (error) {
                results.push({
                    trackId: track.track_id,
                    success: false,
                    error: error.message,
                    oldPath: track.track_path,
                    newPath: null
                });
            }
        }

        return results;
    }

    /**
     * Tek track'i düzelt
     */
    async fixSingleTrack(track, options) {
        const { threshold, maxRetries, dryRun } = options;
        
        // 1. Dosya adı ile arama yap
        const searchResult = await this.wordSimilaritySearch.performTestWordSimilaritySearch(track.track_fileName);
        
        if (!searchResult.found || !searchResult.bestMatch) {
            return {
                trackId: track.track_id,
                success: false,
                reason: 'no_match_found',
                oldPath: track.track_path,
                newPath: null,
                score: 0
            };
        }

        // 2. Threshold kontrolü
        if (searchResult.bestScore < threshold) {
            return {
                trackId: track.track_id,
                success: false,
                reason: 'low_confidence',
                oldPath: track.track_path,
                newPath: searchResult.bestMatch.path,
                score: searchResult.bestScore
            };
        }

        // 3. Dry run kontrolü
        if (dryRun) {
            return {
                trackId: track.track_id,
                success: true,
                reason: 'dry_run',
                oldPath: track.track_path,
                newPath: searchResult.bestMatch.path,
                score: searchResult.bestScore,
                dryRun: true
            };
        }

        // 4. Yolu güncelle
        try {
            this.db.updateTrackPath(track.track_id, searchResult.bestMatch.path);
            
            return {
                trackId: track.track_id,
                success: true,
                reason: 'fixed',
                oldPath: track.track_path,
                newPath: searchResult.bestMatch.path,
                score: searchResult.bestScore,
                musicFileId: searchResult.bestMatch.id
            };
        } catch (error) {
            return {
                trackId: track.track_id,
                success: false,
                reason: 'update_failed',
                oldPath: track.track_path,
                newPath: searchResult.bestMatch.path,
                score: searchResult.bestScore,
                error: error.message
            };
        }
    }

    /**
     * İstatistikleri güncelle
     */
    updateStats(results) {
        for (const result of results) {
            if (result.success) {
                if (result.dryRun) {
                    this.stats.skipped++;
                } else {
                    this.stats.fixed++;
                }
            } else {
                this.stats.failed++;
            }
        }
    }

    /**
     * İstatistikleri getir
     */
    getStats() {
        const duration = this.stats.endTime ? 
            this.stats.endTime - this.stats.startTime : 
            Date.now() - this.stats.startTime;

        return {
            ...this.stats,
            duration: duration,
            durationFormatted: this.formatDuration(duration),
            successRate: this.stats.total > 0 ? 
                ((this.stats.fixed / this.stats.total) * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Süreyi formatla
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}s ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Test modu - sadece analiz yap
     */
    async analyzeMissingPaths(limit = 100) {
        console.log('🔍 M3U Path analizi başlatılıyor...');
        
        const invalidPathTracks = this.db.getM3UInvalidPathTracks(limit, 0);
        const analysis = [];

        for (const track of invalidPathTracks) {
            const searchResult = await this.wordSimilaritySearch.performTestWordSimilaritySearch(track.track_fileName);
            
            analysis.push({
                trackId: track.track_id,
                fileName: track.track_fileName,
                sourceFile: track.track_source_file,
                found: searchResult.found,
                bestScore: searchResult.bestScore,
                bestMatch: searchResult.bestMatch ? {
                    id: searchResult.bestMatch.id,
                    fileName: searchResult.bestMatch.fileName,
                    path: searchResult.bestMatch.path
                } : null
            });
        }

        return {
            total: invalidPathTracks.length,
            analysis: analysis,
            summary: {
                found: analysis.filter(a => a.found).length,
                notFound: analysis.filter(a => !a.found).length,
                avgScore: analysis.filter(a => a.found).reduce((sum, a) => sum + a.bestScore, 0) / 
                         analysis.filter(a => a.found).length || 0
            }
        };
    }

    /**
     * Belirli bir M3U dosyasındaki kayıtları düzelt
     */
    async fixM3UFile(m3uFilePath, options = {}) {
        console.log(`🎵 M3U dosyası düzeltiliyor: ${m3uFilePath}`);
        
        const tracks = this.db.db.prepare(`
            SELECT * FROM v_unmatched_tracks_optimized 
            WHERE source_file = ? AND unmatched_reason = 'invalid_path'
        `).all(m3uFilePath);

        if (tracks.length === 0) {
            return {
                success: true,
                message: 'Bu M3U dosyasında düzeltilecek kayıt bulunamadı',
                stats: { total: 0, fixed: 0, failed: 0 }
            };
        }

        const results = await this.processBatch(tracks, options);
        const stats = {
            total: tracks.length,
            fixed: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        };

        return {
            success: true,
            m3uFile: m3uFilePath,
            stats: stats,
            results: results
        };
    }
}

module.exports = M3UPathFixerOptimized;



