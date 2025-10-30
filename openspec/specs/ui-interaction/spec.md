# UI Interaction - Avalonia

## Purpose

Playlist Organizer Avalonia uygulamasında kullanıcı etkileşimleri ve UI işlevselliği.

## Requirements

### Requirement: Playlist Track Display

Sistem, TreeView'da bir playlist seçildiğinde track'leri görüntülemelidir.

#### Scenario: Kullanıcı playlist seçer

- **WHEN** kullanıcı TreeView'da bir playlist'e tıklar
- **THEN** seçilen playlist'in track'leri ana içerik alanında yüklenir ve görüntülenir
- **AND** track listesi dosya adı, yol ve durum bilgilerini gösterir

#### Scenario: Track durumu gösterimi

- **WHEN** playlist track'leri yüklendiğinde
- **THEN** her track için durumu (Found/Missing/Updated) gösterilir
- **AND** durum uygun renkler ve ikonlarla belirtilir

### Requirement: Track Information Display

Sistem, seçilen playlist'ler için kapsamlı track bilgileri göstermelidir.

#### Scenario: Track detayları görünümü

- **WHEN** bir playlist seçildiğinde
- **THEN** track listesi dosya adı, tam yol ve durumu gösterir
- **AND** track'ler dosya adına göre alfabetik olarak sıralanır
- **AND** eksik track'ler uygun şekilde vurgulanır

#### Scenario: Track durumu doğrulama

- **WHEN** track'ler yüklendiğinde
- **THEN** sistem her track dosyasının diskte var olup olmadığını kontrol eder
- **AND** track durumunu buna göre günceller (Found/Missing)
- **AND** gerçek zamanlı durum bilgilerini görüntüler

### Requirement: Playlist Selection Integration

Mevcut playlist seçim işlevselliği track bilgilerini yüklemek ve görüntülemek için geliştirilmelidir.

#### Scenario: Gelişmiş playlist seçimi

- **WHEN** SelectedPlaylist property'si değiştiğinde
- **THEN** LoadTracksForPlaylistAsync metodu otomatik olarak çağrılır
- **AND** Tracks collection'ı yeni playlist'in track'leri ile güncellenir
- **AND** UI mevcut track sayısını ve durumunu yansıtır
