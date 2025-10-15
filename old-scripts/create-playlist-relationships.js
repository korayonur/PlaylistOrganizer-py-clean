#!/usr/bin/env node
'use strict';

/**
 * Playlist-track ilişkilerini oluştur
 * Import edilen playlist'lerden track'leri çıkar ve ilişkileri kur
 */

const { getDatabase } = require('./shared/database');
const fs = require('fs');
const path = require('path');

console.log('🔗 Playlist-track ilişkileri oluşturuluyor...\n');

const db = getDatabase().getDatabase();

// Playlist'leri işle
const createPlaylistTrackRelations = async () => {
    console.log('📝 Playlist\'ler okunuyor...');
    const playlists = db.prepare('SELECT id, name, path, type FROM playlists').all();
    console.log(`   ${playlists.length} playlist bulundu\n`);
    
    let totalTracks = 0;
    let processedPlaylists = 0;
    
    for (const playlist of playlists) {
        try {
            console.log(`📁 İşleniyor: ${playlist.name} (${playlist.type})`);
            
            let tracks = [];
            
            if (playlist.type === 'vdjfolder') {
                // VDJFolder dosyasını oku
                tracks = await parseVDJFolder(playlist.path);
            } else if (playlist.type === 'm3u') {
                // M3U dosyasını oku
                tracks = await parseM3U(playlist.path);
            }
            
            if (tracks.length > 0) {
                console.log(`   📊 ${tracks.length} track bulundu`);
                
                // Track'leri veritabanına ekle ve ilişkileri kur
                await addTracksToPlaylist(playlist.id, tracks);
                totalTracks += tracks.length;
            }
            
            processedPlaylists++;
            
            // İlerleme göster
            if (processedPlaylists % 100 === 0) {
                console.log(`   ⏳ İşlenen: ${processedPlaylists}/${playlists.length} playlist`);
            }
            
        } catch (error) {
            console.error(`   ❌ Hata: ${playlist.name} - ${error.message}`);
        }
    }
    
    console.log(`\n✅ ${processedPlaylists} playlist işlendi, ${totalTracks} track ilişkisi oluşturuldu`);
};

// VDJFolder dosyasını parse et
const parseVDJFolder = async (filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const tracks = [];
        
        // VDJFolder formatını parse et
        const lines = content.split('\n');
        let currentTrack = null;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('[file]')) {
                if (currentTrack) {
                    tracks.push(currentTrack);
                }
                currentTrack = { path: '', fileName: '' };
            } else if (trimmedLine.startsWith('path=') && currentTrack) {
                currentTrack.path = trimmedLine.substring(5);
                currentTrack.fileName = path.basename(currentTrack.path);
            }
        }
        
        if (currentTrack) {
            tracks.push(currentTrack);
        }
        
        return tracks;
    } catch (error) {
        console.error(`VDJFolder parse hatası: ${error.message}`);
        return [];
    }
};

// M3U dosyasını parse et
const parseM3U = async (filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const tracks = [];
        
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                tracks.push({
                    path: trimmedLine,
                    fileName: path.basename(trimmedLine)
                });
            }
        }
        
        return tracks;
    } catch (error) {
        console.error(`M3U parse hatası: ${error.message}`);
        return [];
    }
};

// Track'leri playlist'e ekle
const addTracksToPlaylist = async (playlistId, tracks) => {
    const insertTrackStmt = db.prepare(`
        INSERT OR IGNORE INTO tracks (path, fileName, fileNameOnly, normalizedFileName, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);
    
    const insertRelationStmt = db.prepare(`
        INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, track_order)
        VALUES (?, ?, ?)
    `);
    
    const transaction = db.transaction(() => {
        tracks.forEach((track, index) => {
            try {
                // Track'i ekle
                const fileNameOnly = path.basename(track.fileName, path.extname(track.fileName));
                const normalizedFileName = normalizeFileName(track.fileName);
                
                const result = insertTrackStmt.run(
                    track.path,
                    track.fileName,
                    fileNameOnly,
                    normalizedFileName,
                    new Date().toISOString()
                );
                
                // İlişkiyi kur
                insertRelationStmt.run(playlistId, result.lastInsertRowid, index);
                
            } catch (error) {
                console.error(`Track ekleme hatası: ${error.message}`);
            }
        });
    });
    
    transaction();
};

// Normalize fonksiyonu (kelime-arama-servisi'nden)
const kelimeArama = require('./shared/kelime-arama-servisi');
const normalizeFileName = (fileName) => {
    return kelimeArama.normalize(fileName);
};

// Ana işlemi çalıştır
createPlaylistTrackRelations().then(() => {
    console.log('\n🎉 Playlist-track ilişkileri oluşturuldu!');
    
    // Sonuç kontrolü
    console.log('\n📊 SONUÇ:');
    console.log('═'.repeat(40));
    const stats = {
        playlists: db.prepare('SELECT COUNT(*) as count FROM playlists').get().count,
        tracks: db.prepare('SELECT COUNT(*) as count FROM tracks').get().count,
        playlist_tracks: db.prepare('SELECT COUNT(*) as count FROM playlist_tracks').get().count,
        music_files: db.prepare('SELECT COUNT(*) as count FROM music_files').get().count
    };
    
    console.log(`Playlists: ${stats.playlists}`);
    console.log(`Tracks: ${stats.tracks}`);
    console.log(`Playlist-Track İlişkileri: ${stats.playlist_tracks}`);
    console.log(`Music Files: ${stats.music_files}`);
    console.log('═'.repeat(40));
    
}).catch(error => {
    console.error('❌ Hata:', error);
});
