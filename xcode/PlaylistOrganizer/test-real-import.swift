#!/usr/bin/env swift

import Foundation

// Test script for real import functionality
print("🧪 Gerçek Import Test Başlıyor...")

// Test 1: Database dosyası oluşuyor mu?
let projectPath = "/Users/koray/projects/PlaylistOrganizer-py-backup"
let dbPath = "\(projectPath)/playlist_organizer_swiftui.db"

print("📁 Database path: \(dbPath)")

if FileManager.default.fileExists(atPath: dbPath) {
    print("✅ Database dosyası mevcut")
    
    // Database boyutunu kontrol et
    do {
        let attributes = try FileManager.default.attributesOfItem(atPath: dbPath)
        if let size = attributes[.size] as? Int64 {
            print("📊 Database boyutu: \(size) bytes")
        }
    } catch {
        print("❌ Database boyutu kontrol edilemedi: \(error)")
    }
} else {
    print("❌ Database dosyası bulunamadı")
}

// Test 2: Müzik klasörü var mı?
let musicPath = "/Users/koray/Music"
if FileManager.default.fileExists(atPath: musicPath) {
    print("✅ Müzik klasörü mevcut: \(musicPath)")
    
    // Müzik dosyalarını say
    do {
        let contents = try FileManager.default.contentsOfDirectory(atPath: musicPath)
        let musicFiles = contents.filter { file in
            let ext = (file as NSString).pathExtension.lowercased()
            return ["mp3", "m4a", "wav", "flac", "aac"].contains(ext)
        }
        print("🎵 Müzik dosyası sayısı: \(musicFiles.count)")
    } catch {
        print("❌ Müzik klasörü okunamadı: \(error)")
    }
} else {
    print("❌ Müzik klasörü bulunamadı: \(musicPath)")
}

// Test 3: VirtualDJ klasörü var mı?
let virtualDJPath = "/Users/koray/VirtualDJ"
if FileManager.default.fileExists(atPath: virtualDJPath) {
    print("✅ VirtualDJ klasörü mevcut: \(virtualDJPath)")
    
    // VDJFolder dosyalarını say
    do {
        let contents = try FileManager.default.contentsOfDirectory(atPath: virtualDJPath)
        let vdjFolders = contents.filter { file in
            let ext = (file as NSString).pathExtension.lowercased()
            return ext == "vdjfolder"
        }
        print("📁 VDJFolder dosyası sayısı: \(vdjFolders.count)")
    } catch {
        print("❌ VirtualDJ klasörü okunamadı: \(error)")
    }
} else {
    print("❌ VirtualDJ klasörü bulunamadı: \(virtualDJPath)")
}

print("🧪 Gerçek Import Test Tamamlandı")
