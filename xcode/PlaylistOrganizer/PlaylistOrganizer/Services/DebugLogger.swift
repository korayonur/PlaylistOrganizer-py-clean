import Foundation
import os.log

/// Genel debug logging sistemi
class DebugLogger {
    static let shared = DebugLogger()
    
    private let logFileURL: URL
    private let fileHandle: FileHandle?
    private let dateFormatter: DateFormatter
    private let systemLogger: Logger
    
    private init() {
        // Documents klasöründe debug log dosyası oluştur
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        logFileURL = documentsPath.appendingPathComponent("playlist_organizer_debug.log")
        
        // Log dosyasını oluştur veya aç
        if !FileManager.default.fileExists(atPath: logFileURL.path) {
            FileManager.default.createFile(atPath: logFileURL.path, contents: nil, attributes: nil)
        }
        
        fileHandle = try? FileHandle(forWritingTo: logFileURL)
        
        // Date formatter
        dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS"
        
        // System logger
        systemLogger = Logger(subsystem: "com.djkoray01.PlaylistOrganizer", category: "Debug")
        
        // Log dosyasının başına session başlangıcını yaz
        log("=== DEBUG SESSION BAŞLADI ===", level: .info)
        log("📱 Uygulama: PlaylistOrganizer", level: .info)
        log("📅 Tarih: \(Date())", level: .info)
        log("💻 Sistem: macOS \(ProcessInfo.processInfo.operatingSystemVersionString)", level: .info)
        log("🔧 Build: \(getBuildInfo())", level: .info)
        log("📁 Log Dosyası: \(logFileURL.path)", level: .info)
        log("=== DEBUG SESSION BAŞLADI ===", level: .info)
    }
    
    deinit {
        log("=== DEBUG SESSION SONA ERDİ ===", level: .info)
        fileHandle?.closeFile()
    }
    
    /// Build bilgilerini al
    private func getBuildInfo() -> String {
        let bundle = Bundle.main
        let version = bundle.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown"
        let build = bundle.infoDictionary?["CFBundleVersion"] as? String ?? "Unknown"
        return "v\(version) (\(build))"
    }
    
    /// Log mesajını hem console'a hem dosyaya yaz
    func log(_ message: String, level: LogLevel = .info, category: String = "General") {
        let timestamp = dateFormatter.string(from: Date())
        let logMessage = "[\(timestamp)] [\(level.rawValue)] [\(category)] \(message)"
        
        // Console'a yaz
        print(logMessage)
        
        // System logger'a yaz
        switch level {
        case .info:
            systemLogger.info("\(message)")
        case .warning:
            systemLogger.warning("\(message)")
        case .error:
            systemLogger.error("\(message)")
        case .debug:
            systemLogger.debug("\(message)")
        }
        
        // Dosyaya yaz
        if let fileHandle = fileHandle {
            let data = (logMessage + "\n").data(using: .utf8) ?? Data()
            fileHandle.seekToEndOfFile()
            fileHandle.write(data)
        }
    }
    
    /// Database işlemleri için özel log
    func logDatabase(_ message: String, level: LogLevel = .info) {
        log(message, level: level, category: "Database")
    }
    
    /// Import işlemleri için özel log
    func logImport(_ message: String, level: LogLevel = .info) {
        log(message, level: level, category: "Import")
    }
    
    /// UI işlemleri için özel log
    func logUI(_ message: String, level: LogLevel = .info) {
        log(message, level: level, category: "UI")
    }
    
    /// Service işlemleri için özel log
    func logService(_ message: String, level: LogLevel = .info) {
        log(message, level: level, category: "Service")
    }
    
    /// Build işlemleri için özel log
    func logBuild(_ message: String, level: LogLevel = .info) {
        log(message, level: level, category: "Build")
    }
    
    /// Sistem sağlık durumu logla
    func logSystemHealth() {
        log("=== SİSTEM SAĞLIK DURUMU ===", level: .info, category: "System")
        
        // Memory usage
        var memoryInfo = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size)/4
        let result = withUnsafeMutablePointer(to: &memoryInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }
        
        if result == KERN_SUCCESS {
            let memoryMB = Double(memoryInfo.resident_size) / 1024.0 / 1024.0
            log("💾 Memory Usage: \(String(format: "%.2f", memoryMB)) MB", level: .info, category: "System")
        }
        
        // Disk space
        if let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
            do {
                let resourceValues = try documentsPath.resourceValues(forKeys: [.volumeAvailableCapacityKey])
                if let availableCapacity = resourceValues.volumeAvailableCapacity {
                    let availableGB = Double(availableCapacity) / 1024.0 / 1024.0 / 1024.0
                    log("💽 Available Disk Space: \(String(format: "%.2f", availableGB)) GB", level: .info, category: "System")
                }
            } catch {
                log("❌ Disk space bilgisi alınamadı: \(error)", level: .error, category: "System")
            }
        }
        
        // Database file size
        let dbPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!.appendingPathComponent("playlist_organizer_swiftui.db")
        if FileManager.default.fileExists(atPath: dbPath.path) {
            do {
                let attributes = try FileManager.default.attributesOfItem(atPath: dbPath.path)
                if let fileSize = attributes[.size] as? Int64 {
                    let sizeMB = Double(fileSize) / 1024.0 / 1024.0
                    log("🗄️ Database Size: \(String(format: "%.2f", sizeMB)) MB", level: .info, category: "System")
                }
            } catch {
                log("❌ Database size bilgisi alınamadı: \(error)", level: .error, category: "System")
            }
        }
        
        log("=== SİSTEM SAĞLIK DURUMU SONU ===", level: .info, category: "System")
    }
    
    /// Hata logla
    func logError(_ error: Error, context: String = "", category: String = "Error") {
        let message = context.isEmpty ? "Hata: \(error.localizedDescription)" : "\(context) - Hata: \(error.localizedDescription)"
        log(message, level: .error, category: category)
    }
    
    /// Performance logla
    func logPerformance(_ operation: String, duration: TimeInterval, category: String = "Performance") {
        let message = "⏱️ \(operation): \(String(format: "%.3f", duration))s"
        log(message, level: .info, category: category)
    }
}

enum LogLevel: String {
    case info = "INFO"
    case warning = "WARN"
    case error = "ERROR"
    case debug = "DEBUG"
}
