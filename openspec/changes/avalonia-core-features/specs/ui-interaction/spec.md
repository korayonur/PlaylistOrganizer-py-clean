# UI Interaction Spec Updates

## ADDED Requirements

### Requirement: Import Functionality
Sistem SHALL M3U ve VDJFolder dosyalarını import edebilmelidir.

#### Scenario: M3U file import
- **WHEN** kullanıcı M3U dosyası seçer
- **THEN** sistem dosyayı parse eder
- **AND** playlist ve track'leri database'e kaydeder
- **AND** import progress'ini gösterir

#### Scenario: VDJFolder import
- **WHEN** kullanıcı VDJFolder dizini seçer
- **THEN** sistem klasör yapısını analiz eder
- **AND** hierarchical playlist yapısı oluşturur
- **AND** track'leri otomatik olarak bağlar

### Requirement: Search Functionality
Sistem SHALL playlist ve track'lerde arama yapabilmelidir.

#### Scenario: Playlist search
- **WHEN** kullanıcı search box'a metin girer
- **THEN** sistem playlist isimlerinde arama yapar
- **AND** eşleşen playlist'leri filtreler
- **AND** sonuçları real-time gösterir

#### Scenario: Track search
- **WHEN** kullanıcı track arama yapar
- **THEN** sistem filename ve path'lerde arama yapar
- **AND** eşleşen track'leri highlight eder
- **AND** parent playlist'leri gösterir

### Requirement: Track Validation
Sistem SHALL track dosyalarının varlığını kontrol edebilmelidir.

#### Scenario: File existence check
- **WHEN** track'ler yüklendiğinde
- **THEN** sistem her dosyanın diskte var olup olmadığını kontrol eder
- **AND** track status'unu Found/Missing olarak günceller
- **AND** UI'da durumu renklerle gösterir

#### Scenario: Batch validation
- **WHEN** kullanıcı "Validate All" butonuna tıklar
- **THEN** sistem tüm track'leri toplu olarak kontrol eder
- **AND** progress bar ile ilerlemeyi gösterir
- **AND** sonuçları rapor olarak sunar

## MODIFIED Requirements

### Requirement: Playlist Track Display
Sistem SHALL TreeView'da bir playlist seçildiğinde track'leri görüntülemelidir.

#### Scenario: Enhanced playlist selection
- **WHEN** kullanıcı TreeView'da bir playlist'e tıklar
- **THEN** seçilen playlist'in track'leri ana içerik alanında yüklenir
- **AND** track'ler dosya varlığı kontrolü ile birlikte görüntülenir
- **AND** loading state gösterilir
- **AND** track durumları (Found/Missing) renklerle belirtilir

#### Scenario: Track information display
- **WHEN** playlist track'leri yüklendiğinde
- **THEN** her track için dosya adı, tam yol ve durumu gösterilir
- **AND** track'ler dosya adına göre alfabetik olarak sıralanır
- **AND** eksik track'ler kırmızı renkle vurgulanır
- **AND** bulunan track'ler yeşil renkle gösterilir
