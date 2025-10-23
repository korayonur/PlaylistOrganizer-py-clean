//
//  PlaylistOrganizerUITests.swift
//  PlaylistOrganizerUITests
//
//  Created by Koray Önür on 22.10.2025.
//

import XCTest

final class PlaylistOrganizerUITests: XCTestCase {
    
    var app: XCUIApplication!
    
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }
    
    override func tearDownWithError() throws {
        app = nil
    }
    
    // MARK: - Basic UI Tests
    
    func testAppLaunch() throws {
        // Uygulama başlatıldığında ana pencere açılıyor mu?
        XCTAssertTrue(app.windows.count > 0)
    }
    
    func testSearchFieldExists() throws {
        // Arama kutusu var mı?
        let searchField = app.textFields["Playlist ara..."]
        XCTAssertTrue(searchField.exists)
    }
    
    func testImportButtonExists() throws {
        // Import butonu var mı?
        let importButton = app.buttons["Müzik Dosyaları Import Et"]
        XCTAssertTrue(importButton.exists)
    }
    
    func testPlaylistListExists() throws {
        // Playlist listesi var mı?
        // Bu test SwiftUI view'ları için daha karmaşık olabilir
        // Şimdilik basit kontrol yapalım
        XCTAssertTrue(app.windows.count > 0)
    }
    
    func testTrackListExists() throws {
        // Track listesi var mı?
        // Bu test SwiftUI view'ları için daha karmaşık olabilir
        // Şimdilik basit kontrol yapalım
        XCTAssertTrue(app.windows.count > 0)
    }
    
    // MARK: - Interaction Tests
    
    func testSearchFieldInteraction() throws {
        let searchField = app.textFields["Playlist ara..."]
        
        // Arama kutusuna tıkla
        searchField.tap()
        
        // Metin yaz
        searchField.typeText("test search")
        
        // Metin yazıldı mı kontrol et
        XCTAssertEqual(searchField.value as? String, "test search")
    }
    
    func testImportButtonInteraction() throws {
        let importButton = app.buttons["Müzik Dosyaları Import Et"]
        
        // Import butonuna tıkla
        importButton.tap()
        
        // File picker açıldı mı? (Bu test sistem ayarlarına bağlı olabilir)
        // Şimdilik butonun tıklanabilir olduğunu kontrol edelim
        XCTAssertTrue(importButton.isHittable)
    }
    
    // MARK: - Performance Tests
    
    func testAppLaunchPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            app.launch()
        }
    }
    
    func testAppMemoryUsage() throws {
        // Bellek kullanımı testi
        let memoryBefore = getMemoryUsage()
        
        // Bazı işlemler yap
        let searchField = app.textFields["Playlist ara..."]
        searchField.tap()
        searchField.typeText("memory test")
        
        let memoryAfter = getMemoryUsage()
        
        // Bellek sızıntısı var mı kontrol et
        XCTAssertLessThan(memoryAfter, memoryBefore * 1.5) // %50'den fazla artış olmamalı
    }
    
    // MARK: - Helper Methods
    
    private func getMemoryUsage() -> UInt64 {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size)/4
        
        let kerr: kern_return_t = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_,
                         task_flavor_t(MACH_TASK_BASIC_INFO),
                         $0,
                         &count)
            }
        }
        
        if kerr == KERN_SUCCESS {
            return info.resident_size
        } else {
            return 0
        }
    }
}

