/**
 * BASİT ARAMA MOTORU
 * Parantez sistemi olmadan, sadece kelime eşleşmesi
 */

const fs = require('fs');
const path = require('path');

class SimpleSearchEngine {
    constructor() {
        this.database = null;
        this.musicFiles = [];
    }

    /**
     * Veritabanını yükle
     */
    loadDatabase(dbPath = 'simple_musicfiles.db.json') {
        try {
            console.log(`📥 Veritabanı yükleniyor: ${dbPath}`);
            const data = fs.readFileSync(dbPath, 'utf8');
            this.database = JSON.parse(data);
            this.musicFiles = this.database.musicFiles || [];
            console.log(`✅ ${this.musicFiles.length} dosya yüklendi`);
            return true;
        } catch (error) {
            console.error(`❌ Veritabanı yükleme hatası: ${error.message}`);
            return false;
        }
    }

    /**
     * Türkçe karakterleri normalize et
     */
    normalizeText(text) {
        const charMap = {
            "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", 
            "ş": "s", "Ş": "S", "ç": "c", "Ç": "C", 
            "ü": "u", "Ü": "U", "ö": "o", "Ö": "O"
        };

        let normalized = text;
        normalized = normalized.normalize("NFKC");
        normalized = normalized.split('').map(c => charMap[c] || c).join('');
        normalized = normalized.toLowerCase();
        normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
        normalized = normalized.replace(/\s+/g, ' ');
        return normalized.trim();
    }

    /**
     * Arama kelimelerini çıkar
     */
    extractSearchWords(searchQuery) {
        // TÜM PARANTEZLERİ KALDIR - basit yaklaşım
        const cleanedQuery = searchQuery
            .replace(/\([^)]*\)/g, '')  // (content)
            .replace(/\[[^\]]*\]/g, '') // [content]
            .replace(/\{[^}]*\}/g, '')  // {content}
            .replace(/\s+/g, ' ')       // Çoklu boşlukları tek boşluğa
            .trim();
        
        // Kelime ayırma - basit
        const words = cleanedQuery
            .split(/[-_\s\.\,\&\+\|\~\!\@\#\$\%\^\*\(\)\[\]\{\}]+/)
            .map(word => word.trim())
            .filter(word => word.length > 1)
            .map(word => this.normalizeText(word))
            .filter(word => word.length > 1);
        
        return words;
    }

    /**
     * Basit benzerlik hesaplama
     */
    calculateSimpleSimilarity(searchWords, targetWords) {
        if (searchWords.length === 0 || targetWords.length === 0) {
            return 0.0;
        }

        // Exact match hesaplama
        let exactMatches = 0;
        for (const searchWord of searchWords) {
            if (targetWords.includes(searchWord)) {
                exactMatches++;
            }
        }

        // Basit skor: eşleşen kelime sayısı / toplam arama kelime sayısı
        const exactScore = exactMatches / searchWords.length;

        // Bonus: hedef dosyada fazla kelime varsa penalty
        let lengthPenalty = 0.0;
        if (targetWords.length > searchWords.length * 3) {
            lengthPenalty = 0.1;
        }

        const finalScore = Math.max(0.0, exactScore - lengthPenalty);
        return Math.min(1.0, finalScore);
    }

    /**
     * Dosya arama
     */
    searchFiles(searchQuery, options = {}) {
        const {
            limit = 10,
            minScore = 0.1
        } = options;

        if (!this.musicFiles || this.musicFiles.length === 0) {
            console.error('❌ Veritabanı yüklenmemiş!');
            return [];
        }

        console.log(`🔍 Arama: "${searchQuery}"`);
        
        // Arama kelimelerini çıkar
        const searchWords = this.extractSearchWords(searchQuery);
        console.log(`🔍 Arama kelimeleri: [${searchWords.join(', ')}]`);

        if (searchWords.length === 0) {
            console.log('❌ Arama kelimesi bulunamadı!');
            return [];
        }

        const startTime = Date.now();

        // Her dosya için benzerlik hesapla
        const results = [];
        for (const file of this.musicFiles) {
            const similarity = this.calculateSimpleSimilarity(searchWords, file.allWords);
            
            if (similarity >= minScore) {
                results.push({
                    path: file.path,
                    name: file.name,
                    similarity: similarity,
                    fileWords: file.fileWords,
                    folderWords: file.folderWords,
                    allWords: file.allWords,
                    matchDetails: {
                        searchWords: searchWords,
                        exactMatches: searchWords.filter(word => file.allWords.includes(word)).length,
                        totalSearchWords: searchWords.length
                    }
                });
            }
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Skora göre sırala
        results.sort((a, b) => b.similarity - a.similarity);

        console.log(`⏱️ Arama süresi: ${duration}ms (${(this.musicFiles.length / (duration / 1000)).toFixed(0)} dosya/sn)`);
        console.log(`📊 ${results.length} sonuç bulundu`);

        return results.slice(0, limit);
    }

    /**
     * Test araması yap
     */
    testSearch(searchQuery, options = {}) {
        console.log('\n🔍 BASİT ARAMA TESTİ');
        console.log('='.repeat(80));
        console.log(`🔍 Arama: "${searchQuery}"`);
        console.log('─'.repeat(80));

        const results = this.searchFiles(searchQuery, options);

        if (results.length === 0) {
            console.log('❌ Hiç sonuç bulunamadı!');
            return [];
        }

        console.log('\n📊 SONUÇLAR:');
        results.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.similarity.toFixed(4)} - ${result.name}`);
            console.log(`   📁 ${result.path}`);
            console.log(`   🔍 Dosya kelimeleri: [${result.fileWords.join(', ')}]`);
            console.log(`   📊 Eşleşen kelimeler: ${result.matchDetails.exactMatches}/${result.matchDetails.totalSearchWords}`);
        });

        return results;
    }
}

// Test fonksiyonu
async function testSimpleSearch() {
    const searchEngine = new SimpleSearchEngine();
    
    // Veritabanını yükle
    if (!searchEngine.loadDatabase()) {
        console.error('❌ Veritabanı yüklenemedi!');
        return;
    }

    // Test aramaları
    const testQueries = [
        'A$Ap Ferg ft. Nicki Minaj - Plain Jane (ilkan Gunuc Remix)  mmm Masallah',
        'Mahsun Kırmızıgül - Sarı Sarı',
        'FUNDA ONCU - CAN BEDENDEN CIKMAYINCA',
        'Massimo Scalic - Massimo Scalici (Roxanne Bachata Version)',
        'müge zeren ilk bakışta aşık oldum'
    ];

    for (const query of testQueries) {
        searchEngine.testSearch(query, { limit: 3 });
        console.log('\n' + '='.repeat(80) + '\n');
    }
}

// Module export
module.exports = SimpleSearchEngine;

// Çalıştır
if (require.main === module) {
    testSimpleSearch();
}
