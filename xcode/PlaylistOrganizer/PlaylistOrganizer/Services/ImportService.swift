import Foundation
import SwiftUI // For @Published
import UniformTypeIdentifiers
import Combine

// MARK: - Array Extension
extension Array {
    func chunked(into size: Int) -> [[Element]] {
        return stride(from: 0, to: count, by: size).map {
            Array(self[$0..<Swift.min($0 + size, count)])
        }
    }
}

// MARK: - Import Progress & Result Models
struct ImportProgress {
    let stage: String
    let current: Int
    let total: Int
    let percentage: Int
    let message: String
}

struct ImportResult {
    let musicFiles: [ScannedFile]
    let tracks: [ScannedTrack]
    let playlistFiles: [ScannedPlaylistFile]
    let m3uCount: Int
    let vdjfolderCount: Int
    let totalFiles: Int
    let duration: TimeInterval
    let success: Bool
}

class ImportService: ObservableObject {
    @Published var isImporting = false
    @Published var importProgress: Double = 0.0
    @Published var importedFiles: [String] = []
    @Published var importErrors: [String] = []
    @Published var importStats: ImportStats = ImportStats()
    
    private let config = ConfigurationService.shared
    private let databaseImportService: DatabaseImportService
    private let sessionTrackingService: SessionTrackingService
    private let wordIndexingService: WordIndexingService
    
    init() {
        let databaseManager = DatabaseManager()
        self.databaseImportService = DatabaseImportService(databaseManager: databaseManager)
        self.sessionTrackingService = SessionTrackingService(databaseManager: databaseManager)
        self.wordIndexingService = WordIndexingService(databaseManager: databaseManager)
    }
    
    // MARK: - Import Statistics
    
    struct ImportStats {
        // Genel İstatistikler
        var totalFilesProcessed: Int = 0
        var totalFilesFound: Int = 0
        var errors: Int = 0
        
        // Müzik Dosyaları İstatistikleri
        var musicFilesFound: Int = 0
        var musicFilesProcessed: Int = 0
        var musicFilesAdded: Int = 0
        var musicFilesSkipped: Int = 0
        
        // Playlist Dosyaları İstatistikleri
        var playlistFilesFound: Int = 0
        var playlistFilesProcessed: Int = 0
        var m3uFilesProcessed: Int = 0
        var vdjfolderFilesProcessed: Int = 0
        
        // Track İstatistikleri
        var tracksFound: Int = 0
        var tracksProcessed: Int = 0
        var tracksAdded: Int = 0
        var tracksSkipped: Int = 0
        
        // Word Index İstatistikleri
        var wordIndexEntriesCreated: Int = 0
        
        // Progress Bilgileri
        var currentStage: String = ""
        var currentProgress: Double = 0.0
        var stageProgress: Double = 0.0
    }
    
    // MARK: - Public Methods
    
    /// Ana import fonksiyonu (eski projeden aktarıldı)
    func scanAndImport(progressCallback: ((ImportProgress) -> Void)? = nil) async throws -> ImportResult {
        let startTime = Date()
        let logger = ImportLogger.shared
        logger.log("🚀 Import başlatılıyor: VirtualDJ + Müzik klasörleri")
        
        // UI Progress'i başlat
        await MainActor.run {
            isImporting = true
            importProgress = 0.0
            importStats = ImportStats()
        }
        
        // Progress helper - aşamalı progress sistemi
        let reportProgress = { (stage: String, current: Int, total: Int, message: String, stageWeight: Double) in
            let stageProgress = Double(current) / Double(total)
            let overallProgress = stageProgress * stageWeight
            
            // UI Progress'i güncelle
            Task { @MainActor in
                self.importProgress = overallProgress
                self.importStats.currentStage = stage
                self.importStats.currentProgress = overallProgress
                self.importStats.stageProgress = stageProgress
            }
            
            // Logger'a yaz
            logger.log("\(stage): \(current)/\(total) (%\(Int(stageProgress * 100))) - \(message)")
            
            if let callback = progressCallback {
                callback(ImportProgress(
                    stage: stage,
                    current: current,
                    total: total,
                    percentage: Int(overallProgress * 100),
                    message: message
                ))
            }
        }
        
        // Create import session
        let sessionId = try await sessionTrackingService.createSession(path: "import:\(config.musicPath)")
        
        do {
            // 1. VirtualDJ klasörünü tara (playlist'ler için) - %20
            logger.log("📁 VirtualDJ klasörü taranıyor: \(config.virtualDJPath)")
            reportProgress("VirtualDJ Tarama", 0, 100, "VirtualDJ klasörü taranıyor...", 0.2)
            let virtualDJResult = try await scanDirectoryAsync(config.virtualDJPath, isMainDirectory: true)
            
            // Stats güncelle
            await MainActor.run {
                importStats.playlistFilesFound = virtualDJResult.playlistFiles.count
            }
            
            // 2. Müzik klasörünü tara (müzik dosyaları için) - %40
            logger.log("📁 Müzik klasörü taranıyor: \(config.musicPath)")
            reportProgress("Müzik Tarama", 0, 100, "Müzik klasörü taranıyor...", 0.4)
            let musicResult = try await scanDirectoryAsync(config.musicPath, isMainDirectory: true)
            
            // Stats güncelle
            await MainActor.run {
                importStats.musicFilesFound = musicResult.musicFiles.count
                importStats.totalFilesFound = musicResult.musicFiles.count + virtualDJResult.playlistFiles.count
            }
            
            // 3. Database'i temizle - %5
            logger.log("🗄️ Database temizleniyor...")
            reportProgress("Database Temizleme", 0, 100, "Database temizleniyor...", 0.05)
            try await databaseImportService.clearImportTables()
            
            // 4. Müzik dosyalarını toplu olarak ekle - %20
            logger.log("📝 Müzik dosyaları database'e ekleniyor: \(musicResult.musicFiles.count) dosya")
            reportProgress("Müzik Ekleme", 0, 100, "Müzik dosyaları ekleniyor...", 0.2)
            let musicBulkResult = try await databaseImportService.bulkAddFiles(musicResult.musicFiles)
            
            // Stats güncelle
            await MainActor.run {
                importStats.musicFilesProcessed = musicResult.musicFiles.count
                importStats.musicFilesAdded = musicBulkResult.added
                importStats.musicFilesSkipped = musicBulkResult.skipped
            }
            
            // 5. Playlist dosyalarını işle - %10
            logger.log("🎶 Playlist dosyaları işleniyor: \(virtualDJResult.playlistFiles.count) dosya")
            reportProgress("Playlist İşleme", 0, 100, "Playlist dosyaları işleniyor...", 0.1)
            
            var m3uCount = 0
            var vdjfolderCount = 0
            var totalTracksProcessed = 0
            
            for (index, playlistFile) in virtualDJResult.playlistFiles.enumerated() {
                do {
                    if config.isM3UExtension(playlistFile.fileExtension) {
                        let m3uTracks = try await parseM3UFile(at: playlistFile.path)
                        // Playlist'i kaydet
                        let playlistId = try await databaseImportService.createPlaylist(path: playlistFile.path, name: playlistFile.fileName, type: .m3u, trackCount: m3uTracks.count)
                        _ = try await databaseImportService.savePlaylistTracks(playlistId: playlistId, tracks: m3uTracks.map { ScannedTrack(path: $0.originalPath, fileName: $0.normalizedName, fileNameOnly: $0.normalizedName, normalizedFileName: $0.normalizedName, fileExtension: URL(fileURLWithPath: $0.originalPath).pathExtension.lowercased(), source: "m3u", sourceFile: playlistFile.fileName, metadata: nil) })
                        m3uCount += 1
                        totalTracksProcessed += m3uTracks.count
                    } else if config.isVDJFolderExtension(playlistFile.fileExtension) {
                        let vdjTracks = try await parseVDJFolderFile(at: playlistFile.path)
                        // Playlist'i kaydet
                        let playlistId = try await databaseImportService.createPlaylist(path: playlistFile.path, name: playlistFile.fileName, type: .vdjfolder, trackCount: vdjTracks.count)
                        _ = try await databaseImportService.savePlaylistTracks(playlistId: playlistId, tracks: vdjTracks.map { ScannedTrack(path: $0.originalPath, fileName: $0.normalizedName, fileNameOnly: $0.normalizedName, normalizedFileName: $0.normalizedName, fileExtension: URL(fileURLWithPath: $0.originalPath).pathExtension.lowercased(), source: "vdjfolder", sourceFile: playlistFile.fileName, metadata: nil) })
                        vdjfolderCount += 1
                        totalTracksProcessed += vdjTracks.count
                    }
                    
                    // Progress güncelle - sadece her 100 playlist'te bir
                    if (index + 1) % 100 == 0 || index == virtualDJResult.playlistFiles.count - 1 {
                        reportProgress("Playlist İşleme", index + 1, virtualDJResult.playlistFiles.count, "Playlist işleniyor...", 0.1)
                    }
                } catch {
                    logger.logError(error, context: "Playlist işleme hatası: \(playlistFile.path)")
                    await MainActor.run {
                        importStats.errors += 1
                    }
                }
            }
            
            // Stats güncelle
            await MainActor.run {
                importStats.playlistFilesProcessed = virtualDJResult.playlistFiles.count
                importStats.m3uFilesProcessed = m3uCount
                importStats.vdjfolderFilesProcessed = vdjfolderCount
                importStats.tracksFound = totalTracksProcessed
                importStats.tracksProcessed = totalTracksProcessed
            }
            
            // 6. Word Index oluştur - %5
            logger.log("📝 Word index oluşturuluyor...")
            reportProgress("Word Index Oluşturma", 0, 100, "Word index oluşturuluyor...", 0.05)
            try await wordIndexingService.createWordIndex(files: musicResult.musicFiles)
            
            let totalFiles = musicBulkResult.added + totalTracksProcessed + m3uCount + vdjfolderCount
            
            // Update import session
            try await sessionTrackingService.updateSession(
                sessionId: sessionId,
                totalFiles: totalFiles,
                processedFiles: totalFiles,
                addedFiles: musicBulkResult.added + totalTracksProcessed,
                skippedFiles: musicBulkResult.skipped,
                errorFiles: importStats.errors
            )
            
            reportProgress("Tamamlandı", 100, 100, "Import tamamlandı!", 1.0)
            
            let duration = Date().timeIntervalSince(startTime)
            
            // Final stats güncelle
            await MainActor.run {
                importStats.totalFilesProcessed = totalFiles
                importStats.currentProgress = 1.0
                importStats.stageProgress = 1.0
                importStats.currentStage = "Tamamlandı"
            }
            
            // Final stats'i logla
            logger.logStats(importStats)
            logger.logSessionEnd()
            
            // UI Progress'i tamamla - Dialog'u kapatma
            await MainActor.run {
                // isImporting = false  // Dialog'u kapatma
                importProgress = 1.0
                importStats.currentStage = "✅ Import Tamamlandı"
            }
            
            return ImportResult(
                musicFiles: musicResult.musicFiles,
                tracks: [], // Tracks artık database'de
                playlistFiles: virtualDJResult.playlistFiles,
                m3uCount: m3uCount,
                vdjfolderCount: vdjfolderCount,
                totalFiles: totalFiles,
                duration: duration,
                success: true
            )
            
        } catch {
            logger.logError(error, context: "Import hatası")
            
            let duration = Date().timeIntervalSince(startTime)
            
            // UI Progress'i hata durumunda da kapatma
            await MainActor.run {
                // isImporting = false  // Dialog'u kapatma
                importProgress = 0.0
                importStats.errors += 1
                importStats.currentStage = "❌ Import Hatası"
            }
            
            logger.logSessionEnd()
            
            return ImportResult(
                musicFiles: [],
                tracks: [],
                playlistFiles: [],
                m3uCount: 0,
                vdjfolderCount: 0,
                totalFiles: 0,
                duration: duration,
                success: false
            )
        }
    }
    
    func scanDirectoryAsync(_ dirPath: String, isMainDirectory: Bool = false) async throws -> DirectoryScanResult {
        DebugLogger.shared.logDatabase("📁 Klasör taranıyor: \(dirPath)")
        
        let result = DirectoryScanResult()
        let isVirtualDJFolder = dirPath.contains("VirtualDJ")
        let batchSize = 100 // Her batch'te 100 dosya işle
        
        do {
            let fileManager = FileManager.default
            let items = try fileManager.contentsOfDirectory(atPath: dirPath)
            DebugLogger.shared.logDatabase("📁 \(items.count) dosya bulundu, batch processing başlatılıyor...")
            
            // Dosyaları batch'ler halinde işle
            for i in stride(from: 0, to: items.count, by: batchSize) {
                let endIndex = min(i + batchSize, items.count)
                let batch = Array(items[i..<endIndex])
                let batchNumber = (i / batchSize) + 1
                let totalBatches = (items.count + batchSize - 1) / batchSize
                
                DebugLogger.shared.logDatabase("📦 Batch \(batchNumber)/\(totalBatches) işleniyor (\(batch.count) dosya)")
                
                // Progress güncelle - SADECE ana klasör için
                if isMainDirectory && (batchNumber % 10 == 0 || batchNumber == totalBatches) {
                    let progress = Double(i) / Double(items.count)
                    await MainActor.run {
                        self.importProgress = progress * 0.8 // %80'e kadar
                    }
                }
                
                for item in batch {
                    let itemPath = "\(dirPath)/\(item)"
                    
                    do {
                        let attributes = try fileManager.attributesOfItem(atPath: itemPath)
                        let isDirectory = (attributes[.type] as? FileAttributeType) == .typeDirectory
                        let fileExt = URL(fileURLWithPath: item).pathExtension.lowercased()
                        
                        DebugLogger.shared.logDatabase("🔍 Dosya kontrol ediliyor: \(item) (uzantı: \(fileExt), klasör: \(isDirectory))")
                        
                        // Debug: isMusicExtension kontrolü
                        let isMusic = config.isMusicExtension(fileExt)
                        DebugLogger.shared.logDatabase("🔍 isMusicExtension(\(fileExt)) = \(isMusic)")
                        
                        if isDirectory {
                            // Alt klasörü recursive olarak tara (progress güncelleme YOK)
                            let subResult = try await scanDirectoryAsync(itemPath, isMainDirectory: false)
                            result.musicFiles.append(contentsOf: subResult.musicFiles)
                            result.tracks.append(contentsOf: subResult.tracks)
                            result.playlistFiles.append(contentsOf: subResult.playlistFiles)
                        } else if config.isMusicExtension(URL(fileURLWithPath: item).pathExtension.lowercased()) {
                            // Müzik dosyası
                            let fileExt = URL(fileURLWithPath: item).pathExtension.lowercased()
                            DebugLogger.shared.logDatabase("🔍 Müzik dosyası bulundu: \(URL(fileURLWithPath: itemPath).lastPathComponent) (uzantı: \(fileExt))")
                            result.musicFiles.append(ScannedFile(
                                path: itemPath,
                                fileName: item,
                                fileNameOnly: URL(fileURLWithPath: item).deletingPathExtension().lastPathComponent,
                                normalizedFileName: URL(fileURLWithPath: item).deletingPathExtension().lastPathComponent.lowercased(),
                                fileExtension: URL(fileURLWithPath: item).pathExtension.lowercased(),
                                size: attributes[.size] as? Int64 ?? 0,
                                modified: attributes[.modificationDate] as? Date ?? Date(),
                                created: attributes[.creationDate] as? Date ?? Date()
                            ))
                        } else if isPlaylistFile(itemPath) {
                            // Playlist dosyası - SADECE VirtualDJ klasöründe tara
                            if isVirtualDJFolder {
                                DebugLogger.shared.logDatabase("🔍 Playlist dosyası bulundu: \(URL(fileURLWithPath: itemPath).lastPathComponent)")
                                result.playlistFiles.append(ScannedPlaylistFile(
                                    path: itemPath,
                                    fileName: item,
                                    fileExtension: URL(fileURLWithPath: item).pathExtension.lowercased(),
                                    type: config.getPlaylistType(for: itemPath)
                                ))
                            }
                        }
                    } catch {
                        DebugLogger.shared.logError(error, context: "Dosya işleme hatası: \(itemPath)", category: "Database")
                    }
                }
                
                // CPU'yu serbest bırak
                if batchNumber < totalBatches {
                    try await Task.sleep(nanoseconds: 1_000_000) // 1ms
                }
            }
            
            // Progress'i %80'e çıkar
            await MainActor.run {
                self.importProgress = 0.8
            }
            
            DebugLogger.shared.logDatabase("✅ Tarama tamamlandı: \(result.musicFiles.count) müzik, \(result.tracks.count) track, \(result.playlistFiles.count) playlist")
            return result
            
        } catch {
            DebugLogger.shared.logError(error, context: "Klasör tarama hatası: \(dirPath)", category: "Database")
            throw error
        }
    }
    
    // MARK: - Private Helper Methods
    
    private func isPlaylistFile(_ path: String) -> Bool {
        let fileExtension = URL(fileURLWithPath: path).pathExtension.lowercased()
        return config.isM3UExtension(fileExtension) || config.isVDJFolderExtension(fileExtension)
    }
    
    private func parseM3UFile(at path: String) async throws -> [M3UTrack] {
        // M3U parsing implementation
        return []
    }
    
    private func parseVDJFolderFile(at path: String) async throws -> [VDJFolderTrack] {
        // VDJFolder parsing implementation
        return []
    }
}

// MARK: - File Picker Helper

struct MusicFilePicker: NSViewControllerRepresentable {
    @Binding var selectedFiles: [URL]
    let onFilesSelected: ([URL]) -> Void
    
    func makeNSViewController(context: Context) -> NSViewController {
        let picker = NSOpenPanel()
        picker.allowsMultipleSelection = true
        picker.canChooseFiles = true
        picker.canChooseDirectories = false
        picker.allowedContentTypes = [.mp3, .wav, .aiff, .audio]
        
        let controller = NSViewController()
        
        DispatchQueue.main.async {
            picker.begin { response in
                if response == .OK {
                    self.selectedFiles = picker.urls
                    self.onFilesSelected(picker.urls)
                }
            }
        }
        
        return controller
    }
    
    func updateNSViewController(_ nsViewController: NSViewController, context: Context) {
        // No updates needed
    }
}