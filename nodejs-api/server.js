const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const fs = require('fs-extra');
const path = require('path');
const xml2js = require('xml2js');
const SimpleSQLiteDatabase = require('./simple_database');

// Server versiyonu
const SERVER_VERSION = '4.2.0';

// Logging sistemi
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

function logError(error, context = '') {
    const timestamp = new Date().toISOString();
    const logMessage = {
        timestamp,
        level: 'ERROR',
        context,
        message: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno
    };
    
    console.error(`[${timestamp}] ERROR ${context}:`, error.message);
    
    // Log dosyasına yaz
    const logFile = path.join(logDir, `error_${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logMessage) + '\n');
}

function logInfo(message, context = '') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO ${context}:`, message);
}

// Geliştirilmiş Türkçe karakter haritası
const ENHANCED_CHAR_MAP = {
    // Türkçe karakterler
    "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
    "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O",
    
    // Latin genişletilmiş
    "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
    "è": "e", "é": "e", "ê": "e", "ë": "e", "ì": "i", "í": "i", "î": "i", "ï": "i",
    "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u",
    "ý": "y", "þ": "th", "ÿ": "y", "ß": "ss", "ð": "d", "ñ": "n"
};

// Desteklenen formatlar (Python'daki SUPPORTED_FORMATS ile aynı)
const SUPPORTED_FORMATS = {
    "audio": [
        "mp3", "wav", "cda", "wma", "asf", "ogg", "m4a", "aac", "aif", "aiff",
        "flac", "mpc", "ape", "wv", "opus", "ra", "rm", "3gp", "amr", "au"
    ],
    "video": [
        "mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4v", "3gp", "ogv"
    ],
    "vdj": [
        "vdjfolder", "vdjplaylist", "vdj"
    ],
    "image": [
        "jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp", "svg"
    ]
};

// BASİT KELİME EŞLEŞME ALGORİTMASI
class SimpleWordMatcher {
    constructor() {
        this.musicFiles = [];
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

        // NFKC normalizasyonu ve karakter dönüşümü
        normalized = normalized.normalize("NFKC");
        normalized = normalized.split('').map(c => charMap[c] || c).join('');
        normalized = normalized.toLowerCase();

        // Sadece harf ve rakamları koru, boşlukları koru
        normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');

        // Çoklu boşlukları tek boşluğa çevir
    normalized = normalized.replace(/\s+/g, ' ');

    return normalized.trim();
}

    /**
     * Dosya adından kelimeleri çıkar
     */
    extractWords(fileName, filePath = "") {
        // fileName zaten sadece dosya adı (path.basename ile alınmış)
        const fileNameWithoutExt = path.parse(fileName).name;
        const normalizedFileName = this.normalizeText(fileNameWithoutExt);
        
        // Kelime ayırma - sadece boşluk ve tire ile
        const fileNameWords = normalizedFileName.split(/[\s\-]+/)
            .map(word => word.trim())
            .filter(word => word.length > 1);
    
    return {
            file_words: fileNameWords
    };
}

/**
     * Geliştirilmiş kelime eşleşmesi hesapla
     */
    // calculateSimilarity metodu kaldırıldı - artık inline hesaplama yapılıyor

    /**
     * Dosya adı benzerliği hesapla - Levenshtein distance ile
     */
    calculateFileNameSimilarity(aranan, fileName) {
        // Önce uzantıyı kaldır, sonra normalize et
        const arananWithoutExt = aranan.replace(/\.[^.]*$/, '');
        const fileNameWithoutExt = fileName.replace(/\.[^.]*$/, '');
        
        const arananNormalized = this.normalizeText(arananWithoutExt).toLowerCase();
        const fileNameNormalized = this.normalizeText(fileNameWithoutExt).toLowerCase();
        
        // Levenshtein distance hesapla
        const distance = this.levenshteinDistance(arananNormalized, fileNameNormalized);
        const maxLength = Math.max(arananNormalized.length, fileNameNormalized.length);
        
        // Benzerlik oranı: 1 - (distance / maxLength)
        return maxLength === 0 ? 1 : 1 - (distance / maxLength);
    }
    
    /**
     * Levenshtein distance hesapla
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
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

/**
     * Verimli azaltma algoritması
     */
    verimliAzaltmaAramasi(aranan, musicFiles) {
        console.log(`🚀 VERİMLİ AZALTMA ARAMASI BAŞLADI: "${aranan}"`);
        const arananNormalized = this.normalizeText(aranan);
        const arananKelimeler = arananNormalized.split(' ');
        console.log(`🚀 NORMALIZE EDİLDİ: "${arananNormalized}"`);
        console.log(`🚀 KELİMELER:`, arananKelimeler);
        
        let enIyiSonuc = null;
        let bulunanSonuclar = [];
        let toplamTarananDosya = 0;
        
        // Her kelime sayısı için arama yap (4, 3, 2, 1)
        let aramaTamamlandi = false;
        console.log(`🔍 ARANAN KELİMELER:`, arananKelimeler);
        console.log(`🔍 KELİME SAYISI:`, arananKelimeler.length);
        for (let kelimeSayisi = arananKelimeler.length; kelimeSayisi >= 1 && !aramaTamamlandi; kelimeSayisi--) {
            console.log(`🔍 ${kelimeSayisi} kelime araması başlıyor: "${arananKelimeler.slice(0, kelimeSayisi).join(' ')}"`);
            const azaltilmisAranan = arananKelimeler.slice(0, kelimeSayisi).join(' ');
            console.log(`🔍 Aranan: "${azaltilmisAranan}"`);
            let buSeviyedeEnIyi = null;
            let buSeviyedeBulunan = [];
            
            // Müzik dosyalarında ara - İLK EŞLEŞMEDE DUR!
            let buSeviyedeTarananDosya = 0;
            for (const musicFile of musicFiles) {
                toplamTarananDosya++;
                buSeviyedeTarananDosya++;
                if (!musicFile || !musicFile.normalizedFileName) {
                    continue;
                }
                const hedefNormalized = musicFile.normalizedFileName;
                
                if (hedefNormalized.includes(azaltilmisAranan)) {
                    const sonuc = {
                        bulundu: true,
                        seviye: kelimeSayisi === arananKelimeler.length ? 'tam' : `${kelimeSayisi}_kelime`,
                        kelimeSayisi: kelimeSayisi
                    };
                    
                    if (!buSeviyedeEnIyi) {
                        buSeviyedeEnIyi = {
                            ...musicFile,
                            sonuc: sonuc
                        };
                        console.log(`✅ ${kelimeSayisi} kelime eşleşmesi bulundu: "${musicFile.fileName}" (${buSeviyedeTarananDosya} dosya tarandı)`);
                        console.log(`✅ Hedef: "${hedefNormalized}"`);
                        console.log(`✅ Aranan: "${azaltilmisAranan}"`);
                    }
                    
                    buSeviyedeBulunan.push({
                        ...musicFile,
                        sonuc: sonuc
                    });
                    
                    // İLK EŞLEŞMEDE HEMEN DUR!
                    if (kelimeSayisi === arananKelimeler.length) {
                        console.log(`🎯 TAM EŞLEŞME BULUNDU - ARAMA DURDURULUYOR! (${toplamTarananDosya} dosya tarandı)`);
                        aramaTamamlandi = true;
                break;
                    }
                    
                    if (kelimeSayisi >= 3) {
                        console.log(`✅ İYİ EŞLEŞME BULUNDU (${kelimeSayisi} kelime) - ARAMA DURDURULUYOR! (${toplamTarananDosya} dosya tarandı)`);
                        aramaTamamlandi = true;
                        break;
                    }
                }
                
                // Arama tamamlandıysa dosya taramayı dur
                if (aramaTamamlandi) {
                    break;
                }
            }
            console.log(`📊 ${kelimeSayisi} kelime seviyesi tamamlandı: ${buSeviyedeTarananDosya} dosya tarandı, ${buSeviyedeBulunan.length} eşleşme bulundu`);
            
            // Bu seviyede eşleşme bulundu mu?
            if (buSeviyedeEnIyi) {
                // Bu seviyedeki sonuçları dosya adı benzerliğine göre sırala
                buSeviyedeBulunan.sort((a, b) => {
                    const aSimilarity = this.calculateFileNameSimilarity(aranan, a.name);
                    const bSimilarity = this.calculateFileNameSimilarity(aranan, b.name);
                    return bSimilarity - aSimilarity; // Yüksek benzerlik önce
                });
                
                // En iyi sonucu güncelle (kelime sayısı + dosya adı benzerliği)
                if (!enIyiSonuc || kelimeSayisi > enIyiSonuc.sonuc.kelimeSayisi) {
                    enIyiSonuc = buSeviyedeBulunan[0];
                } else if (kelimeSayisi === enIyiSonuc.sonuc.kelimeSayisi) {
                    // Aynı kelime sayısında, dosya adı benzerliğine bak
                    const currentSimilarity = this.calculateFileNameSimilarity(aranan, enIyiSonuc.name);
                    const newSimilarity = this.calculateFileNameSimilarity(aranan, buSeviyedeBulunan[0].name);
                    if (newSimilarity > currentSimilarity) {
                        enIyiSonuc = buSeviyedeBulunan[0];
                    }
                }
                
                // Bulunan sonuçları ekle (maksimum 10 sonuç)
                const yeniSonuclar = buSeviyedeBulunan.slice(0, 10 - bulunanSonuclar.length);
                bulunanSonuclar = [...bulunanSonuclar, ...yeniSonuclar];
                
                // Bu seviyede eşleşme bulundu - sonuçları işle
            }
            
            // Arama tamamlandıysa dış döngüden çık
            if (aramaTamamlandi) {
                console.log(`🛑 ARAMA TAMAMLANDI - DIŞ DÖNGÜ DURDURULUYOR! (${toplamTarananDosya} dosya tarandı)`);
                break;
            }
        }
        
        // Arama aşaması bilgisi
        let aramaAsamasi = '';
        if (enIyiSonuc) {
            if (enIyiSonuc.sonuc.seviye === 'tam') {
                aramaAsamasi = `Tüm seviyeler taranarak ${arananKelimeler.length} kelime tam eşleşme bulundu`;
            } else {
                aramaAsamasi = `Tüm seviyeler taranarak ${enIyiSonuc.sonuc.kelimeSayisi} kelime eşleşme bulundu (en iyi benzerlik)`;
            }
        } else {
            aramaAsamasi = 'Hiçbir eşleşme bulunamadı';
        }

        return {
            enIyiSonuc,
            bulunanSonuclar,
            toplamTarananDosya,
            aramaAsamasi
        };
    }

    /**
     * Dosya arama
     */
    searchFile(searchPath, options = {}) {
    console.log(`🚨 WORDMATCHER.searchFile ÇAĞRILDI: ${searchPath}`);
    const startTime = Date.now();
    
    console.log(`📊 Veritabanı kontrolü: ${this.musicFiles ? this.musicFiles.length : 'YOK'} dosya`);
    
    
        if (!this.musicFiles || this.musicFiles.length === 0) {
        return {
            originalPath: searchPath,
            found: false,
            status: 'database_error',
            processTime: Date.now() - startTime
        };
    }
    
    const fileName = path.basename(searchPath);
    const fileNameWithoutExt = path.parse(fileName).name;
    const fileDir = path.dirname(searchPath);
    
    // 1. Tam yol eşleşmesi
        const exactMatch = this.musicFiles.find(file => file.path === searchPath);
    if (exactMatch) {
        return {
            originalPath: searchPath,
            found: true,
            status: 'exact_match',
            matchType: 'tamYolEsleme',
            foundPath: searchPath,
            similarity: 1.0, // Exact match
            processTime: Date.now() - startTime
        };
    }
    
        // 2. Aynı klasör farklı uzantı
    const extensions = ['.mp3', '.m4a', '.flac', '.wav', '.mp4', '.avi', '.mkv'];
    for (const ext of extensions) {
        const altPath = path.join(fileDir, fileNameWithoutExt + ext);
            const altMatch = this.musicFiles.find(file => file.path === altPath);
        if (altMatch) {
            return {
                originalPath: searchPath,
                found: true,
                status: 'exact_match',
                matchType: 'ayniKlasorFarkliUzanti',
                foundPath: altPath,
                similarity: 0.9, // Same folder different extension
                processTime: Date.now() - startTime
            };
        }
    }
    
        // 3. Farklı klasör aynı ad
        const sameNameMatch = this.musicFiles.find(file => 
        path.basename(file.path) === fileName
    );
    if (sameNameMatch) {
        return {
            originalPath: searchPath,
            found: true,
            status: 'exact_match',
            matchType: 'farkliKlasorveUzanti',
            foundPath: sameNameMatch.path,
            similarity: 0.8, // Same name different folder
            processTime: Date.now() - startTime
        };
    }
    
        // 4. Basit kelime eşleşmesi araması
        // Tam dosya adını kullan (uzantı hariç)
        const normalizedFileName = this.normalizeText(fileNameWithoutExt);
        const searchWords = this.extractWords(normalizedFileName, "");
        if (!searchWords || !searchWords.file_words || searchWords.file_words.length === 0) {
        return {
            originalPath: searchPath,
            found: false,
            status: 'no_search_words',
            processTime: Date.now() - startTime
        };
    }
    
    const candidates = [];
    const limit = options.limit || 1;
        const threshold = options.threshold || 0.5;
        
        
        let processedCount = 0;
        for (const file of this.musicFiles) {
        processedCount++;
        
            // Debug logları kaldırıldı
            
            // Debug logları kaldırıldı
            if (!file.fileWords || file.fileWords.length === 0) {
            continue;
        }
        
        const targetWords = {
                'file_words': file.fileWords || []
            };
            
            // Basit similarity hesaplama
            const searchFile = searchWords['file_words'] || [];
            const targetFile = targetWords['file_words'] || [];
            
            // Debug logları kaldırıldı - memory sorunu nedeniyle
            
            let exactMatches = 0;
            for (const searchWord of searchFile) {
                if (targetFile.includes(searchWord)) {
                    exactMatches++;
                }
            }
            
            // Düzeltilmiş similarity hesaplaması: arama dosyasındaki kelimelerin ne kadarı eşleşiyor
            const similarity = searchFile.length > 0 ? exactMatches / searchFile.length : 0;
            
            // DEBUG: Bülent Serttaş dosyası için özel similarity hesaplama
            
            
            
        
        if (similarity >= threshold) {
            candidates.push({
                path: file.path,
                similarity: similarity,
                file: file
            });
        }
    }
    
    if (candidates.length > 0) {
        
            // Sıralama: benzerlik skoruna göre, sonra tie-breaker
        candidates.sort((a, b) => {
                // 1. Önce similarity skoruna göre
                if (b.similarity !== a.similarity) {
                return b.similarity - a.similarity;
            }
            
                // 2. Tie-breaker: Eşleşen kelime sayısına göre (daha fazla eşleşme öncelikli)
                if (a.matchedWords !== b.matchedWords) {
                    return b.matchedWords - a.matchedWords;
                }
                
                // 3. Tie-breaker: Dosya adı uzunluğuna göre (kısa ad öncelikli)
                const aNameLength = path.basename(a.path).length;
                const bNameLength = path.basename(b.path).length;
                if (aNameLength !== bNameLength) {
                    return aNameLength - bNameLength;
                }
                
                // 4. Son tie-breaker: Alfabetik sıralama
                return path.basename(a.path).localeCompare(path.basename(b.path));
        });
        
        
        const bestMatch = candidates[0];
        const matches = candidates.slice(0, limit).map(candidate => ({
            path: candidate.path,
                similarity: candidate.similarity
        }));
        
        
        return {
            originalPath: searchPath,
            found: true,
            status: 'similar_found',
            matchType: 'benzerDosya',
            foundPath: bestMatch.path,
            similarity: bestMatch.similarity,
            processTime: Date.now() - startTime,
            matches: matches,
            debug: {
                searchedWords: searchWords.file_words || [],
                foundWords: bestMatch.file ? (bestMatch.file.fileWords || []) : []
            }
        };
    }
    
    return {
        originalPath: searchPath,
        found: false,
        status: 'not_found',
        processTime: Date.now() - startTime
    };
}

    /**
     * Sorgu tabanlı arama
     */
    searchByQuery(query, options = {}) {
        const startTime = Date.now();
        
        if (!this.musicFiles || this.musicFiles.length === 0) {
            return {
                query,
                found: false,
                status: 'database_error',
                processTime: Date.now() - startTime
            };
        }
        
        if (typeof query !== 'string' || query.trim().length === 0) {
            return {
                query,
                found: false,
                status: 'invalid_query',
                processTime: Date.now() - startTime
            };
        }
        
        const limit = options.limit || 10;
        const threshold = options.threshold || 0.5;
        
        const searchWords = this.extractWords(query, "");
        if (!searchWords || !searchWords.file_words || searchWords.file_words.length === 0) {
            return {
                query,
                found: false,
                status: 'no_search_words',
                processTime: Date.now() - startTime
            };
        }
        
        const candidates = [];
        
        for (const file of this.musicFiles) {
            if (!file.fileWords || file.fileWords.length === 0) {
                continue;
            }
            
            const targetWords = {
                'file_words': file.fileWords || []
            };
            
            // calculateSimilarity kaldırıldı - artık inline hesaplama yapılıyor
            
            if (similarity >= threshold) {
                candidates.push({
                    path: file.path,
                    similarity: similarity,
                    file: file
                });
            }
        }
        
        candidates.sort((a, b) => b.similarity - a.similarity);
        
        
        const matches = candidates.slice(0, limit);
        
        return {
            query,
            found: matches.length > 0,
            status: matches.length > 0 ? 'matches_found' : 'no_match',
            matches: matches,
            processTime: Date.now() - startTime,
            totalProcessed: this.musicFiles.length
        };
    }

}

// Global matcher instance kaldırıldı - aşağıda yeniden tanımlanacak

// SQLite veritabanı sistemi

let musicDatabase = null;
let databaseLoadTime = null;

// SQLite veritabanı instance'ını oluştur
const sqliteDb = new SimpleSQLiteDatabase();

async function loadDatabase() {
    try {
        console.log('📂 SQLite veritabanı yükleniyor...');
        
        // Veritabanı istatistiklerini kontrol et
        const stats = sqliteDb.getStats();
        
        if (stats.fileCount === 0) {
            console.log('⚠️ SQLite veritabanı boş, JSON\'dan migrasyon gerekli');
            
            // JSON dosyası var mı kontrol et
            const jsonDbPath = path.join(__dirname, '../simple_musicfiles.db.json');
            if (await fs.pathExists(jsonDbPath)) {
                console.log('🔄 JSON\'dan SQLite\'a migrasyon başlatılıyor...');
                
                // Migrasyon scriptini çalıştır
                const JSONToSQLiteMigrator = require('./migrate-to-sqlite');
                const migrator = new JSONToSQLiteMigrator();
                
                try {
                    await migrator.migrate();
                    migrator.close();
                    console.log('✅ Migrasyon tamamlandı');
                } catch (migrateError) {
                    console.error('❌ Migrasyon hatası:', migrateError);
                    return false;
                }
            } else {
                console.log('⚠️ JSON veritabanı bulunamadı, otomatik indexleme başlatılıyor...');
                
                // Otomatik indexleme yap
                const indexer = new SimpleIndexer();
                const musicFolder = '/Users/koray/Music/KorayMusics'; // Varsayılan müzik klasörü
                console.log(`🔄 Otomatik indexleme başlatılıyor: ${musicFolder}`);
                
                const result = await indexer.indexMusicDirectory(musicFolder);
                if (!result) {
                    console.error('❌ Otomatik indexleme başarısız');
                    return false;
                }
                
                console.log('✅ Otomatik indexleme tamamlandı');
            }
        }
        
        // Veritabanı istatistiklerini göster
        const finalStats = sqliteDb.getStats();
        console.log('📊 Veritabanı istatistikleri:');
        console.log(`   📁 Dosya sayısı: ${finalStats.fileCount}`);
        console.log(`   🔤 Kelime sayısı: ${finalStats.wordCount}`);
        console.log(`   💾 Boyut: ${(finalStats.dbSize / 1024 / 1024).toFixed(2)} MB`);
        
        musicDatabase = sqliteDb;
        databaseLoadTime = Date.now();
        
        console.log(`✅ SQLite veritabanı yüklendi: ${finalStats.fileCount} dosya`);
        
        return true;
    } catch (error) {
        console.error('❌ Veritabanı yükleme hatası:', error);
        console.error('❌ Hata detayları:', {
            code: error.code,
            errno: error.errno,
            syscall: error.syscall,
            path: error.path
        });
        return false;
    }
}

// Global arama fonksiyonları - SimpleWordMatcher kullanıyor
async function searchFile(filePath, options = {}) {
    console.log(`🔍 SQLite searchFile çağrıldı: ${filePath}`);
    
    try {
        // Veritabanı yüklü mü kontrol et
        if (!musicDatabase) {
            await loadDatabase();
        }
        
        const startTime = Date.now();
        const fileName = path.basename(filePath);
        const normalizedFileName = sqliteDb.normalizeText(fileName);
        
        console.log(`🔍 Arama terimi: "${normalizedFileName}"`);
        
        // Kademeli arama algoritması
        let results = sqliteDb.searchProgressive(normalizedFileName, 10);
        
        const processTime = Date.now() - startTime;
        
        if (results.length > 0) {
            const bestMatch = results[0];
            return {
                found: true,
                matches: results.map(result => ({
                    path: result.path,
                    fileName: result.fileName,
                    similarity: result.similarity_score || 1.0
                })),
                bestMatch: {
                    path: bestMatch.path,
                    fileName: bestMatch.fileName,
                    similarity: bestMatch.similarity_score || 1.0
                },
                matchType: 'benzerDosya',
                processTime: processTime,
                totalMatches: results.length
            };
        } else {
            return {
                found: false,
                matches: [],
                bestMatch: null,
                matchType: 'bulunamadi',
                processTime: processTime,
                totalMatches: 0
            };
        }
        
    } catch (error) {
        console.error('❌ searchFile hatası:', error);
        return {
            found: false,
            matches: [],
            bestMatch: null,
            matchType: 'hata',
            processTime: 0,
            totalMatches: 0,
            error: error.message
        };
    }
}

async function searchByQuery(query, options = {}) {
    console.log(`🔍 SQLite searchByQuery çağrıldı: ${query}`);
    
    try {
        // Veritabanı yüklü mü kontrol et
        if (!musicDatabase) {
            await loadDatabase();
        }
        
        const startTime = Date.now();
        const normalizedQuery = musicDatabase.normalizeText(query);
        
        console.log(`🔍 Arama terimi: "${normalizedQuery}"`);
        
        // 1. Basit arama
        console.log(`🔍 DEBUG: musicDatabase:`, musicDatabase ? 'var' : 'null');
        console.log(`🔍 DEBUG: Kademeli arama başlatılıyor...`);
        let results = musicDatabase.searchProgressive(normalizedQuery, 20);
        console.log(`🔍 DEBUG: Kademeli arama sonucu: ${results.length} adet`);
        
        const processTime = Date.now() - startTime;
        
        return {
            found: results.length > 0,
            matches: results.map(result => ({
                path: result.path,
                fileName: result.fileName,
                similarity: result.similarity_score || 1.0
            })),
            totalMatches: results.length,
            processTime: processTime,
            query: query,
            normalizedQuery: normalizedQuery
        };
        
    } catch (error) {
        console.error('❌ searchByQuery hatası:', error);
        return {
            found: false,
            matches: [],
            totalMatches: 0,
            processTime: 0,
            query: query,
            error: error.message
        };
    }
}

const app = express();
const PORT = process.env.PORT || 50001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: SERVER_VERSION, timestamp: new Date().toISOString() });
});

app.post('/api/search/files', async (req, res) => {
    console.log('🚨 API ENDPOINT ÇAĞRILDI: /api/search/files');
    try {
        const { paths, options = {} } = req.body;
        console.log('🚨 PATHS:', paths);
        console.log('🚨 OPTIONS:', options);
        
        if (!Array.isArray(paths)) {
            return res.status(400).json({
                status: 'error',
                message: 'paths parametresi dizi olmalı'
            });
        }
        
        const startTime = Date.now();
        const results = [];
        const matchDetails = {
            tamYolEsleme: { count: 0, time: 0 },
            ayniKlasorFarkliUzanti: { count: 0, time: 0 },
            farkliKlasorveUzanti: { count: 0, time: 0 },
            benzerDosya: { count: 0, time: 0 }
        };
        
        for (const searchPath of paths) {
            console.log('🚨 SEARCHFILE ÇAĞIRILIYOR:', searchPath);
            const result = await searchFile(searchPath, options);
            console.log('🚨 SEARCHFILE SONUCU:', result.found, result.matches?.length);
            results.push(result);
            
            if (result.found && result.matchType) {
                matchDetails[result.matchType].count++;
                matchDetails[result.matchType].time += result.processTime;
            }
        }
        
        const executionTime = Date.now() - startTime;
        
        // Sadeleştirilmiş istatistikler - duplikasyon kaldırıldı
        const processStats = {
            totalFilesProcessed: musicDatabase ? musicDatabase.getFileCount() : 0,
            timestamp: new Date().toISOString(),
            serverVersion: SERVER_VERSION
        };
        
        res.json({
            status: 'success',
            version: SERVER_VERSION,
            data: results,
            stats: {
                totalProcessed: paths.length,
                executionTime: executionTime,
                averageProcessTime: Math.round(executionTime / paths.length),
                matchDetails: matchDetails
            },
            processStats: processStats  // Sadeleştirilmiş - duplikasyon yok
        });
        
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Arama sırasında hata oluştu',
            error: error.message,
            details: error.stack
        });
    }
});

// DEPRECATED: GET /api/search kaldırıldı - POST /api/search/query kullanın

// Yeni: Sorgu tabanlı arama endpointi
app.post('/api/search/query', async (req, res) => {
    try {
        const { query, options = {} } = req.body;
        if (typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({ status: 'error', message: 'query parametresi zorunlu ve string olmalı' });
        }

        const startTime = Date.now();
        const result = await searchByQuery(query, options);
        const executionTime = Date.now() - startTime;

        res.json({
            status: 'success',
            version: SERVER_VERSION,
            data: result,
            stats: {
                totalProcessed: 1,
                executionTime,
                averageProcessTime: executionTime
            }
        });
    } catch (error) {
        console.error('Query search error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            version: SERVER_VERSION,
            message: 'Sorgu araması sırasında hata oluştu',
            error: error.message,
            details: error.stack
        });
    }
});

// DEPRECATED: Bu endpoint kaldırıldı - /api/search/query kullanın

// Global missing files endpoint
app.get('/api/playlistsong/global-missing', async (req, res) => {
    try {
        // Python'daki gibi iki ayrı klasör kullan
        const settingsPath = path.join(__dirname, '..', 'py', 'settings.json');
        let virtualdjRoot = '/Users/koray/Library/Application Support/VirtualDJ';
        
        if (await fs.pathExists(settingsPath)) {
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            if (settings.virtualdj_root) {
                virtualdjRoot = settings.virtualdj_root;
            }
        }
        
        const playlistsFolders = path.join(virtualdjRoot, 'Folders');
        const playlistsMyLists = path.join(virtualdjRoot, 'MyLists');
        
        // Python'daki gibi os.walk benzeri recursive tarama
        async function getAllPlaylists(dirPath) {
            const playlists = [];
            try {
                const items = await fs.readdir(dirPath);
                for (const item of items) {
                    const fullPath = path.join(dirPath, item);
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.isDirectory()) {
                        // Alt klasörleri recursive olarak tara
                        const subPlaylists = await getAllPlaylists(fullPath);
                        playlists.push(...subPlaylists);
                    } else if (item.endsWith('.vdjfolder')) {
                        playlists.push(fullPath);
                    }
                }
            } catch (error) {
                console.error(`Klasör okunamadı: ${dirPath}`, error.message);
            }
            return playlists;
        }
        
        let allPlaylists = [];
        
        // Folders klasöründeki playlist'leri tara - PARALEL
        const folderPromises = [];
        if (await fs.pathExists(playlistsFolders)) {
            folderPromises.push(getAllPlaylists(playlistsFolders));
        }
        
        // MyLists klasöründeki playlist'leri tara - PARALEL
        if (await fs.pathExists(playlistsMyLists)) {
            folderPromises.push(getAllPlaylists(playlistsMyLists));
        }
        
        // Tüm klasörleri paralel olarak tara
        const results = await Promise.all(folderPromises);
        for (const result of results) {
            allPlaylists.push(...result);
        }
        
        console.log(`Toplam ${allPlaylists.length} playlist bulundu`);
        
        const allMissingFiles = [];
        const missingFilePaths = new Set();
        
        // XML parser'ı bir kez oluştur - PERFORMANS OPTİMİZASYONU
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser();
        
        let virtualFolderCount = 0;
        
        for (const playlistPath of allPlaylists) {
            try {
                const stats = await fs.stat(playlistPath);
                if (stats.size < 1000) continue; // 1KB'dan küçükse atla
                
                const content = await fs.readFile(playlistPath, 'utf8');
                
                // VirtualFolder içermiyorsa atla - PERFORMANS OPTİMİZASYONU
                if (!content.includes('<VirtualFolder') || !content.includes('<song')) {
                    continue;
                }
                
                virtualFolderCount++;
                
                const result = await parser.parseStringPromise(content);
                
                const playlistName = path.basename(playlistPath, '.vdjfolder');
                let songs = [];
                
                // VirtualFolder yapısını kontrol et - PYTHON GİBİ SADELEŞTİRİLMİŞ
                if (result.VirtualFolder && result.VirtualFolder.song) {
                    songs = Array.isArray(result.VirtualFolder.song) 
                        ? result.VirtualFolder.song 
                        : [result.VirtualFolder.song];
                } else {
                    // Python gibi - FavoriteFolder'ı atla (çok yavaş)
                    continue;
                }
                
                for (const song of songs) {
                    const filePath = song.$.path;
                    if (filePath && !(await fs.pathExists(filePath))) {
                        if (!missingFilePaths.has(filePath)) {
                            missingFilePaths.add(filePath);
                            
                            // Sadece dosya yoksa ekle - benzerlik araması yapma
                            // Artist ve title'ı birleştir
                            const artist = song.$.artist || '';
                            const title = song.$.title || '';
                            const fullTitle = artist && title ? `${artist} - ${title}` : (artist || title || 'Bilinmeyen');
                            
                            allMissingFiles.push({
                                originalPath: filePath,
                                playlistName: playlistName,
                                playlistPath: playlistPath,
                                fullTitle: fullTitle,
                                isFileExists: false,
                                found: false,
                                foundPath: null,
                                similarity: 0,
                                matchType: 'missing'
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Playlist okuma hatası ${playlistPath}:`, error);
            }
        }
        
        res.json({
            success: true,
            total_missing_files: allMissingFiles.length,
            unique_missing_files: allMissingFiles.length,
            playlists_checked: allPlaylists.length,
            missing_files: allMissingFiles
        });
        
    } catch (error) {
        console.error('Global missing files error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Eksik dosyalar alınırken hata oluştu',
            error: error.message
        });
    }
});

// Playlist listesi endpoint'i
app.get('/api/playlists/list', async (req, res) => {
    try {
        // Python'daki gibi iki ayrı klasör kullan
        const settingsPath = path.join(__dirname, '..', 'py', 'settings.json');
        let virtualdjRoot = '/Users/koray/Library/Application Support/VirtualDJ';
        
        if (await fs.pathExists(settingsPath)) {
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            if (settings.virtualdj_root) {
                virtualdjRoot = settings.virtualdj_root;
            }
        }
        
        // Python'daki gibi iki ayrı klasör
        const playlistsFolders = path.join(virtualdjRoot, 'Folders');
        const playlistsMyLists = path.join(virtualdjRoot, 'MyLists');
        
        // Python'daki build_playlist_tree fonksiyonunu implement et
        async function buildPlaylistTree(dirPath, isMyLists = false) {
            try {
                const items = await fs.readdir(dirPath);
                const result = [];
                
                // Gizli dosyaları filtrele
                const visibleItems = items.filter(item => !item.startsWith('.'));
                
                // Klasörleri ve playlist dosyalarını ayır
                const folders = [];
                const files = [];
                
                for (const item of visibleItems) {
                    const fullPath = path.join(dirPath, item);
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.isDirectory() || item.endsWith('.subfolders')) {
                        folders.push({ name: item, path: fullPath, isDir: stat.isDirectory() });
                    } else if (item.endsWith('.vdjfolder')) {
                        files.push({ name: item, path: fullPath });
                    }
                }
                
                // Klasörleri işle
                for (const folder of folders) {
                    if (folder.name === 'My Library.subfolders') {
                        continue; // Python'daki gibi atla
                    }
                    
                    const isSubfolder = folder.name.endsWith('.subfolders');
                    
                    if (isSubfolder || isMyLists) {
                        const children = await buildPlaylistTree(folder.path, isMyLists);
                        if (children.length > 0) {
                            result.push({
                                id: Buffer.from(folder.path).toString('hex'),
                                name: folder.name.replace('.subfolders', ''),
                                path: folder.path,
                                type: 'folder',
                                children: children
                            });
                        }
                    }
                }
                
                // Playlist dosyalarını işle
                for (const file of files) {
                    try {
                        const content = await fs.readFile(file.path, 'utf8');
                        if (!content.trim()) {
                            console.log(`Boş playlist dosyası: ${file.path}`);
                            continue;
                        }
                        
                        // XML parsing ile şarkı sayısını hesapla
                        const xml2js = require('xml2js');
                        const parser = new xml2js.Parser();
                        const result_xml = await parser.parseStringPromise(content);
                        
                        let songCount = 0;
                        if (result_xml && result_xml.VirtualFolder && result_xml.VirtualFolder.song) {
                            const songs = result_xml.VirtualFolder.song;
                            songCount = Array.isArray(songs) ? songs.length : 1;
                        }
                        
                        result.push({
                            id: Buffer.from(file.path).toString('hex'),
                            name: file.name.replace('.vdjfolder', ''),
                            path: file.path,
                            type: 'playlist',
                            songCount: songCount
                        });
                    } catch (error) {
                        console.error(`Playlist dosyası okunamadı: ${file.path}`, error.message);
                    }
                }
                
                // GELİŞTİRİLMİŞ SIRALAMA: Özel klasörler önce, sonra alfabetik
                return result.sort((a, b) => {
                    // 1. Tip sıralaması (klasör önce)
                    const aType = a.type === 'folder' ? 0 : 1;
                    const bType = b.type === 'folder' ? 0 : 1;
                    if (aType !== bType) return aType - bType;
                    
                    // 2. Özel klasör önceliği
                    if (a.type === 'folder' && b.type === 'folder') {
                        const aName = a.name.toLowerCase();
                        const bName = b.name.toLowerCase();
                        
                        // Özel klasör öncelik sırası
                        const specialFolders = [
                            'mylists',      // MyLists en üstte
                            'serato',       // Serato ikinci
                            'my library',   // My Library üçüncü
                            'favorites',    // Favorites dördüncü
                            'history'       // History beşinci
                        ];
                        
                        const aSpecial = specialFolders.findIndex(special => aName.includes(special));
                        const bSpecial = specialFolders.findIndex(special => bName.includes(special));
                        
                        // Her ikisi de özel klasörse
                        if (aSpecial !== -1 && bSpecial !== -1) {
                            return aSpecial - bSpecial;
                        }
                        // Sadece a özel klasörse
                        if (aSpecial !== -1 && bSpecial === -1) {
                            return -1;
                        }
                        // Sadece b özel klasörse  
                        if (aSpecial === -1 && bSpecial !== -1) {
                            return 1;
                        }
                    }
                    
                    // 3. Alfabetik sıralama
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });
            } catch (error) {
                console.error(`Klasör okunamadı: ${dirPath}`, error.message);
                return [];
            }
        }
        
        // Her iki klasörden de playlist'leri al
        const foldersTree = await buildPlaylistTree(playlistsFolders);
        const mylistsTree = await buildPlaylistTree(playlistsMyLists, true);
        
        // İki ağacı birleştir
        const combinedTree = [];
        
        // Folders klasörü varsa ekle
        if (await fs.pathExists(playlistsFolders) && foldersTree.length > 0) {
            combinedTree.push({
                id: Buffer.from(playlistsFolders).toString('hex'),
                name: 'Folders',
                path: playlistsFolders,
                type: 'folder',
                children: foldersTree
            });
        }
        
        // MyLists klasörü varsa ekle
        if (await fs.pathExists(playlistsMyLists) && mylistsTree.length > 0) {
            combinedTree.push({
                id: Buffer.from(playlistsMyLists).toString('hex'),
                name: 'MyLists',
                path: playlistsMyLists,
                type: 'folder',
                children: mylistsTree
            });
        }
        
        // İstatistikleri hesapla (Python'daki gibi recursive)
        function countNodes(tree) {
            let total = 0;
            for (const item of tree) {
                total++;
                if (item.children) {
                    total += countNodes(item.children);
                }
            }
            return total;
        }
        
        function countByType(tree, type) {
            let count = 0;
            for (const item of tree) {
                if (item.type === type) {
                    count++;
                }
                if (item.children) {
                    count += countByType(item.children, type);
                }
            }
            return count;
        }
        
        const stats = {
            totalNodes: countNodes(combinedTree),
            folders: countByType(combinedTree, 'folder'),
            playlists: countByType(combinedTree, 'playlist')
        };
        
        res.json({
            success: true,
            data: combinedTree,
            stats: stats
        });
        
    } catch (error) {
        console.error('Playlist list error:', error);
        res.status(500).json({
            success: false,
            message: 'Playlist listesi alınırken hata oluştu',
            error: error.message
        });
    }
});

// Port bilgisi endpoint'i
app.get('/api/port', (req, res) => {
    res.json({
        status: 'ok',
        port: PORT,
        host: 'localhost',
        apiUrl: `http://localhost:${PORT}/api`
    });
});

// Test endpoint'i
app.get('/api/test', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Settings endpoints
app.get('/api/settings', async (req, res) => {
    try {
        const settingsPath = path.join(__dirname, '..', 'py', 'settings.json');
        
        if (await fs.pathExists(settingsPath)) {
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            res.json(settings);
        } else {
            // Varsayılan ayarları döndür
            const defaultSettings = {
                music_folder: '/Users/koray/Music',
                virtualdj_root: '/Users/koray/Library/Application Support/VirtualDJ',
                last_updated: null
            };
            res.json(defaultSettings);
        }
    } catch (error) {
        console.error('Settings get error:', error);
        res.status(500).json({
            success: false,
            message: 'Ayarlar yüklenirken hata oluştu',
            error: error.message
        });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const settingsPath = path.join(__dirname, '..', 'py', 'settings.json');
        const settings = req.body;
        
        // Ayarları dosyaya kaydet
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
        
        res.json({
            success: true,
            message: 'Ayarlar başarıyla kaydedildi'
        });
    } catch (error) {
        console.error('Settings save error:', error);
        res.status(500).json({
            success: false,
            message: 'Ayarlar kaydedilirken hata oluştu',
            error: error.message
        });
    }
});

// Playlist güncelleme endpoint'leri
app.post('/api/playlistsong/update', async (req, res) => {
    try {
        const { playlistPath, items } = req.body;
        
        if (!playlistPath || !items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                error: 'playlistPath ve items gerekli'
            });
        }
        
        // Playlist dosyasını oku
        const content = await fs.readFile(playlistPath, 'utf8');
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(content);
        
        if (!result.VirtualFolder || !result.VirtualFolder.song) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz playlist formatı'
            });
        }
        
        let songs = result.VirtualFolder.song;
        if (!Array.isArray(songs)) {
            songs = [songs];
        }
        
        let updatedCount = 0;
        for (const item of items) {
            const { oldPath, newPath } = item;
            for (const song of songs) {
                if (song.$ && song.$.path === oldPath) {
                    song.$.path = newPath;
                    updatedCount++;
                }
            }
        }
        
        if (updatedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Hiçbir şarkı güncellenemedi',
                details: { items: items }
            });
        }
        
        // XML'i geri yaz
        const builder = new xml2js.Builder();
        const xml = builder.buildObject(result);
        await fs.writeFile(playlistPath, xml);
        
        res.json({
            success: true,
            message: `${updatedCount} şarkı bu playlist'te güncellendi`
        });
    } catch (error) {
        console.error('Playlist update error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

app.post('/api/playlistsong/global-update', async (req, res) => {
    try {
        console.log('Global update request body:', JSON.stringify(req.body, null, 2));
        const { items, updateAllPlaylists = true } = req.body;
        
        if (!items || !Array.isArray(items)) {
            console.log('Invalid items:', items);
            return res.status(400).json({
                success: false,
                error: 'Güncellenecek öğe bulunamadı'
            });
        }
        
        // Python'daki gibi iki ayrı klasör kullan
        const settingsPath = path.join(__dirname, '..', 'py', 'settings.json');
        let virtualdjRoot = '/Users/koray/Library/Application Support/VirtualDJ';
        
        if (await fs.pathExists(settingsPath)) {
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            if (settings.virtualdj_root) {
                virtualdjRoot = settings.virtualdj_root;
            }
        }
        
        const playlistsFolders = path.join(virtualdjRoot, 'Folders');
        const playlistsMyLists = path.join(virtualdjRoot, 'MyLists');
        
        // Python'daki gibi os.walk benzeri recursive tarama
        async function getAllPlaylists(dirPath) {
            const playlists = [];
            try {
                const items = await fs.readdir(dirPath);
                for (const item of items) {
                    const fullPath = path.join(dirPath, item);
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.isDirectory()) {
                        // Alt klasörleri recursive olarak tara
                        const subPlaylists = await getAllPlaylists(fullPath);
                        playlists.push(...subPlaylists);
                    } else if (item.endsWith('.vdjfolder')) {
                        playlists.push(fullPath);
                    }
                }
            } catch (error) {
                console.error(`Klasör okunamadı: ${dirPath}`, error.message);
            }
            return playlists;
        }
        
        let allPlaylists = [];
        
        // Folders klasöründeki playlist'leri tara
        if (await fs.pathExists(playlistsFolders)) {
            const foldersPlaylists = await getAllPlaylists(playlistsFolders);
            allPlaylists.push(...foldersPlaylists);
        }
        
        // MyLists klasöründeki playlist'leri tara
        if (await fs.pathExists(playlistsMyLists)) {
            const mylistsPlaylists = await getAllPlaylists(playlistsMyLists);
            allPlaylists.push(...mylistsPlaylists);
        }
        
        let totalUpdated = 0;
        let totalPlaylistsUpdated = 0;
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser();
        const builder = new xml2js.Builder();
        
        for (const playlistPath of allPlaylists) {
            try {
                const content = await fs.readFile(playlistPath, 'utf8');
                const result = await parser.parseStringPromise(content);
                
                if (!result.VirtualFolder || !result.VirtualFolder.song) continue;
                
                let songs = result.VirtualFolder.song;
                if (!Array.isArray(songs)) {
                    songs = [songs];
                }
                
                let playlistUpdated = false;
                for (const song of songs) {
                    for (const item of items) {
                        if (song.$ && song.$.path === item.oldPath) {
                            song.$.path = item.newPath;
                            playlistUpdated = true;
                            totalUpdated++;
                        }
                    }
                }
                
                if (playlistUpdated) {
                    const xml = builder.buildObject(result);
                    await fs.writeFile(playlistPath, xml);
                    totalPlaylistsUpdated++;
                }
            } catch (error) {
                console.error(`Playlist ${playlistPath} güncellenirken hata:`, error);
            }
        }
        
        res.json({
            success: true,
            message: `${totalUpdated} şarkı ${totalPlaylistsUpdated} playlist'te güncellendi`,
            totalUpdated,
            totalPlaylistsUpdated
        });
    } catch (error) {
        console.error('Global playlist update error:', error);
        res.status(500).json({
            success: false,
            message: 'Global playlist güncellenirken hata oluştu',
            error: error.message
        });
    }
});

// Playlist okuma endpoint'i
app.post('/api/playlistsongs/read', async (req, res) => {
    try {
        const { playlistPath } = req.body;
        
        if (!playlistPath) {
            return res.status(400).json({
                success: false,
                error: 'playlistPath gerekli'
            });
        }
        
        if (!await fs.pathExists(playlistPath)) {
            return res.status(404).json({
                success: false,
                error: 'Playlist dosyası bulunamadı'
            });
        }
        
        const content = await fs.readFile(playlistPath, 'utf8');
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(content);
        
        // VirtualFolder yapısını kontrol et
        if (result.VirtualFolder && result.VirtualFolder.song) {
            // Normal VirtualFolder yapısı
        } else if (result.FavoriteFolder && result.FavoriteFolder.$.path) {
            // FavoriteFolder yapısı - VirtualDJ gibi recursive tarama yap
            const folderPath = result.FavoriteFolder.$.path;
            console.log(`FavoriteFolder detected, recursively scanning path: ${folderPath}`);
            
            try {
                // Recursive dosya tarama fonksiyonu
                async function scanDirectoryRecursively(dirPath) {
                    const allFiles = [];
                    
                    async function scanDir(currentPath) {
                        try {
                            const items = await fs.readdir(currentPath);
                            
                            for (const item of items) {
                                const fullPath = path.join(currentPath, item);
                                const stat = await fs.stat(fullPath);
                                
                                if (stat.isDirectory()) {
                                    // Alt klasörü recursive olarak tara
                                    await scanDir(fullPath);
                                } else if (stat.isFile()) {
                                    // Dosya uzantısını kontrol et
                                    const ext = path.extname(item).toLowerCase();
                                    const supportedExts = ['.mp3', '.wav', '.m4a', '.flac', '.mp4', '.avi', '.mkv', '.ogg', '.aac', '.wma'];
                                    
                                    if (supportedExts.includes(ext)) {
                                        allFiles.push(fullPath);
                                    }
                                }
                            }
                        } catch (error) {
                            console.warn(`Klasör taranamadı: ${currentPath}`, error.message);
                        }
                    }
                    
                    await scanDir(dirPath);
                    return allFiles;
                }
                
                const allMusicFiles = await scanDirectoryRecursively(folderPath);
                console.log(`Found ${allMusicFiles.length} music files in ${folderPath}`);
                
                const songList = await Promise.all(allMusicFiles.map(async (filePath, index) => {
                    const fileName = path.basename(filePath);
                    const parsedName = path.parse(fileName);
                    
                    // Dosya adından artist ve title çıkarmaya çalış
                    let artist = '';
                    let title = parsedName.name;
                    
                    // "Artist - Title" formatını kontrol et
                    const dashIndex = parsedName.name.indexOf(' - ');
                    if (dashIndex > 0) {
                        artist = parsedName.name.substring(0, dashIndex).trim();
                        title = parsedName.name.substring(dashIndex + 3).trim();
                    }
                    
                    return {
                        file: filePath,
                        name: fileName,
                        artist: artist,
                        title: title,
                        duration: '0:00',
                        isFileExists: await fs.pathExists(filePath)
                    };
                }));
                
                const stats = {
                    totalSongs: songList.length,
                    existingSongs: songList.filter(song => song.isFileExists).length,
                    missingSongs: songList.filter(song => !song.isFileExists).length
                };
                
                return res.json({
                    success: true,
                    songs: songList,
                    stats: stats
                });
            } catch (error) {
                console.error(`FavoriteFolder path okunamadı: ${folderPath}`, error.message);
                return res.json({
                    success: true,
                    songs: []
                });
            }
        } else {
            return res.json({
                success: true,
                songs: []
            });
        }
        
        let songs = result.VirtualFolder.song;
        if (!Array.isArray(songs)) {
            songs = [songs];
        }
        
        const songList = await Promise.all(songs.map(async song => {
            const filePath = song.$.path || '';
            return {
                file: filePath,
                name: song.$.name || (filePath ? path.basename(filePath) : ''),
                artist: song.$.artist || '',
                title: song.$.title || '',
                duration: song.$.duration || '0:00',
                isFileExists: filePath ? await fs.pathExists(filePath) : false
            };
        }));
        
        const stats = {
            totalSongs: songList.length,
            existingSongs: songList.filter(song => song.isFileExists).length,
            missingSongs: songList.filter(song => !song.isFileExists).length
        };
        
        res.json({
            success: true,
            songs: songList,
            stats: stats
        });
    } catch (error) {
        console.error('Playlist read error:', error);
        res.status(500).json({
            success: false,
            message: 'Playlist okunurken hata oluştu',
            error: error.message
        });
    }
});

// Playlist'ten kaldırma endpoint'i
app.post('/api/playlistsong/remove-from-all', async (req, res) => {
    try {
        const { songPath } = req.body;
        
        if (!songPath) {
            return res.status(400).json({
                success: false,
                error: 'songPath parametresi gerekli'
            });
        }
        
        // Python'daki gibi iki ayrı klasör kullan
        const settingsPath = path.join(__dirname, '..', 'py', 'settings.json');
        let virtualdjRoot = '/Users/koray/Library/Application Support/VirtualDJ';
        
        if (await fs.pathExists(settingsPath)) {
            const settingsData = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            if (settings.virtualdj_root) {
                virtualdjRoot = settings.virtualdj_root;
            }
        }
        
        const playlistsFolders = path.join(virtualdjRoot, 'Folders');
        const playlistsMyLists = path.join(virtualdjRoot, 'MyLists');
        
        // Python'daki gibi os.walk benzeri recursive tarama
        async function getAllPlaylists(dirPath) {
            const playlists = [];
            try {
                const items = await fs.readdir(dirPath);
                for (const item of items) {
                    const fullPath = path.join(dirPath, item);
                    const stat = await fs.stat(fullPath);
                    
                    if (stat.isDirectory()) {
                        // Alt klasörleri recursive olarak tara
                        const subPlaylists = await getAllPlaylists(fullPath);
                        playlists.push(...subPlaylists);
                    } else if (item.endsWith('.vdjfolder')) {
                        playlists.push(fullPath);
                    }
                }
            } catch (error) {
                console.error(`Klasör okunamadı: ${dirPath}`, error.message);
            }
            return playlists;
        }
        
        let allPlaylists = [];
        
        // Folders klasöründeki playlist'leri tara
        if (await fs.pathExists(playlistsFolders)) {
            const foldersPlaylists = await getAllPlaylists(playlistsFolders);
            allPlaylists.push(...foldersPlaylists);
        }
        
        // MyLists klasöründeki playlist'leri tara
        if (await fs.pathExists(playlistsMyLists)) {
            const mylistsPlaylists = await getAllPlaylists(playlistsMyLists);
            allPlaylists.push(...mylistsPlaylists);
        }
        
        let totalRemoved = 0;
        const removedFromPlaylists = [];
        let totalPlaylistsChecked = 0;
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser();
        const builder = new xml2js.Builder();
        
        // Path karşılaştırması için normalize et
        function normalizePath(path) {
            if (!path) return "";
            return path.normalize().toLowerCase().trim();
        }
        
        const targetPathNormalized = normalizePath(songPath);
        
        for (const playlistPath of allPlaylists) {
            try {
                totalPlaylistsChecked++;
                const content = await fs.readFile(playlistPath, 'utf8');
                const result = await parser.parseStringPromise(content);
                
                if (!result.VirtualFolder || !result.VirtualFolder.song) continue;
                
                let songs = result.VirtualFolder.song;
                if (!Array.isArray(songs)) {
                    songs = [songs];
                }
                
                const originalLength = songs.length;
                
                // Şarkıyı bul ve kaldır - song.$.path kullan
                songs = songs.filter(song => {
                    const songPathNormalized = normalizePath(song.$ && song.$.path);
                    return songPathNormalized !== targetPathNormalized;
                });
                
                if (songs.length < originalLength) {
                    const playlistName = path.basename(playlistPath, '.vdjfolder');
                    const removedCount = originalLength - songs.length;
                    
                    removedFromPlaylists.push({
                        playlistName: playlistName,
                        playlistPath: playlistPath,
                        removedCount: removedCount
                    });
                    
                    // XML'i güncelle
                    if (songs.length > 0) {
                        result.VirtualFolder.song = songs;
                    } else {
                        // Eğer hiç şarkı kalmadıysa, song elementini kaldır
                        delete result.VirtualFolder.song;
                    }
                    
                    const xml = builder.buildObject(result);
                    await fs.writeFile(playlistPath, xml);
                    totalRemoved += removedCount;
                }
            } catch (error) {
                console.error(`Playlist ${playlistPath} güncellenirken hata:`, error);
            }
        }
        
        res.json({
            success: true,
            songPath: songPath,
            removedFromPlaylists: removedFromPlaylists,
            totalPlaylistsChecked: totalPlaylistsChecked,
            totalRemovedCount: totalRemoved
        });
    } catch (error) {
        console.error('Remove from all playlists error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            songPath: req.body.songPath || "",
            removedFromPlaylists: [],
            totalPlaylistsChecked: 0,
            totalRemovedCount: 0
        });
    }
});

// BASİT İNDEXLEYİCİ SINIFI
class SimpleIndexer {
    constructor() {
        this.musicFiles = [];
        this.indexedCount = 0;
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
        
        // NFKC normalizasyonu ve karakter dönüşümü
        normalized = normalized.normalize("NFKC");
        normalized = normalized.split('').map(c => charMap[c] || c).join('');
        normalized = normalized.toLowerCase();
        
        // Sadece alfanumerik ve boşluk karakterlerini koru
        normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
        
        // Çoklu boşlukları tek boşluğa çevir
        normalized = normalized.replace(/\s+/g, ' ');
        
        return normalized.trim();
    }

    /**
     * Dosya adından basit kelimeleri çıkar
     */
    extractSimpleWords(fileName) {
        const fileNameWithoutExt = path.parse(fileName).name;
        
        // PARANTEZLERİ KALDIRMA - tüm kelimeleri al
        const cleanedName = fileNameWithoutExt
            .replace(/\s+/g, ' ')       // Çoklu boşlukları tek boşluğa
            .trim();
        
        // Kelime ayırma - basit
        const words = cleanedName
            .split(/[-_\s\.\,\&\+\|\~\!\@\#\$\%\^\*\(\)\[\]\{\}]+/)
            .map(word => word.trim())
            .filter(word => word.length > 1)
            .map(word => this.normalizeText(word))
            .filter(word => word.length > 1);
        
        return words;
    }

    /**
     * Klasör yolundan kelimeleri çıkar
     */
    extractFolderWords(filePath) {
        const pathParts = path.dirname(filePath)
            .split(path.sep)
            .filter(p => p && p !== "." && !p.startsWith("/"));
        
        const folderWords = [];
        for (const folder of pathParts) {
            const normalizedFolder = this.normalizeText(folder);
            const words = normalizedFolder.split(/\s+/).filter(w => w.length > 1);
            folderWords.push(...words);
        }
        
        return folderWords;
    }

    /**
     * Tek dosyayı indexle
     */
    indexFile(filePath) {
        try {
            const fileName = path.basename(filePath);
            const fileExt = path.extname(fileName).toLowerCase();
            
            // Desteklenen formatları kontrol et
            const supportedFormats = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.mp4', '.avi', '.mkv'];
            if (!supportedFormats.includes(fileExt)) {
                return null;
            }
            
            // Dosya kelimelerini çıkar
            const fileWords = this.extractSimpleWords(fileName);
            
            // Klasör kelimelerini çıkar
            const folderWords = this.extractFolderWords(filePath);
            
            // Tüm kelimeleri birleştir
            const allWords = [...folderWords, ...fileWords];
            
            const indexedFile = {
                path: filePath,
                fileName: fileName,
                normalizedFileName: this.normalizeText(path.parse(fileName).name)
            };
            
            this.musicFiles.push(indexedFile);
            this.indexedCount++;
            
            if (this.indexedCount % 1000 === 0) {
                console.log(`📊 ${this.indexedCount} dosya indexlendi...`);
            }
            
            return indexedFile;
            
        } catch (error) {
            console.error(`❌ Dosya indexleme hatası: ${filePath} - ${error.message}`);
            return null;
        }
    }

    /**
     * Klasörü recursive olarak tara
     */
    async scanDirectory(dirPath) {
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    // Alt klasörü tara
                    await this.scanDirectory(fullPath);
                } else if (stat.isFile()) {
                    // Dosyayı indexle
                    this.indexFile(fullPath);
                }
            }
        } catch (error) {
            console.error(`❌ Klasör tarama hatası: ${dirPath} - ${error.message}`);
        }
    }

    /**
     * Ana indexleme işlemi
     */
    async indexMusicDirectory(musicPath) {
        console.log('🔍 BASİT İNDEXLEYİCİ BAŞLATILIYOR');
        console.log('='.repeat(80));
        console.log(`📁 Müzik klasörü: ${musicPath}`);
        console.log('─'.repeat(80));
        
        const startTime = Date.now();
        
        try {
            // Klasörü tara
            await this.scanDirectory(musicPath);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log('\n✅ İNDEXLEME TAMAMLANDI');
            console.log('─'.repeat(80));
            console.log(`📊 Toplam dosya: ${this.indexedCount}`);
            console.log(`⏱️ Süre: ${duration}ms (${(this.indexedCount / (duration / 1000)).toFixed(0)} dosya/sn)`);
            
            // JSON dosyasına kaydet - BASİT FORMAT
            const outputData = this.musicFiles;
            
            const outputPath = path.join(__dirname, '../simple_musicfiles.db.json');
            fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
            
            console.log(`💾 Veritabanı kaydedildi: ${outputPath}`);
            console.log(`📁 Dosya boyutu: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
            
            return outputData;
            
        } catch (error) {
            console.error('❌ İndexleme hatası:', error.message);
            return null;
        }
    }
}

// İndeks oluşturma endpoint'i
app.post('/api/index/create', async (req, res) => {
    try {
        const { musicFolder } = req.body;
        
        if (!musicFolder) {
            return res.status(400).json({
                success: false,
                error: 'musicFolder gerekli'
            });
        }
        
        console.log(`🔄 İndeksleme başlatılıyor: ${musicFolder}`);
        
        // SimpleIndexer'ı kullan
        const indexer = new SimpleIndexer();
        
        // İndeksleme işlemini başlat
        const result = await indexer.indexMusicDirectory(musicFolder);
        
        if (result) {
            // Veritabanını yeniden yükle
            musicDatabase = null;
            await loadDatabase();
            
            console.log(`✅ İndeksleme tamamlandı: ${result.totalFiles} dosya`);
            
            res.json({
                success: true,
                message: 'İndeksleme başarıyla tamamlandı',
                data: {
                    totalFiles: result.totalFiles,
                    version: result.version,
                    lastUpdate: result.lastUpdate,
                    databaseSize: result.musicFiles ? result.musicFiles.length : 0
                }
            });
        } else {
            console.error(`❌ İndeksleme hatası`);
            res.status(500).json({
                success: false,
                message: 'İndeks oluşturulurken hata oluştu',
                error: 'İndeksleme işlemi başarısız oldu'
            });
        }
    } catch (error) {
        console.error('Index create error:', error);
        res.status(500).json({
            success: false,
            message: 'İndeks oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

// İndeks durumu endpoint'i
app.get('/api/index/status', async (req, res) => {
    try {
        // Veritabanı yüklü mü kontrol et
        if (!musicDatabase) {
            await loadDatabase();
        }
        
        const stats = sqliteDb.getStats();
        
        res.json({
            success: true,
            version: SERVER_VERSION,
            indexed: stats.fileCount > 0,
            fileCount: stats.fileCount,
            wordCount: stats.wordCount,
            databaseSize: stats.dbSize,
            databasePath: stats.dbPath,
            lastModified: new Date().toISOString(),
            databaseType: 'SQLite'
        });
    } catch (error) {
        console.error('Index status error:', error);
        res.status(500).json({
            success: false,
            message: 'İndeks durumu alınırken hata oluştu',
            error: error.message
        });
    }
});

// Dosya streaming endpoint'i
app.post('/api/stream', async (req, res) => {
    try {
        const { filePath } = req.body;
        
        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: 'filePath gerekli'
            });
        }
        
        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'Dosya bulunamadı'
            });
        }
        
        // Dosya streaming için basit bir response
        res.json({
            success: true,
            message: 'Dosya streaming hazır',
            filePath
        });
    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({
            success: false,
            message: 'Dosya streaming hatası',
            error: error.message
        });
    }
});

// Server başlatma
async function startServer() {
    try {
        logInfo(`Server başlatılıyor... v${SERVER_VERSION}`, 'STARTUP');
        
        // Veritabanını yükle
        const dbLoaded = await loadDatabase();
        if (!dbLoaded) {
            logError(new Error('Veritabanı yüklenemedi'), 'STARTUP');
            process.exit(1);
        }
        
        // Server'ı başlat
        const server = app.listen(PORT, () => {
            logInfo(`🚀 Node.js API server başlatıldı: http://localhost:${PORT}`, 'STARTUP');
            logInfo(`📊 Veritabanı: ${musicDatabase ? musicDatabase.getFileCount() : 0} dosya`, 'STARTUP');
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logInfo('SIGTERM alındı, server kapatılıyor...', 'SHUTDOWN');
            server.close(() => {
                logInfo('Server kapatıldı', 'SHUTDOWN');
                process.exit(0);
            });
        });
        
        process.on('SIGINT', () => {
            logInfo('SIGINT alındı, server kapatılıyor...', 'SHUTDOWN');
            server.close(() => {
                logInfo('Server kapatıldı', 'SHUTDOWN');
                process.exit(0);
            });
        });
        
    } catch (error) {
        logError(error, 'STARTUP');
        process.exit(1);
    }
}

startServer();
