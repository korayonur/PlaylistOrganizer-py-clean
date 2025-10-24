import Foundation
import os.log

/// Import süreci için özel logger
class ImportLogger {
    static let shared = ImportLogger()
    
    private let logFileURL: URL
    private let fileHandle: FileHandle?
    private let dateFormatter: DateFormatter
    
    private init() {
        // Documents klasöründe log dosyası oluştur
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        logFileURL = documentsPath.appendingPathComponent("playlist_organizer_import.log")
        
        // Log dosyasını oluştur veya aç
        if !FileManager.default.fileExists(atPath: logFileURL.path) {
            FileManager.default.createFile(atPath: logFileURL.path, contents: nil, attributes: nil)
        }
        
        fileHandle = try? FileHandle(forWritingTo: logFileURL)
        
        // Date formatter
        dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS"
        
        // Log dosyasının başına session başlangıcını yaz
        log("=== IMPORT SESSION BAŞLADI ===")
    }
    
    deinit {
        fileHandle?.closeFile()
    }
    
    /// Log mesajını hem console'a hem dosyaya yaz
    func log(_ message: String, level: ImportLogLevel = .info) {
        let timestamp = dateFormatter.string(from: Date())
        let logMessage = "[\(timestamp)] [\(level.rawValue)] \(message)"
        
        // Console'a yaz
        print(logMessage)
        
        // Dosyaya yaz
        if let fileHandle = fileHandle {
            let data = (logMessage + "\n").data(using: .utf8) ?? Data()
            fileHandle.seekToEndOfFile()
            fileHandle.write(data)
        }
    }
    
    /// Import istatistiklerini logla
    func logStats(_ stats: ImportService.ImportStats) {
        log("=== IMPORT İSTATİSTİKLERİ ===")
        log("Genel: \(stats.totalFilesProcessed)/\(stats.totalFilesFound) dosya işlendi")
        log("Müzik Dosyaları: \(stats.musicFilesProcessed)/\(stats.musicFilesFound) işlendi, \(stats.musicFilesAdded) eklendi, \(stats.musicFilesSkipped) atlandı")
        log("Playlist Dosyaları: \(stats.playlistFilesProcessed)/\(stats.playlistFilesFound) işlendi")
        log("Track'ler: \(stats.tracksProcessed)/\(stats.tracksFound) işlendi, \(stats.tracksAdded) eklendi, \(stats.tracksSkipped) atlandı")
        log("Word Index: \(stats.wordIndexEntriesCreated) entry oluşturuldu")
        log("Hatalar: \(stats.errors)")
        log("Mevcut Aşama: \(stats.currentStage)")
        log("Genel İlerleme: %\(Int(stats.currentProgress * 100))")
        log("Aşama İlerlemesi: %\(Int(stats.stageProgress * 100))")
        log("=== İSTATİSTİK SONU ===")
    }
    
    /// Hata logla
    func logError(_ error: Error, context: String = "") {
        let message = context.isEmpty ? "Hata: \(error.localizedDescription)" : "\(context) - Hata: \(error.localizedDescription)"
        log(message, level: .error)
    }
    
    /// Session sonunu logla
    func logSessionEnd() {
        log("=== IMPORT SESSION SONA ERDİ ===")
    }
}

enum ImportLogLevel: String {
    case info = "INFO"
    case warning = "WARN"
    case error = "ERROR"
    case debug = "DEBUG"
}
