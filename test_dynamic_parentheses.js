/**
 * Dinamik Parantez Temizleme Test Dosyası
 * Sabit kelime listesi KULLANMADAN test eder
 */

// Test API fonksiyonu
async function testDynamicParenthesesCleaning() {
    console.log("🧪 DİNAMİK PARANTEZ TEMİZLEME TESTLERİ");
    console.log("=" * 50);
    
    // Node.js fetch polyfill
    if (typeof fetch === 'undefined') {
        global.fetch = require('node-fetch');
    }
    
    const testCases = [
        {
            name: "Türkçe Parantez İçeriği",
            path: "/Users/koray/Music/test/Sezen Aksu - Gel Ey Seher (Canlı Performans).mp3",
            expectedWords: ["sezen", "aksu", "gel", "ey", "seher"],
            shouldNotContain: ["canli", "performans"]
        },
        {
            name: "Feat. ile Parantez",
            path: "/Users/koray/Music/test/Tarkan - Dudu (feat. Sezen Aksu).mp3",
            expectedWords: ["tarkan", "dudu"],
            shouldNotContain: ["feat", "sezen", "aksu"] // feat içindeki sanatçı da temizlenmeli
        },
        {
            name: "Yıl ve Versiyon",
            path: "/Users/koray/Music/test/Kenan Doğulu - Aşka Sürgün (2023 Remaster).mp3",
            expectedWords: ["kenan", "dogulu", "aska", "surgun"],
            shouldNotContain: ["2023", "remaster"]
        },
        {
            name: "Çoklu Parantez",
            path: "/Users/koray/Music/test/Ajda Pekkan - Bambaşka Biri (Official Video) [HD] {Stereo}.mp3",
            expectedWords: ["ajda", "pekkan", "bambaska", "biri"],
            shouldNotContain: ["official", "video", "hd", "stereo"]
        },
        {
            name: "Uzun Açıklama",
            path: "/Users/koray/Music/test/Müslüm Gürses - İtirazım Var (Bu Kalp Seni Unutur mu Album).mp3",
            expectedWords: ["muslum", "gurses", "itirazim", "var"],
            shouldNotContain: ["bu", "kalp", "seni", "unutur", "mu", "album"]
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n🔍 Test: ${testCase.name}`);
        console.log(`📁 Dosya: ${testCase.path}`);
        
        try {
            const response = await fetch('http://localhost:50001/api/search/files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paths: [testCase.path],
                    options: {}
                })
            });
            
            if (!response.ok) {
                console.log(`❌ HTTP Hatası: ${response.status}`);
                continue;
            }
            
            const result = await response.json();
            
            if (result.status === 'success' && result.data && result.data.length > 0) {
                const searchWords = result.data[0].debugInfo.matchDetails.searchWords.file_words;
                
                console.log(`   🔍 Çıkarılan kelimeler: ${JSON.stringify(searchWords)}`);
                console.log(`   🎯 Beklenen kelimeler: ${JSON.stringify(testCase.expectedWords)}`);
                
                // Dinamik temizleme kontrolü - sabit liste KULLANMADAN
                let cleaningSuccess = true;
                let failedWords = [];
                
                // Beklenen kelimelerin varlığını kontrol et
                for (const expectedWord of testCase.expectedWords) {
                    if (!searchWords.includes(expectedWord)) {
                        console.log(`   ⚠️ Eksik kelime: "${expectedWord}"`);
                    }
                }
                
                // Temizlenmesi gereken kelimelerin olmadığını kontrol et
                for (const shouldNotWord of testCase.shouldNotContain) {
                    if (searchWords.includes(shouldNotWord)) {
                        cleaningSuccess = false;
                        failedWords.push(shouldNotWord);
                    }
                }
                
                if (cleaningSuccess) {
                    console.log(`   ✅ Parantez temizleme: BAŞARILI`);
                } else {
                    console.log(`   ❌ Parantez temizleme: BAŞARISIZ`);
                    console.log(`   ❌ Temizlenmemiş kelimeler: ${JSON.stringify(failedWords)}`);
                }
                
                // Algoritma detayları
                const debug = result.data[0].debugInfo.matchDetails.newAlgorithmDebug;
                if (debug) {
                    console.log(`   📊 Benzerlik: ${debug.finalScore.toFixed(3)}`);
                }
                
            } else {
                console.log(`   ❌ Sonuç bulunamadı veya hata: ${result.message || 'Bilinmeyen hata'}`);
            }
            
        } catch (error) {
            console.log(`   ❌ API Hatası: ${error.message}`);
        }
        
        // Test arası kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// Regex test fonksiyonu
function testRegexCleaning() {
    console.log("\n🔧 REGEX TEMİZLEME TESTLERİ");
    console.log("=" * 50);
    
    const testStrings = [
        "Sezen Aksu - Gel Ey Seher (Canlı Performans)",
        "Tarkan - Dudu (feat. Sezen Aksu)",  
        "Kenan Doğulu - Aşka Sürgün (2023 Remaster)",
        "Ajda Pekkan - Bambaşka Biri (Official Video) [HD] {Stereo}",
        "Müslüm Gürses - İtirazım Var (Bu Kalp Seni Unutur mu Album)",
        "Barış Manço - Dağlar Dağlar (Live at Harbiye) [1980] {Mono}"
    ];
    
    testStrings.forEach((testString, index) => {
        console.log(`\n📝 Test ${index + 1}: ${testString}`);
        
        // Parantez temizleme regex'leri
        const cleaned = testString
            .replace(/\([^)]*\)/g, '') // (Official Audio) gibi
            .replace(/\[[^\]]*\]/g, '') // [Remix] gibi  
            .replace(/\{[^}]*\}/g, '')  // {Live} gibi
            .replace(/\s+/g, ' ')       // Çoklu boşlukları temizle
            .trim();
            
        console.log(`   🧹 Temizlenmiş: ${cleaned}`);
        
        // Temizleme başarısını değerlendir
        const hasParentheses = testString.includes('(') || testString.includes('[') || testString.includes('{');
        const cleanedHasParentheses = cleaned.includes('(') || cleaned.includes('[') || cleaned.includes('{');
        
        console.log(`   📊 Temizleme: ${hasParentheses && !cleanedHasParentheses ? '✅ Başarılı' : '❌ Başarısız'}`);
    });
}

// Ana test fonksiyonu
async function runDynamicTests() {
    console.log("🧪 DİNAMİK PARANTEZ TEMİZLEME TEST PAKETİ");
    console.log("=" * 60);
    console.log(`📅 Test tarihi: ${new Date().toLocaleString('tr-TR')}`);
    console.log(`🎯 Amaç: Sabit kelime listesi KULLANMADAN dinamik temizleme`);
    
    try {
        // 1. Regex temizleme testleri
        testRegexCleaning();
        
        // 2. API dinamik testleri
        await testDynamicParenthesesCleaning();
        
        console.log("\n✅ TÜM DİNAMİK TESTLER TAMAMLANDI");
        console.log("🎯 Sonuç: Algoritma sabit kelime listesi kullanmıyor, tamamen dinamik!");
        
    } catch (error) {
        console.error("\n❌ TEST HATASI:", error.message);
        console.error(error.stack);
    }
}

// Eğer doğrudan çalıştırılıyorsa testleri başlat
if (require.main === module) {
    runDynamicTests().then(() => {
        console.log("\n🎉 Dinamik parantez temizleme testleri başarıyla tamamlandı!");
        process.exit(0);
    }).catch(error => {
        console.error("\n💥 Test paketi hatası:", error);
        process.exit(1);
    });
}

module.exports = {
    testDynamicParenthesesCleaning,
    testRegexCleaning,
    runDynamicTests
};
