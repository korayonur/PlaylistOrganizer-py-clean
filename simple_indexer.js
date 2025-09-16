/**
 * BASİT İNDEXLEYİCİ
 * Parantez sistemi olmadan, sadece kelime eşleşmesi
 */

const fs = require('fs');
const path = require('path');

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
        normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
        
        // Çoklu boşlukları tek boşluğa çevir
        normalized = normalized.replace(/\s+/g, ' ');
        
        return normalized.trim();
    }

    /**
     * Dosya adından basit kelimeleri çıkar
     */
    extractSimpleWords(fileName) {
        const fileNameWithoutExt = path.parse(fileName).name;
        
        // TÜM PARANTEZLERİ KALDIR - basit yaklaşım
        const cleanedName = fileNameWithoutExt
            .replace(/\([^)]*\)/g, '')  // (content)
            .replace(/\[[^\]]*\]/g, '') // [content]
            .replace(/\{[^}]*\}/g, '')  // {content}
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
                name: fileName,
                fileNameOnly: path.parse(fileName).name,
                normalizedName: this.normalizeText(path.parse(fileName).name),
                fileWords: fileWords,
                folderWords: folderWords,
                allWords: allWords,
                fileExtension: fileExt,
                indexedAt: new Date().toISOString()
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
            
            // JSON dosyasına kaydet
            const outputData = {
                version: "2.0-simple",
                lastUpdate: new Date().toISOString(),
                encoding: "utf-8",
                indexingMethod: "simple-word-matching",
                totalFiles: this.indexedCount,
                musicFiles: this.musicFiles
            };
            
            const outputPath = 'simple_musicfiles.db.json';
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

// Ana fonksiyon
async function main() {
    const indexer = new SimpleIndexer();
    const musicPath = '/Users/koray/Music/KorayMusics';
    
    const result = await indexer.indexMusicDirectory(musicPath);
    
    if (result) {
        console.log('\n🎯 ÖRNEK İNDEXLENMİŞ DOSYALAR:');
        console.log('─'.repeat(80));
        
        // İlk 5 dosyayı göster
        result.musicFiles.slice(0, 5).forEach((file, index) => {
            console.log(`${index + 1}. ${file.name}`);
            console.log(`   📁 ${file.path}`);
            console.log(`   🔍 Dosya kelimeleri: [${file.fileWords.join(', ')}]`);
            console.log(`   📁 Klasör kelimeleri: [${file.folderWords.join(', ')}]`);
            console.log('');
        });
    }
}

// Çalıştır
main();
