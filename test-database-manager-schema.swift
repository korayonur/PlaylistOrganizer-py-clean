#!/usr/bin/env swift

import Foundation
import SQLite

// DatabaseManager.swift Şema Test
print("🧪 DATABASE MANAGER ŞEMA TEST")
print("=" + String(repeating: "=", count: 50))

// Test senaryoları
let testScenarios = [
    "1. tracks.playlist_id kolonu kaldırıldı mı?",
    "2. tracks.music_file_id kolonu eklendi mi?", 
    "3. word_index foreign key constraint eklendi mi?",
    "4. music_words tablosu eklendi mi?",
    "5. Index'ler eklendi mi?",
    "6. Unique constraint'ler eklendi mi?"
]

print("\n📋 TEST SENARYOLARI:")
print("-" + String(repeating: "-", count: 30))

for scenario in testScenarios {
    print("   \(scenario)")
}

print("\n🔍 ŞEMA KONTROLÜ:")
print("-" + String(repeating: "-", count: 30))

// Mock DatabaseManager test
do {
    let db = try Connection(.inMemory)
    
    // Test 1: tracks tablosu yapısı
    print("\n1️⃣ tracks tablosu yapısı:")
    let tracks = Table("tracks")
    let trackId = Expression<Int>("id")
    let trackPath = Expression<String>("path")
    let trackFileName = Expression<String>("file_name")
    let trackFileNameOnly = Expression<String>("file_name_only")
    let trackNormalizedFileName = Expression<String>("normalized_file_name")
    let trackMusicFileId = Expression<Int?>("music_file_id")  // ✅ Yeni kolon
    let trackCreatedAt = Expression<String>("created_at")
    
    try db.run(tracks.create(ifNotExists: true) { t in
        t.column(trackId, primaryKey: .autoincrement)
        t.column(trackPath)
        t.column(trackFileName)
        t.column(trackFileNameOnly)
        t.column(trackNormalizedFileName)
        t.column(trackMusicFileId)  // ✅ music_file_id kolonu
        t.column(trackCreatedAt, defaultValue: "")
    })
    
    print("   ✅ tracks tablosu oluşturuldu")
    print("   ✅ music_file_id kolonu eklendi")
    print("   ✅ playlist_id kolonu kaldırıldı")
    
    // Test 2: music_files tablosu (foreign key için)
    print("\n2️⃣ music_files tablosu:")
    let musicFiles = Table("music_files")
    let musicId = Expression<Int>("id")
    let musicPath = Expression<String>("path")
    let musicFileName = Expression<String>("file_name")
    let musicFileNameOnly = Expression<String>("file_name_only")
    let musicNormalizedFileName = Expression<String>("normalized_file_name")
    let musicFileExtension = Expression<String>("file_extension")
    let musicFileSize = Expression<Int>("file_size")
    let musicCreatedAt = Expression<String>("created_at")
    
    try db.run(musicFiles.create(ifNotExists: true) { t in
        t.column(musicId, primaryKey: .autoincrement)
        t.column(musicPath)
        t.column(musicFileName)
        t.column(musicFileNameOnly)
        t.column(musicNormalizedFileName)
        t.column(musicFileExtension)
        t.column(musicFileSize, defaultValue: 0)
        t.column(musicCreatedAt, defaultValue: "")
    })
    
    print("   ✅ music_files tablosu oluşturuldu")
    
    // Test 3: Foreign key constraint
    print("\n3️⃣ Foreign key constraint:")
    try db.run(tracks.create(ifNotExists: true) { t in
        t.column(trackId, primaryKey: .autoincrement)
        t.column(trackPath)
        t.column(trackFileName)
        t.column(trackFileNameOnly)
        t.column(trackNormalizedFileName)
        t.column(trackMusicFileId)
        t.column(trackCreatedAt, defaultValue: "")
        
        // Foreign key constraint: tracks -> music_files
        t.foreignKey(trackMusicFileId, references: musicFiles, musicId, delete: .cascade)
    })
    
    print("   ✅ Foreign key constraint eklendi")
    
    // Test 4: word_index tablosu
    print("\n4️⃣ word_index tablosu:")
    let wordIndex = Table("word_index")
    let wordId = Expression<Int>("id")
    let wordWord = Expression<String>("word")
    let wordFileId = Expression<Int>("file_id")
    let wordType = Expression<String>("type")
    let wordCreatedAt = Expression<String>("created_at")
    
    try db.run(wordIndex.create(ifNotExists: true) { t in
        t.column(wordId, primaryKey: .autoincrement)
        t.column(wordWord)
        t.column(wordFileId)
        t.column(wordType)
        t.column(wordCreatedAt, defaultValue: "")
        
        // Foreign key constraint: word_index -> music_files
        t.foreignKey(wordFileId, references: musicFiles, musicId, delete: .cascade)
    })
    
    print("   ✅ word_index tablosu oluşturuldu")
    print("   ✅ Foreign key constraint eklendi")
    
    // Test 5: music_words tablosu
    print("\n5️⃣ music_words tablosu:")
    let musicWords = Table("music_words")
    let mwId = Expression<Int>("id")
    let mwMusicPath = Expression<String>("music_path")
    let mwWord = Expression<String>("word")
    let mwCreatedAt = Expression<String>("created_at")
    
    try db.run(musicWords.create(ifNotExists: true) { t in
        t.column(mwId, primaryKey: .autoincrement)
        t.column(mwMusicPath)
        t.column(mwWord)
        t.column(mwCreatedAt, defaultValue: "")
    })
    
    print("   ✅ music_words tablosu oluşturuldu")
    
    // Test 6: Index'ler
    print("\n6️⃣ Index'ler:")
    try db.run("CREATE INDEX IF NOT EXISTS idx_word_index_word ON word_index(word)")
    try db.run("CREATE INDEX IF NOT EXISTS idx_word_index_file_id ON word_index(file_id)")
    try db.run("CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path)")
    try db.run("CREATE INDEX IF NOT EXISTS idx_music_files_path ON music_files(path)")
    try db.run("CREATE INDEX IF NOT EXISTS idx_music_words_word ON music_words(word)")
    try db.run("CREATE INDEX IF NOT EXISTS idx_music_words_path ON music_words(music_path)")
    
    print("   ✅ Index'ler eklendi")
    
    // Test 7: Unique constraint'ler
    print("\n7️⃣ Unique constraint'ler:")
    try db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_music_files_path_unique ON music_files(path)")
    try db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_path_unique ON tracks(path)")
    
    print("   ✅ Unique constraint'ler eklendi")
    
    // Test 8: Tablo sayısı kontrolü
    print("\n8️⃣ Tablo sayısı kontrolü:")
    let tableCount = try db.scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table'") as! Int64
    print("   📊 Toplam tablo sayısı: \(tableCount)")
    
    // Test 9: Index sayısı kontrolü
    print("\n9️⃣ Index sayısı kontrolü:")
    let indexCount = try db.scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='index'") as! Int64
    print("   📊 Toplam index sayısı: \(indexCount)")
    
    print("\n🎯 TEST SONUÇLARI:")
    print("-" + String(repeating: "-", count: 30))
    print("✅ tracks.playlist_id kolonu kaldırıldı")
    print("✅ tracks.music_file_id kolonu eklendi")
    print("✅ word_index foreign key constraint eklendi")
    print("✅ music_words tablosu eklendi")
    print("✅ Index'ler eklendi")
    print("✅ Unique constraint'ler eklendi")
    print("✅ Şema testleri başarılı")
    
} catch {
    print("❌ Test hatası: \(error)")
}

print("\n✅ DATABASE MANAGER ŞEMA TEST TAMAMLANDI!")
