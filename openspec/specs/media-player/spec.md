# Medya Oynatıcı Yeteneği

## Gereksinimler

### Requirement: Parça Oynatma
Sistem müzik parçalarını oynatabilmelidir.

#### Scenario: Temel oynatma
- **WHEN** kullanıcı bir parçaya çift tıklar
- **THEN** parça oynatılmaya başlar
- **AND** oynatma kontrolleri görünür

#### Scenario: Oynatma kontrolleri
- **WHEN** parça oynatılırken
- **THEN** play/pause butonu görünür
- **AND** ses seviyesi kontrolü mevcut
- **AND** ileri/geri sarma butonları çalışır

### Requirement: Oynatma Kuyruğu
Sistem birden fazla parçayı sırayla oynatabilmelidir.

#### Scenario: Kuyruğa ekleme
- **WHEN** kullanıcı parçaya sağ tıklar
- **THEN** "Kuyruğa Ekle" seçeneği görünür
- **AND** parça oynatma kuyruğuna eklenir

#### Scenario: Sıralı oynatma
- **WHEN** kuyrukta birden fazla parça varsa
- **THEN** parçalar sırayla oynatılır
- **AND** otomatik geçiş yapılır

### Requirement: Oynatma Geçmişi
Sistem oynatılan parçaların geçmişini tutmalıdır.

#### Scenario: Geçmiş kaydetme
- **WHEN** parça oynatılır
- **THEN** oynatma geçmişine eklenir
- **AND** oynatma zamanı kaydedilir
