//
//  TestCoverageMonitor.swift
//  PlaylistOrganizerTests
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation
import XCTest

/// Test coverage monitoring ve raporlama sistemi
class TestCoverageMonitor {
    
    // MARK: - Properties
    
    private var coverageData: [String: Double] = [:]
    private var testResults: [String: TestResult] = [:]
    private var startTime: Date?
    private var endTime: Date?
    
    // MARK: - Test Result Structure
    
    struct TestResult {
        let testName: String
        let category: TestConstants.TestCategory
        let priority: TestConstants.TestPriority
        let status: TestConstants.TestStatus
        let executionTime: TimeInterval
        let memoryUsage: Int
        let coverage: Double
        let errorMessage: String?
        let timestamp: Date
        
        init(
            testName: String,
            category: TestConstants.TestCategory,
            priority: TestConstants.TestPriority,
            status: TestConstants.TestStatus,
            executionTime: TimeInterval,
            memoryUsage: Int = 0,
            coverage: Double = 0.0,
            errorMessage: String? = nil
        ) {
            self.testName = testName
            self.category = category
            self.priority = priority
            self.status = status
            self.executionTime = executionTime
            self.memoryUsage = memoryUsage
            self.coverage = coverage
            self.errorMessage = errorMessage
            self.timestamp = Date()
        }
    }
    
    // MARK: - Singleton
    
    static let shared = TestCoverageMonitor()
    
    private init() {
        setupCoverageMonitoring()
    }
    
    // MARK: - Setup
    
    private func setupCoverageMonitoring() {
        startTime = Date()
        print("📊 Test Coverage Monitor başlatıldı")
    }
    
    // MARK: - Test Execution Tracking
    
    /// Test başlatıldığında çağrılır
    func startTest(
        _ testName: String,
        category: TestConstants.TestCategory,
        priority: TestConstants.TestPriority
    ) {
        let testResult = TestResult(
            testName: testName,
            category: category,
            priority: priority,
            status: .running,
            executionTime: 0.0
        )
        
        testResults[testName] = testResult
        print("🧪 Test başlatıldı: \(testName) [\(category.displayName)]")
    }
    
    /// Test tamamlandığında çağrılır
    func endTest(
        _ testName: String,
        status: TestConstants.TestStatus,
        executionTime: TimeInterval,
        memoryUsage: Int = 0,
        coverage: Double = 0.0,
        errorMessage: String? = nil
    ) {
        guard var testResult = testResults[testName] else {
            print("❌ Test bulunamadı: \(testName)")
            return
        }
        
        testResult = TestResult(
            testName: testName,
            category: testResult.category,
            priority: testResult.priority,
            status: status,
            executionTime: executionTime,
            memoryUsage: memoryUsage,
            coverage: coverage,
            errorMessage: errorMessage
        )
        
        testResults[testName] = testResult
        
        // Coverage data güncelle
        if coverage > 0 {
            coverageData[testName] = coverage
        }
        
        let statusIcon = status.isSuccessful ? "✅" : "❌"
        print("\(statusIcon) Test tamamlandı: \(testName) [\(status.displayName)] - \(String(format: "%.2f", executionTime))s")
        
        if let error = errorMessage {
            print("   Hata: \(error)")
        }
    }
    
    // MARK: - Coverage Analysis
    
    /// Genel coverage hesaplar
    func calculateOverallCoverage() -> Double {
        guard !coverageData.isEmpty else { return 0.0 }
        
        let totalCoverage = coverageData.values.reduce(0, +)
        return totalCoverage / Double(coverageData.count)
    }
    
    /// Kategori bazında coverage hesaplar
    func calculateCoverageByCategory() -> [TestConstants.TestCategory: Double] {
        var categoryCoverage: [TestConstants.TestCategory: Double] = [:]
        
        for category in TestConstants.TestCategory.allCases {
            let categoryTests = testResults.values.filter { $0.category == category }
            guard !categoryTests.isEmpty else { continue }
            
            let totalCoverage = categoryTests.reduce(0.0) { $0 + $1.coverage }
            categoryCoverage[category] = totalCoverage / Double(categoryTests.count)
        }
        
        return categoryCoverage
    }
    
    /// Priority bazında coverage hesaplar
    func calculateCoverageByPriority() -> [TestConstants.TestPriority: Double] {
        var priorityCoverage: [TestConstants.TestPriority: Double] = [:]
        
        for priority in TestConstants.TestPriority.allCases {
            let priorityTests = testResults.values.filter { $0.priority == priority }
            guard !priorityTests.isEmpty else { continue }
            
            let totalCoverage = priorityTests.reduce(0.0) { $0 + $1.coverage }
            priorityCoverage[priority] = totalCoverage / Double(priorityTests.count)
        }
        
        return priorityCoverage
    }
    
    // MARK: - Test Statistics
    
    /// Test istatistikleri hesaplar
    func calculateTestStatistics() -> TestStatistics {
        let totalTests = testResults.count
        let passedTests = testResults.values.filter { $0.status.isSuccessful }.count
        let failedTests = testResults.values.filter { $0.status == .failed }.count
        let skippedTests = testResults.values.filter { $0.status == .skipped }.count
        
        let totalExecutionTime = testResults.values.reduce(0.0) { $0 + $1.executionTime }
        let averageExecutionTime = totalTests > 0 ? totalExecutionTime / Double(totalTests) : 0.0
        
        let totalMemoryUsage = testResults.values.reduce(0) { $0 + $1.memoryUsage }
        let averageMemoryUsage = totalTests > 0 ? totalMemoryUsage / totalTests : 0
        
        let overallCoverage = calculateOverallCoverage()
        
        return TestStatistics(
            totalTests: totalTests,
            passedTests: passedTests,
            failedTests: failedTests,
            skippedTests: skippedTests,
            totalExecutionTime: totalExecutionTime,
            averageExecutionTime: averageExecutionTime,
            totalMemoryUsage: totalMemoryUsage,
            averageMemoryUsage: averageMemoryUsage,
            overallCoverage: overallCoverage
        )
    }
    
    // MARK: - Test Statistics Structure
    
    struct TestStatistics {
        let totalTests: Int
        let passedTests: Int
        let failedTests: Int
        let skippedTests: Int
        let totalExecutionTime: TimeInterval
        let averageExecutionTime: TimeInterval
        let totalMemoryUsage: Int
        let averageMemoryUsage: Int
        let overallCoverage: Double
        
        var successRate: Double {
            guard totalTests > 0 else { return 0.0 }
            return Double(passedTests) / Double(totalTests)
        }
        
        var failureRate: Double {
            guard totalTests > 0 else { return 0.0 }
            return Double(failedTests) / Double(totalTests)
        }
    }
    
    // MARK: - Coverage Validation
    
    /// Coverage hedeflerini kontrol eder
    func validateCoverageTargets() -> CoverageValidationResult {
        let overallCoverage = calculateOverallCoverage()
        let categoryCoverage = calculateCoverageByCategory()
        let priorityCoverage = calculateCoverageByPriority()
        
        var violations: [String] = []
        
        // Genel coverage kontrolü
        if overallCoverage < TestConstants.CoverageThresholds.minimum {
            violations.append("Genel coverage %80'in altında: \(String(format: "%.1f", overallCoverage * 100))%")
        }
        
        // Kategori bazında kontrol
        for (category, coverage) in categoryCoverage {
            if coverage < TestConstants.CoverageThresholds.minimum {
                violations.append("\(category.displayName) coverage %80'in altında: \(String(format: "%.1f", coverage * 100))%")
            }
        }
        
        // Priority bazında kontrol
        for (priority, coverage) in priorityCoverage {
            if coverage < TestConstants.CoverageThresholds.minimum {
                violations.append("\(priority.displayName) priority coverage %80'in altında: \(String(format: "%.1f", coverage * 100))%")
            }
        }
        
        return CoverageValidationResult(
            isValid: violations.isEmpty,
            overallCoverage: overallCoverage,
            violations: violations
        )
    }
    
    // MARK: - Coverage Validation Result
    
    struct CoverageValidationResult {
        let isValid: Bool
        let overallCoverage: Double
        let violations: [String]
    }
    
    // MARK: - Reporting
    
    /// Test raporu oluşturur
    func generateTestReport() -> String {
        let statistics = calculateTestStatistics()
        let validation = validateCoverageTargets()
        
        var report = "📊 TEST RAPORU\n"
        report += "================\n\n"
        
        // Genel istatistikler
        report += "📈 Genel İstatistikler:\n"
        report += "  Toplam Test: \(statistics.totalTests)\n"
        report += "  Başarılı: \(statistics.passedTests) (\(String(format: "%.1f", statistics.successRate * 100))%)\n"
        report += "  Başarısız: \(statistics.failedTests) (\(String(format: "%.1f", statistics.failureRate * 100))%)\n"
        report += "  Atlanan: \(statistics.skippedTests)\n"
        report += "  Toplam Süre: \(String(format: "%.2f", statistics.totalExecutionTime))s\n"
        report += "  Ortalama Süre: \(String(format: "%.2f", statistics.averageExecutionTime))s\n"
        report += "  Toplam Memory: \(statistics.totalMemoryUsage)MB\n"
        report += "  Ortalama Memory: \(statistics.averageMemoryUsage)MB\n\n"
        
        // Coverage bilgileri
        report += "🎯 Coverage Bilgileri:\n"
        report += "  Genel Coverage: \(String(format: "%.1f", statistics.overallCoverage * 100))%\n"
        
        let categoryCoverage = calculateCoverageByCategory()
        for (category, coverage) in categoryCoverage {
            report += "  \(category.displayName): \(String(format: "%.1f", coverage * 100))%\n"
        }
        report += "\n"
        
        // Validation sonuçları
        report += "✅ Coverage Validation:\n"
        if validation.isValid {
            report += "  Tüm coverage hedefleri karşılandı!\n"
        } else {
            report += "  Coverage hedefleri karşılanmadı:\n"
            for violation in validation.violations {
                report += "    - \(violation)\n"
            }
        }
        report += "\n"
        
        // Test detayları
        report += "🧪 Test Detayları:\n"
        for (testName, result) in testResults {
            let statusIcon = result.status.isSuccessful ? "✅" : "❌"
            report += "  \(statusIcon) \(testName) [\(result.category.displayName)] - \(String(format: "%.2f", result.executionTime))s\n"
        }
        
        return report
    }
    
    // MARK: - Cleanup
    
    /// Test verilerini temizler
    func cleanup() {
        coverageData.removeAll()
        testResults.removeAll()
        startTime = nil
        endTime = nil
        print("🧹 Test Coverage Monitor temizlendi")
    }
    
    // MARK: - Final Report
    
    /// Final test raporu oluşturur
    func generateFinalReport() -> String {
        endTime = Date()
        let totalTime = endTime?.timeIntervalSince(startTime ?? Date()) ?? 0.0
        
        var report = generateTestReport()
        report += "\n⏱️ Toplam Test Süresi: \(String(format: "%.2f", totalTime))s\n"
        report += "📅 Rapor Tarihi: \(DateFormatter.localizedString(from: Date(), dateStyle: .medium, timeStyle: .medium))\n"
        
        return report
    }
}
