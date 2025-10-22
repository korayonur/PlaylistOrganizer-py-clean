# PlaylistOrganizer SwiftUI Projesi

## Proje Genel Bakış

**PlaylistOrganizer**, müzik playlist'lerini organize etmek ve yönetmek için geliştirilmiş native macOS uygulamasıdır. SwiftUI ile geliştirilmiş, Mac'te sorunsuz çalışan modern bir uygulamadır.

## Teknoloji Yığını

### Ana Teknolojiler
- **SwiftUI** - Native macOS UI framework
- **Swift** - Programlama dili
- **Xcode** - IDE
- **macOS** - Hedef platform (macOS 13.0+)

### Mimari
- **MVVM Pattern** - Model-View-ViewModel deseni
- **Combine Framework** - Reactive programming
- **Core Data** - Veri yönetimi (opsiyonel)
- **Protocol-oriented programming** - Swift'in güçlü yanı

### Katmanlar
1. **Models** - Veri modelleri (Playlist, Track, Artist)
2. **ViewModels** - İş mantığı (@ObservableObject)
3. **Views** - UI bileşenleri (SwiftUI Views)
4. **Services** - Harici servisler (MockDataService)

## Hedef Platformlar

- **macOS** - Ana hedef platform (macOS 13.0+)
- **macOS 26.0** - Güncel SDK hedefi

## Özellikler

### Temel Özellikler ✅
- ✅ Playlist listesi görüntüleme
- ✅ Track listesi görüntüleme
- ✅ Arama ve filtreleme
- ✅ İstatistik kartları (Toplam/Bulunan/Eksik)
- ✅ Dark theme UI

### Gelişmiş Özellikler (Planlanan)
- 🔄 Müzik dosyası import/export
- 🔄 Playlist oluşturma ve düzenleme
- 🔄 Akıllı playlist önerileri
- 🔄 Cloud senkronizasyonu
- 🔄 Offline çalışma desteği

## Geliştirme Kuralları

### Kod Standartları
- Swift coding conventions
- SwiftUI best practices
- MVVM pattern zorunlu
- @StateObject ve @ObservedObject kullanımı
- Combine framework ile reactive programming

### Git Workflow
- Feature branch'ler
- Pull request'ler
- Code review
- Conventional commits

### Dokümantasyon
- Tüm belgeler Türkçe
- OpenSpec ile spec-driven development
- SwiftUI preview'ları
- Kullanıcı kılavuzu

## Kurulum ve Çalıştırma

### Gereksinimler
- **Xcode 15.0+** (macOS geliştirme için)
- **Swift 6.2+**
- **macOS 13.0+** (hedef platform)

### Çalıştırma
```bash
# Xcode ile açma
open PlaylistOrganizer.xcodeproj

# Terminal'den build
xcodebuild -project PlaylistOrganizer.xcodeproj -scheme PlaylistOrganizer -configuration Debug build

# Çalıştırma
xcodebuild -project PlaylistOrganizer.xcodeproj -scheme PlaylistOrganizer -configuration Debug -destination 'platform=macOS' run
```

## Proje Yapısı

```
xcode/PlaylistOrganizer/
├── PlaylistOrganizer.xcodeproj/     # Xcode proje dosyası
└── PlaylistOrganizer/
    ├── PlaylistOrganizerApp.swift   # Ana uygulama
    ├── ContentView.swift            # Ana UI view
    ├── PlaylistOrganizerViewModel.swift # ViewModel ve modeller
    └── Assets.xcassets/            # Uygulama varlıkları
```

## Katkıda Bulunma

1. Feature branch oluştur
2. Değişiklikleri yap
3. SwiftUI preview'ları test et
4. Pull request oluştur
5. Code review bekle
6. Merge et

## Lisans

MIT License
