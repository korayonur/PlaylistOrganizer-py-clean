#!/usr/bin/env node

const { getDatabaseManager } = require('../../infrastructure/persistence/DatabaseManager');
const { normalizeText } = require('../../shared/utils');

/**
 * Kelime Bazlı Arama Servisi (TEK NOKTA SİSTEM)
 * Tüm benzerlik araması bu servisten yapılır
 */
class WordIndexService {
    constructor(db) {
        this.db = db;
        
        // Prepared statements - performans için
        this.trackInsertStmt = this.db.prepare(`
            INSERT OR IGNORE INTO track_words 
            (track_path, word, word_length, word_position, track_source, track_source_file)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        this.musicInsertStmt = this.db.prepare(`
            INSERT OR IGNORE INTO music_words 
            (music_path, word, word_length, word_position)
            VALUES (?, ?, ?, ?)
        `);
        
        this.trackDeleteStmt = this.db.prepare(`
            DELETE FROM track_words WHERE track_path = ?
        `);
        
        this.musicDeleteStmt = this.db.prepare(`
            DELETE FROM music_words WHERE music_path = ?
        `);
    }
    
    /**
     * Normalize: uzantısız, boşluklu, anlaşılır format
     * Tüm dünya dillerini destekler (Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, vb.)
     * MERKEZİ NORMALİZASYON: utils.js'deki normalizeText fonksiyonunu kullanır
     */
    normalize(text) {
        return normalizeText(text);
    }
    
    /**
     * Kelimeleri filtrele (minimum 1 harf - tek harfli kelimeler de önemli)
     */
    filterWords(words) {
        return words.filter(w => w.length >= 1);
    }
    
    /**
     * Track için kelime indexi oluştur
     * NOT: fileName kullan (boşluklu), normalizedFileName değil!
     */
    kelimeIndexiOlusturTrack(trackPath, fileName, source, sourceFile) {
        // Önce eski kelimeleri sil (varsa)
        this.trackDeleteStmt.run(trackPath);
        
        const normalized = this.normalize(fileName);  // Uzantısız
        const allWords = normalized.split(/\s+/).filter(w => w.length > 0);
        const words = this.filterWords(allWords);  // Minimum 2 harf filtresi
        
        const transaction = this.db.transaction(() => {
            words.forEach((word, index) => {
                this.trackInsertStmt.run(
                    trackPath, 
                    word, 
                    word.length, 
                    index, 
                    source, 
                    sourceFile
                );
            });
        });
        
        transaction();
    }
    
    /**
     * Music file için kelime indexi oluştur
     * NOT: fileName kullan (boşluklu), normalizedFileName değil!
     */
    kelimeIndexiOlusturMusic(musicPath, fileName) {
        // Önce eski kelimeleri sil (varsa)
        this.musicDeleteStmt.run(musicPath);
        
        const normalized = this.normalize(fileName);  // Uzantısız
        const allWords = normalized.split(/\s+/).filter(w => w.length > 0);
        const words = this.filterWords(allWords);  // Minimum 2 harf filtresi
        
        const transaction = this.db.transaction(() => {
            words.forEach((word, index) => {
                this.musicInsertStmt.run(
                    musicPath, 
                    word, 
                    word.length, 
                    index
                );
            });
        });
        
        transaction();
    }
    
    /**
     * ÇİFT YÖNLÜ ARAMA - TEK SQL QUERY
     * Track kelimeleri ile music_words'de ara
     */
    kelimeIleAra(trackPath, limit = 10) {  // Limit: 50 → 10 (daha az gereksiz sonuç)
        // 1. Track'in kelimelerini al
        const trackWords = this.db.prepare(`
            SELECT word, word_length, word_position FROM track_words 
            WHERE track_path = ?
            ORDER BY word_position
        `).all(trackPath);
        
        if (trackWords.length === 0) {
            return [];
        }
        
        const words = trackWords.map(w => w.word);
        
        // 2. Bu kelimeleri music_words'de ara (TEK QUERY!)
        const placeholders = words.map(() => '?').join(',');
        
        const sql = `
            SELECT 
                mw.music_path,
                mf.fileName as music_file_name,
                mf.normalizedFileName,
                GROUP_CONCAT(mw.word || ':' || mw.word_position, ',') as matched_words_positions,
                SUM(CASE 
                    WHEN mw.word_length > 5 THEN 3
                    WHEN mw.word_length >= 3 THEN 2
                    ELSE 1
                END) as base_score,
                COUNT(*) as match_count
            FROM music_words mw
            INNER JOIN music_files mf ON mw.music_path = mf.path
            WHERE mw.word IN (${placeholders})
            GROUP BY mw.music_path
            HAVING match_count >= 2  -- En az 2 kelime eşleşmeli
            ORDER BY base_score DESC, match_count DESC
            LIMIT 50  -- İlk 50'yi al, sonra sıralama bonusu uygula
        `;
        
        const results = this.db.prepare(sql).all(...words);
        
        // 3. Sıralama bonusu hesapla ve final skorla
        const finalResults = results.map(r => {
            const matchedWordsMap = {};
            if (r.matched_words_positions) {
                r.matched_words_positions.split(',').forEach(wp => {
                    const [word, position] = wp.split(':');
                    matchedWordsMap[word] = parseInt(position);
                });
            }
            
            // Music dosyasının toplam kelime sayısını al
            const musicTotalWords = this.db.prepare(`
                SELECT COUNT(*) as count FROM music_words WHERE music_path = ?
            `).get(r.music_path).count;
            
            // Kelime sırası bonusu: Ardışık kelimeler için +1 puan
            let sequenceBonus = 0;
            for (let i = 0; i < trackWords.length - 1; i++) {
                const currentWord = trackWords[i].word;
                const nextWord = trackWords[i + 1].word;
                
                if (matchedWordsMap[currentWord] !== undefined && 
                    matchedWordsMap[nextWord] !== undefined &&
                    matchedWordsMap[nextWord] === matchedWordsMap[currentWord] + 1) {
                    sequenceBonus += 1;
                }
            }
            
            // Fazla kelime cezası: Music dosyasında fazla kelime varsa ceza
            const extraWords = musicTotalWords - r.match_count;
            const extraPenalty = extraWords > 0 ? (extraWords / musicTotalWords) * 0.3 : 0;
            
            const finalScore = r.base_score + sequenceBonus;
            const matchRatio = Math.min(r.match_count / words.length, 1.0); // Maksimum 1.0
            const adjustedRatio = Math.min(matchRatio * (1 - extraPenalty), 1.0); // Maksimum 1.0
            
            return {
                music_file_path: r.music_path,
                music_file_name: r.music_file_name,
                music_file_normalized: r.normalizedFileName,
                matched_words: Object.keys(matchedWordsMap),
                score: finalScore,
                base_score: r.base_score,
                sequence_bonus: sequenceBonus,
                extra_penalty: Math.round(extraPenalty * 100) / 100,
                match_count: r.match_count,
                total_words: words.length,
                music_total_words: musicTotalWords,
                match_ratio: adjustedRatio,
                match_type: this.determineMatchType(finalScore, r.match_count, words.length, adjustedRatio)
            };
        });
        
        // Final skorlama ile tekrar sırala ve limit uygula
        // ÖNCELİK: adjusted_ratio (fazla kelime cezası dahil), sonra score
        return finalResults
            .sort((a, b) => {
                // Önce adjusted ratio (yüksek önce)
                if (Math.abs(a.match_ratio - b.match_ratio) > 0.01) {
                    return b.match_ratio - a.match_ratio;
                }
                // Sonra score (yüksek önce)
                return b.score - a.score;
            })
            .slice(0, limit);
    }
    
    /**
     * Match type belirle (adjusted ratio kullan)
     */
    determineMatchType(score, matchCount, totalWords, adjustedRatio) {
        const matchRatio = Math.min(adjustedRatio || (matchCount / totalWords), 1.0);
        
        // Skor eşiklerini düşür (çok yüksek skorlar alınamıyor)
        if (matchRatio >= 0.8 && score >= 6) return 'exact';
        if (matchRatio >= 0.6 && score >= 4) return 'high';
        if (matchRatio >= 0.4 && score >= 2) return 'medium';
        return 'low';
    }
    
    /**
     * Tüm index'i yeniden oluştur (ilk kurulum için)
     */
    async tumIndexiYenidenOlustur() {
        console.log('🧹 Eski index\'ler temizleniyor...');
        this.db.prepare('DELETE FROM track_words').run();
        this.db.prepare('DELETE FROM music_words').run();
        this.db.prepare('DELETE FROM playlist_tracks').run();
        
        // 1. Tracks için index
        console.log('📊 Tracks okunuyor...');
        const tracks = this.db.prepare(`
            SELECT path, fileName 
            FROM tracks
        `).all();
        
        console.log(`⏳ ${tracks.length.toLocaleString()} track için index oluşturuluyor...`);
        const batchSize = 1000;
        
        for (let i = 0; i < tracks.length; i += batchSize) {
            const batch = tracks.slice(i, i + batchSize);
            const transaction = this.db.transaction(() => {
                batch.forEach(track => {
                    this.kelimeIndexiOlusturTrack(
                        track.path, 
                        track.fileName,  // fileName kullan (boşluklu)
                        'track',         // Sabit source
                        track.path       // Path'i source_file olarak kullan
                    );
                });
            });
            transaction();
            
            const progress = Math.round((i + batch.length) / tracks.length * 100);
            console.log(`   Tracks: ${progress}% (${(i + batch.length).toLocaleString()}/${tracks.length.toLocaleString()})`);
        }
        
        // 2. Music files için index
        console.log('📊 Music files okunuyor...');
        const musicFiles = this.db.prepare(`
            SELECT path, fileName 
            FROM music_files
        `).all();
        
        console.log(`⏳ ${musicFiles.length.toLocaleString()} music file için index oluşturuluyor...`);
        
        for (let i = 0; i < musicFiles.length; i += batchSize) {
            const batch = musicFiles.slice(i, i + batchSize);
            const transaction = this.db.transaction(() => {
                batch.forEach(file => {
                    this.kelimeIndexiOlusturMusic(file.path, file.fileName);  // fileName kullan (boşluklu)
                });
            });
            transaction();
            
            const progress = Math.round((i + batch.length) / musicFiles.length * 100);
            console.log(`   Music: ${progress}% (${(i + batch.length).toLocaleString()}/${musicFiles.length.toLocaleString()})`);
        }
        
        // 3. Playlist tracks için ilişkilendirme
        console.log('📊 Playlist tracks ilişkilendiriliyor...');
        const playlists = this.db.prepare('SELECT id, path, type FROM playlists').all();
        console.log(`⏳ ${playlists.length.toLocaleString()} playlist için track ilişkileri oluşturuluyor...`);
        
                // populate-playlist-tracks.js'deki mantığı kullan
        const ImportService = require('./ImportService');
        const importService = new ImportService();
        
        let totalLinkedTracks = 0;
        const playlistBatchSize = 100;
        
        for (let i = 0; i < playlists.length; i += playlistBatchSize) {
            const batch = playlists.slice(i, i + playlistBatchSize);
            
            for (const playlist of batch) {
                try {
                    const tracks = importService.parsePlaylistFile(playlist.path);
                    const linkedCount = importService.savePlaylistTracks(playlist.id, tracks);
                    totalLinkedTracks += linkedCount;
                } catch (error) {
                    // Playlist dosyası okunamadı/parse edilemedi - skip
                }
            }
            
            const progress = Math.round((i + batch.length) / playlists.length * 100);
            console.log(`   Playlists: ${progress}% (${(i + batch.length).toLocaleString()}/${playlists.length.toLocaleString()})`);
        }
        
        console.log(`✅ ${totalLinkedTracks.toLocaleString()} playlist-track ilişkisi oluşturuldu!`);
        console.log('✅ Index oluşturuldu!');
    }
}

module.exports = WordIndexService;

