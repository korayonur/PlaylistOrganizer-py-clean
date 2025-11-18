# 🎵 Playlist Organizer - Desktop Application

**Version:** 2.0 (Avalonia Desktop App)  
**Last Update:** 30 Ekim 2025  
**Status:** 🚧 Active Development

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
  - SQLite database for tracks and playlists
  - JSON cache for tree structure
  - File system scanning
  - Lazy loading of track details

### 🚧 Planned Features (Not Yet Implemented)

- **🔧 Fix System**

  - Automatic track path correction
  - Batch rename operations
  - Missing file recovery suggestions
  - Duplicate detection and removal

- **💳 Payment System**
  - License management
  - Subscription handling
  - Payment gateway integration
  - User account management

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
- **DatabaseManager:** SQLite database operations

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

## 📊 Database

**Location:** `apps/avalonia/PlaylistOrganizerAvalonia/playlistorganizer.db`

**Schema:** Flat denormalized structure optimized for desktop app performance

**Tables:**

- `playlists` - Playlist metadata
- `tracks` - Track information with file paths
- `music_files` - Physical music files on disk

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

- **.NET 9.0** - Runtime and framework
- **Avalonia UI** - Cross-platform UI framework
- **SQLite** - Embedded database
- **Dapper** - Lightweight ORM
- **System.Text.Json** - JSON serialization
- **Microsoft.Extensions.Logging** - Logging framework

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

### Phase 2: Fix System 🚧 (Planlandı)

**Tahmini Süre (GenAI Destekli):** ~10-15 saat (1.5-2 gün)  
**Tahmini Süre (Geleneksel):** ~18-25 saat (2.5-3 gün)  
**Başlangıç:** Phase 1 tamamlandıktan sonra  
**Tahmini Bitiş:** 1-2 hafta içinde

- [ ] Automatic path correction (~4-6 saat)
  - Fuzzy path matching algoritması
  - Dosya sistemi tarama ve eşleştirme
  - Otomatik düzeltme önerileri

- [ ] Batch operations (~3-4 saat)
  - Toplu path düzeltme
  - Toplu silme/taşıma işlemleri
  - Progress tracking

- [ ] Duplicate detection (~4-6 saat)
  - Hash-based duplicate detection
  - Similarity matching
  - Duplicate removal UI

- [ ] File recovery suggestions (~2-3 saat)
  - Missing file için alternatif path önerileri
  - Dosya adı benzerliği analizi
  - Kullanıcı onayı ile otomatik düzeltme

- [ ] Undo/Redo support (~3-4 saat)
  - Command pattern implementation
  - Action history management
  - UI integration

### Phase 3: Payment & Licensing 🚧 (Planlandı)

**Tahmini Süre (GenAI Destekli):** ~20-30 saat (2.5-3.5 gün)  
**Tahmini Süre (Geleneksel):** ~35-50 saat (4.5-6 gün)  
**Başlangıç:** Phase 2 tamamlandıktan sonra  
**Tahmini Bitiş:** 2-3 hafta içinde

- [ ] License key management (~6-8 saat)
  - License key generation ve validation
  - Local license storage
  - License activation/deactivation

- [ ] Subscription system (~8-12 saat)
  - Subscription plan management
  - Trial period handling
  - Feature gating based on subscription

- [ ] Payment gateway integration (~8-12 saat)
  - Stripe/PayPal integration
  - Payment processing
  - Receipt generation

- [ ] User authentication (~4-6 saat)
  - User registration/login
  - Session management
  - Password reset flow

- [ ] Cloud sync (optional) (~12-16 saat)
  - Cloud storage integration (Dropbox/Google Drive)
  - Sync conflict resolution
  - Offline mode support

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

## ⏱️ Proje Tamamlanma Tahmini

**Toplam Tahmini Süre (GenAI Destekli):** ~67-93 saat (8-12 gün, günde 8 saat çalışma ile)  
**Toplam Tahmini Süre (Geleneksel):** ~113-155 saat (14-19 gün, günde 8 saat çalışma ile)  
**Tasarruf (GenAI ile):** ~46-62 saat (%40-50 daha hızlı)

**Gerçekçi Tamamlanma Tarihi (GenAI Destekli):**
- **Minimum (yoğun çalışma):** 1.5-2 hafta
- **Ortalama (normal tempo):** 2-3 hafta
- **Maksimum (part-time çalışma):** 4-5 hafta

**Gerçekçi Tamamlanma Tarihi (Geleneksel):**
- **Minimum (yoğun çalışma):** 2-3 hafta
- **Ortalama (normal tempo):** 3-4 hafta
- **Maksimum (part-time çalışma):** 6-8 hafta

**Not:** GenAI destekli geliştirme (Cursor IDE) ile bu süreler geleneksel yöntemlere göre %40-50 daha hızlıdır. Test, debugging ve kullanıcı geri bildirimleri süreleri etkileyebilir.

**Öncelik Sırası:**
1. ✅ Phase 1: Core Features (Tamamlandı)
2. 🚧 Phase 2: Fix System (Yüksek öncelik - kullanıcı değeri yüksek)
3. 🚧 Phase 3: Payment & Licensing (Orta öncelik - monetization için gerekli)
4. 📋 Phase 4: Advanced Features (Düşük öncelik - nice-to-have)

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

- Fix system not yet implemented
- Payment system not yet implemented
- No cloud sync capability
- Limited to local file system
- No playlist editing (view-only)

## 📝 Migration Note

**Legacy System:** The old Node.js API + Angular frontend in `apps/old-nodejs-api/` is deprecated and no longer maintained. The project has fully migrated to the Avalonia desktop application.

## 📖 Documentation

- **OpenSpec:** `openspec/` - Specification-driven development
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
