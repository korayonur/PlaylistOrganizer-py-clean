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

// ImportStats mock
struct ImportStats {
    var totalFilesFound: Int = 0
    var totalFilesProcessed: Int = 0
    var musicFilesFound: Int = 0
    var musicFilesProcessed: Int = 0
    var musicFilesAdded: Int = 0
    var musicFilesSkipped: Int = 0
    var playlistFilesFound: Int = 0
    var playlistFilesProcessed: Int = 0
    var tracksFound: Int = 0
    var tracksProcessed: Int = 0
    var tracksAdded: Int = 0
    var tracksSkipped: Int = 0
    var wordIndexEntriesCreated: Int = 0
    var errors: Int = 0
    var currentStage: String = ""
    var currentProgress: Double = 0.0
    var stageProgress: Double = 0.0
}

// DirectoryScanResult mock
struct DirectoryScanResult {
    var musicFiles: [ScannedFile] = []
    var tracks: [ScannedTrack] = []
    var playlistFiles: [ScannedPlaylistFile] = []
}

struct ScannedFile {
    let path: String
    let fileName: String
    let fileNameOnly: String
    let normalizedFileName: String
    let fileExtension: String
    let size: Int64
    let modified: Date
    let created: Date
}

struct ScannedTrack {
    let path: String
    let fileName: String
    let fileNameOnly: String
    let normalizedFileName: String
    let fileExtension: String
    let source: String
    let sourceFile: String
}

struct ScannedPlaylistFile {
    let path: String
    let fileName: String
    let fileExtension: String
    let type: PlaylistType
}

enum PlaylistType {
    case m3u
    case vdjfolder
}

// Test Import Service
class TestImportService {
    private let config = ConfigurationService.shared
    private var stats = ImportStats()
    
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
    
    private func scanDirectoryAsync(_ dirPath: String) async throws -> DirectoryScanResult {
        print("📁 Klasör taranıyor: \(dirPath)")
        
        var result = DirectoryScanResult()
        let isVirtualDJFolder = dirPath.contains("VirtualDJ")
        let batchSize = 100
        
        do {
            let fileManager = FileManager.default
            let items = try fileManager.contentsOfDirectory(atPath: dirPath)
            print("📁 \(items.count) dosya bulundu, batch processing başlatılıyor...")
            
            stats.totalFilesFound = items.count
            
            // Dosyaları batch'ler halinde işle
            for i in stride(from: 0, to: items.count, by: batchSize) {
                let endIndex = min(i + batchSize, items.count)
                let batch = Array(items[i..<endIndex])
                let batchNumber = (i / batchSize) + 1
                let totalBatches = (items.count + batchSize - 1) / batchSize
                
                print("📦 Batch \(batchNumber)/\(totalBatches) işleniyor (\(batch.count) dosya)")
                
                // Progress güncelle
                let progress = Double(i) / Double(items.count)
                stats.currentProgress = progress * 0.8 // %80'e kadar
                
                for item in batch {
                    let itemPath = "\(dirPath)/\(item)"
                    
                    do {
                        let attributes = try fileManager.attributesOfItem(atPath: itemPath)
                        let isDirectory = (attributes[.type] as? FileAttributeType) == .typeDirectory
                        let fileExt = URL(fileURLWithPath: item).pathExtension.lowercased()
                        
                        print("🔍 Dosya kontrol ediliyor: \(item) (uzantı: \(fileExt), klasör: \(isDirectory))")
                        
                        // Debug: isMusicExtension kontrolü
                        let isMusic = config.isMusicExtension(fileExt)
                        print("🔍 isMusicExtension(\(fileExt)) = \(isMusic)")
                        
                        if isDirectory {
                            // Alt klasörü recursive olarak tara
                            let subResult = try await scanDirectoryAsync(itemPath)
                            result.musicFiles.append(contentsOf: subResult.musicFiles)
                            result.tracks.append(contentsOf: subResult.tracks)
                            result.playlistFiles.append(contentsOf: subResult.playlistFiles)
                        } else if config.isMusicExtension(fileExt) {
                            // Müzik dosyası
                            print("🎵 Müzik dosyası bulundu: \(URL(fileURLWithPath: itemPath).lastPathComponent) (uzantı: \(fileExt))")
                            result.musicFiles.append(ScannedFile(
                                path: itemPath,
                                fileName: item,
                                fileNameOnly: URL(fileURLWithPath: item).deletingPathExtension().lastPathComponent,
                                normalizedFileName: URL(fileURLWithPath: item).deletingPathExtension().lastPathComponent.lowercased(),
                                fileExtension: fileExt,
                                size: attributes[.size] as? Int64 ?? 0,
                                modified: attributes[.modificationDate] as? Date ?? Date(),
                                created: attributes[.creationDate] as? Date ?? Date()
                            ))
                            stats.musicFilesFound += 1
                        } else if isPlaylistFile(itemPath) {
                            // Playlist dosyası - SADECE VirtualDJ klasöründe tara
                            if isVirtualDJFolder {
                                print("📋 Playlist dosyası bulundu: \(URL(fileURLWithPath: itemPath).lastPathComponent)")
                                result.playlistFiles.append(ScannedPlaylistFile(
                                    path: itemPath,
                                    fileName: item,
                                    fileExtension: fileExt,
                                    type: config.getPlaylistType(for: itemPath)
                                ))
                                stats.playlistFilesFound += 1
                            }
                        }
                        
                        stats.totalFilesProcessed += 1
                        
                    } catch {
                        print("❌ Dosya işleme hatası: \(itemPath) - \(error.localizedDescription)")
                        stats.errors += 1
                    }
                }
                
                // CPU'yu serbest bırak
                if batchNumber < totalBatches {
                    try await Task.sleep(nanoseconds: 1_000_000) // 1ms
                }
            }
            
            // Progress'i %80'e çıkar
            stats.currentProgress = 0.8
            
            print("✅ Tarama tamamlandı: \(result.musicFiles.count) müzik, \(result.tracks.count) track, \(result.playlistFiles.count) playlist")
            return result
            
        } catch {
            print("❌ Klasör tarama hatası: \(dirPath) - \(error.localizedDescription)")
            throw error
        }
    }
    
    private func isPlaylistFile(_ path: String) -> Bool {
        let fileExtension = URL(fileURLWithPath: path).pathExtension.lowercased()
        return config.isM3UExtension(fileExtension) || config.isVDJFolderExtension(fileExtension)
    }
    
    private func printStats(_ result: DirectoryScanResult) {
        print("\n📊 İSTATİSTİKLER:")
        print("   Toplam Dosya: \(stats.totalFilesFound)")
        print("   İşlenen Dosya: \(stats.totalFilesProcessed)")
        print("   Müzik Dosyaları: \(stats.musicFilesFound)")
        print("   Playlist Dosyaları: \(stats.playlistFilesFound)")
        print("   Hatalar: \(stats.errors)")
        print("   Progress: %\(Int(stats.currentProgress * 100))")
        print("   Müzik Dosyaları Detayı: \(result.musicFiles.count)")
        print("   Playlist Dosyaları Detayı: \(result.playlistFiles.count)")
    }
}

// Extension for ConfigurationService
extension ConfigurationService {
    func getPlaylistType(for path: String) -> PlaylistType {
        let fileExtension = URL(fileURLWithPath: path).pathExtension.lowercased()
        if isM3UExtension(fileExtension) {
            return .m3u
        } else if isVDJFolderExtension(fileExtension) {
            return .vdjfolder
        }
        return .m3u // default
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
