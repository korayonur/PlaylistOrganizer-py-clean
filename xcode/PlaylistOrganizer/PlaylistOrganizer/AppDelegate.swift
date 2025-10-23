//
//  AppDelegate.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 23.10.2025.
//

import Cocoa
import SwiftUI

class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
    
    func applicationWillTerminate(_ notification: Notification) {
        print("🔄 Uygulama kapatılıyor...")
        // Database bağlantısını kapat
        // TODO: DatabaseManager'da cleanup metodu ekle
    }
}
