/**
 * Parantez Temizleme Algoritması Test Dosyası
 */

const path = require('path');

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

function normalizeText(text, options = {}) {
    if (typeof text !== 'string') {
        return '';
    }

    const keepSpaces = options.keepSpaces !== false;
    const keepCase = options.keepCase || false;

    let normalized = text;

    // Unicode normalizasyonu
    normalized = normalized.normalize("NFKC");
    
    // Türkçe karakter dönüşümü
    normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');

    // Büyük/küçük harf dönüşümü
    if (!keepCase) {
        normalized = normalized.toLowerCase();
    }

    // Özel karakterleri kaldır (sadece harf, rakam, boşluk)
    normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');

    // Boşlukları düzenle
    if (!keepSpaces) {
        normalized = normalized.replace(/\s+/g, '');
    } else {
        normalized = normalized.replace(/\s+/g, ' ');
    }

    return normalized.trim();
}

function extractImprovedWords(fileName, filePath = "") {
    /**Geliştirilmiş kelime çıkarma - parantez temizleme ve klasör/dosya adı ayrımı*/
    const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
    
    // Tüm klasörleri al (sadece son 1 değil)
    const relevantFolders = pathParts;
    
    // Dosya adını normalize et ve parantezleri temizle
    const fileNameWithoutExt = path.parse(fileName).name;
    
    // Parantez içindeki metinleri kaldır: (Official Audio), [Remix], {Live} vs.
    const cleanedFileName = fileNameWithoutExt
        .replace(/\([^)]*\)/g, '') // (Official Audio) gibi
        .replace(/\[[^\]]*\]/g, '') // [Remix] gibi  
        .replace(/\{[^}]*\}/g, '')  // {Live} gibi
        .replace(/\s+/g, ' ')       // Çoklu boşlukları temizle
        .trim();
    
    const fileNameParts = cleanedFileName.split(/[-_]/).map(part => part.trim());
    
    // Klasör kelimelerini normalize et
    const folderWords = [];
    for (const folder of relevantFolders) {
        const normalizedFolder = normalizeText(folder, { keepSpaces: false });
        const camelCaseWords = normalizedFolder.replace(/([a-z])([A-Z])/g, '$1 $2');
        folderWords.push(...camelCaseWords.split(/\s+/).filter(w => w.length > 1));
    }
    
    // Dosya adı kelimelerini normalize et - parantez temizlenmiş hali
    const fileWords = [];
    for (const part of fileNameParts) {
        if (part.trim()) { // Boş parçaları atla
            const normalizedPart = normalizeText(part, { keepSpaces: false });
            const words = normalizedPart.split(/\s+/).filter(w => w.length > 1);
            fileWords.push(...words);
        }
    }
    
    const result = {
        'folder_words': folderWords,
        'file_words': fileWords,
        'all_words': [...folderWords, ...fileWords]
    };
    
    return result;
}

// Test senaryoları
function testParenthesesCleaning() {
    console.log("🧪 PARANTEZ TEMİZLEME TESTLERİ");
    console.log("=" * 50);
    
    const testCases = [
        {
            name: "Sezen Aksu - Kutlama (Official Audio).mp4",
            path: "/Users/koray/Music/KorayMusics/Videodown3/Sezen Aksu - Kutlama (Official Audio).mp4",
            expected: ["sezen", "aksu", "kutlama"]
        },
        {
            name: "Kenan Doğulu - Tabii Ki [Remix].mp3",
            path: "/Users/koray/Music/test/Kenan Doğulu - Tabii Ki [Remix].mp3",
            expected: ["kenan", "dogulu", "tabii", "ki"]
        },
        {
            name: "Tarkan - Şımarık {Live Performance}.mp4",
            path: "/Users/koray/Music/test/Tarkan - Şımarık {Live Performance}.mp4", 
            expected: ["tarkan", "simarik"]
        },
        {
            name: "Ajda Pekkan - Bambaşka Biri (Official Video) [HD].mp3",
            path: "/Users/koray/Music/test/Ajda Pekkan - Bambaşka Biri (Official Video) [HD].mp3",
            expected: ["ajda", "pekkan", "bambaska", "biri"]
        }
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`\n📁 Test ${index + 1}: ${testCase.name}`);
        
        // Eski algoritma (parantez temizleme olmadan)
        const oldFileName = path.parse(testCase.name).name;
        const oldWords = oldFileName.split(/[-_]/).map(part => {
            const normalized = normalizeText(part, { keepSpaces: false });
            return normalized.split(/\s+/).filter(w => w.length > 1);
        }).flat();
        
        // Yeni algoritma (parantez temizleme ile)
        const newWords = extractImprovedWords(testCase.name, testCase.path);
        
        console.log(`   🔴 Eski: ${JSON.stringify(oldWords)}`);
        console.log(`   🟢 Yeni: ${JSON.stringify(newWords.file_words)}`);
        console.log(`   🎯 Beklenen: ${JSON.stringify(testCase.expected)}`);
        
        // Karşılaştırma
        const isImproved = newWords.file_words.length < oldWords.length;
        const isCorrect = JSON.stringify(newWords.file_words) === JSON.stringify(testCase.expected);
        
        console.log(`   📊 İyileşti: ${isImproved ? '✅' : '❌'}`);
        console.log(`   📊 Doğru: ${isCorrect ? '✅' : '❌'}`);
    });
}

// API test fonksiyonu
async function testAPIWithParentheses() {
    console.log("\n🌐 API PARANTEZ TEMİZLEME TESTLERİ");
    console.log("=" * 50);
    
    // Node.js fetch polyfill
    if (typeof fetch === 'undefined') {
        global.fetch = require('node-fetch');
    }
    
    const testPath = "/Users/koray/Music/KorayMusics/Videodown3/Sezen Aksu - Kutlama (Official Audio).mp4";
    
    try {
        console.log(`🔍 Test edilen dosya: ${testPath}`);
        
        const response = await fetch('http://localhost:50001/api/search/files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paths: [testPath],
                options: {}
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success' && result.data && result.data.length > 0) {
            const searchResult = result.data[0];
            const debugInfo = searchResult.debugInfo.matchDetails;
            
            console.log(`\n📊 SONUÇLAR:`);
            console.log(`   🔍 Arama kelimeleri: ${JSON.stringify(debugInfo.searchWords.file_words)}`);
            console.log(`   🎯 Hedef kelimeleri: ${JSON.stringify(debugInfo.targetWords.file_words)}`);
            console.log(`   💯 Benzerlik: ${searchResult.similarity}`);
            console.log(`   🎵 Bulunan: ${searchResult.foundPath}`);
            
            if (debugInfo.newAlgorithmDebug) {
                const debug = debugInfo.newAlgorithmDebug;
                console.log(`\n🔬 ALGORİTMA DETAYLARI:`);
                console.log(`   - Exact Score: ${debug.exactScore}`);
                console.log(`   - Fuzzy Score: ${debug.fuzzyScore}`);
                console.log(`   - Context Score: ${debug.contextScore}`);
                console.log(`   - Special Score: ${debug.specialScore}`);
                console.log(`   - Final Score: ${debug.finalScore}`);
            }
            
            // Parantez temizleme başarısını kontrol et
            const hasParenthesesWords = debugInfo.searchWords.file_words.some(word => 
                ['official', 'audio', 'video', 'hd', 'remix', 'live'].includes(word.toLowerCase())
            );
            
            console.log(`\n✅ Parantez temizleme: ${hasParenthesesWords ? '❌ Başarısız' : '✅ Başarılı'}`);
            
        } else {
            console.log(`❌ API Hatası: ${result.message || 'Bilinmeyen hata'}`);
        }
        
    } catch (error) {
        console.log(`❌ Bağlantı hatası: ${error.message}`);
    }
}

// Ana test fonksiyonu
async function runParenthesesTests() {
    console.log("🧪 PARANTEZ TEMİZLEME TEST PAKETİ");
    console.log("=" * 60);
    console.log(`📅 Test tarihi: ${new Date().toLocaleString('tr-TR')}`);
    
    try {
        // 1. Yerel parantez temizleme testleri
        testParenthesesCleaning();
        
        // 2. API testleri
        await testAPIWithParentheses();
        
        console.log("\n✅ TÜM TESTLER TAMAMLANDI");
        
    } catch (error) {
        console.error("\n❌ TEST HATASI:", error.message);
        console.error(error.stack);
    }
}

// Eğer doğrudan çalıştırılıyorsa testleri başlat
if (require.main === module) {
    runParenthesesTests().then(() => {
        console.log("\n🎉 Parantez temizleme testleri başarıyla tamamlandı!");
        process.exit(0);
    }).catch(error => {
        console.error("\n💥 Test paketi hatası:", error);
        process.exit(1);
    });
}

module.exports = {
    extractImprovedWords,
    testParenthesesCleaning,
    runParenthesesTests
};
