# 🎵 Playlist Organizer - Desktop Application

**Version:** 2.0 (Avalonia Desktop App)  
**Last Update:** 19 Kasım 2025  
**Status:** 🚧 Active Development (Phase 2: Fix System)

## 📋 Overview

Modern, cross-platform desktop application for managing music playlists and tracks. Built with Avalonia UI framework for Windows, macOS, and Linux support.

**Current Focus:** Desktop-first experience with advanced playlist management, track search, and missing file detection.

## 🏗️ Project Structure

```
PlaylistOrganizer-py-backup/
├── apps/
│   ├── avalonia/                    # Avalonia Desktop App (Active)
│   │   └── PlaylistOrganizerAvalonia/
│   │       ├── Application/          # Business logic & services
│   │       │   ├── Models/           # Data models
│   │       │   └── Services/        # PlaylistTreeService, VDJFolderParser, etc.
│   │       ├── Domain/               # Domain entities & enums
│   │       ├── Infrastructure/       # Database, file system, logging
│   │       ├── ViewModels/           # MVVM view models
│   │       └── Views/                # Avalonia UI views
│   └── old-nodejs-api/              # Legacy Node.js + Angular (Deprecated)
├── data/                            # Application data & cache
│   └── playlist-tree.json          # Playlist tree cache
├── docs/                           # Documentation
├── openspec/                       # Specification-driven development
└── PlaylistOrganizer.code-workspace # VS Code workspace
```

## 🚀 Quick Start

### Prerequisites

- .NET 9.0 SDK or later
- SQLite3 (usually included with .NET)

### Running the Application

```bash
cd apps/avalonia/PlaylistOrganizerAvalonia
dotnet run
```

### Building for Production

```bash
# Windows
dotnet publish -c Release -r win-x64 --self-contained

# macOS
dotnet publish -c Release -r osx-x64 --self-contained

# Linux
dotnet publish -c Release -r linux-x64 --self-contained
```

## ✨ Current Features

### ✅ Implemented Features

- **📁 Playlist Management**

  - VirtualDJ folder structure support (`.vdjfolder` files)
  - M3U/M3U8 playlist support
  - Hierarchical tree view with folder navigation
  - Playlist track count tracking
  - Empty playlist filtering

- **🔍 Track Search & Discovery**

  - File system-based track loading
  - Missing track detection
  - Track status tracking (Found/Missing)
  - Real-time file existence checking

- **🌳 Tree View**

  - Hierarchical playlist structure
  - Expandable/collapsible folders
  - Alphabetical sorting (case-insensitive)
  - JSON cache for fast loading (`data/playlist-tree.json`)
  - Manual refresh capability

- **📊 Statistics**

  - Total playlists count
  - Total tracks count
  - Found tracks count
  - Missing tracks count
  - Per-playlist statistics

- **🎯 Filtering**

  - Filter playlists containing missing tracks
  - Hide empty playlists (0 tracks)
  - Recursive folder filtering

- **💾 Data Management**

  - File system-based (veritabanı kaldırıldı)
  - JSON cache for tree structure (`data/playlist-tree.json`)
  - JSON + Memory Cache arama indexi (`word-index.json`)
  - File system scanning
  - Lazy loading of track details

- **🔍 Advanced Search System** ✅ (Yeni - 19 Kasım 2025)

  - JSON + Memory Cache tabanlı arama sistemi
  - Tam eşleşme araması (normalize edilmiş dosya isimleri)
  - Benzerlik araması (hibrit algoritma: kelime + harf bazlı)
  - Geliştirilmiş puanlama sistemi (query coverage öncelikli)
  - 42,000+ dosya için 10-200ms arama süresi
  - Kısa kelime desteği (arama kalitesi için)

- **🔧 Fix Suggestions System** ✅ (Kısmen Tamamlandı - 19 Kasım 2025)

  - Eksik track'ler için fix önerileri
  - Benzer dosya adlarına göre arama
  - Confidence skoru ile sıralama
  - Tek tek fix uygulama
  - Playlist dosyalarını direkt güncelleme (VDJFolder, M3U)
  - UI otomatik güncelleme (track düzeltildiğinde)

### 🚧 Planned Features (Not Yet Implemented)

- **🔧 Fix System (Devam Ediyor)**

  - ✅ Tek tek fix önerileri (Tamamlandı)
  - ❌ Toplu fix işlemi (Yapılacak)
  - ❌ Filtrede sadece eksik dosya unique gösterim (Yapılacak)
  - ❌ Batch operations (Yapılacak)
  - ❌ Duplicate detection and removal (Yapılacak)

- **💳 Payment & Licensing System**

  - ❌ Ödeme linki entegrasyonu (Stripe/PayPal link)
  - ❌ Manuel lisans verme sistemi
  - ❌ License key generation ve validation
  - ❌ Local license storage
  - ❌ Feature gating based on license

- **📦 Build & Distribution**

  - ❌ Mac build ve test
  - ❌ Windows build ve test
  - ❌ Test dağıtımı (beta testers)
  - ❌ Auto-update sistemi

## 🎯 Architecture

### MVVM Pattern

The application follows Model-View-ViewModel (MVVM) architecture:

- **Models:** Domain entities (`Playlist`, `Track`, `PlaylistTree`)
- **Views:** Avalonia XAML UI definitions
- **ViewModels:** Business logic and UI state management (`MainWindowViewModel`)
- **Services:** Application services (`PlaylistTreeService`, `VDJFolderParserService`, `M3UParserService`)

### Key Services

- **PlaylistTreeService:** Builds and caches playlist tree from file system
- **VDJFolderParserService:** Parses VirtualDJ `.vdjfolder` files
- **M3UParserService:** Parses M3U/M3U8 playlist files
- **FileScannerService:** Scans file system for playlist files
- **JsonWordIndexService:** JSON + Memory Cache arama servisi
- **HybridSimilarityCalculator:** Benzerlik skoru hesaplama (kelime + harf bazlı)
- **TrackFixService:** Fix önerileri ve playlist güncelleme
- **StringNormalizationService:** Dosya isimlerini normalize etme

### Data Flow

1. **Tree Loading:**

   - Check JSON cache (`data/playlist-tree.json`)
   - If cache missing/invalid, scan file system
   - Parse playlist files and build hierarchical tree
   - Save to cache for next launch

2. **Track Loading:**

   - User selects playlist
   - Parse playlist file (`.vdjfolder` or `.m3u`)
   - Check file existence for each track
   - Display tracks with status (Found/Missing)

3. **Filtering:**
   - Scan all playlists for missing tracks
   - Build filtered tree showing only playlists with missing tracks
   - Recursively filter parent folders

## 📊 Data Storage

**Veritabanı:** ❌ Kaldırıldı (19 Kasım 2025) - Artık dosya sistemi tabanlı çalışıyor

**JSON Cache:**

- `data/playlist-tree.json` - Playlist tree cache
- `word-index.json` - Arama indexi (42,000+ dosya için)

**Dosya Sistemi:**

- Playlist dosyaları direkt okunuyor (`.vdjfolder`, `.m3u`)
- Track bilgileri playlist dosyalarından parse ediliyor
- Fix işlemleri playlist dosyalarını direkt güncelliyor

## 🛠️ Development

### Project Structure

```
PlaylistOrganizerAvalonia/
├── Application/
│   ├── Models/              # Data transfer objects
│   └── Services/            # Business logic services
├── Domain/
│   ├── Entities/            # Domain entities
│   └── Enums/               # Enumerations
├── Infrastructure/
│   ├── Database/            # Database schema & migrations
│   └── Services/            # Infrastructure services
├── ViewModels/              # MVVM view models
└── Views/                   # Avalonia XAML views
```

### Key Technologies

- **.NET 10.0** - Runtime and framework
- **Avalonia UI** - Cross-platform UI framework
- **System.Text.Json** - JSON serialization
- **Microsoft.Extensions.Logging** - Logging framework
- **HashSet<string>** - O(1) lookup için memory cache

## 📈 Roadmap

> **Development Speed:** Bu proje Cursor IDE ve GenAI modeli kullanılarak geliştirilmektedir. Geleneksel yazılım geliştirme sürelerinden çok daha hızlı ilerlemektedir.

### Phase 1: Core Features ✅ (Tamamlandı)

**Süre (GenAI Destekli):** ~25-30 saat (3-4 gün)  
**Süre (Geleneksel):** ~40-50 saat (5-6 gün)  
**Durum:** ✅ Tamamlandı

- [x] Playlist tree view (~8 saat)
- [x] Track loading and display (~6 saat)
- [x] Missing track detection (~8 saat)
- [x] File system scanning (~6 saat)
- [x] JSON cache system (~4 saat)
- [x] Alphabetical sorting (~3 saat)
- [x] Filtering system (~5 saat)

### Phase 2: Fix System 🚧 (Devam Ediyor - %40 Tamamlandı)

**Başlangıç:** 30 Ekim 2025  
**Durum:** 🚧 Aktif Geliştirme  
**Tamamlanan:** Tek tek fix önerileri ve uygulama  
**Kalan:** Toplu fix, unique gösterim, build & test

**Tamamlanan Özellikler:**

- ✅ JSON + Memory Cache arama sistemi (~8 saat)
- ✅ Fix önerileri sistemi (~6 saat)
- ✅ Tek tek fix uygulama (~4 saat)
- ✅ Playlist dosyalarını direkt güncelleme (~3 saat)
- ✅ Geliştirilmiş puanlama sistemi (~2 saat)

**Yapılacak Özellikler:**

- [ ] **Toplu Fix İşlemi** (~4-6 saat)

  - Tüm eksik track'leri toplu olarak düzeltme
  - Progress tracking ve cancel desteği
  - Batch fix UI (seçili track'ler için)
  - Success/failure raporlama

- [ ] **Unique Gösterim** (~2-3 saat)

  - Filtrede sadece eksik dosya unique gösterim
  - Aynı dosya birden fazla playlist'te varsa tek gösterim
  - Toplu fix için seçim yapılabilir liste

- [ ] **Build & Test** (~4-6 saat)

  - Mac build ve test
  - Windows build ve test
  - Cross-platform test senaryoları
  - Build otomasyonu

- [ ] **Test Dağıtımı** (~2-3 saat)
  - Beta testers için dağıtım hazırlığı
  - Installer oluşturma (Mac/Windows)
  - Test senaryoları dokümantasyonu

### Phase 3: Payment & Licensing 🚧 (Planlandı)

**Tahmini Süre (GenAI Destekli):** ~12-18 saat (1.5-2.5 gün)  
**Tahmini Süre (Geleneksel):** ~20-30 saat (2.5-4 gün)  
**Başlangıç:** Phase 2 tamamlandıktan sonra  
**Yaklaşım:** Link ile ödeme + Manuel lisans verme (basitleştirilmiş)

**Yapılacak Özellikler:**

- [ ] **Ödeme Linki Entegrasyonu** (~4-6 saat)

  - Stripe/PayPal payment link oluşturma
  - Ödeme tamamlandığında webhook/email bildirimi
  - Ödeme durumu takibi

- [ ] **Manuel Lisans Verme Sistemi** (~4-6 saat)

  - Ödeme tamamlandıktan sonra manuel lisans key oluşturma
  - Lisans key generation (unique, güvenli)
  - Email ile lisans key gönderme
  - Lisans key validation sistemi

- [ ] **License Management** (~3-4 saat)

  - Local license storage (encrypted)
  - License activation/deactivation
  - License expiration kontrolü
  - Feature gating based on license

- [ ] **UI Integration** (~1-2 saat)
  - License activation dialog
  - Payment link butonu
  - License status gösterimi
  - Feature unlock/lock mekanizması

### Phase 4: Advanced Features 📋 (Gelecek)

**Tahmini Süre (GenAI Destekli):** ~12-18 saat (1.5-2.5 gün)  
**Tahmini Süre (Geleneksel):** ~20-30 saat (2.5-4 gün)  
**Başlangıç:** Phase 3 tamamlandıktan sonra  
**Tahmini Bitiş:** 3-4 hafta içinde

- [ ] Playlist editing (~4-6 saat)

  - Drag & drop track reordering
  - Add/remove tracks
  - Playlist metadata editing

- [ ] Track metadata editing (~3-4 saat)

  - ID3 tag editing
  - Batch metadata updates
  - Metadata validation

- [ ] Export/Import functionality (~4-6 saat)

  - Export to M3U/VirtualDJ format
  - Import from various formats
  - Format conversion

- [ ] Backup and restore (~3-4 saat)

  - Automatic backup scheduling
  - Manual backup/restore
  - Backup file management

- [ ] Multi-language support (~6-8 saat)
  - i18n implementation
  - Language switching
  - Translation management

## 📅 Proje Takvimi ve İlerleme

### 📊 Genel Durum

**Proje Başlangıç:** 30 Ekim 2025  
**Son Güncelleme:** 19 Kasım 2025  
**Geçen Süre:** ~20 gün  
**GenAI Destekli Geliştirme:** ✅ Aktif (Cursor IDE)

### ⏱️ Tamamlanma Tahmini (GenAI Destekli)

**Phase 2 (Kalan İşler):** ~12-18 saat (1.5-2.5 gün)

- Toplu fix işlemi: 4-6 saat
- Unique gösterim: 2-3 saat
- Build & test: 4-6 saat
- Test dağıtımı: 2-3 saat

**Phase 3 (Payment & Licensing):** ~12-18 saat (1.5-2.5 gün)

- Ödeme linki entegrasyonu: 4-6 saat
- Manuel lisans verme: 4-6 saat
- License management: 3-4 saat
- UI integration: 1-2 saat

**Toplam Kalan Süre:** ~24-36 saat (3-4.5 gün, günde 8 saat çalışma ile)

### 📈 İlerleme Durumu

| Phase                        | Durum           | Tamamlanma | Kalan Süre | Tahmini Bitiş    |
| ---------------------------- | --------------- | ---------- | ---------- | ---------------- |
| Phase 1: Core Features       | ✅ Tamamlandı   | 100%       | -          | 30 Ekim 2025     |
| Phase 2: Fix System          | 🚧 Devam Ediyor | ~40%       | 12-18 saat | 21-22 Kasım 2025 |
| Phase 3: Payment & Licensing | 📋 Planlandı    | 0%         | 12-18 saat | 23-24 Kasım 2025 |
| Phase 4: Advanced Features   | 📋 Gelecek      | 0%         | -          | -                |

### 🎯 Tahmini Bitiş Tarihi

**GenAI Destekli (Günde 8 saat çalışma ile):**

- **Minimum (yoğun çalışma):** 21-22 Kasım 2025 (2-3 gün)
- **Ortalama (normal tempo):** 23-24 Kasım 2025 (4-5 gün)
- **Maksimum (part-time çalışma):** 27-28 Kasım 2025 (8-9 gün)

**Not:** Bu tahminler Phase 2 ve Phase 3 için geçerlidir. Phase 4 (Advanced Features) ayrı planlanacaktır.

### 📝 Yapılacak Ana Maddeler (Öncelik Sırasına Göre)

#### 🔴 Yüksek Öncelik (Phase 2 - Devam Ediyor)

1. **Toplu Fix İşlemi** (~4-6 saat)

   - Tüm eksik track'leri toplu olarak düzeltme
   - Progress tracking ve cancel desteği
   - Batch fix UI
   - Success/failure raporlama

2. **Unique Gösterim** (~2-3 saat)

   - Filtrede sadece eksik dosya unique gösterim
   - Aynı dosya birden fazla playlist'te varsa tek gösterim
   - Toplu fix için seçim yapılabilir liste

3. **Build & Test** (~4-6 saat)

   - Mac build ve test
   - Windows build ve test
   - Cross-platform test senaryoları

4. **Test Dağıtımı** (~2-3 saat)
   - Beta testers için dağıtım hazırlığı
   - Installer oluşturma (Mac/Windows)

#### 🟡 Orta Öncelik (Phase 3 - Planlandı)

5. **Ödeme Linki Entegrasyonu** (~4-6 saat)

   - Stripe/PayPal payment link
   - Webhook/email bildirimi

6. **Manuel Lisans Verme** (~4-6 saat)

   - Lisans key generation
   - Email ile lisans gönderme

7. **License Management** (~3-4 saat)
   - Local license storage
   - Feature gating

#### 🟢 Düşük Öncelik (Phase 4 - Gelecek)

8. Playlist editing
9. Track metadata editing
10. Export/Import functionality
11. Multi-language support

### 💡 Önemli Notlar

- **GenAI Tasarrufu:** Geleneksel yöntemlere göre %40-50 daha hızlı
- **Test Süresi:** Build ve test süreleri tahminlere dahil
- **Beklenmedik Durumlar:** Debugging ve kullanıcı geri bildirimleri süreleri etkileyebilir
- **Ödeme Modeli:** Basitleştirilmiş yaklaşım (link + manuel lisans) ile süre kısaldı

## 💡 Marketing Strategy Recommendations

### Target Audience

1. **DJs & Music Professionals**

   - VirtualDJ users managing large music libraries
   - Need to track missing files and organize playlists
   - Value: Time-saving, reliability

2. **Music Enthusiasts**

   - Large personal music collections
   - Multiple playlist formats (M3U, VirtualDJ)
   - Value: Organization, discovery

3. **Music Libraries & Collections**
   - Radio stations, clubs, venues
   - Need centralized playlist management
   - Value: Professional tools, bulk operations

### Pricing Strategy

**Freemium Model:**

- **Free Tier:**

  - Basic playlist viewing
  - Missing track detection (limited to 100 playlists)
  - Community support

- **Pro Tier ($9.99/month or $99/year):**

  - Unlimited playlists
  - Advanced filtering
  - Fix system (automatic corrections)
  - Priority support
  - Cloud backup

- **Enterprise Tier (Custom pricing):**
  - Multi-user licenses
  - API access
  - Custom integrations
  - Dedicated support

### Marketing Channels

1. **Content Marketing**

   - Blog posts about playlist management
   - YouTube tutorials for DJs
   - Case studies from music professionals

2. **Community Building**

   - Discord/Slack community
   - User forums
   - Feature request voting

3. **Partnerships**

   - VirtualDJ plugin marketplace
   - Music software review sites
   - DJ equipment retailers

4. **Social Media**

   - Twitter/X for updates
   - Instagram for visual content
   - LinkedIn for B2B outreach

5. **Product Hunt Launch**
   - Launch on Product Hunt
   - Engage with early adopters
   - Collect feedback and testimonials

### Go-to-Market Strategy

**Phase 1: Beta Launch (Months 1-2)**

- Invite-only beta with 50-100 users
- Collect feedback and fix critical issues
- Build case studies and testimonials

**Phase 2: Public Launch (Month 3)**

- Product Hunt launch
- Free tier available
- Content marketing campaign
- Social media presence

**Phase 3: Growth (Months 4-6)**

- Paid tier launch
- Partnership development
- Community building
- Feature expansion based on feedback

**Phase 4: Scale (Months 7-12)**

- Enterprise features
- API development
- International expansion
- Advanced features (fix system, cloud sync)

## 🐛 Known Limitations

- ✅ Fix system kısmen tamamlandı (tek tek fix var, toplu fix yok)
- ❌ Payment system not yet implemented
- ❌ No cloud sync capability
- ✅ Limited to local file system (by design)
- ❌ No playlist editing (view-only)
- ❌ Mac/Windows build not yet tested
- ❌ No auto-update system

## 📝 Migration Note

**Legacy System:** The old Node.js API + Angular frontend in `apps/old-nodejs-api/` is deprecated and no longer maintained. The project has fully migrated to the Avalonia desktop application.

## 📖 Documentation

- **OpenSpec:** `openspec/` - Specification-driven development
- **Search System:** `apps/avalonia/PlaylistOrganizerAvalonia/SEARCH_SYSTEM.md` - Arama sistemi dokümantasyonu
- **Migration Plans:** `docs/current/` - Current migration plans
- **Avalonia Migration:** `openspec/changes/api-to-avalonia-migration/`

## 🤝 Contributing

This is currently a private project. Contributions and feedback are welcome through issues and discussions.

## 🔒 License

MIT (or specify your license)

## 👤 Author

Koray

## 🎉 Acknowledgments

Built with:

- Clean Architecture principles
- MVVM pattern
- Modern .NET best practices
- Avalonia UI framework

---

**Note:** This project is actively under development. Features marked as "Planned" are not yet implemented but are on the roadmap.
