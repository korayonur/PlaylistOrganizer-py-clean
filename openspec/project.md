# Proje Bağlamı

## Amaç
**Playlist Organizer**, müzik dosyalarını yönetmek, playlist'leri organize etmek ve eksik parçaları otomatik olarak tespit edip düzeltmek için geliştirilmiş modern bir masaüstü uygulamasıdır. 

**Ana Hedefler:**
- 🎵 Müzik dosyalarını import etme ve organize etme
- 🔍 Kelime tabanlı akıllı arama sistemi
- 🛠️ Eksik parçaları tespit etme ve otomatik düzeltme önerileri
- 📊 Playlist istatistikleri ve analiz
- 🏗️ Clean Architecture ile sürdürülebilir kod yapısı
- 🖥️ Cross-platform masaüstü deneyimi (macOS/Windows)

## Teknoloji Yığını

### Mevcut Sistem (Node.js + Angular)
- **Backend**: Node.js + Express + Clean Architecture
- **Frontend**: Angular 18 + Material Design + Standalone Components
- **Veritabanı**: SQLite3 (better-sqlite3)
- **CLI**: Commander.js
- **Mimari**: Domain-Driven Design + Repository Pattern

### Hedef Sistem (.NET MAUI)
- **Framework**: .NET 8 + .NET MAUI 8 (kararlı workload)
- **UI**: SwiftUI benzeri XAML + MVVM
- **Veritabanı**: SQLite (Microsoft.Data.Sqlite)
- **Mimari**: Clean Architecture + CQRS-lite
- **Platform**: macOS (MacCatalyst) + Windows

### Geçiş Stratejisi
- **Faz 1**: Domain modelleri ve iş kuralları port edildi ✅
- **Faz 2**: MAUI UI iskeleti ve temel sayfalar ✅
- **Faz 3**: Fix ve benzerlik akışları (devam ediyor)
- **Faz 4**: Medya oynatıcı ve gelişmiş özellikler
- **Faz 5**: Optimizasyon ve platform özelleştirmeleri

## Proje Kuralları

### Kod Stili
- **Dil**: Türkçe yorumlar ve değişken isimleri
- **C# Konvansiyonları**: PascalCase (sınıflar, metodlar), camelCase (değişkenler)
- **XAML**: PascalCase element isimleri, kebab-case attribute'lar
- **Dosya Organizasyonu**: Her sınıf ayrı dosya, klasör yapısı Clean Architecture'a uygun
- **Nullable Reference Types**: Etkin (C# 8+)

### Mimari Desenler
- **Clean Architecture**: Domain merkezli, bağımlılıklar içe doğru
- **CQRS-lite**: Komut/Sorgu ayrımı (ICommand, IQuery)
- **Repository Pattern**: Veri erişim soyutlaması
- **Dependency Injection**: Microsoft.Extensions.DependencyInjection
- **MVVM**: CommunityToolkit.Mvvm ile ViewModel'ler

### Test Stratejisi
- **Birim Testleri**: xUnit + FluentAssertions
- **Entegrasyon Testleri**: Test veritabanı ile repository testleri
- **UI Testleri**: MAUI Test Harness (gelecekte)
- **Test Kapsamı**: Domain servisleri, use case'ler, repository'ler

### Git Workflow
- **Branch Stratejisi**: Feature branch'ler (feature/maui-migration)
- **Commit Mesajları**: Conventional Commits (feat:, fix:, docs:)
- **Code Review**: Pull request'ler zorunlu
- **Merge Stratejisi**: Squash and merge

## Domain Bağlamı

### Ana Varlıklar
- **Playlist**: Müzik listesi, klasör yapısı, istatistikler
- **Track**: Müzik parçası, dosya yolu, metadata
- **FixSuggestion**: Eksik parça için düzeltme önerisi
- **SearchInfo**: Arama sonuçları ve eşleşme skorları
- **ImportSession**: Import işlemi takibi

### İş Kuralları
- **Kelime Normalizasyonu**: Türkçe karakterler, büyük/küçük harf duyarsız
- **Benzerlik Hesaplama**: Levenshtein distance + kelime ağırlıkları
- **Fix Önerileri**: En yüksek skorlu eşleşmeler öncelikli
- **Dosya Yönetimi**: Playlist dosyalarını güncelleme, backup oluşturma

### Kullanıcı Senaryoları
1. **Import**: Müzik klasörünü tarayıp veritabanına ekleme
2. **Arama**: Kelime tabanlı parça arama
3. **Playlist Yönetimi**: Klasör ağacı görünümü, istatistikler
4. **Fix İşlemleri**: Eksik parçaları tespit etme ve düzeltme
5. **Medya Oynatma**: Parçaları dinleme ve test etme

## Önemli Kısıtlamalar

### Teknik Kısıtlamalar
- **.NET 8**: MAUI workload'ı .NET 9'da henüz kararlı değil
- **macOS**: MacCatalyst 14.0+ gereksinimi
- **Windows**: Windows 10 19041.0+ gereksinimi
- **SQLite**: Mevcut veritabanı şeması korunmalı
- **Dosya İzinleri**: Kullanıcıdan klasör erişim izni gerekli

### İş Kısıtlamaları
- **API Gereksizliği**: Native uygulama, HTTP API'ye ihtiyaç yok
- **Offline Çalışma**: İnternet bağlantısı olmadan çalışabilmeli
- **Performans**: Büyük playlist'lerde hızlı arama ve filtreleme
- **Geriye Uyumluluk**: Mevcut veritabanı ile uyumlu olmalı

### Güvenlik Kısıtlamaları
- **Sandbox**: macOS notarization gereksinimleri
- **Dosya Erişimi**: Sadece kullanıcının seçtiği klasörlere erişim
- **Veri Koruma**: Kullanıcı verileri yerel olarak saklanır

## Dış Bağımlılıklar

### NuGet Paketleri
- **Microsoft.Maui.Controls**: MAUI framework
- **CommunityToolkit.Maui**: UI bileşenleri ve yardımcılar
- **CommunityToolkit.Mvvm**: MVVM altyapısı
- **Microsoft.Data.Sqlite**: SQLite veritabanı erişimi
- **Microsoft.Extensions.Logging**: Loglama sistemi

### Platform Bağımlılıkları
- **macOS**: Xcode, MacCatalyst runtime
- **Windows**: Windows SDK, .NET Desktop Runtime
- **SQLite**: Platform native SQLite kütüphanesi

### Geliştirme Araçları
- **Visual Studio 2022**: MAUI geliştirme ortamı
- **.NET 8 SDK**: Geliştirme ve build için
- **Git**: Versiyon kontrolü
- **OpenSpec**: Spec-driven development (yeni)

## Geçiş Notları

### Tamamlanan İşler
- ✅ Clean Architecture katmanları oluşturuldu
- ✅ Domain modelleri port edildi
- ✅ CQRS altyapısı kuruldu
- ✅ Temel MAUI sayfaları hazırlandı
- ✅ SQLite entegrasyonu başlatıldı

### Devam Eden İşler
- 🔄 Fix ve benzerlik servislerinin port edilmesi
- 🔄 UI bileşenlerinin tamamlanması
- 🔄 Medya oynatıcı entegrasyonu
- 🔄 Test coverage'ın artırılması

### Gelecek Planlar
- 📋 .NET 9 MAUI workload'ı yayınlandığında geçiş
- 📋 iOS/Android desteği (opsiyonel)
- 📋 Cloud sync özelliği (opsiyonel)
- 📋 Plugin sistemi (opsiyonel)
