//
//  MockDataService.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation

class MockDataService {
    static func getSamplePlaylists() -> [Playlist] {
        let automixPlaylist = Playlist(
            id: 1,
            path: "/Users/koray/Music/Playlists/automix.m3u",
            name: "automix",
            type: .m3u,
            trackCount: 179,
            createdAt: Date(),
            updatedAt: Date(),
            isSelected: true
        )
        
        let sidelistPlaylist = Playlist(
            id: 2,
            path: "/Users/koray/Music/Playlists/sidelist.m3u",
            name: "sidelist",
            type: .m3u,
            trackCount: 72,
            createdAt: Date(),
            updatedAt: Date()
        )
        
        let sideviewPlaylist = Playlist(
            id: 3,
            path: "/Users/koray/Music/Playlists/Sideview",
            name: "Sideview",
            type: .vdjfolder,
            trackCount: 2,
            createdAt: Date(),
            updatedAt: Date(),
            isExpanded: true,
            children: [automixPlaylist, sidelistPlaylist]
        )
        
        return [
            Playlist(id: 4, path: "/Users/koray/Music/Playlists/History.m3u", name: "History", type: .m3u, trackCount: 43, createdAt: Date(), updatedAt: Date()),
            Playlist(id: 5, path: "/Users/koray/Music/Playlists/koray.m3u", name: "koray", type: .m3u, trackCount: 19, createdAt: Date(), updatedAt: Date()),
            Playlist(id: 6, path: "/Users/koray/Music/Playlists/Serato.m3u", name: "Serato", type: .m3u, trackCount: 3, createdAt: Date(), updatedAt: Date()),
            Playlist(id: 7, path: "/Users/koray/Music/Playlists/MyLists", name: "MyLists", type: .vdjfolder, trackCount: 36, createdAt: Date(), updatedAt: Date()),
            Playlist(id: 8, path: "/Users/koray/Music/Playlists/PlayLists", name: "PlayLists", type: .vdjfolder, trackCount: 25, createdAt: Date(), updatedAt: Date()),
            Playlist(id: 9, path: "/Users/koray/Music/Playlists/Serato2.m3u", name: "Serato", type: .m3u, trackCount: 1, createdAt: Date(), updatedAt: Date()),
            Playlist(id: 10, path: "/Users/koray/Music/Playlists/Serato3.m3u", name: "Serato", type: .m3u, trackCount: 53, createdAt: Date(), updatedAt: Date()),
            sideviewPlaylist
        ]
    }
    
    static func getSampleTracks() -> [Track] {
        return [
            Track(id: 1, path: "/Users/koray/Music/KorayMusics/Düğüning/Tarkan - Dudu.m4a", fileName: "Tarkan - Dudu.m4a", fileNameOnly: "Tarkan - Dudu", normalizedFileName: "tarkan-dudu", createdAt: Date()),
            Track(id: 2, path: "/Users/koray/Music/KorayMusics/VideoFiles/ROSALÍA & Ozuna - Yo x ti, tú x mí.m4a", fileName: "ROSALÍA & Ozuna - Yo x ti, tú x mí.m4a", fileNameOnly: "ROSALÍA & Ozuna - Yo x ti, tú x mí", normalizedFileName: "rosalia-ozuna-yo-x-ti-tu-x-mi", createdAt: Date()),
            Track(id: 3, path: "/Users/koray/Music/KorayMusics/yunus/The Immaculate Collection/Madonna - La Isla Bonita.mp3", fileName: "Madonna - La Isla Bonita.mp3", fileNameOnly: "Madonna - La Isla Bonita", normalizedFileName: "madonna-la-isla-bonita", createdAt: Date()),
            Track(id: 4, path: "/Users/koray/Music/KorayMusics/VideoClips/Ace of Base - All That She Wants.m4a", fileName: "Ace of Base - All That She Wants.m4a", fileNameOnly: "Ace of Base - All That She Wants", normalizedFileName: "ace-of-base-all-that-she-wants", createdAt: Date()),
            Track(id: 5, path: "/Users/koray/Music/KorayMusics/2022-clubberism/arsiv/Preview tracks (40 tracks)/Anitta - Envolver (Intro Dirty).mp3", fileName: "Anitta - Envolver (Intro Dirty).mp3", fileNameOnly: "Anitta - Envolver (Intro Dirty)", normalizedFileName: "anitta-envolver-intro-dirty", createdAt: Date()),
            Track(id: 6, path: "/Users/koray/Music/KorayMusics/yunus/Eternamente/Ana Gabriel - Historia de un amor.mp3", fileName: "Ana Gabriel - Historia de un amor.mp3", fileNameOnly: "Ana Gabriel - Historia de un amor", normalizedFileName: "ana-gabriel-historia-de-un-amor", createdAt: Date()),
            Track(id: 7, path: "/Users/koray/Music/KorayMusics/2 - DÜĞÜN/3.YABANCI DANS MÜZİKLERİ - TAMAM/Christina Perri - A Thousand Years.mp3", fileName: "Christina Perri - A Thousand Years.mp3", fileNameOnly: "Christina Perri - A Thousand Years", normalizedFileName: "christina-perri-a-thousand-years", createdAt: Date()),
            Track(id: 8, path: "/Users/koray/Music/KorayMusics/2022_Dugun/ALI471 - HADI GEL GEZELIM [official video].mp3", fileName: "ALI471 - HADI GEL GEZELIM [official video].mp3", fileNameOnly: "ALI471 - HADI GEL GEZELIM [official video]", normalizedFileName: "ali471-hadi-gel-gezelim-official-video", createdAt: Date()),
            Track(id: 9, path: "/Users/koray/Music/KorayMusics/2023_4k/Semicenk feat. Doğu Swag - Pişman Değilim (prod. by Büken).m4a", fileName: "Semicenk feat. Doğu Swag - Pişman Değilim (prod. by Büken).m4a", fileNameOnly: "Semicenk feat. Doğu Swag - Pişman Değilim (prod. by Büken)", normalizedFileName: "semicenk-feat-dogu-swag-pisman-degilim-prod-by-buken", createdAt: Date()),
            Track(id: 10, path: "/Users/koray/Music/KorayMusics/2019 New Year Party/Cher - Dov'e L'Amore (Dim Zach u0026 Deem edit) Teaser.mp3", fileName: "Cher - Dov'e L'Amore (Dim Zach u0026 Deem edit) Teaser.mp3", fileNameOnly: "Cher - Dov'e L'Amore (Dim Zach u0026 Deem edit) Teaser", normalizedFileName: "cher-dove-lamore-dim-zach-deem-edit-teaser", createdAt: Date()),
            Track(id: 11, path: "/Users/koray/Music/KorayMusics/TuneFab/Düğün/Jain - Alright.m4a", fileName: "Jain - Alright.m4a", fileNameOnly: "Jain - Alright", normalizedFileName: "jain-alright", createdAt: Date()),
            Track(id: 12, path: "/Users/koray/Music/KorayMusics/Tiktok 2021/Dale Don Dale.m4a", fileName: "Dale Don Dale.m4a", fileNameOnly: "Dale Don Dale", normalizedFileName: "dale-don-dale", createdAt: Date())
        ]
    }
}
