/**
 * Narin Yarim Benzerlik Debug Test
 */

// Test API fonksiyonu
async function testNarinYarimDebug() {
    console.log("🔍 NARIN YARIM BENZERLİK DEBUG TESTİ");
    console.log("=" * 60);
    
    // Node.js fetch polyfill
    if (typeof fetch === 'undefined') {
        global.fetch = require('node-fetch');
    }
    
    const searchPath = "/Users/koray/Music/KorayMusics/liseparty/turkpop/Turkce Pop/Narin Yarim - Remix Banu Parlak.flac";
    
    console.log(`🔍 Arama dosyası: ${searchPath}`);
    console.log(`📝 Beklenen: "Banu Parlak - Narin Yarim" formatında dosya`);
    
    try {
        const response = await fetch('http://localhost:50001/api/search/files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paths: [searchPath],
                options: {}
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success' && result.data && result.data.length > 0) {
            const searchResult = result.data[0];
            const debugInfo = searchResult.debugInfo;
            
            console.log(`\n📊 SONUÇ:`);
            console.log(`   Bulunan: ${searchResult.foundPath}`);
            console.log(`   Benzerlik: ${searchResult.similarity.toFixed(4)}`);
            console.log(`   Total Candidates: ${debugInfo.totalCandidates}`);
            
            console.log(`\n🔍 KELİME ANALİZİ:`);
            console.log(`   Arama kelimeleri: ${JSON.stringify(debugInfo.matchDetails.searchWords.file_words)}`);
            console.log(`   Bulunan kelimeleri: ${JSON.stringify(debugInfo.matchDetails.targetWords.file_words)}`);
            
            const debug = debugInfo.matchDetails.newAlgorithmDebug;
            console.log(`\n🔬 ALGORİTMA SKORLARI:`);
            console.log(`   Exact Score: ${debug.exactScore.toFixed(4)}`);
            console.log(`   Fuzzy Score: ${debug.fuzzyScore.toFixed(4)}`);
            console.log(`   Context Score: ${debug.contextScore.toFixed(4)}`);
            console.log(`   Special Score: ${debug.specialScore.toFixed(4)}`);
            console.log(`   Parentheses Score: ${debug.parenthesesScore.toFixed(4)}`);
            console.log(`   Final Score: ${debug.finalScore.toFixed(4)}`);
            
            // Manuel kelime sırası analizi
            console.log(`\n🧮 MANUEL KELIME SIRASI ANALİZİ:`);
            const searchWords = debugInfo.matchDetails.searchWords.file_words;
            const targetWords = debugInfo.matchDetails.targetWords.file_words;
            
            console.log(`   Arama sırası: ${JSON.stringify(searchWords)}`);
            console.log(`   Hedef sırası: ${JSON.stringify(targetWords)}`);
            
            // Kelime eşleşme detayları
            searchWords.forEach((word, index) => {
                const targetIndex = targetWords.indexOf(word);
                if (targetIndex !== -1) {
                    console.log(`   ✅ "${word}" → Arama[${index}] → Hedef[${targetIndex}]`);
                } else {
                    console.log(`   ❌ "${word}" → Hedefte yok`);
                }
            });
            
            // Ardışık kelime kontrolü
            let sequenceCount = 0;
            for (let i = 0; i < searchWords.length - 1; i++) {
                const currentWord = searchWords[i];
                const nextWord = searchWords[i + 1];
                
                const currentIndex = targetWords.indexOf(currentWord);
                const nextIndex = targetWords.indexOf(nextWord);
                
                if (currentIndex !== -1 && nextIndex !== -1 && nextIndex === currentIndex + 1) {
                    sequenceCount++;
                    console.log(`   🔗 Ardışık: "${currentWord}" → "${nextWord}" (${currentIndex} → ${nextIndex})`);
                }
            }
            
            console.log(`\n📊 SIRA ANALİZİ:`);
            console.log(`   Ardışık kelime çifti: ${sequenceCount}/${searchWords.length - 1}`);
            console.log(`   Dosya uzunluğu: Hedef ${targetWords.length} vs Arama ${searchWords.length}`);
            
            if (targetWords.length > searchWords.length * 2) {
                console.log(`   ⚠️ UZUN DOSYA PENALTISI: Hedef çok uzun (mashup olabilir)`);
            }
            
        } else {
            console.log(`❌ API Hatası: ${result.message || 'Bilinmeyen hata'}`);
        }
        
    } catch (error) {
        console.log(`❌ Bağlantı hatası: ${error.message}`);
    }
}

// Eğer doğrudan çalıştırılıyorsa test et
if (require.main === module) {
    testNarinYarimDebug().then(() => {
        console.log("\n🎉 Narin Yarim debug testi tamamlandı!");
        process.exit(0);
    }).catch(error => {
        console.error("\n💥 Debug test hatası:", error);
        process.exit(1);
    });
}

module.exports = {
    testNarinYarimDebug
};
