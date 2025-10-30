# Test System Integration and Model Refactoring Proposal

## Why
Mevcut test sistemi ve model yapısında önemli sorunlar var:

1. **Test Sistemi Dağınık**: Tests klasörü ayrı proje olarak çalışıyor, kod tekrarı var
2. **Model Kod Tekrarı**: Domain/Entities ve Models klasörlerinde aynı sınıflar var
3. **Test Coverage Eksik**: M3U Parser, VDJFolder Parser, Import Service test edilmemiş
4. **Clean Architecture İhlali**: Business logic dağınık, UI ve Domain karışık

Bu değişiklik ile:
- Test sistemi ana projeye entegre edilir
- Kod tekrarı kaldırılır
- Comprehensive test coverage sağlanır
- Clean Architecture prensiplerine uygun hale gelir

## What Changes

### 1. Test System Integration
- **MOVE**: `/Tests` → `/PlaylistOrganizerAvalonia/Tests`
- **INTEGRATE**: Test projesi ana projeye entegre edilir
- **ENHANCE**: Terminal'de `dotnet test` ile çalışır
- **ADD**: M3U Parser, VDJFolder Parser, Import Service testleri

### 2. Model Refactoring
- **REMOVE**: `/PlaylistOrganizerAvalonia/Models` klasörü
- **REFACTOR**: ViewModels'de Domain Entities kullanılır
- **SEPARATE**: UI concerns (INotifyPropertyChanged) Domain'den ayrılır
- **CLEAN**: Business logic Domain katmanında toplanır

### 3. Test Coverage Enhancement
- **ADD**: M3UParserServiceTests
- **ADD**: VDJFolderParserServiceTests
- **ADD**: ImportServiceTests
- **ADD**: FileScannerServiceTests
- **ADD**: DatabaseManagerTests (enhanced)
- **ADD**: IntegrationTests

## Impact
- Affected specs: mimari, proje-genel, test-system
- Affected code: Tüm test sistemi, ViewModels, Models
- Database: Değişiklik yok
- UI: ViewModels refactor edilir
- Services: Test coverage artar

## Architecture Benefits
- **Single Responsibility**: Her katman kendi sorumluluğunu alır
- **Dependency Inversion**: Domain UI'dan bağımsız
- **Testability**: Comprehensive test coverage
- **Maintainability**: Kod tekrarı yok, temiz yapı
- **Clean Architecture**: Katmanlar doğru ayrılmış

## Migration Scope

### Test System:
- Test projesi ana projeye entegre
- Test dependencies güncellenir
- Test runner konfigürasyonu
- CI/CD pipeline güncellemesi

### Model Refactoring:
- Models klasörü kaldırılır
- ViewModels Domain Entities kullanır
- UI concerns ViewModels'e taşınır
- Business logic Domain'de kalır

### Test Coverage:
- Unit tests tüm servisler için
- Integration tests database operasyonları için
- Mock objects ve test data
- Test utilities ve helpers
