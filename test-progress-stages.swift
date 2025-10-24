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
    
    func isM3UExtension(_ fileExtension: String) -> Bool {
        let ext = fileExtension.lowercased()
        return ext == "m3u" || ext == "m3u8" || ext == ".m3u" || ext == ".m3u8"
    }
    
    func isVDJFolderExtension(_ fileExtension: String) -> Bool {
        let ext = fileExtension.lowercased()
        return ext == "vdjfolder" || ext == ".vdjfolder"
    }
}

// Progress Test Service
class ProgressTestService {
    private let config = ConfigurationService.shared
    
    func testProgressStages() async throws {
        print("🚀 Progress Aşamaları Test Başlıyor...")
        print("=" * 80)
        
        // Test klasörleri
        let testPaths = [
            "/Users/koray/Music/KorayMusics",
            "/Users/koray/Music/VirtualDJ"
        ]
        
        for testPath in testPaths {
            print("\n📁 Test Klasörü: \(testPath)")
            print("-" * 60)
            
            if FileManager.default.fileExists(atPath: testPath) {
                try await testProgressForPath(testPath)
            } else {
                print("❌ Klasör bulunamadı: \(testPath)")
            }
        }
        
        print("\n" + "=" * 80)
        print("✅ Progress Aşamaları Test Tamamlandı")
    }
    
    private func testProgressForPath(_ dirPath: String) async throws {
        print("📁 Klasör taranıyor: \(dirPath)")
        
        var musicFiles = 0
        var playlistFiles = 0
        var totalFiles = 0
        let isVirtualDJFolder = dirPath.contains("VirtualDJ")
        
        do {
            let fileManager = FileManager.default
            let items = try fileManager.contentsOfDirectory(atPath: dirPath)
            print("📁 \(items.count) dosya bulundu")
            
            totalFiles = items.count
            
            // Progress aşamalarını test et
            let stages = [
                ("Klasör Tarama", 0.0, 0.8),
                ("Database Temizleme", 0.8, 0.85),
                ("Müzik Ekleme", 0.85, 0.95),
                ("Playlist İşleme", 0.95, 1.0)
            ]
            
            // 1. Klasör Tarama Aşaması (0% - 80%)
            print("\n🔄 AŞAMA 1: Klasör Tarama (0% - 80%)")
            print("-" * 40)
            
            let batchSize = 20
            for i in stride(from: 0, to: items.count, by: batchSize) {
                let endIndex = min(i + batchSize, items.count)
                let batch = Array(items[i..<endIndex])
                let batchNumber = (i / batchSize) + 1
                let totalBatches = (items.count + batchSize - 1) / batchSize
                
                // Progress hesapla
                let progress = Double(i) / Double(items.count)
                let stageProgress = progress * 0.8 // %80'e kadar
                let overallProgress = stageProgress
                
                print("📦 Batch \(batchNumber)/\(totalBatches): %\(Int(overallProgress * 100)) (Aşama: %\(Int(stageProgress * 100)))")
                
                for item in batch {
                    let itemPath = "\(dirPath)/\(item)"
                    
                    do {
                        let attributes = try fileManager.attributesOfItem(atPath: itemPath)
                        let isDirectory = (attributes[.type] as? FileAttributeType) == .typeDirectory
                        let fileExt = URL(fileURLWithPath: item).pathExtension.lowercased()
                        
                        if !isDirectory {
                            if config.isMusicExtension(fileExt) {
                                musicFiles += 1
                                print("  🎵 Müzik: \(item)")
                            } else if isPlaylistFile(itemPath) && isVirtualDJFolder {
                                playlistFiles += 1
                                print("  📋 Playlist: \(item)")
                            }
                        }
                        
                    } catch {
                        print("  ❌ Hata: \(itemPath)")
                    }
                }
                
                // CPU'yu serbest bırak
                if batchNumber < totalBatches {
                    try await Task.sleep(nanoseconds: 100_000) // 0.1ms
                }
            }
            
            // 2. Database Temizleme Aşaması (80% - 85%)
            print("\n🔄 AŞAMA 2: Database Temizleme (80% - 85%)")
            print("-" * 40)
            
            for i in 0..<5 {
                let progress = 0.8 + (Double(i) / 5.0) * 0.05
                print("🗄️ Database temizleme: %\(Int(progress * 100))")
                try await Task.sleep(nanoseconds: 50_000) // 0.05ms
            }
            
            // 3. Müzik Ekleme Aşaması (85% - 95%)
            print("\n🔄 AŞAMA 3: Müzik Ekleme (85% - 95%)")
            print("-" * 40)
            
            for i in 0..<musicFiles {
                let progress = 0.85 + (Double(i) / Double(musicFiles)) * 0.1
                print("📝 Müzik ekleniyor: %\(Int(progress * 100)) (\(i + 1)/\(musicFiles))")
                try await Task.sleep(nanoseconds: 10_000) // 0.01ms
            }
            
            // 4. Playlist İşleme Aşaması (95% - 100%)
            print("\n🔄 AŞAMA 4: Playlist İşleme (95% - 100%)")
            print("-" * 40)
            
            for i in 0..<playlistFiles {
                let progress = 0.95 + (Double(i) / Double(playlistFiles)) * 0.05
                print("🎶 Playlist işleniyor: %\(Int(progress * 100)) (\(i + 1)/\(playlistFiles))")
                try await Task.sleep(nanoseconds: 10_000) // 0.01ms
            }
            
            // Final Progress
            print("\n✅ Final Progress: %100")
            print("📊 SONUÇLAR:")
            print("   Toplam Dosya: \(totalFiles)")
            print("   Müzik Dosyaları: \(musicFiles)")
            print("   Playlist Dosyaları: \(playlistFiles)")
            
        } catch {
            print("❌ Klasör tarama hatası: \(dirPath) - \(error.localizedDescription)")
            throw error
        }
    }
    
    private func isPlaylistFile(_ path: String) -> Bool {
        let fileExtension = URL(fileURLWithPath: path).pathExtension.lowercased()
        return config.isM3UExtension(fileExtension) || config.isVDJFolderExtension(fileExtension)
    }
}

// String extension for repeating
extension String {
    static func *(lhs: String, rhs: Int) -> String {
        return String(repeating: lhs, count: rhs)
    }
}

// Main execution
Task {
    do {
        let testService = ProgressTestService()
        try await testService.testProgressStages()
    } catch {
        print("❌ Test hatası: \(error.localizedDescription)")
    }
}
