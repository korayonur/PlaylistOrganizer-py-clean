/**
 * TEST SİSTEMİ DOĞRULAMA ARACI
 * Test sisteminin manuel hesaplamalarının doğru olup olmadığını kontrol eder
 */

const fs = require('fs');
const path = require('path');

class TestSystemVerifier {
    constructor() {
        this.musicDatabase = null;
    }

    async loadDatabase() {
        if (this.musicDatabase) return this.musicDatabase;
        
        try {
            const dbPath = '/Users/koray/projects/PlaylistOrganizer-py/musicfiles.db.json';
            const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            this.musicDatabase = dbData;
            console.log(`📊 Veritabanı yüklendi: ${dbData.musicFiles.length} dosya`);
            return dbData;
        } catch (error) {
            console.error('❌ Veritabanı yükleme hatası:', error.message);
            return null;
        }
    }

    /**
     * Test sisteminin iddia ettiği manuel en iyi dosyayı kontrol et
     */
    async verifyManualBest(searchFileName, claimedBestPath) {
        console.log(`🔍 MANUEL EN İYİ DOSYA DOĞRULAMA`);
        console.log(`   Arama: ${searchFileName}`);
        console.log(`   İddia edilen en iyi: ${claimedBestPath}`);
        
        const db = await this.loadDatabase();
        if (!db) return;

        // İddia edilen dosya gerçekten veritabanında var mı?
        const claimedFile = db.musicFiles.find(f => 
            f.path === claimedBestPath || 
            f.path.includes(claimedBestPath) ||
            path.basename(f.path) === claimedBestPath
        );

        if (!claimedFile) {
            console.log(`❌ İDDİA EDİLEN DOSYA VERİTABANINDA YOK!`);
            console.log(`   Aranan: ${claimedBestPath}`);
            
            // Benzer dosyaları ara
            const similarFiles = db.musicFiles.filter(f => 
                f.path.toLowerCase().includes(path.basename(claimedBestPath, path.extname(claimedBestPath)).toLowerCase().substring(0, 10))
            );
            
            if (similarFiles.length > 0) {
                console.log(`\n📁 BENZERİ BULUNAN DOSYALAR:`);
                similarFiles.slice(0, 5).forEach((file, index) => {
                    console.log(`   ${index + 1}. ${file.name}`);
                    console.log(`      Yol: ${file.path}`);
                });
            }
            
            return false;
        } else {
            console.log(`✅ İddia edilen dosya veritabanında bulundu`);
            console.log(`   Gerçek yol: ${claimedFile.path}`);
            console.log(`   Dosya kelimeleri: [${claimedFile.fileWords.join(', ')}]`);
            console.log(`   Parantez kelimeleri: [${(claimedFile.parenthesesWords || []).join(', ')}]`);
            return true;
        }
    }

    /**
     * Başarısız testlerin manuel sonuçlarını doğrula
     */
    async verifyFailedTests() {
        console.log('🔍 BAŞARISIZ TEST DOĞRULAMA');
        console.log('='.repeat(50));

        const failedTests = [
            {
                search: "Bodrum Akşamları (Club Remix).mp4",
                claimedBest: "Bülent Serttaş - Bodrum Akşamları (Official Audio Music).m4a"
            },
            {
                search: "Loboda - Pulia Dura (Eddie G & Roma YNG Moombahton Remix) (1).mp3", 
                claimedBest: "Loboda - Pulia Dura (Eddie G & Roma YNG Moombahton Remix).mp3"
            },
            {
                search: "ASYA OLMAZ OLMAZ BU İŞ OLAMAZ(DJ FERYAL ASLAN& MURAT YAPRAK REMİX) (1).mp3",
                claimedBest: "ASYA OLMAZ OLMAZ BU İŞ OLAMAZ(DJ FERYAL ASLAN& MURAT YAPRAK REMİX).mp3"
            }
        ];

        for (const test of failedTests) {
            console.log(`\n${'-'.repeat(60)}`);
            const isValid = await this.verifyManualBest(test.search, test.claimedBest);
            
            if (!isValid) {
                console.log(`🔴 TEST SİSTEMİ HATASI: Bu dosya veritabanında yok!`);
            } else {
                console.log(`🟢 TEST SİSTEMİ DOĞRU: Bu dosya gerçekten veritabanında var`);
            }
        }
    }

    /**
     * Belirli bir dosya ismi için veritabanında arama yap
     */
    async searchInDatabase(searchPattern) {
        console.log(`🔍 VERİTABANI ARAMA: "${searchPattern}"`);
        
        const db = await this.loadDatabase();
        if (!db) return;

        // Farklı arama stratejileri
        const strategies = [
            { name: "Tam yol eşleşmesi", filter: f => f.path === searchPattern },
            { name: "Dosya adı eşleşmesi", filter: f => f.name === searchPattern },
            { name: "Dosya adı içerme", filter: f => f.name.includes(searchPattern) },
            { name: "Yol içerme", filter: f => f.path.toLowerCase().includes(searchPattern.toLowerCase()) },
            { name: "Normalize isim içerme", filter: f => f.normalizedName.includes(searchPattern.toLowerCase().replace(/[^a-z0-9\s]/g, '')) }
        ];

        for (const strategy of strategies) {
            const results = db.musicFiles.filter(strategy.filter);
            console.log(`\n📊 ${strategy.name}: ${results.length} sonuç`);
            
            if (results.length > 0 && results.length <= 10) {
                results.forEach((file, index) => {
                    console.log(`   ${index + 1}. ${file.name}`);
                });
            } else if (results.length > 10) {
                console.log(`   İlk 3 sonuç:`);
                results.slice(0, 3).forEach((file, index) => {
                    console.log(`   ${index + 1}. ${file.name}`);
                });
                console.log(`   ... ve ${results.length - 3} tane daha`);
            }
        }
    }
}

// CLI kullanımı
if (require.main === module) {
    const verifier = new TestSystemVerifier();
    
    const command = process.argv[2];
    const searchPattern = process.argv[3];
    
    async function main() {
        try {
            if (command === 'verify') {
                await verifier.verifyFailedTests();
            } else if (command === 'search' && searchPattern) {
                await verifier.searchInDatabase(searchPattern);
            } else {
                console.log('🔧 TEST SİSTEMİ DOĞRULAMA ARACI');
                console.log('='.repeat(40));
                console.log('Kullanım:');
                console.log('  node verify_test_system.js verify                # Başarısız testleri doğrula');
                console.log('  node verify_test_system.js search <pattern>      # Veritabanında arama yap');
                console.log('\nÖrnekler:');
                console.log('  node verify_test_system.js verify');
                console.log('  node verify_test_system.js search "Bodrum"');
            }
        } catch (error) {
            console.error('❌ Fatal error:', error);
        }
    }
    
    main();
}

module.exports = TestSystemVerifier;
