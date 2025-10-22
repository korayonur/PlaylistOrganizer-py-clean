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

### .NET MAUI Geliştirme
- .NET 8 kullanılmalı
- Clean Architecture uygulanmalı
- Mac Catalyst öncelikli platform
- MVVM pattern kullanılmalı

### Git Workflow
- Feature branch'ler kullanılmalı
- Her değişiklik için commit yapılmalı
- Açıklayıcı commit mesajları yazılmalı
- Pull request'ler kullanılmalı

### Kod Standartları
- C# coding conventions
- Async/await pattern
- Dependency injection
- Unit test coverage
- Nullable reference types

### OpenSpec Workflow
1. Değişiklik önerisi oluştur
2. Spec'leri güncelle
3. Task'ları tanımla
4. Kodu implement et
5. Test'leri yaz
6. Dokümantasyonu güncelle
7. Değişikliği archive et
