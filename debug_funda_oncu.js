/**
 * FUNDA ÖNCÜ - CAN BEDENDEN ÇIKMAYINCA DEBUG
 * Neden ilk sırada bulunamadığını analiz et
 */

const PerfectSimilarityAlgorithm = require('./perfect_similarity_algorithm.js');
const fs = require('fs');

async function debugFundaOncu() {
    console.log('🔍 FUNDA ÖNCÜ - CAN BEDENDEN ÇIKMAYINCA DEBUG');
    console.log('='.repeat(80));
    
    try {
        const algorithm = new PerfectSimilarityAlgorithm();
        
        // Arama yapılan dosya
        const searchPath = '/Users/koray/Documents/VirtualDJ/Cache/CloudDrive/Catwork Remix Engineers Ft.Funda Öncü - Can Bedenden Çıkmayınca (2012) (4).mp3';
        const fileName = 'Catwork Remix Engineers Ft.Funda Öncü - Can Bedenden Çıkmayınca (2012) (4).mp3';
        
        console.log(`🔍 ARAMA YOLU: ${searchPath}`);
        console.log(`📝 ARAMA DOSYASI: ${fileName}`);
        console.log('─'.repeat(80));
        
        // Arama kelimelerini çıkar
        const searchWords = algorithm.extractPerfectWords(fileName, searchPath);
        console.log('🔍 Arama kelimeleri:', searchWords.file_words);
        console.log('📦 Parantez kelimeleri:', searchWords.parentheses_words);
        console.log('─'.repeat(80));
        
        // Veritabanından tüm Funda Öncü dosyalarını bul
        const database = JSON.parse(fs.readFileSync('musicfiles.db.json', 'utf8'));
        const fundaFiles = database.musicFiles.filter(file => 
            file.name.toLowerCase().includes('funda') && 
            file.name.toLowerCase().includes('onc')
        );
        
        console.log(`📊 Veritabanında ${fundaFiles.length} Funda Öncü dosyası bulundu:`);
        fundaFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.name}`);
            console.log(`      📁 ${file.path}`);
        });
        
        console.log('\n' + '─'.repeat(80));
        console.log('🔍 BENZERLİK HESAPLAMALARI:');
        console.log('─'.repeat(80));
        
        // Her Funda dosyası için benzerlik hesapla
        const results = [];
        for (const file of fundaFiles) {
            const targetWords = algorithm.extractPerfectWords(file.name, file.path);
            const similarity = algorithm.calculatePerfectSimilarity(searchWords, targetWords);
            
            results.push({
                name: file.name,
                path: file.path,
                similarity: similarity,
                searchWords: searchWords,
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
            
            // Exact match analizi
            const exactScore = algorithm.calculateExactMatch(searchWords, result.targetWords);
            console.log(`   📊 Exact Score: ${exactScore.toFixed(4)}`);
            
            // Kelime eşleşme detayı
            const searchFile = searchWords.file_words;
            const targetFile = result.targetWords.file_words;
            
            console.log(`   🔍 Kelime eşleşme detayı:`);
            for (const searchWord of searchFile) {
                const matches = targetFile.filter(targetWord => targetWord === searchWord);
                if (matches.length > 0) {
                    console.log(`      ✅ "${searchWord}" -> ${matches.length} eşleşme`);
                } else {
                    console.log(`      ❌ "${searchWord}" -> eşleşme yok`);
                }
            }
        });
        
        // Özellikle "FUNDA ONCU - CAN BEDENDEN CIKMAYINCA" dosyasını bul
        const targetFile = results.find(r => 
            r.name.toLowerCase().includes('funda') && 
            r.name.toLowerCase().includes('onc') &&
            r.name.toLowerCase().includes('can') &&
            r.name.toLowerCase().includes('bedenden')
        );
        
        if (targetFile) {
            console.log('\n🎯 HEDEF DOSYA BULUNDU:');
            console.log(`📝 ${targetFile.name}`);
            console.log(`📁 ${targetFile.path}`);
            console.log(`📊 Skor: ${targetFile.similarity.toFixed(4)}`);
            console.log(`🔍 Hedef kelimeleri: [${targetFile.targetWords.file_words.join(', ')}]`);
            
            // Neden düşük skor aldığını analiz et
            console.log('\n🔍 DÜŞÜK SKOR ANALİZİ:');
            const searchFile = searchWords.file_words;
            const targetFileWords = targetFile.targetWords.file_words;
            
            console.log('Arama kelimeleri:', searchFile);
            console.log('Hedef kelimeleri:', targetFileWords);
            
            let exactMatches = 0;
            for (const searchWord of searchFile) {
                if (targetFileWords.includes(searchWord)) {
                    exactMatches++;
                    console.log(`✅ "${searchWord}" eşleşti`);
                } else {
                    console.log(`❌ "${searchWord}" eşleşmedi`);
                }
            }
            
            const exactScore = exactMatches / searchFile.length;
            console.log(`\n📊 Exact Score: ${exactMatches}/${searchFile.length} = ${exactScore.toFixed(4)}`);
            
        } else {
            console.log('\n❌ HEDEF DOSYA BULUNAMADI!');
        }
        
    } catch (error) {
        console.error('❌ HATA:', error.message);
    }
}

// Test çalıştır
debugFundaOncu();
