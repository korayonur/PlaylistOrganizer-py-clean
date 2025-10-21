# MAUI UI Implementasyonu Önerisi

## Neden
Mevcut Angular + Node.js tabanlı Playlist Organizer uygulamasını .NET MAUI ile native masaüstü uygulamasına çevirmek. Bu geçiş, daha iyi performans, offline çalışma ve platform entegrasyonu sağlayacak.

## Ne Değişiyor
- **BREAKING**: Angular frontend kaldırılacak, MAUI XAML ile değiştirilecek
- **BREAKING**: Node.js API kaldırılacak, doğrudan SQLite erişimi yapılacak
- **BREAKING**: HTTP istekleri kaldırılacak, native veri erişimi kullanılacak
- Yeni MAUI sayfaları oluşturulacak (PlaylistTreePage, SongGridPage, FixSuggestionsPage)
- MVVM pattern ile ViewModel'ler implement edilecek
- SQLite doğrudan erişim için repository pattern kullanılacak

## Etki
- Etkilenen spec'ler: playlist-management, track-search, fix-suggestions, media-player
- Etkilenen kod: 
  - `frontend/` klasörü tamamen kaldırılacak
  - `api/` klasörü kaldırılacak
  - `src/PlaylistOrganizer.App/` MAUI uygulaması oluşturulacak
  - `src/PlaylistOrganizer.Core/` domain logic taşınacak
  - `src/PlaylistOrganizer.Infrastructure/` veri erişimi implement edilecek
