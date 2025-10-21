uyp# Infrastructure - SQLite Integration

## Overview
- **Goal:** `musicfiles.db` veritabanına bağlanarak playlist ve track verilerini kalıcı kaynaktan okumak / güncellemek.
- **Status:** In Progress
- **Owner:** koray / cursor-agent friendly

## Current State
- ✅ `SqliteConnectionFactory` ve `SqlitePlaylistRepository` eklendi.
- ✅ Uygulama çalışırken `musicfiles.db` bulunursa otomatik kullanılıyor; aksi halde seed edilmiş in-memory repo devreye giriyor.
- ⏳ Track güncelleme/fix işlemleri hâlen stub (dosya sistemi ve playlist dosyası rewrite yok).

## Todo
1. Read Path  
   - [ ] `SqliteTrackRepository` implementasyonu (playlist içeriklerini doğrudan DB’den almak).  
   - [ ] M4A/MP3 için dosya varlığı kontrolünü `music_files` tablosu + file system kombinasyonuyla doğrulamak.
2. Write Path  
   - [ ] Fix uygulanırken `tracks` ve `playlist_tracks` tablolarını güncelle.  
   - [ ] Playlist dosyası (vdjfolder/m3u) senkronizasyonu için `IPlaylistFileUpdater`.
3. Diagnostics  
   - [ ] Logging (query süreleri, hata durumları).  
   - [ ] Entegrasyon testleri (sqlite in-memory database ile).

## Notes
- DB yolu `PLAYLIST_DB_PATH` env değişkeni ile override edilebilir.  
- macOS’ta dosya sistemi izinleri için kullanıcıya erişim onayı gerekebilir.
