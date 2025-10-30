# Clean Architecture - .NET MAUI Mac

## Amaç
Playlist Organizer için temiz, sürdürülebilir ve test edilebilir mimari tasarım.

## Mimari Katmanları

### Gereksinim: Domain Katmanı
En içteki katman, iş mantığını içermelidir.

#### Senaryo: Domain entities
- WHEN domain modeli tasarlandığında
- THEN Playlist, Track, User gibi core entities olmalıdır
- AND business rules bu katmanda olmalıdır

#### Senaryo: Domain services
- WHEN iş mantığı gerektiğinde
- THEN domain services kullanılmalıdır
- AND external dependencies olmamalıdır

### Gereksinim: Application Katmanı
Use case'leri ve application services'leri içermelidir.

#### Senaryo: Use cases
- WHEN bir işlem yapıldığında
- THEN ilgili use case çalışmalıdır
- AND CQRS pattern uygulanmalıdır

#### Senaryo: Application services
- WHEN complex business logic gerektiğinde
- THEN application services kullanılmalıdır
- AND domain katmanına bağımlı olmalıdır

### Gereksinim: Infrastructure Katmanı
External concerns'leri handle etmelidir.

#### Senaryo: Data access
- WHEN veri erişimi gerektiğinde
- THEN repository pattern kullanılmalıdır
- AND Entity Framework Core kullanılmalıdır

#### Senaryo: External services
- WHEN external API'ler gerektiğinde
- THEN HTTP client services kullanılmalıdır
- AND configuration ile yönetilmelidir

### Gereksinim: Presentation Katmanı
UI ve user interaction'ları handle etmelidir.

#### Senaryo: MVVM implementation
- WHEN UI geliştirildiğinde
- THEN ViewModels kullanılmalıdır
- AND Data binding uygulanmalıdır

#### Senaryo: Navigation
- WHEN sayfa geçişleri gerektiğinde
- THEN MAUI navigation kullanılmalıdır
- AND Shell navigation uygulanmalıdır

## Dependency Rules

### Gereksinim: Dependency Inversion
Katmanlar arası bağımlılıklar interface'ler üzerinden olmalıdır.

#### Senaryo: Interface segregation
- WHEN katmanlar arası iletişim gerektiğinde
- THEN interface'ler kullanılmalıdır
- AND concrete implementations inject edilmelidir

### Gereksinim: SOLID Principles
Tüm kod SOLID prensiplerine uygun olmalıdır.

#### Senaryo: Single Responsibility
- WHEN bir class yazıldığında
- THEN tek bir sorumluluğu olmalıdır
- AND değişim nedeni tek olmalıdır

#### Senaryo: Open/Closed Principle
- WHEN yeni özellik eklendiğinde
- THEN mevcut kodu değiştirmeden genişletilebilmelidir
- AND interface'ler kullanılmalıdır
