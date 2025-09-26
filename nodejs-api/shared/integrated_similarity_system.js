#!/usr/bin/env node

const { getDatabase } = require('./database');
const WordSimilaritySearch = require('./utils').WordSimilaritySearch;

/**
 * Entegre Edilmiş Benzerlik Fix Sistemi
 * Ana sisteme entegre edilmiş, API endpoint'leri ile uyumlu
 */
class IntegratedSimilaritySystem {
    constructor() {
        this.dbManager = getDatabase();
        this.db = this.dbManager.getDatabase();
        this.wordSimilarity = new WordSimilaritySearch(this.db);
        this.setupTables();
    }

    setupTables() {
        // Tablolar ana database manager'da oluşturuluyor
        // Burada sadece gerekli kontroller yapılıyor
        console.log('✅ Similarity system tabloları kontrol ediliyor...');
    }

    /**
     * Eşleşmemiş track'ları bul
     */
    getUnmatchedTracks(limit = 100) {
        return this.db.prepare(`
            SELECT id, normalizedFileName, fileName, path, source, source_file
            FROM tracks 
            WHERE path NOT IN (
                SELECT DISTINCT mf.path FROM music_files mf 
                WHERE mf.path IS NOT NULL AND mf.path != '' AND mf.path LIKE '/%'
            )
            AND NOT EXISTS (
                SELECT 1 FROM music_files mf2 
                WHERE mf2.fileName = tracks.fileName 
                  AND mf2.fileName IS NOT NULL 
                  AND mf2.fileName != ''
            )
            AND NOT EXISTS (
                SELECT 1 FROM music_files mf3 
                WHERE mf3.fileNameOnly = tracks.fileNameOnly 
                  AND mf3.fileNameOnly IS NOT NULL 
                  AND mf3.fileNameOnly != ''
            )
            AND NOT EXISTS (
                SELECT 1 FROM music_files mf4 
                WHERE mf4.normalizedFileName = tracks.normalizedFileName 
                  AND mf4.normalizedFileName IS NOT NULL 
                  AND mf4.normalizedFileName != ''
            )
            AND normalizedFileName IS NOT NULL 
            AND normalizedFileName != ''
            LIMIT ?
        `).all(limit);
    }

    /**
     * Benzerlik hesapla
     */
    calculateSimilarity(trackName, musicFileName) {
        const result = this.wordSimilarity.calculateWordSimilarityDetailed(trackName, musicFileName);
        return {
            similarity: result.score,
            wordSimilarity: result.score,
            steps: result.wordMatches
        };
    }

    /**
     * Fix türünü belirle
     */
    determineFixType(similarity, wordSimilarity) {
        if (similarity >= 0.9) return 'exact';
        if (similarity >= 0.7) return 'high';
        if (similarity >= 0.5) return 'medium';
        return 'low';
    }

    /**
     * Güven seviyesini belirle
     */
    determineConfidence(similarity, wordSimilarity) {
        if (similarity >= 0.8 && wordSimilarity >= 0.8) return 'high';
        if (similarity >= 0.6 && wordSimilarity >= 0.6) return 'medium';
        return 'low';
    }

    /**
     * Track için en iyi eşleşmeleri bul
     */
    findBestMatchesForTrack(track, maxSuggestions = 3) {
        const musicFiles = this.db.prepare(`
            SELECT id, normalizedFileName, fileName, path
            FROM music_files 
            WHERE normalizedFileName IS NOT NULL 
            AND normalizedFileName != ''
        `).all();

        const matches = [];
        
        for (const musicFile of musicFiles) {
            const result = this.calculateSimilarity(track.normalizedFileName, musicFile.normalizedFileName);
            
            if (result.similarity >= 0.3) {
                matches.push({
                    track: track,
                    musicFile: musicFile,
                    similarity: result.similarity,
                    wordSimilarity: result.wordSimilarity,
                    steps: result.steps
                });
            }
        }

        // En iyi eşleşmeleri seç
        matches.sort((a, b) => b.similarity - a.similarity);
        return matches.slice(0, maxSuggestions);
    }

    /**
     * Fix önerilerini oluştur
     */
    async generateFixSuggestions(limit = 100) {
        console.log(`🔍 ${limit} track için fix önerileri oluşturuluyor...`);
        
        const unmatchedTracks = this.getUnmatchedTracks(limit);
        const suggestions = [];

        for (const track of unmatchedTracks) {
            const bestMatches = this.findBestMatchesForTrack(track);
            
            for (const match of bestMatches) {
                suggestions.push({
                    track_id: track.id,
                    track_normalized: track.normalizedFileName,
                    music_file_id: match.musicFile.id,
                    music_file_normalized: match.musicFile.normalizedFileName,
                    similarity_score: match.similarity,
                    word_similarity_score: match.wordSimilarity,
                    fix_type: this.determineFixType(match.similarity, match.wordSimilarity),
                    confidence_level: this.determineConfidence(match.similarity, match.wordSimilarity)
                });
            }
        }

        return suggestions;
    }

    /**
     * Önerileri kaydet
     */
    async saveSuggestions(suggestions) {
        this.db.exec('DELETE FROM similarity_fix_suggestions');
        
        const insert = this.db.prepare(`
            INSERT INTO similarity_fix_suggestions (
                track_id, track_normalized, music_file_id, music_file_normalized,
                similarity_score, word_similarity_score, fix_type, confidence_level
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = this.db.transaction((suggestions) => {
            for (const suggestion of suggestions) {
                insert.run(
                    suggestion.track_id,
                    suggestion.track_normalized,
                    suggestion.music_file_id,
                    suggestion.music_file_normalized,
                    suggestion.similarity_score,
                    suggestion.word_similarity_score,
                    suggestion.fix_type,
                    suggestion.confidence_level
                );
            }
        });

        insertMany(suggestions);
        console.log(`✅ ${suggestions.length} öneri kaydedildi`);
    }

    /**
     * Fix önerilerini getir
     */
    getFixSuggestions(filters = {}) {
        let query = `
            SELECT 
                sfs.*,
                t.path as track_path,
                t.fileName as track_fileName,
                t.source as track_source,
                t.source_file as track_source_file,
                mf.path as music_file_path,
                mf.fileName as music_file_name,
                mf.extension as music_file_extension,
                mf.size as music_file_size
            FROM similarity_fix_suggestions sfs
            JOIN tracks t ON sfs.track_id = t.path
            JOIN music_files mf ON sfs.music_file_id = mf.path
            WHERE 1=1
        `;
        
        const params = [];
        
        if (filters.fix_type) {
            query += ' AND sfs.fix_type = ?';
            params.push(filters.fix_type);
        }
        
        if (filters.confidence_level) {
            query += ' AND sfs.confidence_level = ?';
            params.push(filters.confidence_level);
        }
        
        if (filters.min_similarity) {
            query += ' AND sfs.similarity_score >= ?';
            params.push(filters.min_similarity);
        }
        
        query += ' ORDER BY sfs.similarity_score DESC';
        
        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }
        
        return this.db.prepare(query).all(...params);
    }

    /**
     * Fix önerisi uygula
     */
    async applyFix(suggestionId) {
        const suggestion = this.db.prepare(`
            SELECT * FROM similarity_fix_suggestions WHERE id = ?
        `).get(suggestionId);
        
        if (!suggestion) {
            throw new Error('Fix önerisi bulunamadı');
        }
        
        // Track'ın path'ini güncelle
        const musicFile = this.db.prepare(`
            SELECT path FROM music_files WHERE id = ?
        `).get(suggestion.music_file_id);
        
        if (!musicFile) {
            throw new Error('Music file bulunamadı');
        }
        
        // Track'ı güncelle
        this.db.prepare(`
            UPDATE tracks 
            SET path = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(musicFile.path, suggestion.track_id);
        
        // Fix önerisini sil
        this.db.prepare(`
            DELETE FROM similarity_fix_suggestions WHERE id = ?
        `).run(suggestionId);
        
        console.log(`✅ Fix uygulandı: Track ${suggestion.track_id} -> ${musicFile.path}`);
    }

    /**
     * İstatistikleri getir
     */
    getStatistics() {
        const stats = this.db.prepare(`
            SELECT 
                fix_type,
                confidence_level,
                COUNT(*) as count,
                AVG(similarity_score) as avg_similarity,
                AVG(word_similarity_score) as avg_word_similarity
            FROM similarity_fix_suggestions 
            GROUP BY fix_type, confidence_level
            ORDER BY fix_type, confidence_level
        `).all();

        const total = this.db.prepare(`
            SELECT COUNT(*) as total FROM similarity_fix_suggestions
        `).get().total;

        return {
            total,
            by_type: stats,
            summary: {
                exact: stats.filter(s => s.fix_type === 'exact').reduce((sum, s) => sum + s.count, 0),
                high: stats.filter(s => s.fix_type === 'high').reduce((sum, s) => sum + s.count, 0),
                medium: stats.filter(s => s.fix_type === 'medium').reduce((sum, s) => sum + s.count, 0),
                low: stats.filter(s => s.fix_type === 'low').reduce((sum, s) => sum + s.count, 0)
            }
        };
    }

    close() {
        this.db.close();
    }
}

module.exports = IntegratedSimilaritySystem;
