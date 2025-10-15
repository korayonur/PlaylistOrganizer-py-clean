#!/usr/bin/env node
'use strict';

/**
 * Populate Playlist Tracks Migration Script
 * 
 * Bu script mevcut playlists tablosundaki kayıtları kullanarak
 * playlist_tracks tablosunu doldurur.
 */

const { getDatabase } = require('./shared/database');
const importService = require('./modules/import/import-service');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   PLAYLIST-TRACKS MIGRATION SCRIPT                        ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

async function populatePlaylistTracks() {
    try {
        const db = getDatabase().getDatabase();
        
        // Mevcut durum
        const stats = {
            playlists: db.prepare('SELECT COUNT(*) as count FROM playlists').get().count,
            tracks: db.prepare('SELECT COUNT(*) as count FROM tracks').get().count,
            playlistTracksBefore: db.prepare('SELECT COUNT(*) as count FROM playlist_tracks').get().count
        };
        
        console.log('📊 Başlangıç Durumu:');
        console.log(`   - Playlists: ${stats.playlists}`);
        console.log(`   - Tracks: ${stats.tracks}`);
        console.log(`   - Playlist_tracks: ${stats.playlistTracksBefore}`);
        console.log('');
        
        if (stats.playlistTracksBefore > 0) {
            console.log('⚠️  UYARI: playlist_tracks tablosu zaten dolu!');
            console.log('   Devam etmek için playlist_tracks tablosunu temizliyorum...');
            db.prepare('DELETE FROM playlist_tracks').run();
            console.log('✅ playlist_tracks tablosu temizlendi');
            console.log('');
        }
        
        // Tüm playlist'leri al
        const playlists = db.prepare(`
            SELECT id, path, name, type 
            FROM playlists 
            ORDER BY id
        `).all();
        
        console.log(`🔄 ${playlists.length} playlist işleniyor...`);
        console.log('');
        
        let totalLinkedTracks = 0;
        let successCount = 0;
        let errorCount = 0;
        const startTime = Date.now();
        
        // Her playlist için
        for (let i = 0; i < playlists.length; i++) {
            const playlist = playlists[i];
            const progress = Math.round(((i + 1) / playlists.length) * 100);
            
            try {
                // Progress göster (her 100 playlist'te bir)
                if (i % 100 === 0 || i === playlists.length - 1) {
                    process.stdout.write(`\r📈 İlerleme: ${i + 1}/${playlists.length} (%${progress}) - ${totalLinkedTracks} track ilişkilendirildi`);
                }
                
                // Playlist dosyasını parse et
                const playlistTracks = importService.parsePlaylistFile(playlist.path);
                
                // Track'leri kaydet
                const linkedCount = importService.savePlaylistTracks(playlist.id, playlistTracks);
                
                totalLinkedTracks += linkedCount;
                successCount++;
                
            } catch (error) {
                errorCount++;
                if (errorCount <= 10) {  // İlk 10 hatayı göster
                    console.log('');
                    console.error(`❌ Hata: ${playlist.path} - ${error.message}`);
                }
            }
        }
        
        console.log('');
        console.log('');
        
        // Sonuç istatistikleri
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const playlistTracksAfter = db.prepare('SELECT COUNT(*) as count FROM playlist_tracks').get().count;
        
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║   MIGRATION TAMAMLANDI                                    ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('📊 Sonuç İstatistikleri:');
        console.log(`   ✅ Başarılı playlist: ${successCount}/${playlists.length}`);
        console.log(`   ❌ Hatalı playlist: ${errorCount}/${playlists.length}`);
        console.log(`   🔗 Toplam ilişkilendirme: ${playlistTracksAfter}`);
        console.log(`   ⏱️  Süre: ${duration} saniye`);
        console.log('');
        
        // Doğrulama
        console.log('🔍 Doğrulama:');
        const verification = db.prepare(`
            SELECT 
                p.id,
                p.name,
                COUNT(pt.track_id) as track_count
            FROM playlists p
            LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
            GROUP BY p.id
            HAVING track_count > 0
            ORDER BY track_count DESC
            LIMIT 5
        `).all();
        
        console.log('   En çok track içeren 5 playlist:');
        verification.forEach((p, index) => {
            console.log(`   ${index + 1}. ${p.name}: ${p.track_count} track`);
        });
        console.log('');
        
        process.exit(0);
        
    } catch (error) {
        console.error('');
        console.error('💥 Kritik hata:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Script'i çalıştır
populatePlaylistTracks();


