/**
 * BASİT KELİME EŞLEŞME TESTİ
 * Parantez sistemi olmadan test edelim
 */

const PerfectSimilarityAlgorithm = require('./perfect_similarity_algorithm.js');
const fs = require('fs');

async function simpleWordMatchingTest() {
    console.log('🔍 BASİT KELİME EŞLEŞME TESTİ');
    console.log('='.repeat(80));
    
    try {
        const algorithm = new PerfectSimilarityAlgorithm();
        
        // Test dosyası
        const searchFile = 'A$Ap Ferg ft. Nicki Minaj - Plain Jane (ilkan Gunuc Remix)  mmm Masallah.m4a';
        const searchPath = `/test/path/${searchFile}`;
        
        console.log(`🔍 ARAMA: ${searchFile}`);
        console.log('─'.repeat(80));
        
        // Mevcut algoritma ile test
        console.log('1️⃣ MEVCUT ALGORİTMA (Parantez sistemi ile):');
        const currentWords = algorithm.extractPerfectWords(searchFile, searchPath);
        console.log(`   Dosya kelimeleri: [${currentWords.file_words.join(', ')}]`);
        console.log(`   Parantez kelimeleri: [${currentWords.parentheses_words.join(', ')}]`);
        
        // Veritabanından Plain Jane dosyalarını bul
        const database = JSON.parse(fs.readFileSync('musicfiles.db.json', 'utf8'));
        const plainJaneFiles = database.musicFiles.filter(file => 
            file.name.toLowerCase().includes('plain') && 
            file.name.toLowerCase().includes('jane')
        );
        
        console.log(`\n📊 Veritabanında ${plainJaneFiles.length} Plain Jane dosyası bulundu:`);
        plainJaneFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.name}`);
        });
        
        // Her dosya için benzerlik hesapla
        console.log('\n2️⃣ BENZERLİK HESAPLAMALARI:');
        console.log('─'.repeat(80));
        
        const results = [];
        for (const file of plainJaneFiles) {
            const targetWords = algorithm.extractPerfectWords(file.name, file.path);
            const similarity = algorithm.calculatePerfectSimilarity(currentWords, targetWords);
            
            results.push({
                name: file.name,
                path: file.path,
                similarity: similarity,
                targetWords: targetWords
            });
        }
        
        // Skora göre sırala
        results.sort((a, b) => b.similarity - a.similarity);
        
        console.log('📊 SONUÇLAR (Skora göre sıralı):');
        results.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.similarity.toFixed(4)} - ${result.name}`);
            console.log(`   📁 ${result.path}`);
            console.log(`   🔍 Hedef kelimeleri: [${result.targetWords.file_words.join(', ')}]`);
            console.log(`   📦 Hedef parantez kelimeleri: [${result.targetWords.parentheses_words.join(', ')}]`);
        });
        
        // 3. BASİT KELİME EŞLEŞME TESTİ
        console.log('\n3️⃣ BASİT KELİME EŞLEŞME TESTİ:');
        console.log('─'.repeat(80));
        
        // Basit kelime çıkarma (parantez sistemi olmadan)
        function extractSimpleWords(fileName) {
            const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
            
            // Tüm parantezleri kaldır
            const cleanedName = fileNameWithoutExt
                .replace(/\([^)]*\)/g, '')
                .replace(/\[[^\]]*\]/g, '')
                .replace(/\{[^}]*\}/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            // Kelime ayırma
            const words = cleanedName
                .split(/[-_\s\.\,\&\+\|\~\!\@\#\$\%\^\*\(\)\[\]\{\}]+/)
                .map(word => word.trim())
                .filter(word => word.length > 1)
                .map(word => word.toLowerCase());
            
            return words;
        }
        
        // Arama kelimelerini basit yöntemle çıkar
        const simpleSearchWords = extractSimpleWords(searchFile);
        console.log(`🔍 Basit arama kelimeleri: [${simpleSearchWords.join(', ')}]`);
        
        // Her dosya için basit benzerlik hesapla
        const simpleResults = [];
        for (const file of plainJaneFiles) {
            const simpleTargetWords = extractSimpleWords(file.name);
            
            // Basit exact match hesaplama
            let exactMatches = 0;
            for (const searchWord of simpleSearchWords) {
                if (simpleTargetWords.includes(searchWord)) {
                    exactMatches++;
                }
            }
            
            const simpleSimilarity = exactMatches / simpleSearchWords.length;
            
            simpleResults.push({
                name: file.name,
                path: file.path,
                similarity: simpleSimilarity,
                targetWords: simpleTargetWords,
                exactMatches: exactMatches
            });
        }
        
        // Skora göre sırala
        simpleResults.sort((a, b) => b.similarity - a.similarity);
        
        console.log('\n📊 BASİT SONUÇLAR (Skora göre sıralı):');
        simpleResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.similarity.toFixed(4)} - ${result.name}`);
            console.log(`   📁 ${result.path}`);
            console.log(`   🔍 Hedef kelimeleri: [${result.targetWords.join(', ')}]`);
            console.log(`   📊 Eşleşen kelimeler: ${result.exactMatches}/${simpleSearchWords.length}`);
        });
        
        // 4. KARŞILAŞTIRMA
        console.log('\n4️⃣ KARŞILAŞTIRMA:');
        console.log('─'.repeat(80));
        
        console.log('🔍 MEVCUT ALGORİTMA (Parantez sistemi):');
        console.log(`   1. ${results[0].similarity.toFixed(4)} - ${results[0].name}`);
        console.log(`   2. ${results[1].similarity.toFixed(4)} - ${results[1].name}`);
        console.log(`   3. ${results[2].similarity.toFixed(4)} - ${results[2].name}`);
        
        console.log('\n🔍 BASİT KELİME EŞLEŞME:');
        console.log(`   1. ${simpleResults[0].similarity.toFixed(4)} - ${simpleResults[0].name}`);
        console.log(`   2. ${simpleResults[1].similarity.toFixed(4)} - ${simpleResults[1].name}`);
        console.log(`   3. ${simpleResults[2].similarity.toFixed(4)} - ${simpleResults[2].name}`);
        
        // 5. ÖNERİ
        console.log('\n5️⃣ ÖNERİ:');
        console.log('─'.repeat(80));
        
        const targetFile = simpleResults.find(r => 
            r.name.toLowerCase().includes('ilkan') && 
            r.name.toLowerCase().includes('gunuc')
        );
        
        if (targetFile) {
            const targetRank = simpleResults.indexOf(targetFile) + 1;
            console.log(`🎯 HEDEF DOSYA: "${targetFile.name}"`);
            console.log(`📊 Basit algoritmada sırası: ${targetRank}`);
            console.log(`📊 Skor: ${targetFile.similarity.toFixed(4)}`);
            
            if (targetRank <= 3) {
                console.log('✅ Basit algoritma daha iyi sonuç veriyor!');
            } else {
                console.log('❌ Basit algoritma da yeterince iyi değil.');
            }
        } else {
            console.log('❌ Hedef dosya bulunamadı!');
        }
        
    } catch (error) {
        console.error('❌ HATA:', error.message);
    }
}

// Test çalıştır
simpleWordMatchingTest();
