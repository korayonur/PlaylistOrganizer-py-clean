# OpenSpec Talimatları - İyileştirilmiş Versiyon

Bu talimatlar bu projede çalışan AI asistanları içindir.

## 🎯 OPENSPEC WORKFLOW KURALLARI (ZORUNLU)

### 1. Test-Driven Development (TDD) Zorunlu
- **HER DEĞİŞİKLİK ÖNCESİ TEST YAZ**
- Test'leri önce yaz, sonra implement et
- Test'ler başarısız olmalı, sonra implement et
- Test'ler başarılı olmalı
- Refactor et

### 2. OpenSpec Workflow Sırası (ZORUNLU)
1. **Proposal Oluştur** (`openspec/changes/`)
2. **Spec Güncelle** (`openspec/specs/`)
3. **Task Tanımla** (`tasks.md`)
4. **Test Yaz** (TDD)
5. **Implementation Yap**
6. **Test Çalıştır** (Başarılı olmalı)
7. **Code Review**
8. **Archive Et**

### 3. Test Sistemi Kuralları (ZORUNLU)
- **Her adımda test çalıştır**
- Unit test coverage %80+ zorunlu
- Integration test'ler zorunlu
- UI test'ler zorunlu
- Performance test'ler zorunlu
- Test'ler başarısız olursa dur, düzelt

### 4. Continuous Testing (ZORUNLU)
- Her commit'te test çalıştır
- Her pull request'te test çalıştır
- Test başarısız olursa merge etme
- Test coverage raporu zorunlu

## 🏗️ MİMARİ KURALLARI

### Test-First Architecture
- Test'ler mimarinin temelini oluşturur
- Test'ler olmadan kod yazma
- Test'ler dokümantasyon görevi görür
- Test'ler regression'ları önler

### Clean Architecture + TDD
- Domain layer test'leri
- Application layer test'leri
- Infrastructure layer test'leri
- Presentation layer test'leri

## 🔧 TEST SİSTEMİ KURALLARI

### Test Types (Zorunlu)
1. **Unit Tests** - Her class için
2. **Integration Tests** - Servis entegrasyonları
3. **UI Tests** - SwiftUI view'ları
4. **Performance Tests** - Performans kritik kodlar
5. **Snapshot Tests** - UI snapshot'ları

### Test Coverage (Zorunlu)
- **Minimum %80 coverage**
- **Critical paths %100 coverage**
- **Business logic %100 coverage**
- **Error handling %100 coverage**

### Test Automation (Zorunlu)
- CI/CD pipeline'da test'ler
- Pre-commit hooks
- Automated test reports
- Test failure notifications

## 📋 IMPLEMENTATION KURALLARI

### Her Değişiklik İçin:
1. **Test yaz** (TDD)
2. **Test çalıştır** (Başarısız olmalı)
3. **Implementation yap**
4. **Test çalıştır** (Başarılı olmalı)
5. **Refactor et**
6. **Test çalıştır** (Hala başarılı olmalı)

### Test Failure Handling:
- Test başarısız olursa dur
- Hata analizi yap
- Root cause bul
- Düzelt
- Test tekrar çalıştır

## 🚨 YASAK KURALLAR

### ❌ Yapılması Yasak:
- Test olmadan kod yazma
- Test'leri sonradan yazma
- Test başarısızken devam etme
- Test coverage %80'in altında kod
- Test olmadan merge etme

### ✅ Zorunlu Kurallar:
- Test-first development
- Continuous testing
- Test coverage monitoring
- Test automation
- Test documentation

## 📊 TEST METRİKLERİ

### Takip Edilecek Metrikler:
- Test coverage percentage
- Test execution time
- Test failure rate
- Test maintenance cost
- Test reliability

### Raporlama:
- Günlük test raporu
- Haftalık coverage raporu
- Aylık test metrikleri
- Test trend analizi

## 🔄 WORKFLOW ÖRNEĞİ

### Yeni Feature Ekleme:
1. **Proposal**: `openspec/changes/new-feature/proposal.md`
2. **Spec**: `openspec/specs/new-feature/spec.md`
3. **Task**: `openspec/changes/new-feature/tasks.md`
4. **Test**: Test'leri yaz (TDD)
5. **Implementation**: Kodu yaz
6. **Test**: Test'leri çalıştır
7. **Review**: Code review
8. **Archive**: Tamamlanan değişikliği archive et

### Bug Fix:
1. **Test**: Bug'ı reproduce eden test yaz
2. **Fix**: Bug'ı düzelt
3. **Test**: Test'leri çalıştır
4. **Verify**: Bug düzeldi mi kontrol et

## 🎯 HEDEFLER

### Kısa Vadeli (1 hafta):
- Test sistemi %100 çalışır
- TDD workflow aktif
- Test coverage %80+

### Orta Vadeli (1 ay):
- Test automation tam
- CI/CD pipeline aktif
- Test metrics dashboard

### Uzun Vadeli (3 ay):
- Test-driven culture
- Zero bug policy
- High quality codebase

Bu kurallar zorunludur ve ihlal edilemez!