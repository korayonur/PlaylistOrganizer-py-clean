//
//  PlaylistOrganizerApp.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import SwiftUI

@main
struct PlaylistOrganizerApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    init() {
        // Build versiyonunu güncelle
        BuildVersionManager.shared.updateBuildVersion()
        
        // Sistem sağlık durumunu logla
        DebugLogger.shared.logSystemHealth()
        
        // Uygulama başlatma logları
        DebugLogger.shared.logUI("🚀 PlaylistOrganizer uygulaması başlatılıyor...")
        DebugLogger.shared.logBuild("📦 Build bilgileri: \(BuildVersionManager.shared.getCurrentBuildInfo())")
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)
        .commands {
            CommandGroup(replacing: .newItem) { }
        }
    }
}
