#!/usr/bin/env swift

import Foundation

// ConfigurationService mock
class ConfigurationService {
    static let shared = ConfigurationService()
    
    private init() {}
    
    func isMusicExtension(_ fileExtension: String) -> Bool {
        let musicExtensions = ["mp3", "wav", "flac", "aac", "m4a", "ogg", "wma"]
        return musicExtensions.contains(fileExtension.lowercased())
    }
}

// Test Import Service
class TestImportService {
    private let config = ConfigurationService.shared
    
    func testImportProgress() {
        print("🚀 Terminal Import Progress Test Başlıyor...")
        print("=" * 60)
        
        // Test klasörü
        let testPath = "/Users/koray/Music/KorayMusics"
        
        print("\n📁 Test Klasörü: \(testPath)")
        print("-" * 40)
        
        if FileManager.default.fileExists(atPath: testPath) {
            let result = scanDirectory(testPath)
            printStats(result)
        } else {
            print("❌ Klasör bulunamadı: \(testPath)")
        }
        
        print("\n" + "=" * 60)
        print("✅ Terminal Import Progress Test Tamamlandı")
    }
    
    private func scanDirectory(_ dirPath: String) -> (musicFiles: Int, totalFiles: Int) {
        print("📁 Klasör taranıyor: \(dirPath)")
        
        var musicFiles = 0
        var totalFiles = 0
        
        do {
            let fileManager = FileManager.default
            let items = try fileManager.contentsOfDirectory(atPath: dirPath)
            print("📁 \(items.count) dosya bulundu")
            
            totalFiles = items.count
            
            // İlk 10 dosyayı test et
            let testItems = Array(items.prefix(10))
            print("🔍 İlk 10 dosya test ediliyor...")
            
            for item in testItems {
                let itemPath = "\(dirPath)/\(item)"
                
                do {
                    let attributes = try fileManager.attributesOfItem(atPath: itemPath)
                    let isDirectory = (attributes[.type] as? FileAttributeType) == .typeDirectory
                    let fileExt = URL(fileURLWithPath: item).pathExtension.lowercased()
                    
                    print("🔍 Dosya: \(item) (uzantı: \(fileExt), klasör: \(isDirectory))")
                    
                    // Debug: isMusicExtension kontrolü
                    let isMusic = config.isMusicExtension(fileExt)
                    print("🔍 isMusicExtension(\(fileExt)) = \(isMusic)")
                    
                    if !isDirectory && config.isMusicExtension(fileExt) {
                        print("🎵 Müzik dosyası bulundu: \(item)")
                        musicFiles += 1
                    }
                    
                } catch {
                    print("❌ Dosya işleme hatası: \(itemPath) - \(error.localizedDescription)")
                }
            }
            
            print("✅ Tarama tamamlandı: \(musicFiles) müzik dosyası")
            return (musicFiles, totalFiles)
            
        } catch {
            print("❌ Klasör tarama hatası: \(dirPath) - \(error.localizedDescription)")
            return (0, 0)
        }
    }
    
    private func printStats(_ result: (musicFiles: Int, totalFiles: Int)) {
        print("\n📊 İSTATİSTİKLER:")
        print("   Toplam Dosya: \(result.totalFiles)")
        print("   Müzik Dosyaları: \(result.musicFiles)")
    }
}

// String extension for repeating
extension String {
    static func *(lhs: String, rhs: Int) -> String {
        return String(repeating: lhs, count: rhs)
    }
}

// Main execution
let testService = TestImportService()
testService.testImportProgress()
