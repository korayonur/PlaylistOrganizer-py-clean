//
//  TestConstants.swift
//  PlaylistOrganizerTests
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation

/// Test sabitleri ve konfigürasyonları
struct TestConstants {
    
    // MARK: - Test Timeouts
    
    /// Test timeout süreleri (saniye)
    struct Timeouts {
        static let short: TimeInterval = 1.0
        static let medium: TimeInterval = 5.0
        static let long: TimeInterval = 10.0
        static let veryLong: TimeInterval = 30.0
    }
    
    // MARK: - Test Data Sizes
    
    /// Test veri boyutları
    struct DataSizes {
        static let small: Int = 5
        static let medium: Int = 25
        static let large: Int = 100
        static let veryLarge: Int = 1000
    }
    
    // MARK: - Test File Paths
    
    /// Test dosya yolları
    struct FilePaths {
        static let tempDirectory = NSTemporaryDirectory()
        static let testMusicDirectory = "/tmp/PlaylistOrganizerTests/Music"
        static let testDatabasePath = "/tmp/PlaylistOrganizerTests/test.db"
        static let testLogPath = "/tmp/PlaylistOrganizerTests/test.log"
    }
    
    // MARK: - Test File Extensions
    
    /// Desteklenen dosya uzantıları
    static let supportedAudioExtensions = ["mp3", "wav", "aiff", "m4a", "flac"]
    
    // MARK: - Test Coverage Thresholds
    
    /// Test coverage eşikleri
    struct CoverageThresholds {
        static let minimum: Double = 0.8  // %80
        static let good: Double = 0.85    // %85
        static let excellent: Double = 0.9 // %90
        static let perfect: Double = 1.0   // %100
    }
    
    // MARK: - Test Performance Thresholds
    
    /// Performance test eşikleri
    struct PerformanceThresholds {
        static let databaseQuery: TimeInterval = 0.1    // 100ms
        static let searchOperation: TimeInterval = 0.5  // 500ms
        static let importOperation: TimeInterval = 2.0  // 2s
        static let uiUpdate: TimeInterval = 0.1         // 100ms
    }
    
    // MARK: - Test Memory Thresholds
    
    /// Memory test eşikleri (MB)
    struct MemoryThresholds {
        static let low: Int = 50      // 50MB
        static let medium: Int = 100  // 100MB
        static let high: Int = 200    // 200MB
        static let critical: Int = 500 // 500MB
    }
    
    // MARK: - Test Error Messages
    
    /// Test hata mesajları
    struct ErrorMessages {
        static let testFailed = "Test başarısız oldu"
        static let assertionFailed = "Assertion başarısız oldu"
        static let timeoutReached = "Timeout süresi aşıldı"
        static let memoryLeak = "Memory leak tespit edildi"
        static let performanceDegraded = "Performance düştü"
        static let coverageTooLow = "Test coverage çok düşük"
    }
    
    // MARK: - Test Success Messages
    
    /// Test başarı mesajları
    struct SuccessMessages {
        static let testPassed = "Test başarılı"
        static let allTestsPassed = "Tüm testler başarılı"
        static let coverageMet = "Coverage hedefi karşılandı"
        static let performanceMet = "Performance hedefi karşılandı"
        static let noMemoryLeaks = "Memory leak yok"
    }
    
    // MARK: - Test Configuration
    
    /// Test konfigürasyonu
    struct Configuration {
        static let enableVerboseLogging = true
        static let enablePerformanceLogging = true
        static let enableMemoryLogging = true
        static let enableCoverageLogging = true
        static let enableUILogging = true
    }
    
    // MARK: - Test Data Patterns
    
    /// Test veri desenleri
    struct DataPatterns {
        static let playlistNamePrefix = "Test Playlist"
        static let trackTitlePrefix = "Test Track"
        static let artistNamePrefix = "Test Artist"
        static let filePathPrefix = "/test/path"
    }
    
    // MARK: - Test Environment
    
    /// Test ortamı ayarları
    struct Environment {
        static let isDebug = true
        static let isTesting = true
        static let isPerformanceTesting = false
        static let isMemoryTesting = false
    }
    
    // MARK: - Test Categories
    
    /// Test kategorileri
    enum TestCategory: String, CaseIterable {
        case unit = "Unit"
        case integration = "Integration"
        case ui = "UI"
        case performance = "Performance"
        case memory = "Memory"
        case e2e = "End-to-End"
        
        var displayName: String {
            return self.rawValue
        }
    }
    
    // MARK: - Test Priorities
    
    /// Test öncelikleri
    enum TestPriority: Int, CaseIterable {
        case critical = 1
        case high = 2
        case medium = 3
        case low = 4
        
        var displayName: String {
            switch self {
            case .critical: return "Critical"
            case .high: return "High"
            case .medium: return "Medium"
            case .low: return "Low"
            }
        }
    }
    
    // MARK: - Test Status
    
    /// Test durumları
    enum TestStatus: String, CaseIterable {
        case pending = "Pending"
        case running = "Running"
        case passed = "Passed"
        case failed = "Failed"
        case skipped = "Skipped"
        case error = "Error"
        
        var displayName: String {
            return self.rawValue
        }
        
        var isCompleted: Bool {
            return [.passed, .failed, .skipped, .error].contains(self)
        }
        
        var isSuccessful: Bool {
            return self == .passed
        }
    }
    
    // MARK: - Test Metrics
    
    /// Test metrikleri
    struct Metrics {
        static let maxTestExecutionTime: TimeInterval = 60.0 // 1 dakika
        static let maxTestMemoryUsage: Int = 200 // 200MB
        static let maxTestFileSize: Int = 10 * 1024 * 1024 // 10MB
        static let maxTestLogSize: Int = 1024 * 1024 // 1MB
    }
    
    // MARK: - Test Validation
    
    /// Test doğrulama kuralları
    struct Validation {
        static let requireTestDescription = true
        static let requireTestCategory = true
        static let requireTestPriority = true
        static let requireTestTimeout = true
        static let requireTestCleanup = true
    }
    
    // MARK: - Test Reporting
    
    /// Test raporlama ayarları
    struct Reporting {
        static let generateHTMLReport = true
        static let generateJSONReport = true
        static let generateXMLReport = true
        static let includeScreenshots = true
        static let includeLogs = true
        static let includeMetrics = true
    }
}
