#!/usr/bin/env node

const Database = require('better-sqlite3');
const WordSimilaritySearch = require('./nodejs-api/shared/utils').WordSimilaritySearch;

console.log('🚀 Tam Ölçekli Benzerlik Fix Sistemi Başlatılıyor...\n');

class FullSimilarityFixSystem {
    constructor() {
        this.db = new Database('./musicfiles.db');
        this.wordSimilarity = new WordSimilaritySearch(this.db);
        this.setupTables();
    }

    setupTables() {
        console.log('1️⃣ Fix Önerileri Tablosu Hazırlanıyor...');
        
        // Fix önerileri tablosu
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS similarity_fix_suggestions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL,
                track_normalized TEXT NOT NULL,
                music_file_id INTEGER NOT NULL,
                music_file_normalized TEXT NOT NULL,
                similarity_score REAL NOT NULL,
                word_similarity_score REAL NOT NULL,
                fix_type TEXT NOT NULL,
                confidence_level TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (track_id) REFERENCES tracks(id),
                FOREIGN KEY (music_file_id) REFERENCES music_files(id)
            );
        `);

        // İndeksler
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_similarity_track_id ON similarity_fix_suggestions(track_id);
            CREATE INDEX IF NOT EXISTS idx_similarity_score ON similarity_fix_suggestions(similarity_score);
            CREATE INDEX IF NOT EXISTS idx_similarity_fix_type ON similarity_fix_suggestions(fix_type);
        `);

        console.log('✅ Tablo hazır');
    }

    async processTracks(limit = 1000) {
        console.log(`2️⃣ ${limit} Track İşleniyor...`);
        
        const unmatchedTracks = this.db.prepare(`
            SELECT id, normalizedFileName, fileName
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

        console.log(`   ${unmatchedTracks.length} eşleşmemiş track bulundu`);

        const musicFiles = this.db.prepare(`
            SELECT id, normalizedFileName, fileName
            FROM music_files 
            WHERE normalizedFileName IS NOT NULL 
            AND normalizedFileName != ''
        `).all();

        console.log(`   ${musicFiles.length} music file bulundu`);

        return { unmatchedTracks, musicFiles };
    }

    calculateSimilarity(trackName, musicFileName) {
        const result = this.wordSimilarity.calculateWordSimilarityDetailed(trackName, musicFileName);
        return {
            similarity: result.score,
            wordSimilarity: result.score,
            steps: result.wordMatches
        };
    }

    determineFixType(similarity, wordSimilarity) {
        if (similarity >= 0.9) return 'exact';
        if (similarity >= 0.7) return 'high';
        if (similarity >= 0.5) return 'medium';
        return 'low';
    }

    determineConfidence(similarity, wordSimilarity) {
        if (similarity >= 0.8 && wordSimilarity >= 0.8) return 'high';
        if (similarity >= 0.6 && wordSimilarity >= 0.6) return 'medium';
        return 'low';
    }

    async findBestMatches(unmatchedTracks, musicFiles, maxSuggestions = 3) {
        console.log('3️⃣ En İyi Eşleşmeler Aranıyor...');
        
        const suggestions = [];
        let processed = 0;

        for (const track of unmatchedTracks) {
            const trackMatches = [];
            
            // Her music file ile karşılaştır
            for (const musicFile of musicFiles) {
                const result = this.calculateSimilarity(track.normalizedFileName, musicFile.normalizedFileName);
                
                if (result.similarity >= 0.3) {
                    trackMatches.push({
                        track: track,
                        musicFile: musicFile,
                        similarity: result.similarity,
                        wordSimilarity: result.wordSimilarity,
                        steps: result.steps
                    });
                }
            }

            // En iyi eşleşmeleri seç
            trackMatches.sort((a, b) => b.similarity - a.similarity);
            const bestMatches = trackMatches.slice(0, maxSuggestions);

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

            processed++;
            if (processed % 50 === 0) {
                console.log(`   ${processed}/${unmatchedTracks.length} track işlendi`);
            }
        }

        return suggestions;
    }

    async saveSuggestions(suggestions) {
        console.log('4️⃣ Öneriler Veritabanına Kaydediliyor...');
        
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
        console.log(`   ${suggestions.length} öneri kaydedildi`);
    }

    async generateReport() {
        console.log('5️⃣ Rapor Oluşturuluyor...');
        
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

        console.log('\n📊 Fix Önerileri İstatistikleri:');
        console.log('=====================================');
        
        for (const stat of stats) {
            console.log(`${stat.fix_type.toUpperCase()} - ${stat.confidence_level.toUpperCase()}:`);
            console.log(`  Kayıt Sayısı: ${stat.count}`);
            console.log(`  Ortalama Benzerlik: ${stat.avg_similarity.toFixed(3)}`);
            console.log(`  Ortalama Kelime Benzerliği: ${stat.avg_word_similarity.toFixed(3)}`);
            console.log('');
        }

        const bestSuggestions = this.db.prepare(`
            SELECT 
                track_normalized,
                music_file_normalized,
                similarity_score,
                word_similarity_score,
                fix_type,
                confidence_level
            FROM similarity_fix_suggestions 
            WHERE confidence_level = 'high'
            ORDER BY similarity_score DESC
            LIMIT 10
        `).all();

        console.log('🏆 En İyi 10 Öneri:');
        console.log('==================');
        
        bestSuggestions.forEach((suggestion, i) => {
            console.log(`${i+1}. Track: ${suggestion.track_normalized.substring(0, 50)}...`);
            console.log(`   Music: ${suggestion.music_file_normalized.substring(0, 50)}...`);
            console.log(`   Benzerlik: ${suggestion.similarity_score.toFixed(3)}, Kelime: ${suggestion.word_similarity_score.toFixed(3)}`);
            console.log(`   Tip: ${suggestion.fix_type}, Güven: ${suggestion.confidence_level}`);
            console.log('');
        });
    }

    async run(limit = 100) {
        try {
            const { unmatchedTracks, musicFiles } = await this.processTracks(limit);
            const suggestions = await this.findBestMatches(unmatchedTracks, musicFiles);
            await this.saveSuggestions(suggestions);
            await this.generateReport();
            
            console.log('✅ Fix sistemi tamamlandı!');
        } catch (error) {
            console.error('❌ Hata:', error.message);
        } finally {
            this.db.close();
        }
    }
}

// Test çalıştır
const fixSystem = new FullSimilarityFixSystem();
fixSystem.run(100); // 100 track ile test
