#!/usr/bin/env node

const { getDatabase } = require('./shared/database');

console.log('🔧 NORMALIZED FILENAME DÜZELTİLİYOR...\n');

try {
    const dbManager = getDatabase();
    const db = dbManager.getDatabase();

    // Normalize fonksiyonu (kelime-arama-servisi.js'den kopyalandı)
    function normalize(text) {
        // 1. Uzantıyı çıkar (.mp3, .m4a, .mp4, vb)
        const withoutExt = text.replace(/\.(mp3|m4a|mp4|wav|flac|aac|wma|ogg|avi|mkv|mov|wmv|flv|webm)$/i, '');
        
        // 2. Türkçe karakterleri normalize et
        const turkishNormalized = withoutExt
            .replace(/ç/g, 'c').replace(/Ç/g, 'c')
            .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
            .replace(/ı/g, 'i').replace(/I/g, 'i')
            .replace(/ö/g, 'o').replace(/Ö/g, 'o')
            .replace(/ş/g, 's').replace(/Ş/g, 's')
            .replace(/ü/g, 'u').replace(/Ü/g, 'u')
            .replace(/İ/g, 'i');
        
        // 3. Diğer özel karakterleri kaldır ve normalize et
        return turkishNormalized.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // 1. Music files tablosunu güncelle
    console.log('📁 Music files normalizedFileName güncelleniyor...');
    const musicFiles = db.prepare(`
        SELECT path, fileName FROM music_files 
        WHERE fileName IS NOT NULL AND fileName != ''
    `).all();

    console.log(`   ${musicFiles.length.toLocaleString()} music file işlenecek...`);
    
    let musicUpdated = 0;
    const musicUpdateStmt = db.prepare(`
        UPDATE music_files 
        SET normalizedFileName = ? 
        WHERE path = ?
    `);

    for (const file of musicFiles) {
        const newNormalized = normalize(file.fileName);
        musicUpdateStmt.run(newNormalized, file.path);
        musicUpdated++;
        
        if (musicUpdated % 5000 === 0) {
            console.log(`   Music: ${musicUpdated.toLocaleString()}/${musicFiles.length.toLocaleString()}`);
        }
    }
    console.log(`   ✅ ${musicUpdated.toLocaleString()} music file güncellendi\n`);

    // 2. Tracks tablosunu güncelle
    console.log('📝 Tracks normalizedFileName güncelleniyor...');
    const tracks = db.prepare(`
        SELECT path, fileName FROM tracks 
        WHERE fileName IS NOT NULL AND fileName != ''
    `).all();

    console.log(`   ${tracks.length.toLocaleString()} track işlenecek...`);
    
    let tracksUpdated = 0;
    const trackUpdateStmt = db.prepare(`
        UPDATE tracks 
        SET normalizedFileName = ? 
        WHERE path = ?
    `);

    for (const track of tracks) {
        const newNormalized = normalize(track.fileName);
        trackUpdateStmt.run(newNormalized, track.path);
        tracksUpdated++;
        
        if (tracksUpdated % 5000 === 0) {
            console.log(`   Tracks: ${tracksUpdated.toLocaleString()}/${tracks.length.toLocaleString()}`);
        }
    }
    console.log(`   ✅ ${tracksUpdated.toLocaleString()} track güncellendi\n`);

    // 3. Test örnekleri göster
    console.log('📋 GÜNCELLENEN ÖRNEKLER:');
    console.log('\n🎵 Music Files:');
    const musicSamples = db.prepare(`
        SELECT fileName, normalizedFileName 
        FROM music_files 
        WHERE fileName LIKE '%Tarkan%' 
        LIMIT 3
    `).all();
    musicSamples.forEach(m => {
        console.log(`   "${m.fileName}" → "${m.normalizedFileName}"`);
    });

    console.log('\n📝 Tracks:');
    const trackSamples = db.prepare(`
        SELECT fileName, normalizedFileName 
        FROM tracks 
        WHERE fileName LIKE '%Tarkan%' 
        LIMIT 3
    `).all();
    trackSamples.forEach(t => {
        console.log(`   "${t.fileName}" → "${t.normalizedFileName}"`);
    });

    console.log('\n✅ NORMALIZED FILENAME DÜZELTİLDİ!');
    console.log(`📊 Toplam güncellenen: ${(musicUpdated + tracksUpdated).toLocaleString()} kayıt`);

    db.close();
} catch (error) {
    console.error('❌ Hata oluştu:', error.message);
}
