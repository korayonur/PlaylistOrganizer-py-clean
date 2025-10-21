# Playlist Yönetimi Yeteneği

## Gereksinimler

### Requirement: Playlist Listesi Görüntüleme
Sistem kullanıcıya mevcut playlist'lerin hiyerarşik listesini SAĞLAMALIDIR.

#### Scenario: Klasör yapısı ile playlist listesi
- **WHEN** kullanıcı uygulamayı açar
- **THEN** playlist'ler klasör yapısında gösterilir
- **AND** her playlist için parça sayısı ve istatistikler görünür

#### Scenario: Playlist filtreleme
- **WHEN** kullanıcı "Sadece eksik parçalar" filtresini aktif eder
- **THEN** sadece eksik parçaları olan playlist'ler gösterilir

### Requirement: Playlist Detay Görüntüleme
Sistem seçilen playlist'in detaylarını SAĞLAMALIDIR.

#### Scenario: Playlist içeriği görüntüleme
- **WHEN** kullanıcı bir playlist'e tıklar
- **THEN** playlist'teki tüm parçalar listelenir
- **AND** her parça için dosya durumu (mevcut/eksik) gösterilir

#### Scenario: Parça durumu gösterimi
- **WHEN** parça dosyası mevcut değil
- **THEN** parça "Eksik" olarak işaretlenir
- **AND** kırmızı renkte vurgulanır

### Requirement: Playlist İstatistikleri
Sistem playlist'ler için istatistik bilgileri SAĞLAMALIDIR.

#### Scenario: Temel istatistikler
- **WHEN** kullanıcı playlist'i görüntüler
- **THEN** toplam parça sayısı gösterilir
- **AND** mevcut parça sayısı gösterilir
- **AND** eksik parça sayısı gösterilir
- **AND** tamamlanma yüzdesi gösterilir
