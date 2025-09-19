const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

class SQLiteDatabase {
    constructor() {
        this.dbPath = path.join(__dirname, '../musicfiles.db');
        this.db = null;
        this.initialize();
    }

    initialize() {
        try {
            // Veritabanı dosyasını oluştur veya aç
            this.db = new Database(this.dbPath);
            
            // WAL modunu etkinleştir (performans için)
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('cache_size = 10000');
            this.db.pragma('temp_store = MEMORY');
            
            // Tabloları oluştur
            this.createTables();
            
            console.log('✅ SQLite veritabanı başlatıldı:', this.dbPath);
        } catch (error) {
            console.error('❌ SQLite veritabanı başlatılamadı:', error);
            throw error;
        }
    }

    createTables() {
        // Müzik dosyaları tablosu
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS music_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE NOT NULL,
                fileName TEXT NOT NULL,
                normalizedFileName TEXT NOT NULL,
                extension TEXT,
                fileType TEXT,
                size INTEGER,
                modifiedTime TEXT,
                mimeType TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // İndekslenmiş kelimeler tablosu
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS music_file_words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                music_file_id INTEGER NOT NULL,
                word TEXT NOT NULL,
                word_type TEXT DEFAULT 'general',
                FOREIGN KEY (music_file_id) REFERENCES music_files (id) ON DELETE CASCADE
            )
        `);

        // İndeksler oluştur
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_music_files_path ON music_files(path);
            CREATE INDEX IF NOT EXISTS idx_music_files_normalized ON music_files(normalizedFileName);
            CREATE INDEX IF NOT EXISTS idx_music_files_extension ON music_files(extension);
            CREATE INDEX IF NOT EXISTS idx_music_files_file_type ON music_files(fileType);
            CREATE INDEX IF NOT EXISTS idx_words_word ON music_file_words(word);
            CREATE INDEX IF NOT EXISTS idx_words_music_file_id ON music_file_words(music_file_id);
            CREATE INDEX IF NOT EXISTS idx_words_type ON music_file_words(word_type);
        `);

        console.log('✅ SQLite tabloları ve indeksler oluşturuldu');
    }

    // Müzik dosyası ekle
    insertMusicFile(fileData) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO music_files 
            (path, fileName, normalizedFileName, extension, fileType, size, modifiedTime, mimeType)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            fileData.path,
            fileData.fileName,
            fileData.normalizedFileName,
            fileData.extension || null,
            fileData.fileType || null,
            fileData.size || null,
            fileData.modifiedTime || null,
            fileData.mimeType || null
        );

        return result.lastInsertRowid;
    }

    // Kelimeleri ekle
    insertWords(musicFileId, words, wordType = 'general') {
        const stmt = this.db.prepare(`
            INSERT INTO music_file_words (music_file_id, word, word_type)
            VALUES (?, ?, ?)
        `);

        // Önce mevcut kelimeleri sil
        this.db.prepare('DELETE FROM music_file_words WHERE music_file_id = ?').run(musicFileId);

        // Yeni kelimeleri ekle
        const insertMany = this.db.transaction((words) => {
            for (const word of words) {
                stmt.run(musicFileId, word, wordType);
            }
        });

        insertMany(words);
    }

    // Basit arama
    searchFiles(searchTerm, limit = 100) {
        console.log(`🚨 DEBUG: searchFiles çağrıldı! Terim: ${searchTerm}`);
        const normalizedSearch = this.normalizeText(searchTerm);
        const words = normalizedSearch.split(' ').filter(w => w.length > 0);
        
        const debugLog = (message) => {
            console.log(message);
            const fs = require('fs');
            const path = require('path');
            const logDir = path.join(__dirname, 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            const logFile = path.join(logDir, `debug_${new Date().toISOString().split('T')[0]}.log`);
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
        };
        
        debugLog(`🔍 DEBUG searchFiles: Arama terimi: "${normalizedSearch}"`);
        debugLog(`🔍 DEBUG searchFiles: Kelimeler: [${words.join(', ')}]`);
        
        if (words.length === 0) {
            return [];
        }

        // LIKE sorgusu ile arama
        const placeholders = words.map(() => 'normalizedFileName LIKE ?').join(' AND ');
        const searchPatterns = words.map(word => `%${word}%`);

        const stmt = this.db.prepare(`
            SELECT * FROM music_files 
            WHERE ${placeholders}
            ORDER BY 
                CASE 
                    WHEN normalizedFileName LIKE ? THEN 1
                    WHEN normalizedFileName LIKE ? THEN 2
                    ELSE 3
                END,
                LENGTH(normalizedFileName)
            LIMIT ?
        `);

        const exactMatch = `%${normalizedSearch}%`;
        const startsWith = `${normalizedSearch}%`;
        
        const results = stmt.all(...searchPatterns, exactMatch, startsWith, limit);
        debugLog(`🔍 DEBUG searchFiles: Bulunan sonuç sayısı: ${results.length}`);
        
        // Puanlama ekle
        const scoredResults = results.map(result => {
            const fileWords = result.normalizedFileName.split(' ').filter(w => w.length > 0);
            const searchWordCount = words.length;
            const fileWordCount = fileWords.length;
            
            // Eşleşen kelime sayısını hesapla
            let matchCount = 0;
            words.forEach(searchWord => {
                if (fileWords.some(fileWord => fileWord.includes(searchWord))) {
                    matchCount++;
                }
            });
            
            // Adil puanlama: eşleşen kelime sayısı / dosya kelime sayısı
            const similarity = matchCount / fileWordCount;
            
            debugLog(`🔍 DEBUG searchFiles: ${result.fileName} - ${matchCount}/${fileWordCount} = ${similarity.toFixed(3)}`);
            
            return {
                ...result,
                similarity_score: similarity,
                match_count: matchCount,
                total_words: fileWordCount
            };
        });
        
        return scoredResults;
    }

    // Benzerlik bazlı arama (adil puanlama sistemi)
    searchSimilar(searchTerm, threshold = 0.3, limit = 50) {
        const normalizedSearch = this.normalizeText(searchTerm);
        const searchWords = normalizedSearch.split(' ').filter(w => w.length > 0);
        
        if (searchWords.length === 0) {
            return [];
        }

        // Basit SQL sorgusu - sadece veri getir
        const searchPattern = `%${normalizedSearch}%`;
        const stmt = this.db.prepare(`
            SELECT * FROM music_files 
            WHERE normalizedFileName LIKE ?
            ORDER BY 
                CASE 
                    WHEN normalizedFileName LIKE ? THEN 1
                    WHEN normalizedFileName LIKE ? THEN 2
                    ELSE 3
                END,
                LENGTH(normalizedFileName) ASC
            LIMIT ?
        `);

        const exactMatch = `%${normalizedSearch}%`;
        const startsWith = `${normalizedSearch}%`;
        
        const results = stmt.all(searchPattern, exactMatch, startsWith, limit);
        
        // JavaScript'te adil puanlama hesapla
        const debugLog = (message) => {
            console.log(message);
            // Log dosyasına da yaz
            const fs = require('fs');
            const path = require('path');
            const logDir = path.join(__dirname, 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            const logFile = path.join(logDir, `debug_${new Date().toISOString().split('T')[0]}.log`);
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
        };
        
        debugLog(`🔍 DEBUG: Arama terimi: "${normalizedSearch}"`);
        debugLog(`🔍 DEBUG: Arama kelimeleri: [${searchWords.join(', ')}]`);
        debugLog(`🔍 DEBUG: Bulunan dosya sayısı: ${results.length}`);
        
        const scoredResults = results.map((result, index) => {
            const fileWords = result.normalizedFileName.split(' ').filter(w => w.length > 0);
            const searchWordCount = searchWords.length;
            const fileWordCount = fileWords.length;
            
            // Eşleşen kelime sayısını hesapla
            let matchCount = 0;
            const matchedWords = [];
            searchWords.forEach(searchWord => {
                if (fileWords.some(fileWord => fileWord.includes(searchWord))) {
                    matchCount++;
                    matchedWords.push(searchWord);
                }
            });
            
            // Adil puanlama: eşleşen kelime sayısı / dosya kelime sayısı
            // Daha az kelime = daha yüksek puan
            const similarity = matchCount / fileWordCount;
            
            debugLog(`🔍 DEBUG ${index + 1}: ${result.fileName}`);
            debugLog(`   📝 Dosya kelimeleri: [${fileWords.join(', ')}] (${fileWordCount} kelime)`);
            debugLog(`   🎯 Eşleşen kelimeler: [${matchedWords.join(', ')}] (${matchCount} kelime)`);
            debugLog(`   📊 Puanlama: ${matchCount}/${fileWordCount} = ${similarity.toFixed(3)}`);
            
            return {
                ...result,
                similarity_score: similarity,
                match_count: matchCount,
                total_words: fileWordCount
            };
        });
        
        debugLog(`🔍 DEBUG: Filtreleme öncesi sonuç sayısı: ${scoredResults.length}`);
        const filteredResults = scoredResults.filter(result => result.similarity_score >= threshold);
        debugLog(`🔍 DEBUG: Filtreleme sonrası sonuç sayısı: ${filteredResults.length}`);
        
        const finalResults = filteredResults
          .sort((a, b) => b.similarity_score - a.similarity_score)
          .slice(0, limit);
          
        debugLog(`🔍 DEBUG: Final sonuç sayısı: ${finalResults.length}`);
        finalResults.forEach((result, index) => {
            debugLog(`   ${index + 1}. ${result.fileName}: ${result.similarity_score.toFixed(3)}`);
        });
        
        return finalResults;
    }

    // Tüm dosyaları getir
    getAllFiles() {
        const stmt = this.db.prepare('SELECT * FROM music_files ORDER BY normalizedFileName');
        return stmt.all();
    }

    // Dosya sayısı
    getFileCount() {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM music_files');
        return stmt.get().count;
    }

    // Veritabanı istatistikleri
    getStats() {
        const fileCount = this.getFileCount();
        const wordCount = this.db.prepare('SELECT COUNT(*) as count FROM music_file_words').get().count;
        const dbSize = fs.statSync(this.dbPath).size;

        return {
            fileCount,
            wordCount,
            dbSize,
            dbPath: this.dbPath
        };
    }

    // Veritabanını temizle
    clear() {
        this.db.exec('DELETE FROM music_file_words');
        this.db.exec('DELETE FROM music_files');
        console.log('✅ Veritabanı temizlendi');
    }

    // Veritabanını kapat
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    // Türkçe karakter normalizasyonu
    normalizeText(text) {
        const charMap = {
            "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", 
            "ş": "s", "Ş": "S", "ç": "c", "Ç": "C", 
            "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
            "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
            "è": "e", "é": "e", "ê": "e", "ë": "e", "ì": "i", "í": "i", "î": "i", "ï": "i",
            "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u",
            "ý": "y", "þ": "th", "ÿ": "y", "ß": "ss", "ð": "d", "ñ": "n"
        };

        let normalized = text;
        normalized = normalized.normalize("NFKC");
        normalized = normalized.split('').map(c => charMap[c] || c).join('');
        normalized = normalized.toLowerCase();
        normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
        normalized = normalized.replace(/\s+/g, ' ').trim();
        
        return normalized;
    }
}

module.exports = SQLiteDatabase;
