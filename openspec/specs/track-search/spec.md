# Parça Arama Yeteneği

## Gereksinimler

### Requirement: Kelime Tabanlı Arama
Sistem parçaları kelime tabanlı olarak arayabilmelidir.

#### Scenario: Temel arama
- **WHEN** kullanıcı arama kutusuna kelime girer
- **THEN** eşleşen parçalar listelenir
- **AND** arama sonuçları gerçek zamanlı güncellenir

#### Scenario: Türkçe karakter desteği
- **WHEN** kullanıcı "şarkı" yazar
- **THEN** "sarki" içeren parçalar da bulunur
- **AND** büyük/küçük harf duyarsız arama yapılır

### Requirement: Benzerlik Skorlaması
Sistem arama sonuçlarını benzerlik skoruna göre sıralamalıdır.

#### Scenario: Skor tabanlı sıralama
- **WHEN** arama sonuçları döndürülür
- **THEN** en yüksek skorlu eşleşmeler önce gösterilir
- **AND** skor değeri görünür

#### Scenario: Çoklu kelime arama
- **WHEN** kullanıcı "müzik rock" yazar
- **THEN** hem "müzik" hem "rock" içeren parçalar öncelikli gösterilir

### Requirement: Arama Geçmişi
Sistem kullanıcının arama geçmişini tutmalıdır.

#### Scenario: Geçmiş aramalar
- **WHEN** kullanıcı daha önce arama yapmış
- **THEN** son aramalar öneri olarak gösterilir
- **AND** kullanıcı geçmiş aramaları seçebilir
