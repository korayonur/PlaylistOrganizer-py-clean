const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

class SimpleSQLiteDatabase {
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
            
            console.log('✅ Basit SQLite veritabanı başlatıldı:', this.dbPath);
        } catch (error) {
            console.error('❌ SQLite veritabanı başlatılamadı:', error);
            throw error;
        }
    }

    createTables() {
        // Sadece müzik dosyaları tablosu - basit ve temiz
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
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Sadece gerekli indeks - normalizedFileName için
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_music_files_normalized ON music_files(normalizedFileName);
        `);

        console.log('✅ Basit SQLite tabloları oluşturuldu');
    }

    // Müzik dosyası ekle
    insertMusicFile(fileData) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO music_files 
            (path, fileName, normalizedFileName, extension, fileType, size, modifiedTime)
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

    // Kademeli arama algoritması - sizin önerdiğiniz mantık
    searchProgressive(searchTerm, limit = 50) {
        const normalizedSearch = this.normalizeText(searchTerm);
        // Kelime tekrarlarını kaldır ve sırala
        const words = [...new Set(normalizedSearch.split(' ').filter(w => w.length > 0))];
        
        console.log(`🔍 Kademeli Arama: "${normalizedSearch}"`);
        console.log(`🔍 Kelimeler: [${words.join(', ')}]`);
        
        // 1. Adım: Tam eşleşme
        console.log(`🔍 1. AŞAMA: Tam eşleşme aranıyor: "${normalizedSearch}"`);
        let results = this.searchExact(normalizedSearch, limit);
        if (results.length > 0) {
            console.log(`✅ 1. AŞAMADA BULUNDU: Tam eşleşme: ${results.length} sonuç`);
            
            const baseSearchInfo = {
                originalQuery: searchTerm,
                normalizedQuery: normalizedSearch,
                totalWords: words.length,
                matchedAt: 'exact',
                matchedWords: words.length,
                searchStage: '🎯 1. AŞAMA - TAM EŞLEŞME - Tüm kelimeler bulundu',
                searchStep: 1,
                searchStepDescription: 'Tam eşleşme araması'
            };
            
            const searchInfo = this.calculateSearchInfo(searchTerm, normalizedSearch, words, results, baseSearchInfo);
            
            return {
                results: this.addScoring(results, words),
                searchInfo: searchInfo
            };
        }
        console.log(`❌ 1. AŞAMA: Tam eşleşme bulunamadı`);
        
        // 2. Adım: Kelime azaltma (son kelimeyi çıkar)
        for (let i = words.length - 1; i >= 1; i--) {
            const partialTerm = words.slice(0, i).join(' ');
            const stepNumber = words.length - i + 1;
            console.log(`🔍 ${stepNumber}. AŞAMA: Kısmi eşleşme aranıyor: "${partialTerm}" (${i}/${words.length} kelime)`);
            results = this.searchExact(partialTerm, limit);
            if (results.length > 0) {
                console.log(`✅ ${stepNumber}. AŞAMADA BULUNDU: Kısmi eşleşme (${i} kelime): ${results.length} sonuç`);
                
                // Arama terimindeki kelimeleri kullan (partialTerm)
                const searchWords = partialTerm.split(' ').filter(w => w.length > 0);
                const scoredResults = this.addScoring(results, searchWords);
                const bestMatch = scoredResults[0];
                const actualMatchedWords = bestMatch ? bestMatch.match_count : i;
                
                const baseSearchInfo = {
                    originalQuery: searchTerm,
                    normalizedQuery: normalizedSearch,
                    totalWords: i, // Arama terimindeki kelime sayısı
                    matchedAt: 'partial',
                    matchedWords: actualMatchedWords,
                    searchStage: `📉 ${stepNumber}. AŞAMA - KISMİ EŞLEŞME - ${actualMatchedWords}/${i} kelime bulundu`,
                    searchStep: stepNumber,
                    searchStepDescription: `Kısmi eşleşme araması (${actualMatchedWords} kelime)`,
                    searchedTerm: partialTerm
                };
                
                // calculateSearchInfo'da orijinal tüm kelimeleri kullan
                const searchInfo = this.calculateSearchInfo(searchTerm, normalizedSearch, words, results, baseSearchInfo);
                
                return {
                    results: scoredResults,
                    searchInfo: searchInfo
                };
            }
            console.log(`❌ ${stepNumber}. AŞAMA: Kısmi eşleşme bulunamadı: "${partialTerm}"`);
        }
        
        // 3. Adım: Tek kelime arama (uzun kelimeleri öncelikle ara)
        const singleWordStepStart = words.length + 1;
        // Kelimeleri uzunluklarına göre sırala (uzun olanlar daha spesifik)
        const sortedWords = [...words].sort((a, b) => b.length - a.length);
        
        for (let i = 0; i < sortedWords.length; i++) {
            const word = sortedWords[i];
            const originalIndex = words.indexOf(word);
            const stepNumber = singleWordStepStart + i;
            console.log(`🔍 ${stepNumber}. AŞAMA: Tek kelime aranıyor: "${word}" (uzunluk: ${word.length}, ${originalIndex + 1}/${words.length}. kelime)`);
            results = this.searchExact(word, limit);
            if (results.length > 0) {
                console.log(`✅ ${stepNumber}. AŞAMADA BULUNDU: Tek kelime eşleşme: ${results.length} sonuç`);
                
                const baseSearchInfo = {
                    originalQuery: searchTerm,
                    normalizedQuery: normalizedSearch,
                    totalWords: words.length,
                    matchedAt: 'single',
                    matchedWords: 1,
                    matchedWordIndex: originalIndex + 1,
                    matchedWord: word,
                    searchStage: `🔍 ${stepNumber}. AŞAMA - TEK KELİME EŞLEŞME - ${originalIndex + 1}/${words.length}. kelime: "${word}"`,
                    searchStep: stepNumber,
                    searchStepDescription: `Tek kelime araması (${originalIndex + 1}/${words.length}. kelime)`,
                    searchedTerm: word
                };
                
                const searchInfo = this.calculateSearchInfo(searchTerm, normalizedSearch, words, results, baseSearchInfo);
                
                return {
                    results: this.addScoring(results, words),
                    searchInfo: searchInfo
                };
            }
            console.log(`❌ ${stepNumber}. AŞAMA: Tek kelime eşleşme bulunamadı: "${word}"`);
        }
        
        console.log(`❌ Hiçbir eşleşme bulunamadı`);
        
        const baseSearchInfo = {
            originalQuery: searchTerm,
            normalizedQuery: normalizedSearch,
            totalWords: words.length,
            matchedAt: 'none',
            matchedWords: 0,
            searchStage: '❌ HİÇBİR EŞLEŞME BULUNAMADI',
            searchStep: 0,
            searchStepDescription: 'Tüm aşamalar denendi, sonuç bulunamadı'
        };
        
        const searchInfo = this.calculateSearchInfo(searchTerm, normalizedSearch, words, [], baseSearchInfo);
        
        return {
            results: [],
            searchInfo: searchInfo
        };
    }

    // Basit LIKE sorgusu - çok hızlı
    searchExact(term, limit) {
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
        
        const pattern = `%${term}%`;
        const exactMatch = `%${term}%`;
        const startsWith = `${term}%`;
        
        return stmt.all(pattern, exactMatch, startsWith, limit);
    }

    // Puanlama ekle - adil sistem
    addScoring(results, searchWords) {
        return results.map(result => {
            const fileWords = result.normalizedFileName.split(' ').filter(w => w.length > 0);
            const searchWordCount = searchWords.length;
            const fileWordCount = fileWords.length;
            
            // Eşleşen kelime sayısını hesapla - tam eşleşme
            let matchCount = 0;
            const matchedWords = [];
            searchWords.forEach(searchWord => {
                if (fileWords.some(fileWord => fileWord === searchWord)) {
                    matchCount++;
                    matchedWords.push(searchWord);
                }
            });
            
            // Puanlama: eşleşen kelime sayısı / arama kelime sayısı (0-1 arası)
            const similarity = searchWordCount > 0 ? matchCount / searchWordCount : 0;
            
            return {
                ...result,
                similarity_score: similarity,
                match_count: matchCount,
                total_words: fileWordCount,
                matched_words: matchedWords
            };
        }).sort((a, b) => b.similarity_score - a.similarity_score);
    }

    /**
     * SearchInfo hesaplama fonksiyonu - tüm arama türleri için ortak
     * @param {string} searchTerm - Orijinal arama terimi
     * @param {string} normalizedSearch - Normalize edilmiş arama terimi
     * @param {Array} words - Arama terimindeki kelimeler (kısmi veya tam)
     * @param {Array} results - SQL sonuçları
     * @param {Object} baseSearchInfo - Temel searchInfo objesi
     * @returns {Object} - Tamamlanmış searchInfo objesi
     */
    calculateSearchInfo(searchTerm, normalizedSearch, words, results, baseSearchInfo) {
        const scoredResults = this.addScoring(results, words);
        const bestMatch = scoredResults[0];
        
        // En iyi eşleşme bilgilerini hesapla - ORİJİNAL TÜM KELİMELERE GÖRE
        let bestMatchWords = 0;
        let bestMatchSimilarity = 0;
        if (bestMatch) {
            const fileWords = bestMatch.normalizedFileName.split(' ').filter(w => w.length > 0);
            // Orijinal tüm kelimeleri kullan (normalizedSearch'ten)
            const originalWords = normalizedSearch.split(' ').filter(w => w.length > 0);
            originalWords.forEach(originalWord => {
                if (fileWords.some(fileWord => fileWord === originalWord)) {
                    bestMatchWords++;
                }
            });
            bestMatchSimilarity = originalWords.length > 0 ? bestMatchWords / originalWords.length : 0;
        }
        
        return {
            ...baseSearchInfo,
            bestMatchWords: bestMatchWords,
            bestMatchTotalWords: normalizedSearch.split(' ').filter(w => w.length > 0).length,
            bestMatchSimilarity: bestMatchSimilarity
        };
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
        const dbSize = fs.statSync(this.dbPath).size;

        return {
            fileCount,
            dbSize,
            dbPath: this.dbPath
        };
    }

    // Veritabanını temizle
    clear() {
        this.db.exec('DELETE FROM music_files');
        console.log('✅ Veritabanı temizlendi');
    }

    // Veritabanını temizle
    clearDatabase() {
        try {
            this.db.exec('DELETE FROM music_files');
            console.log('🗑️ SQLite veritabanı temizlendi');
        } catch (error) {
            console.error('❌ Veritabanı temizleme hatası:', error);
            throw error;
        }
    }

    // Dosya ekle
    addFile(fileData) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO music_files 
                (path, fileName, normalizedFileName, extension, fileType, size, modifiedTime)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(
                fileData.path,
                fileData.fileName,
                fileData.normalizedFileName,
                fileData.extension || null,
                fileData.fileType || null,
                fileData.size || null,
                fileData.modifiedTime || null,
            );
            
            return result;
        } catch (error) {
            console.error('❌ Dosya ekleme hatası:', error);
            throw error;
        }
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

module.exports = SimpleSQLiteDatabase;
