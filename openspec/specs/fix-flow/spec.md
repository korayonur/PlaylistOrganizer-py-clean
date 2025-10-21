# Feature - Fix Flow

## Overview
- **Goal:** Eksik dosyalar için öneri bulma, kullanıcıya gösterme ve playlist/fiziksel dosyaları güncelleme akışını hayata geçirmek.
- **Status:** In Progress
- **Owner:** koray / cursor-agent friendly

## Current State
- ✅ `GetTrackFixSuggestionQuery` ve `ApplyTrackFixCommand` handler’ları mevcut (stub servis ile çalışıyor).
- ✅ UI’da her parça için “Dinle” / “Fix” butonları gösteriliyor; sonuç mesajı paylaşılıyor.
- ⏳ Fix onayı, gerçek benzerlik servisi, dosya güncellemesi yapılmadı.

## Todo
1. Suggestion Pipeline  
   - [ ] Similarity servisinin gerçek implementasyonunu port et (kelime index, skor hesaplama).  
   - [ ] Birden fazla öneriyi kullanıcıya sunacak arayüz taslağı.  
   - [ ] Fix önerisi bulunamazsa geri bildirim (toast/dialog).
2. Confirmation  
   - [ ] Fix uygulanmadan önce etkilenecek playlistleri göster.  
   - [ ] Kullanıcı onayı alın (dialog).  
   - [ ] Uygulama sırasında progress / loading state yönetin.
3. Persist  
   - [ ] `IFixService.ApplySuggestionAsync` gerçek dosya ve DB güncellemelerini yapacak.  
   - [ ] Başarı/başarısızlık durumlarını logla, UI’da bildir.

## Notes
- Bu spec, `sqlite-integration` spec’iyle birlikte ele alınmalı (özellikle write path).  
- Cursor Agent için her alt madde ayrı task/ticket olarak işaretlenebilir.
