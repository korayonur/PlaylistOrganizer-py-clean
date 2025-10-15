#!/usr/bin/env node

const { getDatabase } = require('./shared/database');
const kelimeArama = require('./shared/kelime-arama-servisi');

async function main() {
    console.log('🚀 Kelime indexi oluşturuluyor...');
    console.log('⚠️  Bu işlem 5-10 dakika sürebilir!');
    console.log('');
    
    const db = getDatabase().getDatabase();
    
    // Mevcut kayıt sayılarını göster
    const trackCount = db.prepare('SELECT COUNT(*) as c FROM tracks').get().c;
    const musicCount = db.prepare('SELECT COUNT(*) as c FROM music_files').get().c;
    
    console.log(`📊 ${trackCount.toLocaleString()} track`);
    console.log(`📊 ${musicCount.toLocaleString()} music file`);
    console.log('');
    
    const startTime = Date.now();
    
    try {
        await kelimeArama.tumIndexiYenidenOlustur();
    } catch (error) {
        console.error('❌ Index oluşturma hatası:', error);
        process.exit(1);
    }
    
    const totalTime = Date.now() - startTime;
    
    // Oluşturulan kelime sayılarını göster
    const trackWordsCount = db.prepare('SELECT COUNT(*) as c FROM track_words').get().c;
    const musicWordsCount = db.prepare('SELECT COUNT(*) as c FROM music_words').get().c;
    
    const avgTrackWords = trackCount > 0 ? Math.round(trackWordsCount / trackCount) : 0;
    const avgMusicWords = musicCount > 0 ? Math.round(musicWordsCount / musicCount) : 0;
    
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('✅ Index oluşturuldu!');
    console.log('═══════════════════════════════════════════');
    console.log(`   📝 track_words: ${trackWordsCount.toLocaleString()} kelime`);
    console.log(`   📝 music_words: ${musicWordsCount.toLocaleString()} kelime`);
    console.log(`   📊 Ortalama ${avgTrackWords} kelime/track`);
    console.log(`   📊 Ortalama ${avgMusicWords} kelime/music`);
    console.log(`   ⏱️  Süre: ${Math.round(totalTime / 1000)}s`);
    console.log('');
    console.log('🎉 Sistem hazır! Artık arama yapabilirsiniz.');
    console.log('');
    
    // Örnek veri göster
    console.log('📋 Örnek track_words:');
    const sampleTracks = db.prepare(`
        SELECT track_path, GROUP_CONCAT(word, ', ') as words
        FROM track_words
        GROUP BY track_path
        LIMIT 3
    `).all();
    
    sampleTracks.forEach(s => {
        console.log(`   ${s.track_path}`);
        console.log(`   → ${s.words}`);
        console.log('');
    });
    
    console.log('📋 Örnek music_words:');
    const sampleMusic = db.prepare(`
        SELECT music_path, GROUP_CONCAT(word, ', ') as words
        FROM music_words
        GROUP BY music_path
        LIMIT 3
    `).all();
    
    sampleMusic.forEach(s => {
        console.log(`   ${s.music_path}`);
        console.log(`   → ${s.words}`);
        console.log('');
    });
}

main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});

