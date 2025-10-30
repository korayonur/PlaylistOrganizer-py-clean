# API to Avalonia Migration Proposal

## Why
Mevcut Node.js API + Angular Frontend projesini tek bir Avalonia desktop uygulamasına çevirmek. Bu migration ile:
- Tek platform (desktop) çözümü
- Daha hızlı performans (no network overhead)
- Daha basit deployment
- Native desktop deneyimi

## What Changes
- **MIGRATED**: Node.js API endpoints → Avalonia Services
- **MIGRATED**: Angular components → Avalonia Views/ViewModels
- **MIGRATED**: Express.js routing → Avalonia navigation
- **MIGRATED**: Angular Material UI → Avalonia native controls
- **MIGRATED**: HTTP API calls → Direct service calls
- **ENHANCED**: Database operations (SQLite direct access)
- **ENHANCED**: File system operations (native file dialogs)

## Impact
- Affected specs: ui-interaction, mimari, proje-genel
- Affected code: Tüm Avalonia projesi
- Database: playlistorganizer.db (SQLite)
- UI: MainWindow.axaml, yeni Views/ViewModels
- Services: Import, Search, Playlist, Track management

## Migration Scope
### API Endpoints to Services:
- `/api/import` → `ImportService`
- `/api/search` → `SearchService` 
- `/api/playlist` → `PlaylistService`
- `/api/playlistsongs` → `TrackService`
- `/api/track` → `TrackFixService`
- `/api/stream` → `MusicPlayerService`
- `/api/health` → `HealthCheckService`
- `/api/database` → `DatabaseService`
- `/api/similarity` → `SimilarityService`

### Angular Components to Avalonia Views:
- `PlaylistTreeComponent` → `PlaylistTreeView`
- `StatsPanelComponent` → `StatsPanelView`
- `SongGridComponent` → `TrackGridView`
- `SettingsDialogComponent` → `SettingsDialogView`
- `FixSuggestionsComponent` → `FixSuggestionsView`
- `MultiSearchDialogComponent` → `MultiSearchDialogView`
