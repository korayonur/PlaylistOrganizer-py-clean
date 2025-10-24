#!/usr/bin/env swift

import Foundation

// Veritabanı Şema Analizi
print("🔍 VERİTABANI ŞEMA ANALİZİ")
print("=" + String(repeating: "=", count: 60))

// Tablo Listesi
let tables = [
    "import_sessions",
    "music_files", 
    "word_index",
    "playlists",
    "tracks",
    "playlist_tracks",
    "music_words"
]

print("\n📋 TABLO ANALİZİ:")
print("-" + String(repeating: "-", count: 40))

for table in tables {
    print("📊 \(table)")
    
    // Her tablo için analiz
    switch table {
    case "import_sessions":
        print("   ✅ ID: AUTOINCREMENT PRIMARY KEY")
        print("   📝 Amaç: Import session'larını takip et")
        print("   🔗 İlişki: Yok (standalone)")
        
    case "music_files":
        print("   ✅ ID: AUTOINCREMENT PRIMARY KEY")
        print("   📝 Amaç: Müzik dosyalarını sakla")
        print("   🔗 İlişki: word_index.file_id -> music_files.id")
        
    case "word_index":
        print("   ✅ ID: AUTOINCREMENT PRIMARY KEY")
        print("   📝 Amaç: Arama için word index")
        print("   🔗 İlişki: file_id -> music_files.id")
        print("   ⚠️ SORUN: Foreign key constraint YOK!")
        
    case "playlists":
        print("   ✅ ID: AUTOINCREMENT PRIMARY KEY")
        print("   📝 Amaç: Playlist bilgilerini sakla")
        print("   🔗 İlişki: playlist_tracks.playlist_id -> playlists.id")
        
    case "tracks":
        print("   ✅ ID: AUTOINCREMENT PRIMARY KEY")
        print("   📝 Amaç: Track bilgilerini sakla")
        print("   🔗 İlişki: playlist_tracks.track_id -> tracks.id")
        print("   ⚠️ SORUN: playlist_id kolonu gereksiz!")
        
    case "playlist_tracks":
        print("   ✅ ID: AUTOINCREMENT PRIMARY KEY")
        print("   📝 Amaç: Many-to-many ilişki")
        print("   🔗 İlişki: playlist_id -> playlists.id, track_id -> tracks.id")
        print("   ✅ Foreign key constraints VAR")
        
    case "music_words":
        print("   ✅ ID: AUTOINCREMENT PRIMARY KEY")
        print("   📝 Amaç: Müzik dosyaları için word index")
        print("   🔗 İlişki: Yok (standalone)")
        print("   ⚠️ SORUN: word_index ile çakışıyor!")
        
    default:
        print("   ❓ Bilinmeyen tablo")
    }
    print()
}

print("🚨 TESPİT EDİLEN SORUNLAR:")
print("-" + String(repeating: "-", count: 40))

let problems = [
    "1. word_index tablosunda foreign key constraint YOK",
    "2. tracks tablosunda gereksiz playlist_id kolonu VAR",
    "3. music_words ve word_index tabloları çakışıyor",
    "4. music_files ile tracks arasında ilişki YOK",
    "5. Import session'ları ile diğer tablolar arasında ilişki YOK"
]

for problem in problems {
    print("   ❌ \(problem)")
}

print("\n🔧 ÖNERİLER:")
print("-" + String(repeating: "-", count: 40))

let recommendations = [
    "1. word_index tablosuna foreign key constraint ekle",
    "2. tracks tablosundan playlist_id kolonunu kaldır",
    "3. music_words tablosunu kaldır (word_index kullan)",
    "4. music_files ile tracks arasında ilişki kur",
    "5. Import session'ları ile diğer tablolar arasında ilişki kur",
    "6. Index'ler ekle (performance için)",
    "7. Unique constraint'ler ekle (data integrity için)"
]

for recommendation in recommendations {
    print("   ✅ \(recommendation)")
}

print("\n📊 İYİLEŞTİRME ÖNERİSİ:")
print("-" + String(repeating: "-", count: 40))

print("""
🎯 ÖNCELİK SIRASI:

1. YÜKSEK ÖNCELİK:
   - word_index foreign key constraint ekle
   - tracks.playlist_id kolonunu kaldır
   - music_words tablosunu kaldır

2. ORTA ÖNCELİK:
   - music_files -> tracks ilişkisi kur
   - Import session ilişkileri kur
   - Index'ler ekle

3. DÜŞÜK ÖNCELİK:
   - Unique constraint'ler ekle
   - Performance optimizasyonları
   - Backup/restore mekanizması

🔧 MİGRASYON STRATEJİSİ:
1. Yeni şema oluştur
2. Mevcut verileri migrate et
3. Test et
4. Eski tabloları kaldır
""")

print("\n✅ ŞEMA ANALİZİ TAMAMLANDI!")
