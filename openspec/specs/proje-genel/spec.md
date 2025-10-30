# Playlist Organizer - .NET MAUI Mac Projesi

## Amaç
Modern, temiz mimarili .NET MAUI Mac uygulaması ile müzik playlist yönetim sistemi.

## Genel Gereksinimler

### Gereksinim: .NET 8 MAUI Mac Uyumluluğu
Sistem .NET 8 MAUI framework'ü kullanarak Mac platformunda çalışmalıdır.

#### Senaryo: Mac uyumluluğu
- WHEN uygulama Mac'te çalıştırıldığında
- THEN tüm özellikler sorunsuz çalışmalıdır
- AND native Mac UI/UX deneyimi sunmalıdır

### Gereksinim: Clean Architecture
Sistem Clean Architecture prensiplerine uygun olarak tasarlanmalıdır.

#### Senaryo: Katman ayrımı
- WHEN kod yazıldığında
- THEN Domain, Application, Infrastructure ve Presentation katmanları ayrı olmalıdır
- AND her katman kendi sorumluluğuna odaklanmalıdır

### Gereksinim: Git Entegrasyonu
Her aşamada Git işlemleri yapılmalıdır.

#### Senaryo: Commit stratejisi
- WHEN her önemli değişiklik yapıldığında
- THEN anlamlı commit mesajları ile kaydedilmelidir
- AND branch stratejisi takip edilmelidir

## Teknik Gereksinimler

### Gereksinim: .NET 8 MAUI
- .NET 8 MAUI framework kullanılmalıdır
- Mac platformu desteklenmelidir
- Modern C# özellikleri kullanılmalıdır

### Gereksinim: MVVM Pattern
- MVVM (Model-View-ViewModel) pattern uygulanmalıdır
- Data binding kullanılmalıdır
- Command pattern uygulanmalıdır

### Gereksinim: Dependency Injection
- Built-in DI container kullanılmalıdır
- Service registration yapılmalıdır
- Interface-based programming uygulanmalıdır
