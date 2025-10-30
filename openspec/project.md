# PlaylistOrganizer Avalonia Projesi

## Proje Genel Bakış

**PlaylistOrganizer**, müzik playlist'lerini organize etmek ve yönetmek için geliştirilmiş cross-platform uygulamasıdır. Avalonia UI ile geliştirilmiş, macOS, Windows ve Linux'ta çalışan modern bir uygulamadır.

## Teknoloji Yığını

### Ana Teknolojiler
- **Avalonia UI** - Cross-platform UI framework
- **C#** - Programlama dili
- **.NET 9** - Runtime ve framework
- **SQLite** - Veri yönetimi
- **MVVM** - Model-View-ViewModel deseni

### Clean Architecture Prensipleri (ZORUNLU)
- **Interface'ler zorunlu**: Her service için interface oluştur
- **Dependency Injection zorunlu**: Constructor injection kullan
- **Repository Pattern zorunlu**: Veri erişimi için repository kullan
- **Separation of Concerns**: Her katman kendi sorumluluğuna odaklanmalı
- **Dependency Direction**: Dış katmanlar → İç katmanlara bağımlı olabilir
- **Business Logic**: UI'dan bağımsız olmalı
- **Testability**: Mock'lanabilir interface'ler kullan

### Mimari
- **Clean Architecture** - Temiz mimari prensipleri
- **MVVM Pattern** - Model-View-ViewModel deseni
- **Dependency Injection** - Bağımlılık enjeksiyonu
- **Repository Pattern** - Veri erişim deseni
- **Async/Await** - Asenkron programlama

### Katmanlar
1. **Models** - Veri modelleri (Playlist, Track, MusicFile)
2. **ViewModels** - İş mantığı (MainWindowViewModel)
3. **Views** - UI bileşenleri (MainWindow.axaml)
4. **Services** - Servisler (DatabaseManager)
5. **Converters** - Value converter'lar

## Hedef Platformlar

- **macOS** - Ana hedef platform
- **Windows** - Cross-platform desteği
- **Linux** - Cross-platform desteği

## Özellikler

### Temel Özellikler ✅
- ✅ Playlist hierarchy görüntüleme (TreeView)
- ✅ Playlist tıklama işlevselliği
- ✅ Track listesi görüntüleme
- ✅ Track durumu gösterimi (Found/Missing/Updated)
- ✅ Real-time dosya varlığı kontrolü
- ✅ Arama ve filtreleme
- ✅ İstatistik kartları (Toplam/Bulunan/Eksik)
- ✅ Dark theme UI
- ✅ 0-track filtreleme

### Gelişmiş Özellikler (Planlanan)
- 🔄 Track editing işlevselliği
- 🔄 Advanced filtering
- 🔄 Track preview/playback
- 🔄 Playlist oluşturma ve düzenleme
- 🔄 Cloud senkronizasyonu

## Geliştirme Kuralları

### Kod Standartları
- C# coding conventions
- Avalonia UI best practices
- MVVM pattern zorunlu
- Clean Architecture prensipleri
- Async/await kullanımı
- Dependency Injection

### Test Kuralları (ZORUNLU)
- **TDD ZORUNLU**: Test'leri önce yaz, sonra implement et
- **Unit test coverage %80+ ZORUNLU**
- **Her adımda test çalıştır ZORUNLU**
- **Test başarısız olursa dur ZORUNLU**
- Mock'ları kullan
- Integration test'ler zorunlu
- UI test'ler zorunlu
- Performance test'ler zorunlu
- Test automation zorunlu
- Test coverage monitoring zorunlu
- Test başarısızken merge etme YASAK
- Test olmadan kod yazma YASAK

### Git Workflow
- Feature branch kullan (feature/avalonia-development)
- Açıklayıcı commit mesajları yaz
- Pull request'ler zorunlu
- Code review yap
- Commit'leri küçük ve anlamlı tut

### Dil Kuralları
- Always respond in Türkçe
- Kod yorumları Türkçe olabilir
- Değişken ve fonksiyon isimleri İngilizce olmalı
- Git commit mesajları Türkçe olabilir

### Dokümantasyon
- Tüm belgeler Türkçe
- OpenSpec ile spec-driven development
- Avalonia UI best practices
- Kullanıcı kılavuzu

## Kurulum ve Çalıştırma

### Gereksinimler
- **.NET 9 SDK**
- **Avalonia UI**
- **SQLite**

### Çalıştırma
```bash
# Proje dizinine git
cd PlaylistOrganizerAvalonia

# Restore packages
dotnet restore

# Build
dotnet build

# Run
dotnet run
```

## Proje Yapısı

```
PlaylistOrganizerAvalonia/
├── Models/                    # Veri modelleri
│   ├── Playlist.cs
│   ├── Track.cs
│   ├── MusicFile.cs
│   └── TrackStatus.cs
├── ViewModels/               # ViewModel'ler
│   └── MainWindowViewModel.cs
├── Views/                    # UI Views
│   └── MainWindow.axaml
├── Services/                 # Servisler
│   └── DatabaseManager.cs
├── Converters/               # Value converter'lar
│   ├── StatusToColorConverter.cs
│   └── ChildrenToVisibilityConverter.cs
└── Program.cs               # Ana program
```

## Katkıda Bulunma

1. Feature branch oluştur
2. Değişiklikleri yap
3. Avalonia UI test et
4. Pull request oluştur
5. Code review bekle
6. Merge et

## Lisans

MIT License