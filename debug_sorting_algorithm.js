/**
 * Sıralama Algoritması Debug Test
 */

// Test API fonksiyonu - detaylı debug
async function debugSortingAlgorithm() {
    console.log("🔍 SIRALAMA ALGORİTMASI DEBUG TESTİ");
    console.log("=" * 50);
    
    // Node.js fetch polyfill
    if (typeof fetch === 'undefined') {
        global.fetch = require('node-fetch');
    }
    
    const testPath = "/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Billie Eilish - Bad Guy (FlexB, Vinci, Darrell Remix) (4).mp3";
    
    try {
        console.log(`🔍 Test dosyası: ${testPath}`);
        
        const response = await fetch('http://localhost:50001/api/search/files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paths: [testPath],
                options: { debug: true }
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success' && result.data && result.data.length > 0) {
            const searchResult = result.data[0];
            const debugInfo = searchResult.debugInfo;
            
            console.log(`\n📊 GENEL BİLGİLER:`);
            console.log(`   Total Candidates: ${debugInfo.totalCandidates}`);
            console.log(`   Bulunan: ${searchResult.foundPath}`);
            console.log(`   Benzerlik: ${searchResult.similarity}`);
            
            console.log(`\n🔍 ARAMA KELİMELERİ:`);
            console.log(`   Ana: ${JSON.stringify(debugInfo.searchWords.file_words)}`);
            console.log(`   Parantez: ${JSON.stringify(debugInfo.searchWords.parentheses_words)}`);
            
            console.log(`\n🎯 BULUNAN DOSYA KELİMELERİ:`);
            console.log(`   Ana: ${JSON.stringify(debugInfo.matchDetails.targetWords.file_words)}`);
            console.log(`   Parantez: ${JSON.stringify(debugInfo.matchDetails.targetWords.parentheses_words)}`);
            
            if (debugInfo.matchDetails.newAlgorithmDebug) {
                const debug = debugInfo.matchDetails.newAlgorithmDebug;
                console.log(`\n🔬 ALGORİTMA SKORLARI:`);
                console.log(`   Exact Score: ${debug.exactScore}`);
                console.log(`   Fuzzy Score: ${debug.fuzzyScore}`);
                console.log(`   Context Score: ${debug.contextScore}`);
                console.log(`   Special Score: ${debug.specialScore}`);
                console.log(`   Final Score: ${debug.finalScore}`);
            }
            
            // Manuel exact match kontrolü
            const searchMain = debugInfo.searchWords.file_words || [];
            const searchParentheses = debugInfo.searchWords.parentheses_words || [];
            const targetMain = debugInfo.matchDetails.targetWords.file_words || [];
            const targetParentheses = debugInfo.matchDetails.targetWords.parentheses_words || [];
            
            console.log(`\n🧮 MANUEL EŞLEŞME KONTROLÜ:`);
            
            // Ana kelime eşleşmeleri
            let mainMatches = 0;
            searchMain.forEach(word => {
                if (targetMain.includes(word)) {
                    mainMatches++;
                    console.log(`   ✅ Ana eşleşme: "${word}"`);
                }
            });
            
            // Parantez kelime eşleşmeleri  
            let parenthesesMatches = 0;
            searchParentheses.forEach(word => {
                if (targetParentheses.includes(word)) {
                    parenthesesMatches++;
                    console.log(`   ✅ Parantez eşleşme: "${word}"`);
                } else {
                    console.log(`   ❌ Parantez eşleşmedi: "${word}" (hedefte: ${JSON.stringify(targetParentheses)})`);
                }
            });
            
            console.log(`\n📊 EŞLEŞME İSTATİSTİKLERİ:`);
            console.log(`   Ana kelime eşleşme: ${mainMatches}/${searchMain.length}`);
            console.log(`   Parantez kelime eşleşme: ${parenthesesMatches}/${searchParentheses.length}`);
            console.log(`   Toplam eşleşme: ${mainMatches + parenthesesMatches}/${searchMain.length + searchParentheses.length}`);
            
            // Beklenen doğru dosya
            console.log(`\n🎯 BEKLENEN DOĞRU DOSYA:`);
            console.log(`   /Users/koray/Music/KorayMusics/Clubberism Hits - Club Pack/Billie Eilish - Bad Guy (FlexB, Vinci, Darrell Remix).mp3`);
            
            // Bu dosya candidates arasında var mı?
            const expectedPath = "/Users/koray/Music/KorayMusics/Clubberism Hits - Club Pack/Billie Eilish - Bad Guy (FlexB, Vinci, Darrell Remix).mp3";
            console.log(`\n❓ DOĞRU DOSYA CANDIDATES ARASINDA MI?`);
            
            // Bu bilgiyi almak için ayrı bir API çağrısı gerekebilir
            console.log(`   Bu bilgiyi almak için server'da ek debug gerekli`);
            
        } else {
            console.log(`❌ API Hatası: ${result.message || 'Bilinmeyen hata'}`);
        }
        
    } catch (error) {
        console.log(`❌ Bağlantı hatası: ${error.message}`);
    }
}

// Eğer doğrudan çalıştırılıyorsa test et
if (require.main === module) {
    debugSortingAlgorithm().then(() => {
        console.log("\n🎉 Debug testi tamamlandı!");
        process.exit(0);
    }).catch(error => {
        console.error("\n💥 Debug test hatası:", error);
        process.exit(1);
    });
}

module.exports = {
    debugSortingAlgorithm
};
