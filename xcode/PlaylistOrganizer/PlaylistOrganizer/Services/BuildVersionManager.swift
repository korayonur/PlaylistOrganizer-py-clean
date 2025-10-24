import Foundation

/// Build versiyon otomatik artırma sistemi
class BuildVersionManager {
    static let shared = BuildVersionManager()
    
    private let versionFilePath: URL
    private let dateFormatter: DateFormatter
    
    private init() {
        // Proje kök dizininde version dosyası
        let projectRoot = URL(fileURLWithPath: "/Users/koray/projects/PlaylistOrganizer-py-backup")
        versionFilePath = projectRoot.appendingPathComponent("VERSION")
        
        dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        
        // Version dosyasını oluştur veya güncelle
        updateBuildVersion()
    }
    
    /// Build versiyonunu güncelle
    func updateBuildVersion() {
        let currentVersion = getCurrentVersion()
        let newVersion = incrementVersion(currentVersion)
        
        // Version dosyasına yaz
        let versionInfo = """
        VERSION=\(newVersion.version)
        BUILD=\(newVersion.build)
        LAST_UPDATED=\(dateFormatter.string(from: Date()))
        BUILD_DATE=\(dateFormatter.string(from: Date()))
        """
        
        do {
            try versionInfo.write(to: versionFilePath, atomically: true, encoding: .utf8)
            DebugLogger.shared.logBuild("📦 Build versiyon güncellendi: v\(newVersion.version) (\(newVersion.build))")
        } catch {
            DebugLogger.shared.logError(error, context: "Version dosyası yazılamadı", category: "Build")
        }
        
        // Info.plist'i güncelle
        updateInfoPlist(version: newVersion.version, build: newVersion.build)
    }
    
    /// Mevcut versiyonu al
    private func getCurrentVersion() -> (version: String, build: String) {
        if FileManager.default.fileExists(atPath: versionFilePath.path) {
            do {
                let content = try String(contentsOf: versionFilePath, encoding: .utf8)
                let lines = content.components(separatedBy: .newlines)
                
                var version = "1.0.0"
                var build = "1"
                
                for line in lines {
                    if line.hasPrefix("VERSION=") {
                        version = String(line.dropFirst(8))
                    } else if line.hasPrefix("BUILD=") {
                        build = String(line.dropFirst(6))
                    }
                }
                
                return (version, build)
            } catch {
                DebugLogger.shared.logError(error, context: "Version dosyası okunamadı", category: "Build")
            }
        }
        
        return ("1.0.0", "1")
    }
    
    /// Versiyonu artır
    private func incrementVersion(_ current: (version: String, build: String)) -> (version: String, build: String) {
        let buildNumber = Int(current.build) ?? 1
        let newBuild = buildNumber + 1
        
        // Her 10 build'de minor version artır
        let versionParts = current.version.components(separatedBy: ".")
        let major = Int(versionParts[0]) ?? 1
        var minor = Int(versionParts[1]) ?? 0
        let patch = Int(versionParts[2]) ?? 0
        
        if newBuild % 10 == 0 {
            minor += 1
        }
        
        let newVersion = "\(major).\(minor).\(patch)"
        
        return (newVersion, String(newBuild))
    }
    
    /// Info.plist'i güncelle
    private func updateInfoPlist(version: String, build: String) {
        let infoPlistPath = URL(fileURLWithPath: "/Users/koray/projects/PlaylistOrganizer-py-backup/xcode/PlaylistOrganizer/PlaylistOrganizer/Info.plist")
        
        // Info.plist dosyası yoksa oluştur
        if !FileManager.default.fileExists(atPath: infoPlistPath.path) {
            createInfoPlist(at: infoPlistPath, version: version, build: build)
            return
        }
        
        do {
            let data = try Data(contentsOf: infoPlistPath)
            var plist = try PropertyListSerialization.propertyList(from: data, options: [], format: nil) as! [String: Any]
            
            plist["CFBundleShortVersionString"] = version
            plist["CFBundleVersion"] = build
            
            let newData = try PropertyListSerialization.data(fromPropertyList: plist, format: .xml, options: 0)
            try newData.write(to: infoPlistPath)
            
            DebugLogger.shared.logBuild("📋 Info.plist güncellendi: v\(version) (\(build))")
        } catch {
            DebugLogger.shared.logError(error, context: "Info.plist güncellenemedi", category: "Build")
        }
    }
    
    /// Info.plist dosyası oluştur
    private func createInfoPlist(at path: URL, version: String, build: String) {
        let plist: [String: Any] = [
            "CFBundleDevelopmentRegion": "tr",
            "CFBundleExecutable": "PlaylistOrganizer",
            "CFBundleIdentifier": "com.djkoray01.PlaylistOrganizer",
            "CFBundleInfoDictionaryVersion": "6.0",
            "CFBundleName": "PlaylistOrganizer",
            "CFBundlePackageType": "APPL",
            "CFBundleShortVersionString": version,
            "CFBundleVersion": build,
            "LSMinimumSystemVersion": "14.0",
            "NSPrincipalClass": "NSApplication",
            "NSHighResolutionCapable": true,
            "NSAppTransportSecurity": [
                "NSAllowsArbitraryLoads": true
            ]
        ]
        
        do {
            let data = try PropertyListSerialization.data(fromPropertyList: plist, format: .xml, options: 0)
            try data.write(to: path)
            DebugLogger.shared.logBuild("📋 Info.plist oluşturuldu: v\(version) (\(build))")
        } catch {
            DebugLogger.shared.logError(error, context: "Info.plist oluşturulamadı", category: "Build")
        }
    }
    
    /// Mevcut build bilgilerini al
    func getCurrentBuildInfo() -> (version: String, build: String, lastUpdated: String) {
        if FileManager.default.fileExists(atPath: versionFilePath.path) {
            do {
                let content = try String(contentsOf: versionFilePath, encoding: .utf8)
                let lines = content.components(separatedBy: .newlines)
                
                var version = "1.0.0"
                var build = "1"
                var lastUpdated = "Unknown"
                
                for line in lines {
                    if line.hasPrefix("VERSION=") {
                        version = String(line.dropFirst(8))
                    } else if line.hasPrefix("BUILD=") {
                        build = String(line.dropFirst(6))
                    } else if line.hasPrefix("LAST_UPDATED=") {
                        lastUpdated = String(line.dropFirst(13))
                    }
                }
                
                return (version, build, lastUpdated)
            } catch {
                DebugLogger.shared.logError(error, context: "Build bilgileri okunamadı", category: "Build")
            }
        }
        
        return ("1.0.0", "1", "Unknown")
    }
}
