//
//  MockDataService.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation

class MockDataService {
    static func getSamplePlaylists() -> [Playlist] {
        let automixPlaylist = Playlist(name: "automix", trackCount: 179, isSelected: true)
        let sidelistPlaylist = Playlist(name: "sidelist", trackCount: 72)
        
        let sideviewPlaylist = Playlist(
            name: "Sideview",
            trackCount: 2,
            isExpanded: true,
            children: [automixPlaylist, sidelistPlaylist]
        )
        
        return [
            Playlist(name: "History", trackCount: 43),
            Playlist(name: "koray", trackCount: 19),
            Playlist(name: "Serato", trackCount: 3),
            Playlist(name: "MyLists", trackCount: 36),
            Playlist(name: "PlayLists", trackCount: 25),
            Playlist(name: "Serato", trackCount: 1),
            Playlist(name: "Serato", trackCount: 53),
            sideviewPlaylist
        ]
    }
    
    static func getSampleTracks() -> [Track] {
        return [
            Track(title: "Dudu", artist: "Tarkan", filePath: "/Users/koray/Music/KorayMusics/Düğüning/Tarkan - Dudu.m4a", status: .found),
            Track(title: "Yo x ti, tú x mí", artist: "ROSALÍA & Ozuna", filePath: "/Users/koray/Music/KorayMusics/VideoFiles/ROSALÍA & Ozuna - Yo x ti, tú x mí.m4a", status: .found),
            Track(title: "La Isla Bonita", artist: "Madonna", filePath: "/Users/koray/Music/KorayMusics/yunus/The Immaculate Collection/Madonna - La Isla Bonita.mp3", status: .found),
            Track(title: "All That She Wants", artist: "Ace of Base", filePath: "/Users/koray/Music/KorayMusics/VideoClips/Ace of Base - All That She Wants.m4a", status: .found),
            Track(title: "Envolver (Intro Dirty)", artist: "Anitta", filePath: "/Users/koray/Music/KorayMusics/2022-clubberism/arsiv/Preview tracks (40 tracks)/Anitta - Envolver (Intro Dirty).mp3", status: .found),
            Track(title: "Historia de un amor", artist: "Ana Gabriel", filePath: "/Users/koray/Music/KorayMusics/yunus/Eternamente/Ana Gabriel - Historia de un amor.mp3", status: .found),
            Track(title: "A Thousand Years", artist: "Christina Perri", filePath: "/Users/koray/Music/KorayMusics/2 - DÜĞÜN/3.YABANCI DANS MÜZİKLERİ - TAMAM/Christina Perri - A Thousand Years.mp3", status: .found),
            Track(title: "HADI GEL GEZELIM", artist: "ALI471", filePath: "/Users/koray/Music/KorayMusics/2022_Dugun/ALI471 - HADI GEL GEZELIM [official video].mp3", status: .found),
            Track(title: "Pişman Değilim", artist: "Semicenk feat. Doğu Swag", filePath: "/Users/koray/Music/KorayMusics/2023_4k/Semicenk feat. Doğu Swag - Pişman Değilim (prod. by Büken).m4a", status: .found),
            Track(title: "Dov'e L'Amore (Dim Zach u0026 Deem edit)", artist: "Cher", filePath: "/Users/koray/Music/KorayMusics/2019 New Year Party/Cher - Dov'e L'Amore (Dim Zach u0026 Deem edit) Teaser.mp3", status: .found),
            Track(title: "Alright", artist: "Jain", filePath: "/Users/koray/Music/KorayMusics/TuneFab/Düğün/Jain - Alright.m4a", status: .found),
            Track(title: "Dale Don Dale", artist: "Don Omar", filePath: "/Users/koray/Music/KorayMusics/Tiktok 2021/Dale Don Dale.m4a", status: .missing)
        ]
    }
}
