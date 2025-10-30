# 🎵 Playlist Organizer - Multi-Platform Project

**Version:** 2.0 (Clean Architecture + Avalonia Migration)  
**Last Update:** 30 Ekim 2025  
**Status:** 🔄 Migration In Progress

## 📋 Overview

Modern music management system with multiple implementations:

- **Old System**: Node.js API + Angular Frontend (Clean Architecture)
- **New System**: Avalonia Desktop App (Cross-platform .NET)

Both systems share the same SQLite database for seamless migration.

## 🏗️ Project Structure

```
PlaylistOrganizer-py-backup/
├── apps/
│   ├── old-nodejs-api/          # Angular + Node.js (legacy)
│   │   ├── api/                 # Backend (Clean Architecture)
│   │   └── frontend/            # Angular 18 UI
│   └── avalonia/                # Avalonia Desktop App (new)
│       └── PlaylistOrganizerAvalonia/
├── shared/
│   ├── database/                # Shared SQLite database
│   ├── logs/                    # Shared logs
│   └── scripts/                 # Build & start scripts
├── docs/                        # Documentation
├── openspec/                    # Specification-driven development
└── PlaylistOrganizer.code-workspace  # VS Code workspace
```

## 🚀 Quick Start

### Option 1: Old Node.js API + Angular (Legacy)

**Backend:** Node.js + Clean Architecture (Domain, Application, Infrastructure, Presentation)  
**Frontend:** Angular 18 (Standalone Components)  
**Database:** SQLite3 (better-sqlite3 + Repository Pattern)  
**CLI:** Commander.js (7 commands)

#### Clean Architecture Layers

```
apps/old-nodejs-api/api/src/
├── domain/              # Business entities & repository interfaces
│   ├── entities/        # BaseEntity, Track, Playlist, MusicFile, etc.
│   └── repositories/    # IRepository, ITrackRepository, etc.
├── application/         # Business logic & use cases
│   ├── services/        # WordIndexService, ImportService
│   └── use-cases/       # SearchTracks, GetPlaylists, StartImport, etc.
├── infrastructure/      # External concerns
│   ├── database/        # Connection, Schema, Repositories
│   └── persistence/     # DatabaseManager
├── presentation/        # User interfaces
│   ├── http/            # Controllers, Routes, Middleware
│   └── cli/             # Commands, Output utilities
└── shared/              # Cross-cutting concerns
    ├── config.js        # Configuration
    ├── logger.js        # Logging system
    ├── utils.js         # Utilities (normalize, etc.)
    └── version.js       # Version manager
```

## 🚀 Quick Start

### Option 1: Old Node.js API + Angular (Legacy)

```bash
./shared/scripts/start-nodejs-api.sh
```

**What it does:**

- ✅ Starts backend API (Port 50001, hot reload with nodemon)
- ✅ Starts frontend (Port 4200, Angular HMR)
- ✅ Opens browser automatically
- ✅ Monitors file changes

**Access:**

- Backend API: http://localhost:50001
- Frontend: http://localhost:4200
- Health Check: http://localhost:50001/api/health

### Option 2: Avalonia Desktop App (New)

```bash
cd apps/avalonia/PlaylistOrganizerAvalonia
dotnet run

# Or use the script:
./shared/scripts/test-avalonia-import.sh    # Import test with progress monitoring
```

### Manual Start (Legacy System)

**Backend:**

```bash
cd apps/old-nodejs-api/api
npm run dev
# or
npm start
```

**Frontend:**

```bash
cd apps/old-nodejs-api/frontend
npm start
# or
ng serve --open
```

## 💻 CLI Commands

The CLI provides powerful tools for managing your music library without starting the HTTP server.

```bash
cd apps/old-nodejs-api/api

# Import & Session Management
node cli.js import <path>                    # Import music files and playlists
node cli.js sessions --limit 10              # List import sessions

# Search & Indexing
node cli.js search "query" --limit 10        # Search tracks by keywords
node cli.js rebuild-index                    # Rebuild word indexes (long operation)

# Database Management
node cli.js db:stats                         # Show database statistics
node cli.js db:analyze                       # Analyze orphan tracks
node cli.js db:update-track-counts           # Update playlist track counts
```

### CLI Examples

```bash
# Import VirtualDJ library
node cli.js import "/Users/username/Music/VirtualDJ"

# Search for remixes
node cli.js search "remix" --limit 20

# View recent import sessions
node cli.js sessions --limit 5

# Get database stats
node cli.js db:stats
```

## 🌐 API Endpoints (8 total)

### Health (1 endpoint)

- `GET /api/health` - Server status and uptime

### Search (3 endpoints)

- `GET /api/search?q=query&limit=10` - Search tracks by keywords
- `GET /api/search/stats` - Database statistics
- `POST /api/search/rebuild` - Rebuild word indexes

### Playlist (2 endpoints)

- `GET /api/playlist?limit=50&offset=0` - List all playlists
- `GET /api/playlist/:id` - Get playlist details and tracks

### Import (2 endpoints)

- `POST /api/import/start` - Start import operation (body: `{path: "/path/to/music"}`)
- `GET /api/import/status` - Get current or last import status

### API Testing

Use the included Insomnia collection: `insomnia-modular-api-collection.json`

Import to Insomnia/Postman and start testing all endpoints immediately!

## ⚙️ Installation

### Prerequisites

- Node.js 18+ and npm 8+
- SQLite3

### Setup

```bash
# Clone repository
git clone <repository-url>
cd PlaylistOrganizer-py-backup

# Install dependencies
cd apps/old-nodejs-api/api && npm install
cd ../frontend && npm install
```

### First Run

```bash
# Start in development mode
./shared/scripts/start-nodejs-api.sh
```

## 📊 Database

**Locations:**
- **Old Node.js API:** `apps/old-nodejs-api/musicfiles.db` 
- **Avalonia App:** `apps/avalonia/PlaylistOrganizerAvalonia/playlistorganizer.db`

**Schema Files:**
- **Old Node.js API:** `apps/old-nodejs-api/schema.sql` (relational with junction tables)
- **Avalonia App:** `apps/avalonia/.../Database/schema.sql` (flat denormalized)

Each system has its own database with compatible schemas for independent operation.

**Tables:**

- `music_files` - Physical music files on disk
- `tracks` - Tracks from playlists
- `playlists` - M3U/VPL playlist files
- `playlist_tracks` - Many-to-many relationship
- `track_words` - Word index for tracks
- `music_words` - Word index for music files
- `import_sessions` - Session tracking and audit trail

**Views:**

- `v_unmatched_tracks` - Tracks without matching music files
- `v_exact_path_matches` - Exact path matches
- `v_filename_matches` - Filename-based matches

## 🎯 Features

### Clean Architecture Benefits

- ✅ **Separation of Concerns** - Each layer has a single responsibility
- ✅ **Testability** - Business logic independent of external concerns
- ✅ **Maintainability** - Easy to understand and modify
- ✅ **Scalability** - Easy to add new features

### Core Features

- ✅ **Word-based Search** - Normalized text search with multi-language support (Turkish, English, etc.)
- ✅ **Session Tracking** - Complete audit trail for import/rebuild operations
- ✅ **Repository Pattern** - Database abstraction for easier testing and migration
- ✅ **Console + File Logging** - All operations logged to console and rotating log files
- ✅ **CLI + HTTP API** - Use the tool that fits your workflow
- ✅ **Hot Reload** - Development mode with automatic reload

## 📚 Tech Stack

**Backend:**

- Node.js 18+
- Express.js (HTTP server)
- Better-sqlite3 (Database driver)
- Commander.js (CLI framework)

**Frontend:**

- Angular 18 (Standalone Components)
- RxJS (Reactive programming)
- Angular Material (UI components)

**Database:**

- SQLite3 (File-based database)

**Development:**

- Nodemon (Hot reload)
- Angular CLI (HMR)
- Concurrently (Multi-process management)

## 📝 Migration Note

This project is currently in transition:

- **Legacy System:** Node.js API + Angular Frontend (Clean Architecture) in `apps/old-nodejs-api/`
- **New System:** Avalonia Desktop App in `apps/avalonia/`

Each system has its own database with compatible schemas for independent operation.

**Project Structure Reorganization:**

- ✅ Organized into `apps/` for different implementations
- ✅ Each app has its own database file
- ✅ Shared resources in `shared/` (schemas, logs, scripts)
- ✅ Clean separation between legacy and new systems

## 🛠️ Scripts & Commands

```bash
# Development (from project root)
./shared/scripts/start-nodejs-api.sh   # Start old Node.js API + Angular frontend
./shared/scripts/test-avalonia-import.sh   # Test Avalonia import with progress

# Individual services
cd apps/old-nodejs-api/api
npm run dev                             # Backend with hot reload (nodemon)
cd ../frontend
npm start                               # Frontend with HMR

# Build
cd apps/old-nodejs-api/frontend
npm run build                           # Build frontend for production

# CLI commands
cd apps/old-nodejs-api/api
node cli.js db:stats                    # Database statistics
node cli.js search "query"              # Search tracks
node cli.js import <path>               # Import files
```

## 📖 Documentation

- **OpenSpec:** `openspec/` - Specification-driven development
- **Migration Plans:** `docs/current/` - Current migration plans
- **Avalonia Migration:** `openspec/changes/api-to-avalonia-migration/`

## 🔒 License

MIT

## 👤 Author

Koray

## 🎉 Acknowledgments

Built with Clean Architecture principles and modern JavaScript best practices.
