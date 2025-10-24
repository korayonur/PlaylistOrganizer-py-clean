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
        return fileExtension.lowercased() == "m3u" || fileExtension.lowercased() == "m3u8"
    }
    
    func isVDJFolderExtension(_ fileExtension: String) -> Bool {
        return fileExtension.lowercased() == "vdjfolder"
    }
}

// Test Import Service
class TestImportService {
    private let config = ConfigurationService.shared
    
    func testImportProgress() async throws {
        print("🚀 Terminal Import Progress Test Başlıyor...")
        print("=" * 60)
        
        // Test klasörleri
        let testPaths = [
            "/Users/koray/Music/KorayMusics",
            "/Users/koray/Music/VirtualDJ"
        ]
        
        for testPath in testPaths {
            print("\n📁 Test Klasörü: \(testPath)")
            print("-" * 40)
            
            if FileManager.default.fileExists(atPath: testPath) {
                let result = try await scanDirectoryAsync(testPath)
                printStats(result)
            } else {
                print("❌ Klasör bulunamadı: \(testPath)")
            }
        }
        
        print("\n" + "=" * 60)
        print("✅ Terminal Import Progress Test Tamamlandı")
    }
    
    private func scanDirectoryAsync(_ dirPath: String) async throws -> (musicFiles: Int, playlistFiles: Int, totalFiles: Int) {
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
            
            // İlk 20 dosyayı test et
            let testItems = Array(items.prefix(20))
            print("🔍 İlk 20 dosya test ediliyor...")
            
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
                    
                    if !isDirectory {
                        if config.isMusicExtension(fileExt) {
                            print("🎵 Müzik dosyası bulundu: \(item)")
                            musicFiles += 1
                        } else if isPlaylistFile(itemPath) && isVirtualDJFolder {
                            print("📋 Playlist dosyası bulundu: \(item)")
                            playlistFiles += 1
                        }
                    }
                    
                } catch {
                    print("❌ Dosya işleme hatası: \(itemPath) - \(error.localizedDescription)")
                }
            }
            
            print("✅ Tarama tamamlandı: \(musicFiles) müzik, \(playlistFiles) playlist")
            return (musicFiles, playlistFiles, totalFiles)
            
        } catch {
            print("❌ Klasör tarama hatası: \(dirPath) - \(error.localizedDescription)")
            throw error
        }
    }
    
    private func isPlaylistFile(_ path: String) -> Bool {
        let fileExtension = URL(fileURLWithPath: path).pathExtension.lowercased()
        return config.isM3UExtension(fileExtension) || config.isVDJFolderExtension(fileExtension)
    }
    
    private func printStats(_ result: (musicFiles: Int, playlistFiles: Int, totalFiles: Int)) {
        print("\n📊 İSTATİSTİKLER:")
        print("   Toplam Dosya: \(result.totalFiles)")
        print("   Müzik Dosyaları: \(result.musicFiles)")
        print("   Playlist Dosyaları: \(result.playlistFiles)")
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
        let testService = TestImportService()
        try await testService.testImportProgress()
    } catch {
        print("❌ Test hatası: \(error.localizedDescription)")
    }
}
