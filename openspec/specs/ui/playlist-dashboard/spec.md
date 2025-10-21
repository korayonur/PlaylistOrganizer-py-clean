# UI - Playlist Dashboard

## Overview
- **Goal:** Masaüstü odaklı ana ekranı (playlist ağacı + detay paneli) web uygulamasındaki deneyime yakın hale getirmek.
- **Status:** In Progress  
- **Owner:** koray / cursor-agent friendly

## Done
- Split layout with playlist tree (left) and detail view (right).
- Playlist detail view lists tracks, shows status badges, includes “Dinle / Fix” actions.

## Todo
1. Tree Enhancements  
   - [ ] Lazy load / sanal scroll (büyük klasörler için performans).  
   - [ ] Arama filtresi (path veya isim bazlı).  
   - [ ] Klasör/playlist ikonları için tutarlı tema ve renklendirme.
2. Detail Panel  
   - [ ] Eksik dosyalar için görsel highlight (örn. kırmızı badge).  
   - [ ] Fix sonuç diyaloğu (kullanıcıya eşleşme özetini göster, onay al).  
   - [ ] Parça oynatma için durum göstergesi (çalıyor/duraklatıldı).
3. Global UX  
   - [ ] Karanlık/aydınlık tema varyasyonları.  
   - [ ] Keyboard navigation (ağaçta ↑/↓, Enter ile aç).  
   - [ ] Masaüstü pencere yeniden boyutlandırmada responsive kırılımlar.

## Notes
- UI katmanında `MainViewModel` ve `PlaylistDetailViewModel` DI ile yönetiliyor.  
- Spec tamamlandığında `docs/current/MAUI_Gecis_Plani.md` güncellenmeli.
