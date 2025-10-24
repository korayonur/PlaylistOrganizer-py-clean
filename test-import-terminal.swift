#!/usr/bin/env swift

import Foundation
import SQLite

// Basit terminal import testi
print("=== TERMINAL IMPORT TEST BAŞLADI ===")

// Veritabanı bağlantısı
let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
let dbPath = documentsPath.appendingPathComponent("playlist_organizer_swiftui.db")
print("✅ Veritabanı yolu: \(dbPath.path)")

do {
    let db = try Connection(dbPath.path)
    print("✅ SQLite bağlantısı kuruldu")
    
    // Tabloları kontrol et
    let tables = ["music_files", "tracks", "playlists", "word_index", "import_sessions"]
    for table in tables {
        let count = try db.scalar("SELECT COUNT(*) FROM \(table)") as? Int64 ?? 0
        print("📊 \(table): \(count) kayıt")
    }
    
    // Test verisi ekle
    print("\n=== TEST VERİSİ EKLENİYOR ===")
    
    // Test müzik dosyası ekle
    let insertMusicFile = try db.prepare("""
        INSERT OR IGNORE INTO music_files (path, fileName, fileNameOnly, normalizedFileName, fileExtension, source, sourceFile, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """)
    
    let now = ISO8601DateFormatter().string(from: Date())
    _ = try insertMusicFile.run(
        "/Users/koray/Music/KorayMusics/test_song.mp3",
        "test_song.mp3",
        "test_song",
        "test song",
        ".mp3",
        "manual",
        "terminal_test",
        now
    )
    
    print("✅ Test müzik dosyası eklendi")
    
    // Test track ekle
    let insertTrack = try db.prepare("""
        INSERT OR IGNORE INTO tracks (path, fileName, fileNameOnly, normalizedFileName, createdAt)
        VALUES (?, ?, ?, ?, ?)
    """)
    
    _ = try insertTrack.run(
        "/Users/koray/Music/KorayMusics/test_song.mp3",
        "test_song.mp3",
        "test_song",
        "test song",
        now
    )
    
    print("✅ Test track eklendi")
    
    // Test playlist ekle
    let insertPlaylist = try db.prepare("""
        INSERT OR IGNORE INTO playlists (path, name, type, trackCount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
    """)
    
    _ = try insertPlaylist.run(
        "/Users/koray/Music/TestPlaylist.m3u",
        "Test Playlist",
        "m3u",
        1,
        now,
        now
    )
    
    print("✅ Test playlist eklendi")
    
    // Güncel sayıları göster
    print("\n=== GÜNCEL VERİLER ===")
    for table in tables {
        let count = try db.scalar("SELECT COUNT(*) FROM \(table)") as? Int64 ?? 0
        print("📊 \(table): \(count) kayıt")
    }
    
    print("\n✅ TERMINAL IMPORT TEST BAŞARILI!")
    
} catch {
    print("❌ Hata: \(error)")
}

print("=== TERMINAL IMPORT TEST SONA ERDİ ===")
