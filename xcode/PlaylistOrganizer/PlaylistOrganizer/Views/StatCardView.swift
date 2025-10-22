//
//  StatCardView.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import SwiftUI

struct StatCardView: View {
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.system(size: 13))
                .foregroundColor(.gray)
            
            Text(value)
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .padding(.horizontal, 25)
        .background(Color(red: 0.23, green: 0.23, blue: 0.23))
        .cornerRadius(8)
    }
}
