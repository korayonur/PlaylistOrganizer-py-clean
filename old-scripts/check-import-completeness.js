#!/usr/bin/env node

/**
 * Import Tamamlık Kontrol Scripti
 * /Users/koray/Music/KorayMusics klasöründeki tüm dosyaların veritabanında olup olmadığını kontrol eder
 */

const { getDatabase } = require('./shared/database');
const fs = require('fs');
const path = require('path');
const config = require('./shared/config');

class ImportChecker {
    constructor() {
        this.db = getDatabase().getDatabase();
        this.scanPath = '/Users/koray/Music/KorayMusics';
        this.musicExtensions = config.getImportPaths().musicExtensions;
        this.stats = {
            totalFiles: 0,
            foundInDb: 0,
            missingFromDb: 0,
            errors: 0,
            fileTypes: {},
            missingFiles: [],
            errorFiles: []
        };
    }

    /**
     * Dosya uzantısının müzik dosyası olup olmadığını kontrol et
     */
    isMusicFile(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        return this.musicExtensions.includes(ext);
    }

    /**
     * Tek bir dosyayı kontrol et
     */
    checkFile(filePath) {
        try {
            const fileName = path.basename(filePath);
            const stats = fs.statSync(filePath);
            
            if (!stats.isFile()) return;
            if (!this.isMusicFile(fileName)) return;

            this.stats.totalFiles++;
            
            // Dosya türü istatistiği
            const ext = path.extname(fileName).toLowerCase();
            this.stats.fileTypes[ext] = (this.stats.fileTypes[ext] || 0) + 1;

            // Veritabanında var mı kontrol et
            const dbRecord = this.db.prepare(`
                SELECT path, fileName, size, created_at 
                FROM music_files 
                WHERE path = ?
            `).get(filePath);

            if (dbRecord) {
                this.stats.foundInDb++;
                
                // Boyut kontrolü
                if (dbRecord.size !== stats.size) {
                    console.log(`⚠️  Boyut farkı: ${fileName} - FS: ${stats.size}, DB: ${dbRecord.size}`);
                }
            } else {
                this.stats.missingFromDb++;
                this.stats.missingFiles.push({
                    path: filePath,
                    fileName: fileName,
                    size: stats.size,
                    modified: stats.mtime
                });
            }

        } catch (error) {
            this.stats.errors++;
            this.stats.errorFiles.push({
                path: filePath,
                error: error.message
            });
            console.error(`❌ Dosya kontrol hatası: ${filePath} - ${error.message}`);
        }
    }

    /**
     * Klasörü recursive olarak tara
     */
    scanDirectory(dirPath) {
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stats = fs.statSync(fullPath);
                
                if (stats.isDirectory()) {
                    // Klasörü recursive olarak tara
                    this.scanDirectory(fullPath);
                } else {
                    // Dosyayı kontrol et
                    this.checkFile(fullPath);
                }
            }
        } catch (error) {
            console.error(`❌ Klasör tarama hatası: ${dirPath} - ${error.message}`);
            this.stats.errors++;
        }
    }

    /**
     * Ana kontrol fonksiyonu
     */
    async run() {
        console.log('🔍 Import Tamamlık Kontrolü Başlatılıyor...');
        console.log(`📁 Tarama yolu: ${this.scanPath}`);
        console.log(`🎵 Desteklenen formatlar: ${this.musicExtensions.join(', ')}`);
        console.log('');

        const startTime = process.hrtime.bigint();

        // Klasörü tara
        this.scanDirectory(this.scanPath);

        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1_000_000;

        // Sonuçları raporla
        this.generateReport(durationMs);
    }

    /**
     * Detaylı rapor oluştur
     */
    generateReport(durationMs) {
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║                IMPORT TAMAMLIK RAPORU                     ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');
        
        console.log(`\n📊 GENEL İSTATİSTİKLER:`);
        console.log(`   📁 Toplam dosya: ${this.stats.totalFiles.toLocaleString()}`);
        console.log(`   ✅ Veritabanında var: ${this.stats.foundInDb.toLocaleString()} (${((this.stats.foundInDb / this.stats.totalFiles) * 100).toFixed(1)}%)`);
        console.log(`   ❌ Veritabanında yok: ${this.stats.missingFromDb.toLocaleString()} (${((this.stats.missingFromDb / this.stats.totalFiles) * 100).toFixed(1)}%)`);
        console.log(`   ⚠️  Hatalı dosyalar: ${this.stats.errors.toLocaleString()}`);
        console.log(`   ⏱️  Tarama süresi: ${(durationMs / 1000).toFixed(2)} saniye`);

        console.log(`\n📈 DOSYA TÜRÜ DAĞILIMI:`);
        const sortedTypes = Object.entries(this.stats.fileTypes)
            .sort((a, b) => b[1] - a[1]);
        
        for (const [ext, count] of sortedTypes) {
            const percentage = ((count / this.stats.totalFiles) * 100).toFixed(1);
            console.log(`   ${ext}: ${count.toLocaleString()} dosya (${percentage}%)`);
        }

        // Eksik dosyaları raporla
        if (this.stats.missingFromDb > 0) {
            console.log(`\n❌ EKSİK DOSYALAR (İlk 20):`);
            this.stats.missingFiles.slice(0, 20).forEach((file, index) => {
                const sizeKB = Math.round(file.size / 1024);
                console.log(`   ${index + 1}. ${file.fileName} (${sizeKB} KB) - ${file.path}`);
            });

            if (this.stats.missingFromDb > 20) {
                console.log(`   ... ve ${this.stats.missingFromDb - 20} dosya daha`);
            }

            // Eksik dosyaları klasöre göre grupla
            console.log(`\n📂 EKSİK DOSYALAR KLASÖRE GÖRE:`);
            const missingByFolder = {};
            this.stats.missingFiles.forEach(file => {
                const folder = path.dirname(file.path).replace(this.scanPath, '');
                missingByFolder[folder] = (missingByFolder[folder] || 0) + 1;
            });

            const sortedFolders = Object.entries(missingByFolder)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            for (const [folder, count] of sortedFolders) {
                console.log(`   ${folder}: ${count} eksik dosya`);
            }
        }

        // Hatalı dosyaları raporla
        if (this.stats.errors > 0) {
            console.log(`\n⚠️  HATALI DOSYALAR (İlk 10):`);
            this.stats.errorFiles.slice(0, 10).forEach((file, index) => {
                console.log(`   ${index + 1}. ${file.path} - ${file.error}`);
            });
        }

        // Öneriler
        console.log(`\n💡 ÖNERİLER:`);
        if (this.stats.missingFromDb > 0) {
            console.log(`   🔄 Eksik ${this.stats.missingFromDb} dosya için import işlemini tekrar çalıştırın`);
            console.log(`   📝 Eksik dosyaları CSV olarak kaydetmek için: --export-missing`);
        }
        if (this.stats.errors > 0) {
            console.log(`   🔧 ${this.stats.errors} dosya için erişim sorunu var, izinleri kontrol edin`);
        }
        if (this.stats.missingFromDb === 0) {
            console.log(`   ✅ Tüm dosyalar başarıyla import edilmiş!`);
        }

        console.log('\n════════════════════════════════════════════════════════════\n');
    }

    /**
     * Eksik dosyaları CSV olarak kaydet
     */
    exportMissingFiles() {
        if (this.stats.missingFiles.length === 0) {
            console.log('✅ Eksik dosya yok, CSV kaydetmeye gerek yok.');
            return;
        }

        const csvPath = path.join(__dirname, 'missing-files-report.csv');
        const csvHeader = 'Dosya Adı,Yol,Boyut (KB),Değiştirilme Tarihi\n';
        
        const csvContent = this.stats.missingFiles.map(file => {
            const sizeKB = Math.round(file.size / 1024);
            const modifiedDate = file.modified.toISOString().split('T')[0];
            return `"${file.fileName}","${file.path}",${sizeKB},"${modifiedDate}"`;
        }).join('\n');

        fs.writeFileSync(csvPath, csvHeader + csvContent);
        console.log(`📄 Eksik dosyalar CSV olarak kaydedildi: ${csvPath}`);
    }
}

// Script çalıştırma
async function main() {
    const checker = new ImportChecker();
    
    // Komut satırı argümanlarını kontrol et
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('Import Tamamlık Kontrol Scripti');
        console.log('Kullanım: node check-import-completeness.js [seçenekler]');
        console.log('');
        console.log('Seçenekler:');
        console.log('  --export-missing    Eksik dosyaları CSV olarak kaydet');
        console.log('  --help, -h          Bu yardım mesajını göster');
        return;
    }

    try {
        await checker.run();
        
        if (args.includes('--export-missing')) {
            checker.exportMissingFiles();
        }
    } catch (error) {
        console.error('❌ Script hatası:', error.message);
        process.exit(1);
    }
}

// Script'i çalıştır
if (require.main === module) {
    main();
}

module.exports = ImportChecker;
