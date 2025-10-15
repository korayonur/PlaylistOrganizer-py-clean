# 🎵 Playlist Organizer - Clean Architecture

**Version:** 2.0 (Clean Architecture)  
**Last Update:** 14 Ekim 2025  
**Status:** ✅ Production Ready

## 📋 Overview

Modern full-stack music management system with Clean Architecture, word-based search, and intelligent track matching.

**Key Features:**
- 🏗️ **Clean Architecture** - SOLID principles, Domain-Driven Design
- 🔍 **Word-based Search** - Normalized, multi-language support
- 📊 **Session Tracking** - Audit trail for all operations
- 🎯 **Repository Pattern** - Database abstraction layer
- 🚀 **CLI + HTTP API** - Flexible usage patterns

## 🏗️ Architecture

**Backend:** Node.js + Clean Architecture (Domain, Application, Infrastructure, Presentation)  
**Frontend:** Angular 18 (Standalone Components)  
**Database:** SQLite3 (better-sqlite3 + Repository Pattern)  
**CLI:** Commander.js (7 commands)

### Clean Architecture Layers

```
api/src/
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

### Development Mode (Recommended)

```bash
./start-new.sh
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

### Manual Start

**Backend:**
```bash
cd api
npm run dev
# or
npm start
```

**Frontend:**
```bash
cd frontend
npm start
# or
ng serve --open
```

## 💻 CLI Commands

The CLI provides powerful tools for managing your music library without starting the HTTP server.

```bash
cd api

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
cd PlaylistOrganizer-py

# Install all dependencies (workspace + api + frontend)
npm run install:all

# Or install individually
npm install          # Workspace
cd api && npm install
cd frontend && npm install
```

### First Run

```bash
# Start in development mode
./start-new.sh

# Or use npm scripts
npm start
# or
npm run dev
```

## 📊 Database

**Location:** `musicfiles.db` (shared between CLI and API)

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

This project was migrated from `nodejs-api/` to `api/` with Clean Architecture on **October 14, 2025**.

**What changed:**
- ❌ Old monolithic backend (`nodejs-api/`)
- ✅ New Clean Architecture backend (`api/`)
- ✅ Repository Pattern for database access
- ✅ Use Cases for business logic
- ✅ CLI commands for operations
- ✅ Improved logging and session tracking

**Old backend backup:** Available in `nodejs-api-backup/` if needed.

## 🛠️ NPM Scripts

```bash
# Development
npm start                # Start with start-new.sh
npm run dev              # Same as start
npm run dev:all          # Start both backend and frontend with concurrently

# Individual services
npm run start:backend    # Start backend only
npm run start:frontend   # Start frontend only
npm run dev:backend      # Backend with hot reload
npm run dev:frontend     # Frontend with HMR

# Build
npm run build:frontend   # Build frontend for production

# Installation
npm run install:all      # Install all dependencies
npm run install:backend  # Install backend dependencies
npm run install:frontend # Install frontend dependencies

# CLI shortcuts
npm run cli              # Access CLI (cd api && node cli.js)
npm run health           # Check API health
npm run status           # Get database stats

# Cleanup
npm run clean            # Clean all node_modules
```

## 📖 Documentation

- **Insomnia Collection:** `insomnia-modular-api-collection.json`
- **Migration Plan:** `clean-architecture-migration.plan.md`
- **Old Documentation:** `old-docs/` directory

## 🔒 License

MIT

## 👤 Author

Koray

## 🎉 Acknowledgments

Built with Clean Architecture principles and modern JavaScript best practices.
