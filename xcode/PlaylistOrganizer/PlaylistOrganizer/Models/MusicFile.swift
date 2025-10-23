//
//  MusicFile.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 23.10.2025.
//

import Foundation

struct MusicFile: Identifiable, Codable, Equatable {
    let id = UUID()
    let path: String
    let fileName: String
    let fileNameOnly: String
    let normalizedFileName: String
    let fileExtension: String
    let size: Int64
    let modifiedTime: Date?
    let createdAt: Date
    
    // MARK: - Computed Properties
    
    /// Dosya adını uzantısız al
    var fileNameWithoutExtension: String {
        return fileNameOnly
    }
    
    /// Audio dosyası mı?
    var isAudioFile: Bool {
        let audioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".wma"]
        return audioExtensions.contains(fileExtension.lowercased())
    }
    
    /// Video dosyası mı?
    var isVideoFile: Bool {
        let videoExtensions = [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm"]
        return videoExtensions.contains(fileExtension.lowercased())
    }
    
    /// Dosya boyutunu formatla (MB)
    var formattedSize: String {
        let mb = Double(size) / (1024 * 1024)
        return String(format: "%.2f MB", mb)
    }
    
    /// Dosya var mı kontrol et
    var fileExists: Bool {
        return FileManager.default.fileExists(atPath: path)
    }
    
    // MARK: - Validation
    
    /// Dosya geçerli mi?
    var isValid: Bool {
        return !path.isEmpty && !fileName.isEmpty && !normalizedFileName.isEmpty
    }
    
    // MARK: - Equatable
    
    static func == (lhs: MusicFile, rhs: MusicFile) -> Bool {
        return lhs.path == rhs.path
    }
    
    // MARK: - Factory Methods
    
    /// Dosya bilgisinden MusicFile oluştur
    static func fromFileInfo(_ fileInfo: FileInfo) -> MusicFile {
        return MusicFile(
            path: fileInfo.path,
            fileName: fileInfo.fileName,
            fileNameOnly: fileInfo.fileNameOnly,
            normalizedFileName: fileInfo.normalizedFileName,
            fileExtension: fileInfo.fileExtension,
            size: fileInfo.size,
            modifiedTime: fileInfo.modifiedTime,
            createdAt: fileInfo.createdAt
        )
    }
}

// MARK: - Supporting Types

struct FileInfo {
    let path: String
    let fileName: String
    let fileNameOnly: String
    let normalizedFileName: String
    let fileExtension: String
    let size: Int64
    let modifiedTime: Date?
    let createdAt: Date
}
