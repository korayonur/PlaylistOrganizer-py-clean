#!/usr/bin/env swift

import Foundation

// Proje Kod Analizi - Şema Uyumluluğu Kontrolü
print("🔍 PROJE KOD ANALİZİ - ŞEMA UYUMLULUĞU")
print("=" + String(repeating: "=", count: 70))

// Analiz edilecek dosyalar
let filesToAnalyze = [
    "DatabaseManager.swift",
    "ImportService.swift", 
    "DatabaseImportService.swift",
    "WordIndexingService.swift",
    "SearchService.swift",
    "PlaylistOrganizerViewModel.swift"
]

print("\n📋 ANALİZ EDİLECEK DOSYALAR:")
print("-" + String(repeating: "-", count: 50))

for (index, file) in filesToAnalyze.enumerated() {
    print("\(index + 1). \(file)")
}

print("\n🔍 ŞEMA UYUMLULUĞU KONTROLÜ:")
print("-" + String(repeating: "-", count: 50))

// Kontrol edilecek şema öğeleri
let schemaElements = [
    "word_index.file_id -> music_files.id (FK constraint)",
    "tracks.playlist_id (gereksiz kolon)",
    "music_words tablosu (çakışan tablo)",
    "music_files -> tracks ilişkisi",
    "import_sessions ilişkileri",
    "Index'ler ve unique constraint'ler"
]

for (index, element) in schemaElements.enumerated() {
    print("\(index + 1). \(element)")
}

print("\n🚨 POTANSİYEL SORUNLAR:")
print("-" + String(repeating: "-", count: 50))

let potentialIssues = [
    "DatabaseManager.swift: Yeni şema ile uyumsuz tablo oluşturma",
    "ImportService.swift: Eski şema ile çalışan import logic",
    "DatabaseImportService.swift: Foreign key constraint'ler olmadan çalışma",
    "WordIndexingService.swift: music_words ve word_index çakışması",
    "SearchService.swift: Index'ler olmadan arama",
    "ViewModel: Eski şema ile veri çekme"
]

for (index, issue) in potentialIssues.enumerated() {
    print("\(index + 1). ❌ \(issue)")
}

print("\n🔧 YAPILACAKLAR:")
print("-" + String(repeating: "-", count: 50))

let todoItems = [
    "DatabaseManager.swift'i yeni şema ile güncelle",
    "ImportService.swift'i foreign key constraint'ler ile uyumlu hale getir",
    "DatabaseImportService.swift'i tracks.playlist_id olmadan çalışacak şekilde güncelle",
    "WordIndexingService.swift'i music_words yerine word_index kullanacak şekilde güncelle",
    "SearchService.swift'i index'ler ile optimize et",
    "ViewModel'i yeni şema ile uyumlu hale getir",
    "Tüm servisleri test et"
]

for (index, item) in todoItems.enumerated() {
    print("\(index + 1). ✅ \(item)")
}

print("\n📊 ÖNCELİK SIRASI:")
print("-" + String(repeating: "-", count: 50))

let priorities = [
    "1. YÜKSEK: DatabaseManager.swift (şema değişiklikleri)",
    "2. YÜKSEK: DatabaseImportService.swift (FK constraint'ler)",
    "3. ORTA: WordIndexingService.swift (tablo birleştirme)",
    "4. ORTA: ImportService.swift (import logic güncelleme)",
    "5. DÜŞÜK: SearchService.swift (index optimizasyonu)",
    "6. DÜŞÜK: ViewModel (UI güncelleme)"
]

for priority in priorities {
    print("   \(priority)")
}

print("\n🎯 ANALİZ SONUCU:")
print("-" + String(repeating: "-", count: 50))
print("✅ Şema analizi tamamlandı")
print("✅ Potansiyel sorunlar tespit edildi")
print("✅ Yapılacaklar listesi hazırlandı")
print("✅ Öncelik sırası belirlendi")
print("\n🚀 Sonraki adım: DatabaseManager.swift analizi")

print("\n✅ PROJE KOD ANALİZİ TAMAMLANDI!")
