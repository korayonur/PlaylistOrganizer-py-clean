# UI Interaction Migration Spec

## ADDED Requirements

### Requirement: Desktop Application Interface
Sistem SHALL native desktop uygulaması olarak çalışmalıdır.

#### Scenario: Main window layout
- **WHEN** uygulama başlatıldığında
- **THEN** 3-panel layout gösterilir (sidebar, stats, main content)
- **AND** playlist tree sol panelde görünür
- **AND** track listesi sağ panelde görünür
- **AND** istatistikler üst panelde gösterilir

#### Scenario: Native file operations
- **WHEN** kullanıcı import yapmak istediğinde
- **THEN** native file dialog açılır
- **AND** M3U ve VDJFolder dosyaları seçilebilir
- **AND** drag & drop desteği sağlanır

### Requirement: Advanced Search Interface
Sistem SHALL gelişmiş arama özellikleri sunmalıdır.

#### Scenario: Multi-search dialog
- **WHEN** kullanıcı advanced search açtığında
- **THEN** multi-criteria search dialog gösterilir
- **AND** playlist, track, path araması yapılabilir
- **AND** filter options sunulur
- **AND** sonuçlar highlight edilir

#### Scenario: Real-time search
- **WHEN** kullanıcı search box'a metin girer
- **THEN** real-time arama sonuçları gösterilir
- **AND** tree view filtrelenir
- **AND** performance optimize edilir

### Requirement: Track Management Interface
Sistem SHALL track yönetimi için gelişmiş UI sunmalıdır.

#### Scenario: Track grid with actions
- **WHEN** playlist seçildiğinde
- **THEN** track grid görüntülenir
- **AND** her track için action buttons gösterilir
- **AND** track status (Found/Missing) renklerle belirtilir
- **AND** bulk operations desteklenir

#### Scenario: Fix suggestions interface
- **WHEN** missing track'ler bulunduğunda
- **THEN** fix suggestions dialog açılır
- **AND** alternatif dosya önerileri gösterilir
- **AND** kullanıcı accept/reject yapabilir
- **AND** batch fix operations desteklenir

## MODIFIED Requirements

### Requirement: Playlist Track Display
Sistem SHALL TreeView'da bir playlist seçildiğinde track'leri görüntülemelidir.

#### Scenario: Enhanced desktop playlist selection
- **WHEN** kullanıcı TreeView'da bir playlist'e tıklar
- **THEN** seçilen playlist'in track'leri ana içerik alanında yüklenir
- **AND** track'ler desktop-optimized grid'de görüntülenir
- **AND** context menu ile additional actions sunulur
- **AND** keyboard shortcuts desteklenir
- **AND** loading states gösterilir

#### Scenario: Desktop track information display
- **WHEN** playlist track'leri yüklendiğinde
- **THEN** her track için dosya adı, tam yol ve durumu gösterilir
- **AND** track'ler desktop-friendly sıralama ile listelenir
- **AND** eksik track'ler kırmızı renkle vurgulanır
- **AND** bulunan track'ler yeşil renkle gösterilir
- **AND** tooltip'ler ile additional info sunulur
