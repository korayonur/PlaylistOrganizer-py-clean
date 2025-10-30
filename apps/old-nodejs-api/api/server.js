const express = require('express');
const cors = require('cors');
const { DatabaseManager } = require('./src/infrastructure/persistence/DatabaseManager');
const WordIndexService = require('./src/application/services/WordIndexService');

// Controllers
const ImportController = require('./src/presentation/http/controllers/ImportController');
const SearchController = require('./src/presentation/http/controllers/SearchController');
const PlaylistController = require('./src/presentation/http/controllers/PlaylistController');
const PlaylistSongsController = require('./src/presentation/http/controllers/PlaylistSongsController');
const TrackFixController = require('./src/presentation/http/controllers/TrackFixController');
const TrackStreamController = require('./src/presentation/http/controllers/TrackStreamController');
const HealthController = require('./src/presentation/http/controllers/HealthController');
const DatabaseController = require('./src/presentation/http/controllers/DatabaseController');
const SimilarityController = require('./src/presentation/http/controllers/SimilarityController');

// Routes
const { importRoutes, searchRoutes, playlistRoutes, healthRoutes, databaseRoutes, similarityRoutes } = require('./src/presentation/http/routes');

// Middleware
const errorHandler = require('./src/presentation/http/middleware/errorHandler');
const requestLogger = require('./src/presentation/http/middleware/requestLogger');

// Logger
const { getLogger } = require('./src/shared/logger');
getLogger(); // Initialize console interception

async function startServer() {
    const app = express();
    const PORT = process.env.PORT || 50001;

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(requestLogger);

    // Initialize database
    const dbManager = new DatabaseManager();
    await dbManager.initialize();
    
    const wordIndexService = new WordIndexService(dbManager.db);

    // Initialize controllers
    const importController = new ImportController(dbManager, wordIndexService);
    const searchController = new SearchController(dbManager, wordIndexService);
    const playlistController = new PlaylistController(dbManager);
    const playlistSongsController = new PlaylistSongsController(dbManager);
    const trackFixController = new TrackFixController(dbManager, wordIndexService);
    const trackStreamController = new TrackStreamController();
    const healthController = new HealthController(dbManager);
    const databaseController = new DatabaseController(dbManager);
    const similarityController = new SimilarityController(dbManager.db, wordIndexService);

    // Load additional routes
    const playlistSongsRoutes = require('./src/presentation/http/routes/playlistsongs.routes');
    const trackFixRoutes = require('./src/presentation/http/routes/trackfix.routes');
    
    // Routes
    app.use('/api/import', importRoutes(importController));
    app.use('/api/search', searchRoutes(searchController));
    app.use('/api/playlist', playlistRoutes(playlistController));
    app.use('/api/playlists', playlistRoutes(playlistController)); // Backward compatibility
    app.use('/api/playlistsongs', playlistSongsRoutes(playlistSongsController)); // Playlist songs
    app.use('/api/track', trackFixRoutes(trackFixController)); // Track fix
    app.post('/api/stream', (req, res) => trackStreamController.stream(req, res)); // Track preview
    app.use('/api/health', healthRoutes(healthController));
    app.use('/api/database', databaseRoutes(databaseController));
    app.use('/api/similarity', similarityRoutes(similarityController));

    // Error handler
    app.use(errorHandler);

    app.listen(PORT, () => {
        console.log(`🚀 Playlist Organizer API running on http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
}

startServer().catch(console.error);
