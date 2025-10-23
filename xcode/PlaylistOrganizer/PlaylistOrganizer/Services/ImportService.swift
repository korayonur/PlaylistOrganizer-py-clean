//
//  ImportService.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation
import SwiftUI
import UniformTypeIdentifiers
import Combine

class ImportService: ObservableObject {
    @Published var isImporting = false
    @Published var importProgress: Double = 0.0
    @Published var importedFiles: [String] = []
    @Published var importErrors: [String] = []
    @Published var importStats: ImportStats = ImportStats()
    
    private let config = ConfigurationService.shared
    private let databaseManager = DatabaseManager()
    private let databaseImportService: DatabaseImportService
    private let sessionTrackingService: SessionTrackingService
    private let wordIndexingService: WordIndexingService
    
    init() {
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
    
    func importFiles(from urls: [URL]) async {
        await MainActor.run {
            isImporting = true
            importProgress = 0.0
            importedFiles.removeAll()
            importErrors.removeAll()
            importStats = ImportStats()
        }
        
        let totalFiles = urls.count
        
        for (index, url) in urls.enumerated() {
            do {
                let fileType = config.getFileType(for: url.path)
                
                if fileType == .music {
                    let isValid = try await validateMusicFile(url)
                    if isValid {
                        let track = try await processMusicFile(url)
                        await MainActor.run {
                            importedFiles.append(track.fileName)
                            importStats.musicFilesProcessed += 1
                            importStats.totalFilesProcessed += 1
                        }
                    } else {
                        await MainActor.run {
                            importErrors.append("Geçersiz müzik dosyası: \(url.lastPathComponent)")
                            importStats.errors += 1
                        }
                    }
                } else if fileType == .playlist {
                    let isValid = try await validatePlaylistFile(url)
                    if isValid {
                        let playlist = try await processPlaylistFile(url)
                        await MainActor.run {
                            importedFiles.append(playlist.name)
                            importStats.playlistFilesProcessed += 1
                            importStats.totalFilesProcessed += 1
                            
                            let playlistType = config.getPlaylistType(for: url.path)
                            if playlistType == .m3u {
                                importStats.m3uFilesProcessed += 1
                            } else if playlistType == .vdjfolder {
                                importStats.vdjfolderFilesProcessed += 1
                            }
                        }
                    } else {
                        await MainActor.run {
                            importErrors.append("Geçersiz playlist dosyası: \(url.lastPathComponent)")
                            importStats.errors += 1
                        }
                    }
                } else {
                    await MainActor.run {
                        importErrors.append("Desteklenmeyen dosya tipi: \(url.lastPathComponent)")
                        importStats.errors += 1
                    }
                }
                
                await MainActor.run {
                    importProgress = Double(index + 1) / Double(totalFiles)
                }
            } catch {
                await MainActor.run {
                    importErrors.append("Hata: \(url.lastPathComponent) - \(error.localizedDescription)")
                    importStats.errors += 1
                }
            }
        }
        
        await MainActor.run {
            isImporting = false
            print("📊 Import tamamlandı: \(importStats.totalFilesProcessed) dosya işlendi")
            print("   - Müzik dosyaları: \(importStats.musicFilesProcessed)")
            print("   - Playlist dosyaları: \(importStats.playlistFilesProcessed)")
            print("   - M3U dosyaları: \(importStats.m3uFilesProcessed)")
            print("   - VDJFolder dosyaları: \(importStats.vdjfolderFilesProcessed)")
            print("   - Hatalar: \(importStats.errors)")
        }
    }
    
    // MARK: - Music File Processing
    
    func validateMusicFile(_ url: URL) async throws -> Bool {
        // Dosya uzantısını kontrol et
        let fileExtension = url.pathExtension.lowercased()
        guard config.isMusicExtension(fileExtension) else {
            return false
        }
        
        // Dosya boyutunu kontrol et (max 100MB)
        let fileSize = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard fileSize < 100 * 1024 * 1024 else {
            return false
        }
        
        // Dışlanacak klasörde mi kontrol et
        guard !config.isExcludedPath(url.path) else {
            return false
        }
        
        return true
    }
    
    func processMusicFile(_ url: URL) async throws -> Track {
        // Dosya metadata'sını oku
        let metadata = try await extractMetadata(from: url)
        
        // Track objesi oluştur
        let track = Track(
            id: 0, // Will be set by database
            path: url.path,
            fileName: url.lastPathComponent,
            fileNameOnly: url.deletingPathExtension().lastPathComponent,
            normalizedFileName: url.lastPathComponent.lowercased().replacingOccurrences(of: " ", with: "-"),
            createdAt: Date()
        )
        
        return track
    }
    
    // MARK: - Playlist File Processing
    
    func validatePlaylistFile(_ url: URL) async throws -> Bool {
        // Dosya uzantısını kontrol et
        let fileExtension = url.pathExtension.lowercased()
        guard config.isPlaylistExtension(fileExtension) else {
            return false
        }
        
        // Dosya boyutunu kontrol et (max 10MB)
        let fileSize = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard fileSize < 10 * 1024 * 1024 else {
            return false
        }
        
        // Dışlanacak klasörde mi kontrol et
        guard !config.isExcludedPath(url.path) else {
            return false
        }
        
        return true
    }
    
    func processPlaylistFile(_ url: URL) async throws -> Playlist {
        let playlistType = config.getPlaylistType(for: url.path)
        let name = url.deletingPathExtension().lastPathComponent
        
        // Playlist objesi oluştur
        let playlist = Playlist(
            id: 0, // Will be set by database
            path: url.path,
            name: name,
            type: playlistType,
            trackCount: 0, // Will be calculated during parsing
            createdAt: Date(),
            updatedAt: Date()
        )
        
        return playlist
    }
    
    // MARK: - Private Methods
    
    /// Normalize file name for search
    private func normalizeFileName(_ fileName: String) -> String {
        return fileName
            .lowercased()
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "_", with: "")
            .replacingOccurrences(of: "-", with: "")
            .replacingOccurrences(of: ".", with: "")
    }
    
    // MARK: - Legacy Methods (for compatibility)
    
    func validateFile(_ url: URL) async throws -> Bool {
        return try await validateMusicFile(url)
    }
    
    func processFile(_ url: URL) async throws -> Track {
        // Dosya metadata'sını oku
        let metadata = try await extractMetadata(from: url)
        
        // Track objesi oluştur
        let track = Track(
            id: 0, // Will be set by database
            path: url.path,
            fileName: url.lastPathComponent,
            fileNameOnly: url.deletingPathExtension().lastPathComponent,
            normalizedFileName: url.lastPathComponent.lowercased().replacingOccurrences(of: " ", with: "-"),
            createdAt: Date()
        )
        
        return track
    }
    
    // MARK: - M3U Parsing
    
    /// M3U dosyasını parse et (eski projeden aktarıldı)
    func parseM3UFile(_ filePath: String) throws -> [M3UTrack] {
        let fileContent = try String(contentsOfFile: filePath, encoding: .utf8)
        let lines = fileContent.components(separatedBy: .newlines)
        var tracks: [M3UTrack] = []
        var currentMetadata: M3UMetadata?
        
        for rawLine in lines {
            let line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
            if line.isEmpty { continue }
            
            // #EXTVDJ metadata parsing
            if line.hasPrefix("#EXTVDJ") {
                currentMetadata = parseExtVDJ(line)
                continue
            }
            
            // .vdjcache dosyalarını atla
            if line.lowercased().contains(".vdjcache") {
                continue
            }
            
            // Tam yol kontrolü - eğer tam yol değilse atla
            if !line.hasPrefix("/") {
                print("⚠️ M3U'da tam yol olmayan satır atlandı: \(line)")
                continue
            }
            
            // HTML decode yap
            let decodedPath = htmlDecode(line)
            let normalizedName = normalizeFileName(URL(fileURLWithPath: decodedPath).lastPathComponent)
            
            tracks.append(M3UTrack(
                originalPath: decodedPath,
                normalizedName: normalizedName,
                metadata: currentMetadata
            ))
            currentMetadata = nil
        }
        
        return tracks
    }
    
    /// #EXTVDJ metadata'sını parse et
    private func parseExtVDJ(_ line: String) -> M3UMetadata? {
        // Basit metadata parsing - gerçek implementasyon için genişletilebilir
        return M3UMetadata(
            title: nil,
            artist: nil,
            duration: nil,
            bpm: nil,
            key: nil
        )
    }
    
    /// HTML decode yap
    private func htmlDecode(_ string: String) -> String {
        return string
            .replacingOccurrences(of: "&amp;", with: "&")
            .replacingOccurrences(of: "&lt;", with: "<")
            .replacingOccurrences(of: "&gt;", with: ">")
            .replacingOccurrences(of: "&quot;", with: "\"")
            .replacingOccurrences(of: "&#39;", with: "'")
    }
    
    // MARK: - VDJFolder Parsing
    
    /// VDJFolder dosyasını parse et (eski projeden aktarıldı)
    func parseVDJFolderFile(_ filePath: String) throws -> [VDJFolderTrack] {
        let fileContent = try String(contentsOfFile: filePath, encoding: .utf8)
        var tracks: [VDJFolderTrack] = []
        
        // XML'den song elementlerini çıkar
        let songRegex = try NSRegularExpression(pattern: #"<song[^>]*path="([^"]*)"[^>]*>"#, options: [])
        let matches = songRegex.matches(in: fileContent, options: [], range: NSRange(location: 0, length: fileContent.utf16.count))
        
        for match in matches {
            if let range = Range(match.range(at: 1), in: fileContent) {
                let songPath = String(fileContent[range])
                if !songPath.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    // HTML decode yap
                    let decodedPath = htmlDecode(songPath)
                    let normalizedName = normalizeFileName(URL(fileURLWithPath: decodedPath).lastPathComponent)
                    
                    tracks.append(VDJFolderTrack(
                        originalPath: decodedPath,
                        normalizedName: normalizedName,
                        metadata: nil
                    ))
                }
            }
        }
        
        return tracks
    }
    
    // MARK: - Directory Scanning
    
    /// Klasörü tara ve import et (eski projeden aktarıldı)
    func scanDirectoryAsync(_ dirPath: String) async throws -> DirectoryScanResult {
        print("📁 Klasör taranıyor: \(dirPath)")
        
        let result = DirectoryScanResult()
        let isVirtualDJFolder = dirPath.contains("VirtualDJ")
        let batchSize = 100 // Her batch'te 100 dosya işle
        
        do {
            let fileManager = FileManager.default
            let items = try fileManager.contentsOfDirectory(atPath: dirPath)
            print("📁 \(items.count) dosya bulundu, batch processing başlatılıyor...")
            
            // Dosyaları batch'ler halinde işle
            for i in stride(from: 0, to: items.count, by: batchSize) {
                let endIndex = min(i + batchSize, items.count)
                let batch = Array(items[i..<endIndex])
                let batchNumber = (i / batchSize) + 1
                let totalBatches = (items.count + batchSize - 1) / batchSize
                
                print("📦 Batch \(batchNumber)/\(totalBatches) işleniyor (\(batch.count) dosya)")
                
                // Progress güncelle
                let progress = Double(i) / Double(items.count)
                await MainActor.run {
                    self.importProgress = progress * 0.8 // %80'e kadar
                }
                
                for item in batch {
                    let itemPath = "\(dirPath)/\(item)"
                    
                    do {
                        let attributes = try fileManager.attributesOfItem(atPath: itemPath)
                        let isDirectory = (attributes[.type] as? FileAttributeType) == .typeDirectory
                        
                        if isDirectory {
                            // Alt klasörü recursive olarak tara
                            let subResult = try await scanDirectoryAsync(itemPath)
                            result.musicFiles.append(contentsOf: subResult.musicFiles)
                            result.tracks.append(contentsOf: subResult.tracks)
                            result.playlistFiles.append(contentsOf: subResult.playlistFiles)
                        } else if isMediaFile(itemPath) {
                            // Müzik dosyası
                            result.musicFiles.append(ScannedFile(
                                path: itemPath,
                                fileName: item,
                                fileNameOnly: URL(fileURLWithPath: item).deletingPathExtension().lastPathComponent,
                                normalizedFileName: normalizeFileName(item),
                                fileExtension: URL(fileURLWithPath: item).pathExtension.lowercased(),
                                size: attributes[.size] as? Int64 ?? 0,
                                modified: attributes[.modificationDate] as? Date ?? Date(),
                                created: attributes[.creationDate] as? Date ?? Date()
                            ))
                        } else if isPlaylistFile(itemPath) {
                            // Playlist dosyası - SADECE VirtualDJ klasöründe tara
                            if isVirtualDJFolder {
                                print("🔍 Playlist dosyası bulundu: \(URL(fileURLWithPath: itemPath).lastPathComponent)")
                                result.playlistFiles.append(ScannedPlaylistFile(
                                    path: itemPath,
                                    fileName: item,
                                    type: config.getPlaylistType(for: itemPath)
                                ))
                            }
                        }
                    } catch {
                        print("❌ Dosya işleme hatası: \(itemPath) - \(error.localizedDescription)")
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
            
            print("✅ Tarama tamamlandı: \(result.musicFiles.count) müzik, \(result.tracks.count) track, \(result.playlistFiles.count) playlist")
            return result
            
        } catch {
            print("❌ Klasör tarama hatası: \(dirPath) - \(error.localizedDescription)")
            throw error
        }
    }
    
    /// Müzik dosyası mı kontrol et
    private func isMediaFile(_ filePath: String) -> Bool {
        let fileExtension = URL(fileURLWithPath: filePath).pathExtension.lowercased()
        return config.isMusicExtension(fileExtension)
    }
    
    /// Playlist dosyası mı kontrol et
    private func isPlaylistFile(_ filePath: String) -> Bool {
        let fileExtension = URL(fileURLWithPath: filePath).pathExtension.lowercased()
        return config.isPlaylistExtension(fileExtension)
    }
    
    /// Metadata extraction fonksiyonu
    private func extractMetadata(from url: URL) async throws -> (title: String?, artist: String?, duration: TimeInterval?) {
        // Basit metadata extraction - sonsuz döngüyü önle
        let fileName = url.lastPathComponent
        let fileNameOnly = url.deletingPathExtension().lastPathComponent
        
        return (
            title: fileNameOnly,
            artist: "Test Artist",
            duration: TimeInterval(180) // 3 dakika varsayılan
        )
    }
    
    // MARK: - Main Import Function
    
    /// Ana import fonksiyonu (eski projeden aktarıldı)
    func scanAndImport(progressCallback: ((ImportProgress) -> Void)? = nil) async throws -> ImportResult {
        let startTime = Date()
        let logger = ImportLogger.shared
        logger.log("🚀 Import başlatılıyor: VirtualDJ + Müzik klasörleri")
        
        // UI Progress'i başlat
        await MainActor.run {
            isImporting = true
            importProgress = 0.0
            importStats = ImportStats() // Stats'i sıfırla
        }
        
        // Progress helper - aşamalı progress sistemi
        let reportProgress = { (stage: String, current: Int, total: Int, message: String, stageWeight: Double = 1.0) in
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
            reportProgress("VirtualDJ Tarama", 0, 100, "VirtualDJ klasörü taranıyor...", stageWeight: 0.2)
            let virtualDJResult = try await scanDirectoryAsync(config.virtualDJPath)
            
            // Stats güncelle
            await MainActor.run {
                importStats.playlistFilesFound = virtualDJResult.playlistFiles.count
            }
            
            // 2. Müzik klasörünü tara (müzik dosyaları için) - %40
            logger.log("📁 Müzik klasörü taranıyor: \(config.musicPath)")
            reportProgress("Müzik Tarama", 0, 100, "Müzik klasörü taranıyor...", stageWeight: 0.4)
            let musicResult = try await scanDirectoryAsync(config.musicPath)
            
            // Stats güncelle
            await MainActor.run {
                importStats.musicFilesFound = musicResult.musicFiles.count
                importStats.totalFilesFound = musicResult.musicFiles.count + virtualDJResult.playlistFiles.count
            }
            
            // 3. Database'i temizle - %5
            logger.log("🗄️ Database temizleniyor...")
            reportProgress("Database Temizleme", 0, 100, "Database temizleniyor...", stageWeight: 0.05)
            try await databaseImportService.clearImportTables()
            
            // 4. Müzik dosyalarını toplu olarak ekle - %20
            logger.log("📝 Müzik dosyaları database'e ekleniyor: \(musicResult.musicFiles.count) dosya")
            reportProgress("Müzik Ekleme", 0, 100, "Müzik dosyaları ekleniyor...", stageWeight: 0.2)
            let musicBulkResult = try await databaseImportService.bulkAddFiles(musicResult.musicFiles)
            
            // Stats güncelle
            await MainActor.run {
                importStats.musicFilesProcessed = musicResult.musicFiles.count
                importStats.musicFilesAdded = musicBulkResult.added
                importStats.musicFilesSkipped = musicBulkResult.skipped
            }
            
            // 5. Playlist dosyalarını işle - %10
            logger.log("🎶 Playlist dosyaları işleniyor: \(virtualDJResult.playlistFiles.count) dosya")
            reportProgress("Playlist İşleme", 0, 100, "Playlist dosyaları işleniyor...", stageWeight: 0.1)
            
            var m3uCount = 0
            var vdjfolderCount = 0
            var totalTracksProcessed = 0
            
            for (index, playlistFile) in virtualDJResult.playlistFiles.enumerated() {
                do {
                    if config.isM3UExtension(playlistFile.fileExtension) {
                        let m3uTracks = try await parseM3UFile(at: playlistFile.path)
                        // Playlist'i kaydet
                        let playlistId = try await databaseImportService.createPlaylist(path: playlistFile.path, name: playlistFile.fileName, type: .m3u, trackCount: m3uTracks.count)
                        _ = try await databaseImportService.savePlaylistTracks(playlistId: playlistId, tracks: m3uTracks.map { ScannedTrack(path: $0.originalPath, fileName: $0.normalizedName, fileNameOnly: $0.normalizedName, normalizedFileName: $0.normalizedName, metadata: nil) })
                        m3uCount += 1
                        totalTracksProcessed += m3uTracks.count
                    } else if config.isVDJFolderExtension(playlistFile.fileExtension) {
                        let vdjTracks = try await parseVDJFolderFile(at: playlistFile.path)
                        // Playlist'i kaydet
                        let playlistId = try await databaseImportService.createPlaylist(path: playlistFile.path, name: playlistFile.fileName, type: .vdjFolder, trackCount: vdjTracks.count)
                        _ = try await databaseImportService.savePlaylistTracks(playlistId: playlistId, tracks: vdjTracks.map { ScannedTrack(path: $0.originalPath, fileName: $0.normalizedName, fileNameOnly: $0.normalizedName, normalizedFileName: $0.normalizedName, metadata: nil) })
                        vdjfolderCount += 1
                        totalTracksProcessed += vdjTracks.count
                    }
                    
                    // Progress güncelle
                    reportProgress("Playlist İşleme", index + 1, virtualDJResult.playlistFiles.count, "Playlist işleniyor...", stageWeight: 0.1)
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
            reportProgress("Word Index Oluşturma", 0, 100, "Word index oluşturuluyor...", stageWeight: 0.05)
            try await wordIndexingService.createWordIndex()
            
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
            
            reportProgress("Tamamlandı", 100, 100, "Import tamamlandı!", stageWeight: 1.0)
            
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
            
            // UI Progress'i tamamla
            await MainActor.run {
                isImporting = false
                importProgress = 1.0
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
            
            // UI Progress'i hata durumunda da kapat
            await MainActor.run {
                isImporting = false
                importProgress = 0.0
                importStats.errors += 1
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
            print("   - Müzik dosyaları: \(scanResult.musicFiles.count)")
            print("   - Track'ler: \(scanResult.tracks.count)")
            print("   - M3U track'leri: \(m3uCount)")
            print("   - VDJFolder track'leri: \(vdjfolderCount)")
            print("   - Playlist dosyaları: \(scanResult.playlistFiles.count)")
            
            // Update session statistics
            try await sessionTrackingService.updateSession(
                sessionId: sessionId,
                totalFiles: totalFiles,
                processedFiles: totalFiles,
                addedFiles: musicBulkResult.added + scanResult.tracks.count,
                skippedFiles: musicBulkResult.skipped,
                errorFiles: 0
            )
            
            reportProgress("Tamamlandı", 100, 100, "Import tamamlandı!")
            
            let duration = Date().timeIntervalSince(startTime)
            
            // UI Progress'i tamamla
            await MainActor.run {
                isImporting = false
                importProgress = 1.0
                
                // Import stats'i güncelle
                importStats = ImportStats(
                    musicFilesProcessed: totalFiles,
                    playlistFilesProcessed: scanResult.playlistFiles.count,
                    m3uFilesProcessed: m3uCount,
                    vdjfolderFilesProcessed: vdjfolderCount,
                    totalFilesProcessed: totalFiles,
                    errors: 0
                )
            }
            
            return ImportResult(
                musicFiles: scanResult.musicFiles,
                tracks: scanResult.tracks,
                playlistFiles: scanResult.playlistFiles,
                m3uCount: m3uCount,
                vdjfolderCount: vdjfolderCount,
                totalFiles: totalFiles,
                duration: duration,
                success: true
            )
            
        } catch {
            print("❌ Import hatası: \(error.localizedDescription)")
            reportProgress("Hata", 0, 100, "Import hatası: \(error.localizedDescription)")
            
            let duration = Date().timeIntervalSince(startTime)
            
            // UI Progress'i hata durumunda da kapat
            await MainActor.run {
                isImporting = false
                importProgress = 0.0
            }
            
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
        
        picker.begin { response in
            if response == .OK {
                selectedFiles = picker.urls
                onFilesSelected(picker.urls)
            }
        }
        
        return controller
    }
    
    func updateNSViewController(_ nsViewController: NSViewController, context: Context) {
        // Update if needed
    }
}
