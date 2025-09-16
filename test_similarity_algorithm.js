/**
 * Benzerlik Arama Algoritması Test Dosyası
 * Mantık hatalarını tespit etmek için kapsamlı testler
 */

const path = require('path');

// Test için gerekli fonksiyonları import et
const CHAR_MAP = {
    // Latin Alfabesi Genişletilmiş
    "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
    "ç": "c", "ć": "c", "č": "c", "ď": "d", "è": "e", "é": "e", "ê": "e", "ë": "e",
    "ì": "i", "í": "i", "î": "i", "ï": "i", "ð": "d", "ñ": "n", "ò": "o", "ó": "o",
    "ô": "o", "õ": "o", "ö": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u", "ü": "u",
    "ý": "y", "þ": "th", "ÿ": "y", "ğ": "g", "ı": "i", "İ": "I", "ş": "s",
    "Š": "S", "ž": "z", "ß": "ss"
};

function normalizeText(text, options = {}) {
    if (typeof text !== 'string') {
        throw new TypeError("Input must be a string");
    }

    const keepSpaces = options.keepSpaces !== false;
    const keepSpecialChars = options.keepSpecialChars || false;
    const keepCase = options.keepCase || false;
    const keepDiacritics = options.keepDiacritics || false;

    let normalized = text;

    if (!keepDiacritics) {
        normalized = normalized.normalize("NFKC");
        normalized = normalized.split('').map(c => CHAR_MAP[c.toLowerCase()] || c).join('');
    }

    if (!keepCase) {
        normalized = normalized.toLowerCase();
    }

    if (!keepSpecialChars) {
        normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
    }

    if (!keepSpaces) {
        normalized = normalized.replace(/\s+/g, ' ');
    }

    return normalized.trim();
}

function extractImprovedWords(fileName, filePath = "") {
    const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
    
    const relevantFolders = pathParts;
    
    const fileNameWithoutExt = path.parse(fileName).name;
    const fileNameParts = fileNameWithoutExt.split(/[-_]/).map(part => part.trim());
    
    const folderWords = [];
    for (const folder of relevantFolders) {
        const normalizedFolder = normalizeText(folder, { keepSpaces: false });
        const camelCaseWords = normalizedFolder.replace(/([a-z])([A-Z])/g, '$1 $2');
        folderWords.push(...camelCaseWords.split(/\s+/).filter(w => w.length > 1));
    }
    
    const fileWords = [];
    for (const part of fileNameParts) {
        const normalizedPart = normalizeText(part, { keepSpaces: false });
        fileWords.push(...normalizedPart.split(/\s+/).filter(w => w.length > 1));
    }
    
    const result = {
        'folder_words': folderWords,
        'file_words': fileWords,
        'all_words': [...folderWords, ...fileWords]
    };
    
    return result;
}

function calculateImprovedSimilarity(searchWords, targetWords) {
    if (!searchWords['all_words'] || !targetWords['all_words'] || 
        searchWords['all_words'].length === 0 || targetWords['all_words'].length === 0) {
        return 0.0;
    }
    
    const fileSearch = searchWords['file_words'] || [];
    const fileTarget = targetWords['file_words'] || [];
    
    if (!fileSearch || !fileTarget || fileSearch.length === 0 || fileTarget.length === 0) {
        return 0.0;
    }
    
    let exactFileMatches = 0;
    for (const word of fileSearch) {
        if (fileTarget.includes(word)) {
            exactFileMatches += 1.0;
        }
    }
    
    // Kelime birleştirme + harf eşleşme algoritması
    for (const word of fileSearch) {
        if (!fileTarget.includes(word)) {
            let bestCombinationScore = 0;
            
            for (let i = 1; i < word.length; i++) {
                const part1 = word.substring(0, i);
                const part2 = word.substring(i);
                
                const part1Index = fileTarget.findIndex(w => w.toLowerCase() === part1.toLowerCase());
                const part2Index = fileTarget.findIndex(w => w.toLowerCase() === part2.toLowerCase());
                
                if (part1Index !== -1 && part2Index !== -1) {
                    bestCombinationScore = Math.max(bestCombinationScore, 1.0);
                } else {
                    const combinedWord = part1 + ' ' + part2;
                    const searchChars = word.toLowerCase().split('');
                    const targetChars = combinedWord.toLowerCase().split('');
                    
                    const searchCharCount = {};
                    const targetCharCount = {};
                    
                    searchChars.forEach(char => {
                        searchCharCount[char] = (searchCharCount[char] || 0) + 1;
                    });
                    
                    targetChars.forEach(char => {
                        targetCharCount[char] = (targetCharCount[char] || 0) + 1;
                    });
                    
                    let minCharCount = 0;
                    for (const char in searchCharCount) {
                        if (targetCharCount[char]) {
                            minCharCount += Math.min(searchCharCount[char], targetCharCount[char]);
                        }
                    }
                    
                    const charSimilarity = minCharCount / Math.max(searchChars.length, targetChars.length);
                    
                    if (charSimilarity > 0.6) {
                        bestCombinationScore = Math.max(bestCombinationScore, charSimilarity);
                    }
                }
            }
            
            if (bestCombinationScore > 0) {
                exactFileMatches += bestCombinationScore;
            }
        }
    }
    
    // Harf bazlı eşleşme
    let charSimilarity = 0;
    let charMatches = 0;
    
    for (const searchWord of fileSearch) {
        for (const targetWord of fileTarget) {
            const searchChars = searchWord.toLowerCase().split('');
            const targetChars = targetWord.toLowerCase().split('');
            
            const commonChars = searchChars.filter(char => targetChars.includes(char));
            const wordSimilarity = commonChars.length / Math.max(searchChars.length, targetChars.length);
            
            if (wordSimilarity > 0.3) {
                charSimilarity += wordSimilarity;
                charMatches++;
            }
        }
    }
    
    // İçerme kontrolü
    for (const searchWord of fileSearch) {
        for (const targetWord of fileTarget) {
            if (targetWord.toLowerCase().includes(searchWord.toLowerCase()) && searchWord.length >= 3) {
                charSimilarity += 0.8;
                charMatches++;
            }
        }
    }
    
    if (charMatches > 0) {
        charSimilarity = charSimilarity / charMatches;
    }
    
    const totalMatches = exactFileMatches + Math.floor(charSimilarity * 2);
    const fileScore = totalMatches / Math.max(fileSearch.length, fileTarget.length);
    
    if (totalMatches < 1) {
        return 0.0;
    }
    
    // Klasör kelime eşleşmesi (Bonus)
    const folderSearch = searchWords['folder_words'] || [];
    const folderTarget = targetWords['folder_words'] || [];
    
    let folderBonus = 0.0;
    if (folderSearch.length > 0 && folderTarget.length > 0) {
        const exactFolderMatches = folderSearch.filter(word => folderTarget.includes(word)).length;
        folderBonus = (exactFolderMatches / Math.max(folderSearch.length, folderTarget.length)) * 0.3;
    }
    
    let fullMatchBonus = 0.0;
    if (exactFileMatches >= 3) {
        fullMatchBonus = 0.15;
    }
    
    const totalScore = fileScore + folderBonus + fullMatchBonus;
    
    return Math.max(0.0, Math.min(1.0, totalScore));
}

// Test API fonksiyonu
async function callSearchAPI(searchPaths) {
    const response = await fetch('http://localhost:50001/api/search/files', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            paths: searchPaths,
            options: {}
        })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

// Test senaryoları
const testCases = [
    {
        name: "Kenan Doğulu - Gel Gelinim Test",
        searchPath: "/Users/koray/Music/KorayMusics/galadugun/MÜZİKAL GÖRÜŞME/İLK DANS/Kenan Doğulu_Gel Gelinim.mp3",
        expectedMatches: [
            "Kenan Doğulu - Gelinim.m4a",
            "Kenan Doğulu - Gel Gelinim",
            "gelinim"
        ]
    },
    {
        name: "Mahsun Kırmızıgül - Sarı Sarı Test", 
        searchPath: "/Users/koray/Music/KorayMusics/Video2019/Mahsun Kırmızıgül - Sarı Sarı.m4a",
        expectedMatches: [
            "Mahsun Kırmızıgül",
            "Sarı Sarı",
            "sari"
        ]
    },
    {
        name: "Sezen Aksu - Kutlama Test",
        searchPath: "/Users/koray/Music/KorayMusics/Videodown3/Sezen Aksu - Kutlama (Official Audio).mp4",
        expectedMatches: [
            "Sezen Aksu",
            "Kutlama"
        ]
    }
];

// Kelime çıkarma testleri
function testWordExtraction() {
    console.log("\n🔍 KELİME ÇIKARMA TESTLERİ");
    console.log("=" * 50);
    
    const testFiles = [
        {
            fileName: "Kenan Doğulu_Gel Gelinim.mp3",
            filePath: "/Users/koray/Music/KorayMusics/galadugun/MÜZİKAL GÖRÜŞME/İLK DANS/Kenan Doğulu_Gel Gelinim.mp3"
        },
        {
            fileName: "Kenan Doğulu - Gelinim.m4a", 
            filePath: "/Users/koray/Music/KorayMusics/1 - DÜĞÜN/SLOW/Kenan Doğulu - Gelinim.m4a"
        },
        {
            fileName: "tabiki.mp3",
            filePath: "/Users/koray/Music/test/tabiki.mp3"
        }
    ];
    
    testFiles.forEach((testFile, index) => {
        console.log(`\n📁 Test ${index + 1}: ${testFile.fileName}`);
        const words = extractImprovedWords(testFile.fileName, testFile.filePath);
        console.log(`   📂 Klasör kelimeleri: ${JSON.stringify(words.folder_words)}`);
        console.log(`   📄 Dosya kelimeleri: ${JSON.stringify(words.file_words)}`);
        console.log(`   🔗 Tüm kelimeler: ${JSON.stringify(words.all_words)}`);
    });
}

// Benzerlik hesaplama testleri
function testSimilarityCalculation() {
    console.log("\n🧮 BENZERLİK HESAPLAMA TESTLERİ");
    console.log("=" * 50);
    
    const searchWords = extractImprovedWords("Kenan Doğulu_Gel Gelinim.mp3", 
        "/Users/koray/Music/KorayMusics/galadugun/MÜZİKAL GÖRÜŞME/İLK DANS/Kenan Doğulu_Gel Gelinim.mp3");
    
    const testTargets = [
        {
            name: "Kenan Doğulu - Gelinim.m4a",
            path: "/Users/koray/Music/KorayMusics/1 - DÜĞÜN/SLOW/Kenan Doğulu - Gelinim.m4a"
        },
        {
            name: "Kenan Doğulu - Tabii Ki.m4a", 
            path: "/Users/koray/Music/KorayMusics/1 - DÜĞÜN/SLOW/Kenan Doğulu - Tabii Ki.m4a"
        },
        {
            name: "Sezen Aksu - Kutlama.mp3",
            path: "/Users/koray/Music/KorayMusics/test/Sezen Aksu - Kutlama.mp3"
        }
    ];
    
    console.log(`\n🔍 Arama dosyası: Kenan Doğulu_Gel Gelinim.mp3`);
    console.log(`📝 Arama kelimeleri: ${JSON.stringify(searchWords)}`);
    
    testTargets.forEach((target, index) => {
        console.log(`\n🎯 Hedef ${index + 1}: ${target.name}`);
        const targetWords = extractImprovedWords(target.name, target.path);
        console.log(`📝 Hedef kelimeler: ${JSON.stringify(targetWords)}`);
        
        const similarity = calculateImprovedSimilarity(searchWords, targetWords);
        console.log(`💯 Benzerlik skoru: ${similarity.toFixed(4)}`);
        
        // Detaylı analiz
        const fileSearch = searchWords['file_words'] || [];
        const fileTarget = targetWords['file_words'] || [];
        
        console.log(`🔎 Dosya kelimeleri karşılaştırması:`);
        console.log(`   Arama: ${JSON.stringify(fileSearch)}`);
        console.log(`   Hedef: ${JSON.stringify(fileTarget)}`);
        
        // Tam eşleşme analizi
        let exactMatches = 0;
        fileSearch.forEach(word => {
            if (fileTarget.includes(word)) {
                exactMatches++;
                console.log(`   ✅ Tam eşleşme: "${word}"`);
            }
        });
        
        console.log(`   📊 Tam eşleşme sayısı: ${exactMatches}/${fileSearch.length}`);
    });
}

// API testleri
async function testSearchAPI() {
    console.log("\n🌐 API ARAMA TESTLERİ");
    console.log("=" * 50);
    
    for (const testCase of testCases) {
        console.log(`\n🔍 Test: ${testCase.name}`);
        console.log(`📁 Arama yolu: ${testCase.searchPath}`);
        
        try {
            const result = await callSearchAPI([testCase.searchPath]);
            
            if (result.status === 'success' && result.data && result.data.length > 0) {
                const searchResult = result.data[0];
                
                console.log(`✅ Sonuç: ${searchResult.found ? 'BULUNDU' : 'BULUNAMADI'}`);
                
                if (searchResult.found) {
                    console.log(`🎯 Bulunan dosya: ${searchResult.foundPath}`);
                    console.log(`💯 Benzerlik: ${searchResult.similarity}`);
                    console.log(`🔧 Eşleşme tipi: ${searchResult.matchType}`);
                    
                    if (searchResult.debugInfo && searchResult.debugInfo.matchDetails) {
                        const details = searchResult.debugInfo.matchDetails;
                        console.log(`📊 Detaylar:`);
                        console.log(`   - Tam eşleşme: ${details.exactFileMatches}`);
                        console.log(`   - Harf benzerliği: ${details.charSimilarity?.toFixed(4)}`);
                        console.log(`   - Toplam eşleşme: ${details.totalMatches}`);
                        console.log(`   - Dosya skoru: ${details.fileScore?.toFixed(4)}`);
                    }
                } else {
                    console.log(`❌ Durum: ${searchResult.status}`);
                }
            } else {
                console.log(`❌ API Hatası: ${result.message || 'Bilinmeyen hata'}`);
            }
            
        } catch (error) {
            console.log(`❌ Bağlantı hatası: ${error.message}`);
        }
        
        // Test arası bekleme
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Mantık hatası analizi
function analyzeLogicErrors() {
    console.log("\n🐛 MANTIK HATASI ANALİZİ");
    console.log("=" * 50);
    
    const potentialErrors = [
        {
            error: "Kelime birleştirme algoritması 'gelinim' kelimesini 'gel' + 'inim' olarak ayırabilir",
            impact: "Yanlış eşleşmelere neden olabilir",
            severity: "Orta"
        },
        {
            error: "Harf eşleşme threshold'u (%30) çok düşük olabilir",
            impact: "Çok fazla false positive",
            severity: "Yüksek"
        },
        {
            error: "Klasör kelimelerinin ağırlığı çok düşük (%30 bonus)",
            impact: "Önemli context bilgisi kaybı",
            severity: "Orta"
        },
        {
            error: "Minimum eşleşme koşulu (totalMatches < 1) çok katı",
            impact: "Bazı geçerli eşleşmeler kaçırılabilir",
            severity: "Yüksek"
        },
        {
            error: "Normalizasyon sırasında özel karakterler kaldırılıyor",
            impact: "Türkçe karakter desteği eksikliği",
            severity: "Orta"
        }
    ];
    
    potentialErrors.forEach((error, index) => {
        console.log(`\n❗ Hata ${index + 1}: ${error.error}`);
        console.log(`   📈 Etki: ${error.impact}`);
        console.log(`   ⚠️  Önem: ${error.severity}`);
    });
    
    console.log("\n💡 ÖNERİLER:");
    console.log("1. Kelime birleştirme algoritmasında minimum kelime uzunluğu kontrolü ekle");
    console.log("2. Harf eşleşme threshold'unu %50'ye çıkar");
    console.log("3. Türkçe karakterler için özel normalizasyon kuralları ekle");
    console.log("4. Klasör kelimelerinin ağırlığını artır");
    console.log("5. Fuzzy matching algoritması ekle");
}

// Ana test fonksiyonu
async function runAllTests() {
    console.log("🧪 BENZERLİK ARAMA ALGORİTMASI TEST PAKETİ");
    console.log("=" * 60);
    console.log(`📅 Test tarihi: ${new Date().toLocaleString('tr-TR')}`);
    console.log(`🔧 Test versiyonu: 1.0.0`);
    
    try {
        // 1. Kelime çıkarma testleri
        testWordExtraction();
        
        // 2. Benzerlik hesaplama testleri  
        testSimilarityCalculation();
        
        // 3. API testleri
        await testSearchAPI();
        
        // 4. Mantık hatası analizi
        analyzeLogicErrors();
        
        console.log("\n✅ TÜM TESTLER TAMAMLANDI");
        
    } catch (error) {
        console.error("\n❌ TEST HATASI:", error.message);
        console.error(error.stack);
    }
}

// Eğer doğrudan çalıştırılıyorsa testleri başlat
if (require.main === module) {
    // Node.js fetch polyfill
    if (typeof fetch === 'undefined') {
        global.fetch = require('node-fetch');
    }
    
    runAllTests().then(() => {
        console.log("\n🎉 Test paketi başarıyla tamamlandı!");
        process.exit(0);
    }).catch(error => {
        console.error("\n💥 Test paketi hatası:", error);
        process.exit(1);
    });
}

module.exports = {
    normalizeText,
    extractImprovedWords,
    calculateImprovedSimilarity,
    runAllTests
};
