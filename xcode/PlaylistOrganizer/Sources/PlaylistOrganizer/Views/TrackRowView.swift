//
//  TrackRowView.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import SwiftUI

struct TrackRowView: View {
    let track: Track
    
    var body: some View {
        HStack {
            // Durum İkonu
            Image(systemName: track.status == .found ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                .foregroundColor(track.status == .found ? .green : .orange)
                .font(.system(size: 16))
            
            // Play Butonu
            Button(action: {
                // TODO: Track oynatma
            }) {
                Image(systemName: "play.fill")
                    .foregroundColor(.white)
                    .font(.system(size: 14))
            }
            .buttonStyle(PlainButtonStyle())
            
            // Dosya Yolu
            Text(track.filePath)
                .foregroundColor(.white)
                .font(.system(size: 13))
                .lineLimit(1)
                .truncationMode(.tail)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 15)
        .background(Color(red: 0.23, green: 0.23, blue: 0.23))
        .cornerRadius(4)
    }
}
