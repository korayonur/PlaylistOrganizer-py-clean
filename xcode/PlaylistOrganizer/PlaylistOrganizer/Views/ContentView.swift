//
//  ContentView.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = PlaylistOrganizerViewModel()
    @StateObject private var importService = ImportService()
    @StateObject private var searchService = SearchService()
    @StateObject private var importLogger = ImportLogger.shared
    // File picker kaldırıldı
    
    var body: some View {
        HStack(spacing: 0) {
            // Sol Sidebar
            VStack(alignment: .leading, spacing: 0) {
                // Arama Kutusu
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    TextField("Playlist ara...", text: $searchService.searchText)
                        .textFieldStyle(PlainTextFieldStyle())
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(Color(red: 0.23, green: 0.23, blue: 0.23))
                .cornerRadius(8)
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 15)
                
                // Filtreleme CheckBox
                HStack {
                    Toggle("Sadece eksik track içeren playlist'ler", isOn: $viewModel.showMissingTracksOnly)
                        .toggleStyle(CheckboxToggleStyle())
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 15)
                
                // Import Butonu - File dialog olmadan
                Button(action: {
                    // Direkt import başlat (file dialog olmadan)
                    Task {
                        do {
                            print("🚀 Import başlatılıyor...")
                            let result = try await importService.scanAndImport { progress in
                                print("📊 \(progress.stage): \(progress.current)/\(progress.total) (%\(progress.percentage)) - \(progress.message)")
                            }
                            print("✅ Import tamamlandı: \(result.totalFiles) dosya işlendi")
                        } catch {
                            print("❌ Import hatası: \(error)")
                            print("❌ Hata detayı: \(error.localizedDescription)")
                        }
                    }
                }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Müzik Dosyaları Import Et")
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .cornerRadius(8)
                }
                .buttonStyle(PlainButtonStyle())
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
                
                // Playlist Listesi
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        ForEach(viewModel.playlists) { playlist in
                            PlaylistRowView(playlist: playlist, viewModel: viewModel)
                        }
                    }
                }
                .padding(.horizontal, 20)
            }
            .frame(width: 320)
            .background(Color(red: 0.18, green: 0.18, blue: 0.18))
            
            Divider()
                .background(Color.gray)
            
            // Sağ Panel
            VStack(alignment: .leading, spacing: 0) {
                // İstatistik Kartları
                HStack(spacing: 12) {
                    StatCardView(title: "Toplam", value: "\(viewModel.totalTracks)", color: .white)
                    StatCardView(title: "Bulunan", value: "\(viewModel.foundTracks)", color: .green)
                    StatCardView(title: "Eksik", value: "\(viewModel.missingTracks)", color: .white)
                }
                .padding(.horizontal, 30)
                .padding(.top, 30)
                .padding(.bottom, 25)
                
                // Track Listesi Başlığı
                Text("Track Listesi")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 30)
                    .padding(.bottom, 15)
                
                // Track Listesi
                ScrollView {
                    LazyVStack(spacing: 5) {
                        if searchService.isSearching {
                            HStack {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("Aranıyor...")
                                    .foregroundColor(.gray)
                            }
                            .padding()
                        } else if !searchService.searchResults.isEmpty {
                            // Search results göster
                            ForEach(searchService.searchResults) { track in
                                TrackRowView(track: track)
                            }
                        } else if !searchService.searchText.isEmpty {
                            // Arama sonucu bulunamadı
                            VStack {
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 40))
                                    .foregroundColor(.gray)
                                Text("Arama sonucu bulunamadı")
                                    .foregroundColor(.gray)
                                Text("\"\(searchService.searchText)\" için sonuç yok")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                            .padding()
                        } else {
                            // Normal track listesi
                        ForEach(viewModel.tracks) { track in
                            TrackRowView(track: track)
                            }
                        }
                    }
                }
                .padding(.horizontal, 30)
            }
            .frame(maxWidth: .infinity)
            .background(Color(red: 0.12, green: 0.12, blue: 0.12))
        }
        .frame(minWidth: 800, minHeight: 600)
        .background(Color(red: 0.12, green: 0.12, blue: 0.12))
        // File picker sheet kaldırıldı
        .overlay(
            // Import Progress Overlay + Log Panel
            HStack(spacing: 0) {
                // Import Progress Overlay
                Group {
                    if importService.isImporting {
                    VStack(spacing: 20) {
                        // Başlık
                        Text("Import İşlemi")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                        
                        // Ana Progress Bar
                        VStack(spacing: 8) {
                            ProgressView(value: importService.importProgress)
                                .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                                .frame(width: 400)
                            
                            Text("\(importService.importStats.currentStage): %\(Int(importService.importProgress * 100))")
                                .foregroundColor(.white)
                                .font(.system(size: 14, weight: .medium))
                        }
                        
                        // Aşama Detayları
                        VStack(spacing: 12) {
                            // AŞAMA 1: Klasör Tarama
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text("📁 AŞAMA 1: Klasör Tarama")
                                        .foregroundColor(.green)
                                        .font(.system(size: 13, weight: .bold))
                                    Spacer()
                                    Text("0% - 80%")
                                        .foregroundColor(.gray)
                                        .font(.system(size: 11))
                                }
                                
                                if importService.importStats.currentStage.contains("Tarama") {
                                    HStack {
                                        Text("Müzik Dosyaları:")
                                            .foregroundColor(.green)
                                            .font(.system(size: 11))
                                        Spacer()
                                        Text("\(importService.importStats.musicFilesFound)")
                                            .foregroundColor(.green)
                                            .font(.system(size: 11))
                                    }
                                    
                                    HStack {
                                        Text("Playlist Dosyaları:")
                                            .foregroundColor(.blue)
                                            .font(.system(size: 11))
                                        Spacer()
                                        Text("\(importService.importStats.playlistFilesFound)")
                                            .foregroundColor(.blue)
                                            .font(.system(size: 11))
                                    }
                                }
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                            .background(Color.green.opacity(0.1))
                            .cornerRadius(6)
                            
                            // AŞAMA 2: Database Temizleme
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text("🗄️ AŞAMA 2: Database Temizleme")
                                        .foregroundColor(.orange)
                                        .font(.system(size: 13, weight: .bold))
                        Spacer()
                                    Text("80% - 85%")
                                        .foregroundColor(.gray)
                                        .font(.system(size: 11))
                                }
                                
                                if importService.importStats.currentStage.contains("Temizleme") {
                                    Text("Tablolar temizleniyor...")
                                        .foregroundColor(.orange)
                                        .font(.system(size: 11))
                                }
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                            .background(Color.orange.opacity(0.1))
                            .cornerRadius(6)
                            
                            // AŞAMA 3: Müzik Ekleme
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text("📝 AŞAMA 3: Müzik Ekleme")
                                        .foregroundColor(.purple)
                                        .font(.system(size: 13, weight: .bold))
                                    Spacer()
                                    Text("85% - 95%")
                            .foregroundColor(.gray)
                                        .font(.system(size: 11))
                                }
                                
                                if importService.importStats.currentStage.contains("Ekleme") {
                                    HStack {
                                        Text("İşlenen:")
                                            .foregroundColor(.purple)
                                            .font(.system(size: 11))
                                        Spacer()
                                        Text("\(importService.importStats.musicFilesProcessed)/\(importService.importStats.musicFilesFound)")
                                            .foregroundColor(.purple)
                                            .font(.system(size: 11))
                                    }
                                    
                                    HStack {
                                        Text("Eklenen:")
                                            .foregroundColor(.green)
                                            .font(.system(size: 11))
                                        Spacer()
                                        Text("\(importService.importStats.musicFilesAdded)")
                                            .foregroundColor(.green)
                                            .font(.system(size: 11))
                                    }
                                    
                                    HStack {
                                        Text("Atlanan:")
                                            .foregroundColor(.yellow)
                                            .font(.system(size: 11))
                                        Spacer()
                                        Text("\(importService.importStats.musicFilesSkipped)")
                                            .foregroundColor(.yellow)
                                            .font(.system(size: 11))
                                    }
                                }
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                            .background(Color.purple.opacity(0.1))
                            .cornerRadius(6)
                            
                            // AŞAMA 4: Playlist İşleme
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text("🎶 AŞAMA 4: Playlist İşleme")
                                        .foregroundColor(.cyan)
                                        .font(.system(size: 13, weight: .bold))
                                    Spacer()
                                    Text("95% - 100%")
                                        .foregroundColor(.gray)
                                        .font(.system(size: 11))
                                }
                                
                                if importService.importStats.currentStage.contains("İşleme") {
                                    HStack {
                                        Text("İşlenen:")
                                            .foregroundColor(.cyan)
                                            .font(.system(size: 11))
                                        Spacer()
                                        Text("\(importService.importStats.playlistFilesProcessed)/\(importService.importStats.playlistFilesFound)")
                                            .foregroundColor(.cyan)
                                            .font(.system(size: 11))
                                    }
                                    
                                    HStack {
                                        Text("Track'ler:")
                                            .foregroundColor(.orange)
                                            .font(.system(size: 11))
                                        Spacer()
                                        Text("\(importService.importStats.tracksProcessed)/\(importService.importStats.tracksFound)")
                                            .foregroundColor(.orange)
                                            .font(.system(size: 11))
                                    }
                                }
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                            .background(Color.cyan.opacity(0.1))
                            .cornerRadius(6)
                        }
                        
                        // Genel İstatistikler
                        VStack(spacing: 6) {
                            Divider()
                                .background(Color.gray)
                            
        HStack {
                                Text("Toplam İşlenen:")
                                    .foregroundColor(.white)
                                    .font(.system(size: 12, weight: .medium))
                                Spacer()
                                Text("\(importService.importStats.totalFilesProcessed)/\(importService.importStats.totalFilesFound)")
                    .foregroundColor(.white)
                                    .font(.system(size: 12))
                            }
                            
                            if importService.importStats.errors > 0 {
                                HStack {
                                    Text("Hatalar:")
                                        .foregroundColor(.red)
                                        .font(.system(size: 12, weight: .medium))
                                    Spacer()
                                    Text("\(importService.importStats.errors)")
                                        .foregroundColor(.red)
                                        .font(.system(size: 12))
                                }
                            }
                        }
                        
                        // Cancel Button
                        Button("İptal") {
                            // Import'u iptal et ve dialog'u kapat
                            importService.isImporting = false
                            importService.importProgress = 0.0
                            importService.importStats.currentStage = "❌ Import İptal Edildi"
                        }
                        .foregroundColor(.red)
                        .font(.system(size: 12))
                        .padding(.horizontal, 20)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.2))
                        .cornerRadius(6)
                        
                        // Kapat Button - Import tamamlandığında görünür
                        if importService.importProgress >= 1.0 {
                            Button("Kapat") {
                                // Dialog'u kapat
                                importService.isImporting = false
                            }
                            .foregroundColor(.blue)
                            .font(.system(size: 12))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 8)
                            .background(Color.blue.opacity(0.2))
                            .cornerRadius(6)
                        }
                    }
                    .padding(25)
                    .background(Color.black.opacity(0.95))
                    .cornerRadius(15)
                    .frame(maxWidth: 500)
                }
                }
                
                // Log Panel - Import sırasında görünür
                if importService.isImporting {
                    VStack(alignment: .leading, spacing: 0) {
                        // Log Panel Başlığı
                        HStack {
                            Text("📝 Import Logları")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                            Spacer()
                            Button("Temizle") {
                                importLogger.logEntries.removeAll()
                            }
                            .foregroundColor(.gray)
                            .font(.system(size: 10))
                        }
                        .padding(.horizontal, 15)
                        .padding(.vertical, 10)
                        .background(Color.gray.opacity(0.2))
                        
                        // Log Entries
                        ScrollView {
                            LazyVStack(alignment: .leading, spacing: 2) {
                                ForEach(importLogger.logEntries.suffix(50)) { entry in
                                    HStack(alignment: .top, spacing: 8) {
                                        Text(entry.timestamp)
                                            .font(.system(size: 9, family: .monospaced))
                                            .foregroundColor(.gray)
                                            .frame(width: 80, alignment: .leading)
                                        
                                        Text("[\(entry.level.rawValue)]")
                                            .font(.system(size: 9, weight: .bold))
                                            .foregroundColor(entry.level == .error ? .red : entry.level == .warning ? .yellow : .green)
                                            .frame(width: 50, alignment: .leading)
                                        
                                        Text(entry.message)
                                            .font(.system(size: 9))
                                            .foregroundColor(.white)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                    }
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 2)
                                }
                            }
                        }
                        .frame(maxHeight: 300)
                    }
                    .frame(width: 400)
                    .background(Color.black.opacity(0.95))
                    .cornerRadius(15)
                }
            }
        )
    }
}


#Preview {
    ContentView()
}
