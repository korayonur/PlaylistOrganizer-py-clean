const fs = require('fs-extra');
const path = require('path');
const SQLiteDatabase = require('./database');

class JSONToSQLiteMigrator {
    constructor() {
        this.jsonDbPath = path.join(__dirname, '../simple_musicfiles.db.json');
        this.sqliteDb = new SQLiteDatabase();
    }

    async migrate() {
        try {
            console.log('🔄 JSON\'dan SQLite\'a veri migrasyonu başlatılıyor...');
            
            // JSON dosyasını oku
            if (!await fs.pathExists(this.jsonDbPath)) {
                throw new Error(`JSON veritabanı dosyası bulunamadı: ${this.jsonDbPath}`);
            }

            console.log('📂 JSON dosyası okunuyor...');
            const jsonData = await fs.readJson(this.jsonDbPath);
            
            if (!Array.isArray(jsonData)) {
                throw new Error('Geçersiz JSON formatı - Array bekleniyor');
            }

            console.log(`📊 ${jsonData.length} dosya bulundu`);

            // SQLite veritabanını temizle
            console.log('🧹 SQLite veritabanı temizleniyor...');
            this.sqliteDb.clear();

            // Verileri migrate et
            console.log('📥 Veriler SQLite\'a aktarılıyor...');
            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < jsonData.length; i++) {
                try {
                    const fileData = jsonData[i];
                    
                    // Gerekli alanları kontrol et
                    if (!fileData.path || !fileData.fileName || !fileData.normalizedFileName) {
                        console.warn(`⚠️ Geçersiz veri atlandı (${i + 1}/${jsonData.length}):`, fileData);
                        errorCount++;
                        continue;
                    }

                    // Müzik dosyasını ekle
                    const musicFileId = this.sqliteDb.insertMusicFile({
                        path: fileData.path,
                        fileName: fileData.fileName,
                        normalizedFileName: fileData.normalizedFileName,
                        extension: fileData.extension || null,
                        fileType: fileData.fileType || null,
                        size: fileData.size || null,
                        modifiedTime: fileData.modifiedTime || null,
                        mimeType: fileData.mimeType || null
                    });

                    // Kelimeleri ekle (eğer varsa)
                    if (fileData.indexedWords && Array.isArray(fileData.indexedWords)) {
                        this.sqliteDb.insertWords(musicFileId, fileData.indexedWords, 'general');
                    } else {
                        // Eğer indexedWords yoksa, normalizedFileName'den kelimeleri çıkar
                        const words = fileData.normalizedFileName.split(' ').filter(w => w.length > 0);
                        if (words.length > 0) {
                            this.sqliteDb.insertWords(musicFileId, words, 'general');
                        }
                    }

                    successCount++;
                    
                    // İlerleme göster
                    if ((i + 1) % 1000 === 0) {
                        console.log(`📈 İlerleme: ${i + 1}/${jsonData.length} (${Math.round((i + 1) / jsonData.length * 100)}%)`);
                    }

                } catch (error) {
                    console.error(`❌ Hata (${i + 1}/${jsonData.length}):`, error.message);
                    errorCount++;
                }
            }

            // İstatistikleri göster
            const stats = this.sqliteDb.getStats();
            console.log('\n✅ Migrasyon tamamlandı!');
            console.log('📊 İstatistikler:');
            console.log(`   ✅ Başarılı: ${successCount}`);
            console.log(`   ❌ Hatalı: ${errorCount}`);
            console.log(`   📁 Toplam dosya: ${stats.fileCount}`);
            console.log(`   🔤 Toplam kelime: ${stats.wordCount}`);
            console.log(`   💾 Veritabanı boyutu: ${(stats.dbSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   📍 Veritabanı yolu: ${stats.dbPath}`);

            // Performans testi
            console.log('\n🧪 Performans testi yapılıyor...');
            await this.performanceTest();

        } catch (error) {
            console.error('❌ Migrasyon hatası:', error);
            throw error;
        }
    }

    async performanceTest() {
        const testQueries = [
            'hande yener',
            'türkü',
            'düğün',
            'pop',
            'rock'
        ];

        console.log('🔍 Arama performans testi:');
        
        for (const query of testQueries) {
            const startTime = Date.now();
            const results = this.sqliteDb.searchFiles(query, 10);
            const endTime = Date.now();
            
            console.log(`   "${query}": ${results.length} sonuç (${endTime - startTime}ms)`);
        }

        // Benzerlik arama testi
        console.log('\n🎯 Benzerlik arama testi:');
        const similarityQuery = 'hande yener acele etme';
        const startTime = Date.now();
        const similarResults = this.sqliteDb.searchSimilar(similarityQuery, 0.3, 10);
        const endTime = Date.now();
        
        console.log(`   "${similarityQuery}": ${similarResults.length} benzer sonuç (${endTime - startTime}ms)`);
        
        if (similarResults.length > 0) {
            console.log('   En iyi eşleşmeler:');
            similarResults.slice(0, 3).forEach((result, index) => {
                console.log(`     ${index + 1}. ${result.fileName} (${(result.similarity_score * 100).toFixed(1)}%)`);
            });
        }
    }

    close() {
        this.sqliteDb.close();
    }
}

// Eğer doğrudan çalıştırılırsa migrasyonu başlat
if (require.main === module) {
    const migrator = new JSONToSQLiteMigrator();
    
    migrator.migrate()
        .then(() => {
            console.log('\n🎉 Migrasyon başarıyla tamamlandı!');
            migrator.close();
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Migrasyon başarısız:', error);
            migrator.close();
            process.exit(1);
        });
}

module.exports = JSONToSQLiteMigrator;
