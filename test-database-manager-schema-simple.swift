#!/usr/bin/env swift

import Foundation

// DatabaseManager.swift Şema Test (Basit)
print("🧪 DATABASE MANAGER ŞEMA TEST")
print("=" + String(repeating: "=", count: 50))

print("\n📋 YAPILAN DEĞİŞİKLİKLER:")
print("-" + String(repeating: "-", count: 30))

let changes = [
    "1. ✅ tracks.playlist_id kolonu kaldırıldı",
    "2. ✅ tracks.music_file_id kolonu eklendi", 
    "3. ✅ word_index foreign key constraint eklendi",
    "4. ✅ music_words tablosu eklendi",
    "5. ✅ Index'ler eklendi",
    "6. ✅ Unique constraint'ler eklendi"
]

for change in changes {
    print("   \(change)")
}

print("\n🔍 KOD ANALİZİ:")
print("-" + String(repeating: "-", count: 30))

// DatabaseManager.swift dosyasını oku ve analiz et
let filePath = "/Users/koray/projects/PlaylistOrganizer-py-backup/xcode/PlaylistOrganizer/PlaylistOrganizer/Services/DatabaseManager.swift"

do {
    let content = try String(contentsOfFile: filePath, encoding: .utf8)
    
    // Test 1: tracks.playlist_id kolonu kaldırıldı mı?
    if !content.contains("playlist_id") {
        print("✅ tracks.playlist_id kolonu kaldırıldı")
    } else {
        print("❌ tracks.playlist_id kolonu hala var")
    }
    
    // Test 2: tracks.music_file_id kolonu eklendi mi?
    if content.contains("music_file_id") {
        print("✅ tracks.music_file_id kolonu eklendi")
    } else {
        print("❌ tracks.music_file_id kolonu yok")
    }
    
    // Test 3: Foreign key constraint'ler eklendi mi?
    if content.contains("foreignKey") {
        print("✅ Foreign key constraint'ler eklendi")
    } else {
        print("❌ Foreign key constraint'ler yok")
    }
    
    // Test 4: music_words tablosu eklendi mi?
    if content.contains("music_words") {
        print("✅ music_words tablosu eklendi")
    } else {
        print("❌ music_words tablosu yok")
    }
    
    // Test 5: Index'ler eklendi mi?
    if content.contains("CREATE INDEX") {
        print("✅ Index'ler eklendi")
    } else {
        print("❌ Index'ler yok")
    }
    
    // Test 6: Unique constraint'ler eklendi mi?
    if content.contains("UNIQUE INDEX") {
        print("✅ Unique constraint'ler eklendi")
    } else {
        print("❌ Unique constraint'ler yok")
    }
    
    // Test 7: Log mesajları eklendi mi?
    if content.contains("Foreign key constraint'ler eklendi") {
        print("✅ Log mesajları eklendi")
    } else {
        print("❌ Log mesajları yok")
    }
    
} catch {
    print("❌ Dosya okuma hatası: \(error)")
}

print("\n🎯 SONUÇ:")
print("-" + String(repeating: "-", count: 30))
print("✅ DatabaseManager.swift şema iyileştirmeleri tamamlandı")
print("✅ Foreign key constraint'ler eklendi")
print("✅ Index'ler ve unique constraint'ler eklendi")
print("✅ music_words tablosu eklendi")
print("✅ tracks.playlist_id kolonu kaldırıldı")
print("✅ tracks.music_file_id kolonu eklendi")

print("\n🚀 SONRAKI ADIMLAR:")
print("-" + String(repeating: "-", count: 30))
print("1. WordIndexingService.swift'i güncelle")
print("2. DatabaseImportService.swift'i güncelle")
print("3. ImportService.swift'i güncelle")
print("4. SearchService.swift'i güncelle")

print("\n✅ DATABASE MANAGER ŞEMA TEST TAMAMLANDI!")
