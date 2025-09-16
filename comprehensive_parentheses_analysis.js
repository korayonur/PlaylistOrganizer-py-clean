/**
 * KAPSAMLI PARANTEZ ANALİZİ
 * Veritabanı ve eksik dosyaları analiz et
 */

const PerfectSimilarityAlgorithm = require('./perfect_similarity_algorithm.js');
const fs = require('fs');

async function comprehensiveParenthesesAnalysis() {
    console.log('🔍 KAPSAMLI PARANTEZ ANALİZİ');
    console.log('='.repeat(100));
    
    try {
        // Veritabanını yükle
        const database = JSON.parse(fs.readFileSync('musicfiles.db.json', 'utf8'));
        const musicFiles = database.musicFiles;
        
        // Global-missing dosyasını yükle
        const globalMissingData = JSON.parse(fs.readFileSync('glabal-missing.json', 'utf8'));
        const missingFiles = globalMissingData.missing_files || [];
        
        console.log(`📊 Veritabanı: ${musicFiles.length} dosya`);
        console.log(`📊 Eksik dosyalar: ${missingFiles.length} dosya\n`);
        
        const algorithm = new PerfectSimilarityAlgorithm();
        
        // 1. PARANTEZ İÇEREN DOSYALARI ANALİZ ET
        console.log('1️⃣ PARANTEZ İÇEREN DOSYALAR ANALİZİ');
        console.log('─'.repeat(100));
        
        const filesWithParentheses = musicFiles.filter(file => 
            file.name.includes('(') && file.name.includes(')')
        );
        
        console.log(`📊 Parantez içeren dosya sayısı: ${filesWithParentheses.length}`);
        
        // Parantez içeriklerini analiz et
        const parenthesesContent = new Map();
        filesWithParentheses.forEach(file => {
            const matches = file.name.match(/\(([^)]+)\)/g);
            if (matches) {
                matches.forEach(match => {
                    const content = match.replace(/[()]/g, '').trim();
                    if (content) {
                        parenthesesContent.set(content, (parenthesesContent.get(content) || 0) + 1);
                    }
                });
            }
        });
        
        console.log('\n📦 En sık kullanılan parantez içerikleri:');
        const sortedParentheses = Array.from(parenthesesContent.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
        
        sortedParentheses.forEach(([content, count], index) => {
            console.log(`   ${index + 1}. "${content}" - ${count} kez`);
        });
        
        // 2. EKSİK DOSYALARDA PARANTEZ ANALİZİ
        console.log('\n2️⃣ EKSİK DOSYALARDA PARANTEZ ANALİZİ');
        console.log('─'.repeat(100));
        
        const missingWithParentheses = missingFiles.filter(file => 
            file.originalPath.includes('(') && file.originalPath.includes(')')
        );
        
        console.log(`📊 Parantez içeren eksik dosya sayısı: ${missingWithParentheses.length}`);
        
        // Eksik dosyalarda parantez içeriklerini analiz et
        const missingParenthesesContent = new Map();
        missingWithParentheses.forEach(file => {
            const fileName = file.originalPath.split('/').pop();
            const matches = fileName.match(/\(([^)]+)\)/g);
            if (matches) {
                matches.forEach(match => {
                    const content = match.replace(/[()]/g, '').trim();
                    if (content) {
                        missingParenthesesContent.set(content, (missingParenthesesContent.get(content) || 0) + 1);
                    }
                });
            }
        });
        
        console.log('\n📦 Eksik dosyalarda en sık kullanılan parantez içerikleri:');
        const sortedMissingParentheses = Array.from(missingParenthesesContent.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
        
        sortedMissingParentheses.forEach(([content, count], index) => {
            console.log(`   ${index + 1}. "${content}" - ${count} kez`);
        });
        
        // 3. PARANTEZ KELİMELERİ ÇIKARMA TESTİ
        console.log('\n3️⃣ PARANTEZ KELİMELERİ ÇIKARMA TESTİ');
        console.log('─'.repeat(100));
        
        const testFiles = [
            'FUNDA ONCU - CAN BEDENDEN CIKMAYINCA (CATWORK REMIX ENGINEERS).mp3',
            'Massimo Scalic - Massimo Scalici (Roxanne Bachata Version).mp3',
            'A$Ap Ferg ft. Nicki Minaj - Plain Jane (ilkan Gunuc Remix)  mmm Masallah.m4a',
            '16 Shots TikTok (Remix) (4).m4a',
            'Hande Yener - Acele Etme (5).m4a'
        ];
        
        testFiles.forEach((fileName, index) => {
            console.log(`\n${index + 1}. ${fileName}`);
            console.log('─'.repeat(80));
            
            const words = algorithm.extractPerfectWords(fileName, `/test/path/${fileName}`);
            console.log(`🔍 Dosya kelimeleri: [${words.file_words.join(', ')}]`);
            console.log(`📦 Parantez kelimeleri: [${words.parentheses_words.join(', ')}]`);
            
            // Manuel parantez analizi
            const matches = fileName.match(/\(([^)]+)\)/g);
            if (matches) {
                console.log(`🔍 Manuel parantez içerikleri:`);
                matches.forEach((match, i) => {
                    const content = match.replace(/[()]/g, '').trim();
                    console.log(`   ${i + 1}. "${content}"`);
                });
            } else {
                console.log(`❌ Parantez bulunamadı`);
            }
        });
        
        // 4. PARANTEZ KELİMELERİNİN BENZERLİK HESAPLAMASINA ETKİSİ
        console.log('\n4️⃣ PARANTEZ KELİMELERİNİN BENZERLİK HESAPLAMASINA ETKİSİ');
        console.log('─'.repeat(100));
        
        const testCase = {
            searchFile: 'Catwork Remix Engineers Ft.Funda Öncü - Can Bedenden Çıkmayınca (2012) (4).mp3',
            targetFile: 'FUNDA ONCU - CAN BEDENDEN CIKMAYINCA (CATWORK REMIX ENGINEERS).mp3'
        };
        
        console.log(`🔍 Arama: ${testCase.searchFile}`);
        console.log(`🎯 Hedef: ${testCase.targetFile}`);
        
        const searchWords = algorithm.extractPerfectWords(testCase.searchFile, `/test/search/${testCase.searchFile}`);
        const targetWords = algorithm.extractPerfectWords(testCase.targetFile, `/test/target/${testCase.targetFile}`);
        
        console.log(`\n🔍 Arama kelimeleri: [${searchWords.file_words.join(', ')}]`);
        console.log(`📦 Arama parantez kelimeleri: [${searchWords.parentheses_words.join(', ')}]`);
        console.log(`🎯 Hedef kelimeleri: [${targetWords.file_words.join(', ')}]`);
        console.log(`📦 Hedef parantez kelimeleri: [${targetWords.parentheses_words.join(', ')}]`);
        
        // Benzerlik hesapla
        const similarity = algorithm.calculatePerfectSimilarity(searchWords, targetWords);
        console.log(`\n📊 Final Benzerlik Skoru: ${similarity.toFixed(4)}`);
        
        // 5. PARANTEZ KELİMELERİNİN AĞIRLIĞI ANALİZİ
        console.log('\n5️⃣ PARANTEZ KELİMELERİNİN AĞIRLIĞI ANALİZİ');
        console.log('─'.repeat(100));
        
        // Parantez kelimeleri olmadan hesapla
        const searchWordsNoParentheses = {
            ...searchWords,
            parentheses_words: []
        };
        
        const similarityNoParentheses = algorithm.calculatePerfectSimilarity(searchWordsNoParentheses, targetWords);
        console.log(`📊 Parantez kelimeleri OLMADAN: ${similarityNoParentheses.toFixed(4)}`);
        console.log(`📊 Parantez kelimeleri İLE: ${similarity.toFixed(4)}`);
        console.log(`📊 Fark: ${(similarity - similarityNoParentheses).toFixed(4)}`);
        
        // 6. ALGORİTMA MANTIK HATASI ANALİZİ
        console.log('\n6️⃣ ALGORİTMA MANTIK HATASI ANALİZİ');
        console.log('─'.repeat(100));
        
        console.log('🔍 Mevcut algoritma mantığı:');
        console.log('   - Parantez kelimeleri: 0.25 ağırlık');
        console.log('   - Dosya kelimeleri: 0.45 ağırlık');
        console.log('   - Fuzzy kelimeleri: 0.25 ağırlık');
        
        console.log('\n❌ TESPİT EDİLEN SORUNLAR:');
        
        // Sorun 1: Parantez kelimeleri çıkarılmıyor
        const searchParentheses = searchWords.parentheses_words;
        const targetParentheses = targetWords.parentheses_words;
        
        if (searchParentheses.length === 0) {
            console.log('   1. Arama dosyasında parantez kelimeleri çıkarılmıyor!');
            console.log(`      Arama: "${testCase.searchFile}"`);
            console.log(`      Parantez kelimeleri: [${searchParentheses.join(', ')}]`);
        }
        
        if (targetParentheses.length === 0) {
            console.log('   2. Hedef dosyasında parantez kelimeleri çıkarılmıyor!');
            console.log(`      Hedef: "${testCase.targetFile}"`);
            console.log(`      Parantez kelimeleri: [${targetParentheses.join(', ')}]`);
        }
        
        // Sorun 2: Parantez kelimeleri eşleşmiyor
        if (searchParentheses.length > 0 && targetParentheses.length > 0) {
            const commonParentheses = searchParentheses.filter(word => targetParentheses.includes(word));
            console.log(`   3. Ortak parantez kelimeleri: [${commonParentheses.join(', ')}]`);
            if (commonParentheses.length === 0) {
                console.log('      ❌ Hiç ortak parantez kelimesi yok!');
            }
        }
        
        // 7. ÖNERİLER
        console.log('\n7️⃣ ÖNERİLER');
        console.log('─'.repeat(100));
        
        console.log('🚀 ÖNERİLEN İYİLEŞTİRMELER:');
        console.log('   1. Parantez kelimeleri çıkarma algoritmasını düzelt');
        console.log('   2. Parantez kelimeleri için daha yüksek ağırlık ver');
        console.log('   3. Parantez kelimeleri için özel bonus sistemi ekle');
        console.log('   4. Parantez kelimeleri ile dosya kelimeleri arasında köprü kur');
        
    } catch (error) {
        console.error('❌ HATA:', error.message);
    }
}

// Test çalıştır
comprehensiveParenthesesAnalysis();
