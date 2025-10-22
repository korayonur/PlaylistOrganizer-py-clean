//
//  ContentView.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = PlaylistOrganizerViewModel()
    
    var body: some View {
        HStack(spacing: 0) {
            // Sol Sidebar
            VStack(alignment: .leading, spacing: 0) {
                // Arama Kutusu
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    TextField("Playlist ara...", text: $viewModel.searchText)
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
                        ForEach(viewModel.tracks) { track in
                            TrackRowView(track: track)
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
    }
}


#Preview {
    ContentView()
}
