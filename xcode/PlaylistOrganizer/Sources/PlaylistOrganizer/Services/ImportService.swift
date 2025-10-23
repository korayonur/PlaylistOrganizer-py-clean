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
    
    private let supportedFileTypes: [UTType] = [
        .mp3,
        .wav,
        .aiff,
        .audio,
        .audio
    ]
    
    // MARK: - Public Methods
    
    func importFiles(from urls: [URL]) async {
        await MainActor.run {
            isImporting = true
            importProgress = 0.0
            importedFiles.removeAll()
            importErrors.removeAll()
        }
        
        let totalFiles = urls.count
        
        for (index, url) in urls.enumerated() {
            do {
                let isValid = try await validateFile(url)
                if isValid {
                    let track = try await processFile(url)
                    await MainActor.run {
                        importedFiles.append(track.title)
                        importProgress = Double(index + 1) / Double(totalFiles)
                    }
                } else {
                    await MainActor.run {
                        importErrors.append("Geçersiz dosya: \(url.lastPathComponent)")
                    }
                }
            } catch {
                await MainActor.run {
                    importErrors.append("Hata: \(url.lastPathComponent) - \(error.localizedDescription)")
                }
            }
        }
        
        await MainActor.run {
            isImporting = false
        }
    }
    
    func validateFile(_ url: URL) async throws -> Bool {
        // Dosya uzantısını kontrol et
        let fileExtension = url.pathExtension.lowercased()
        let supportedExtensions = ["mp3", "wav", "aiff", "m4a", "flac"]
        
        guard supportedExtensions.contains(fileExtension) else {
            return false
        }
        
        // Dosya boyutunu kontrol et (max 100MB)
        let fileSize = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard fileSize < 100 * 1024 * 1024 else {
            return false
        }
        
        return true
    }
    
    func processFile(_ url: URL) async throws -> Track {
        // Dosya metadata'sını oku
        let metadata = try await extractMetadata(from: url)
        
        // Track objesi oluştur
        let track = Track(
            title: metadata.title ?? url.lastPathComponent,
            artist: metadata.artist ?? "Bilinmeyen Sanatçı",
            filePath: url.path,
            status: .found
        )
        
        return track
    }
    
    private func extractMetadata(from url: URL) async throws -> (title: String?, artist: String?, duration: TimeInterval?) {
        // TODO: AVFoundation ile metadata extraction implement et
        // Şimdilik basit implementation
        return (
            title: url.lastPathComponent,
            artist: "Bilinmeyen Sanatçı",
            duration: 0
        )
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
