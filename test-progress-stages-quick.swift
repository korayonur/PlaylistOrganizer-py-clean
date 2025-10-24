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

// Progress Test Service
class ProgressTestService {
    private let config = ConfigurationService.shared
    
    func testProgressStages() {
        print("🚀 Progress Aşamaları Test Başlıyor...")
        print("=" * 80)
        
        // Test klasörü
        let testPath = "/Users/koray/Music/KorayMusics"
        
        print("\n📁 Test Klasörü: \(testPath)")
        print("-" * 60)
        
        if FileManager.default.fileExists(atPath: testPath) {
            testProgressForPath(testPath)
        } else {
            print("❌ Klasör bulunamadı: \(testPath)")
        }
        
        print("\n" + "=" * 80)
        print("✅ Progress Aşamaları Test Tamamlandı")
    }
    
    private func testProgressForPath(_ dirPath: String) {
        print("📁 Klasör taranıyor: \(dirPath)")
        
        var musicFiles = 0
        var totalFiles = 0
        
        do {
            let fileManager = FileManager.default
            let items = try fileManager.contentsOfDirectory(atPath: dirPath)
            print("📁 \(items.count) dosya bulundu")
            
            totalFiles = items.count
            
            // İlk 20 dosyayı test et
            let testItems = Array(items.prefix(20))
            print("🔍 İlk 20 dosya test ediliyor...")
            
            // 1. Klasör Tarama Aşaması (0% - 80%)
            print("\n🔄 AŞAMA 1: Klasör Tarama (0% - 80%)")
            print("-" * 40)
            
            for (index, item) in testItems.enumerated() {
                let itemPath = "\(dirPath)/\(item)"
                
                do {
                    let attributes = try fileManager.attributesOfItem(atPath: itemPath)
                    let isDirectory = (attributes[.type] as? FileAttributeType) == .typeDirectory
                    let fileExt = URL(fileURLWithPath: item).pathExtension.lowercased()
                    
                    // Progress hesapla
                    let progress = Double(index) / Double(testItems.count)
                    let stageProgress = progress * 0.8 // %80'e kadar
                    let overallProgress = stageProgress
                    
                    print("📦 Dosya \(index + 1)/\(testItems.count): %\(Int(overallProgress * 100)) (Aşama: %\(Int(stageProgress * 100)))")
                    
                    if !isDirectory {
                        if config.isMusicExtension(fileExt) {
                            musicFiles += 1
                            print("  🎵 Müzik: \(item)")
                        }
                    }
                    
                } catch {
                    print("  ❌ Hata: \(itemPath)")
                }
            }
            
            // 2. Database Temizleme Aşaması (80% - 85%)
            print("\n🔄 AŞAMA 2: Database Temizleme (80% - 85%)")
            print("-" * 40)
            
            for i in 0..<5 {
                let progress = 0.8 + (Double(i) / 5.0) * 0.05
                print("🗄️ Database temizleme: %\(Int(progress * 100))")
            }
            
            // 3. Müzik Ekleme Aşaması (85% - 95%)
            print("\n🔄 AŞAMA 3: Müzik Ekleme (85% - 95%)")
            print("-" * 40)
            
            for i in 0..<musicFiles {
                let progress = 0.85 + (Double(i) / Double(musicFiles)) * 0.1
                print("📝 Müzik ekleniyor: %\(Int(progress * 100)) (\(i + 1)/\(musicFiles))")
            }
            
            // 4. Playlist İşleme Aşaması (95% - 100%)
            print("\n🔄 AŞAMA 4: Playlist İşleme (95% - 100%)")
            print("-" * 40)
            
            for i in 0..<3 {
                let progress = 0.95 + (Double(i) / 3.0) * 0.05
                print("🎶 Playlist işleniyor: %\(Int(progress * 100)) (\(i + 1)/3)")
            }
            
            // Final Progress
            print("\n✅ Final Progress: %100")
            print("📊 SONUÇLAR:")
            print("   Toplam Dosya: \(totalFiles)")
            print("   Müzik Dosyaları: \(musicFiles)")
            print("   Playlist Dosyaları: 3")
            
        } catch {
            print("❌ Klasör tarama hatası: \(dirPath) - \(error.localizedDescription)")
        }
    }
}

// String extension for repeating
extension String {
    static func *(lhs: String, rhs: Int) -> String {
        return String(repeating: lhs, count: rhs)
    }
}

// Main execution
let testService = ProgressTestService()
testService.testProgressStages()
