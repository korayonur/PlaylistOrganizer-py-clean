# PlaylistOrganizer Projesi

## Proje Genel Bakış

**PlaylistOrganizer**, müzik playlist'lerini organize etmek ve yönetmek için geliştirilmiş bir .NET MAUI uygulamasıdır. Uygulama, Mac, iOS, Android ve Windows platformlarında çalışabilir.

## Teknoloji Yığını

### Ana Teknolojiler
- **.NET 8** - Ana framework
- **.NET MAUI** - Cross-platform UI framework
- **C#** - Programlama dili
- **XAML** - UI tanımlama

### Mimari
- **Clean Architecture** - Katmanlı mimari yaklaşımı
- **Domain-Driven Design (DDD)** - İş mantığı odaklı tasarım
- **MVVM Pattern** - Model-View-ViewModel deseni

### Katmanlar
1. **Domain** - İş mantığı ve varlıklar
2. **Application** - Use case'ler ve servisler
3. **Infrastructure** - Veri erişimi ve harici servisler
4. **Presentation** - UI ve kullanıcı etkileşimi

## Hedef Platformlar

- **macOS** (Mac Catalyst) - Ana hedef platform
- **iOS** - Mobil platform
- **Android** - Mobil platform
- **Windows** - Desktop platform

## Özellikler

### Temel Özellikler
- Playlist oluşturma ve düzenleme
- Müzik dosyası import/export
- Arama ve filtreleme
- Playlist paylaşımı

### Gelişmiş Özellikler
- Akıllı playlist önerileri
- Müzik analizi ve kategorilendirme
- Cloud senkronizasyonu
- Offline çalışma desteği

## Geliştirme Kuralları

### Kod Standartları
- C# coding conventions
- Async/await pattern kullanımı
- Dependency injection
- Unit test coverage

### Git Workflow
- Feature branch'ler
- Pull request'ler
- Code review
- Conventional commits

### Dokümantasyon
- Tüm belgeler Türkçe
- OpenSpec ile spec-driven development
- API dokümantasyonu
- Kullanıcı kılavuzu

## Kurulum ve Çalıştırma

### Gereksinimler
- .NET 8 SDK
- .NET MAUI workload
- Visual Studio 2022 veya VS Code
- Mac için Xcode (iOS geliştirme)

### Çalıştırma
```bash
# Proje restore
dotnet restore

# Mac için çalıştırma
dotnet build -f net8.0-maccatalyst
dotnet run -f net8.0-maccatalyst
```

## Proje Yapısı

```
src/
├── PlaylistOrganizer.Domain/          # Domain katmanı
├── PlaylistOrganizer.Application/     # Application katmanı
├── PlaylistOrganizer.Infrastructure/  # Infrastructure katmanı
├── PlaylistOrganizer.Presentation/    # Presentation katmanı
└── PlaylistOrganizer.Maui/           # MAUI uygulaması
```

## Katkıda Bulunma

1. Feature branch oluştur
2. Değişiklikleri yap
3. Test'leri çalıştır
4. Pull request oluştur
5. Code review bekle
6. Merge et

## Lisans

MIT License
