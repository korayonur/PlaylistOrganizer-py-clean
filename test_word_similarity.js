const Database = require('better-sqlite3');
const path = require('path');

// Database bağlantısı
const dbPath = path.join(__dirname, 'musicfiles.db');
const db = new Database(dbPath);

console.log('🔍 Test başlatılıyor...');

// 1. Rakam filtreleme fonksiyonu
function filterNumbers(text) {
    return text.replace(/^\d+\s*/, '').trim();
}

// 2. Kelime kombinasyonları oluşturma (en uzundan başla)
function generateWordCombinations(words) {
    const combinations = [];
    for (let i = words.length; i >= 1; i--) {
        for (let j = 0; j <= words.length - i; j++) {
            combinations.push(words.slice(j, j + i).join(' '));
        }
    }
    return combinations;
}

// 3. Kademeli arama fonksiyonu
function searchStepByStep(trackName) {
    console.log(`\n🔍 Kademeli arama başlatılıyor: "${trackName}"`);
    
    const filteredName = filterNumbers(trackName);
    console.log(`📝 Rakam filtrelendi: "${trackName}" → "${filteredName}"`);
    
    const words = filteredName.split(' ').filter(w => w.length > 0);
    console.log(`📝 Kelimeler: [${words.join(', ')}] (${words.length} kelime)`);
    
    const combinations = generateWordCombinations(words);
    console.log(`📝 Kombinasyonlar (${combinations.length} adet):`);
    combinations.slice(0, 5).forEach((combo, i) => {
        console.log(`   ${i+1}. "${combo}"`);
    });
    if (combinations.length > 5) {
        console.log(`   ... ve ${combinations.length - 5} tane daha`);
    }

    for (let i = 0; i < combinations.length; i++) {
        const combination = combinations[i];
        console.log(`\n🔎 Arama ${i+1}/${combinations.length}: "${combination}"`);
        
        const results = db.prepare(`
            SELECT id, normalizedFileName, fileName 
            FROM music_files 
            WHERE normalizedFileName LIKE ?
            LIMIT 5
        `).all(`%${combination}%`);

        console.log(`   📊 Sonuç: ${results.length} adet bulundu`);
        
        if (results.length > 0) {
            console.log(`   ✅ İlk 3 sonuç:`);
            results.slice(0, 3).forEach((result, idx) => {
                console.log(`      ${idx+1}. ${result.normalizedFileName}`);
            });
            return { combination, results };
        }
    }

    console.log(`❌ Hiçbir kombinasyon bulunamadı`);
    return null;
}

// 4. Test verilerini al
console.log('\n📊 Test verileri alınıyor...');

// Eşleşmemiş track'lerden birkaç tane al (ID'leri filtrele)
const unmatchedTracks = db.prepare(`
    SELECT id, normalizedFileName, fileName 
    FROM tracks 
    WHERE is_matched = 0 
    AND normalizedFileName NOT LIKE 'vj%'
    AND normalizedFileName NOT LIKE 'gs%'
    AND normalizedFileName NOT LIKE 'yahmdkwkh%'
    AND LENGTH(normalizedFileName) > 5
    ORDER BY id 
    LIMIT 10
`).all();

console.log(`📊 ${unmatchedTracks.length} eşleşmemiş track bulundu:`);
unmatchedTracks.forEach((track, i) => {
    console.log(`   ${i+1}. ${track.normalizedFileName}`);
});

// 5. Her track için test yap
console.log('\n🚀 Test başlatılıyor...\n');

for (let i = 0; i < unmatchedTracks.length; i++) {
    const track = unmatchedTracks[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎵 TEST ${i+1}/${unmatchedTracks.length}: ${track.normalizedFileName}`);
    console.log(`${'='.repeat(60)}`);
    
    const searchResult = searchStepByStep(track.normalizedFileName);
    
    if (searchResult && searchResult.results.length > 0) {
        console.log(`\n✅ BAŞARILI! Bulunan kombinasyon: "${searchResult.combination}"`);
        console.log(`📊 Toplam ${searchResult.results.length} sonuç bulundu`);
    } else {
        console.log(`\n❌ BAŞARISIZ! Hiçbir eşleşme bulunamadı`);
    }
}

console.log('\n🏁 Test tamamlandı!');
db.close();
