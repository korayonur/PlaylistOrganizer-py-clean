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
    @State private var selectedFiles: [URL] = []
    @State private var showFilePicker = false
    
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
                
                // Import Butonu
                Button(action: {
                    showFilePicker = true
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
        .sheet(isPresented: $showFilePicker) {
            MusicFilePicker(selectedFiles: $selectedFiles) { files in
                Task {
                    await importService.importFiles(from: files)
                }
            }
        }
        .overlay(
            // Import Progress Overlay
            Group {
                if importService.isImporting {
                    VStack {
                        ProgressView(value: importService.importProgress)
                            .progressViewStyle(LinearProgressViewStyle())
                        Text("Import ediliyor... \(Int(importService.importProgress * 100))%")
                            .foregroundColor(.white)
                    }
                    .padding()
                    .background(Color.black.opacity(0.8))
                    .cornerRadius(10)
                }
            }
        )
    }
}


#Preview {
    ContentView()
}
