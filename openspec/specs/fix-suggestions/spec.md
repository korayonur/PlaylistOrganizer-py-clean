# Fix Önerileri Yeteneği

## Gereksinimler

### Requirement: Eksik Parça Tespiti
Sistem eksik parçaları otomatik olarak tespit etmelidir.

#### Scenario: Eksik parça tespiti
- **WHEN** playlist yüklenir
- **THEN** dosya sistemi kontrol edilir
- **AND** mevcut olmayan dosyalar "Eksik" olarak işaretlenir

#### Scenario: Toplu eksik parça kontrolü
- **WHEN** kullanıcı "Eksik Parçaları Kontrol Et" butonuna tıklar
- **THEN** tüm playlist'lerdeki parçalar kontrol edilir
- **AND** eksik parçalar listelenir

### Requirement: Benzer Parça Önerisi
Sistem eksik parçalar için benzer alternatifler önermelidir.

#### Scenario: Benzerlik analizi
- **WHEN** eksik parça tespit edilir
- **THEN** veritabanında benzer parçalar aranır
- **AND** en uygun 3-5 alternatif önerilir

#### Scenario: Öneri skorlaması
- **WHEN** benzer parçalar bulunur
- **THEN** her öneri için benzerlik skoru hesaplanır
- **AND** skorlar yüzde olarak gösterilir

### Requirement: Fix Uygulama
Sistem kullanıcının onayı ile fix önerilerini uygulayabilmelidir.

#### Scenario: Tekil fix uygulama
- **WHEN** kullanıcı bir öneriyi kabul eder
- **THEN** playlist dosyası güncellenir
- **AND** eski dosya yolu yeni dosya yolu ile değiştirilir

#### Scenario: Toplu fix uygulama
- **WHEN** kullanıcı birden fazla öneriyi seçer
- **THEN** tüm seçili fix'ler toplu olarak uygulanır
- **AND** işlem durumu gösterilir
