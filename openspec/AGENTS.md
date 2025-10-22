# OpenSpec Talimatları

Bu talimatlar bu projede çalışan AI asistanları içindir.

Aşağıdaki durumlarda `@/openspec/AGENTS.md` dosyasını mutlaka açın:
- Planlama veya önerilerden bahsedildiğinde (proposal, spec, change, plan gibi kelimeler)
- Yeni yetenekler, breaking changes, mimari değişiklikleri veya büyük performans/güvenlik işleri tanıtıldığında
- Belirsiz görünüyorsa ve kodlamadan önce yetkili spec'e ihtiyaç duyduğunuzda

`@/openspec/AGENTS.md` dosyasını şunları öğrenmek için kullanın:
- Değişiklik önerileri oluşturma ve uygulama
- Spec formatı ve konvansiyonları
- Proje yapısı ve yönergeleri

Bu yönetilen bloğu koruyun ki 'openspec update' talimatları yenileyebilsin.

## Proje Kuralları

### Dil ve Dokümantasyon
- Tüm belgeler Türkçe olmalı
- Kod yorumları Türkçe olabilir
- Değişken ve fonksiyon isimleri İngilizce olmalı
- Git commit mesajları Türkçe olabilir

### SwiftUI Geliştirme
- SwiftUI framework kullanılmalı
- macOS 13.0+ hedef platform
- MVVM pattern zorunlu
- @StateObject ve @ObservedObject kullanılmalı
- Combine framework ile reactive programming
- Async/await pattern kullanılmalı
- SwiftUI best practices uygulanmalı

### Git Workflow
- Feature branch'ler kullanılmalı
- Her değişiklik için commit yapılmalı
- Açıklayıcı commit mesajları yazılmalı
- Pull request'ler kullanılmalı

### Kod Standartları
- Swift coding conventions
- SwiftUI best practices
- MVVM pattern zorunlu
- Protocol-oriented programming
- Dependency injection
- Unit test coverage
- SwiftUI preview'ları

### OpenSpec Workflow
1. Değişiklik önerisi oluştur
2. Spec'leri güncelle
3. Task'ları tanımla
4. Kodu implement et
5. SwiftUI preview'ları test et
6. Dokümantasyonu güncelle
7. Değişikliği archive et
