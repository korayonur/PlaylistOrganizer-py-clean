//
//  PlaylistRowView.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import SwiftUI

struct PlaylistRowView: View {
    let playlist: Playlist
    @ObservedObject var viewModel: PlaylistOrganizerViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Ana Playlist
            HStack {
                Image(systemName: "folder")
                    .foregroundColor(.white)
                    .font(.system(size: 16))
                
                Text(playlist.name)
                    .foregroundColor(.white)
                    .font(.system(size: 15))
                
                Spacer()
                
                Text("\(playlist.trackCount)")
                    .foregroundColor(.gray)
                    .font(.system(size: 13))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(playlist.isSelected ? Color.blue.opacity(0.3) : Color.clear)
            .onTapGesture {
                viewModel.selectPlaylist(playlist)
            }
            
            // Alt Playlist'ler
            if playlist.isExpanded {
                ForEach(playlist.children) { childPlaylist in
                    HStack {
                        Image(systemName: "music.note")
                            .foregroundColor(.white)
                            .font(.system(size: 14))
                        
                        Text(childPlaylist.name)
                            .foregroundColor(.white.opacity(0.9))
                            .font(.system(size: 14))
                        
                        Spacer()
                        
                        Text("\(childPlaylist.trackCount)")
                            .foregroundColor(.gray)
                            .font(.system(size: 12))
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .padding(.leading, 35)
                    .background(childPlaylist.isSelected ? Color.blue.opacity(0.3) : Color.clear)
                    .onTapGesture {
                        viewModel.selectPlaylist(childPlaylist)
                    }
                }
            }
        }
    }
}
