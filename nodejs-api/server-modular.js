'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Modülleri import et
const historyRoutes = require('./modules/history/history-routes');
const importRoutes = require('./modules/import/import-routes');
const playlistRoutes = require('./modules/playlist/playlist-routes');
const searchRoutes = require('./modules/search/search-routes');
const analyticsRoutes = require('./modules/analytics/analytics-routes');

// Ortak servisleri import et
const { getLogger } = require('./shared/logger');
const { getDatabase } = require('./shared/database');
const versionManager = require('./shared/version');

const app = express();
const logger = getLogger().module('Server');

// Server versiyonu
const SERVER_VERSION = '5.0.0';

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        version: SERVER_VERSION,
        timestamp: new Date().toISOString(),
            modules: ['history', 'import', 'playlist', 'search', 'analytics']
    });
});

// Versiyon bilgileri endpoint
app.get('/api/version', (req, res) => {
    try {
        const versionInfo = versionManager.getAllVersions();
        res.json({
            success: true,
            data: versionInfo,
            message: 'Versiyon bilgileri alındı'
        });
    } catch (error) {
        logger.error('Versiyon bilgisi alma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Versiyon bilgisi alınamadı',
            error: error.message
        });
    }
});

// Modül versiyon kontrolü endpoint
app.get('/api/version/:module', (req, res) => {
    try {
        const { module } = req.params;
        const version = versionManager.getVersion(module);
        
        res.json({
            success: true,
            data: {
                module,
                version,
                lastUpdated: versionManager.lastUpdated
            },
            message: `${module} modülü versiyon bilgisi alındı`
        });
    } catch (error) {
        logger.error('Modül versiyon bilgisi alma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Modül versiyon bilgisi alınamadı',
            error: error.message
        });
    }
});

// Route'ları bağla
app.use('/api/history', historyRoutes);
app.use('/api/import', importRoutes);
app.use('/api/playlist', playlistRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint bulunamadı',
        path: req.originalUrl,
        method: req.method
    });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error(`Server hatası: ${err.message}`, {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    res.status(500).json({
        success: false,
        message: 'Sunucu hatası',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        timestamp: new Date().toISOString()
    });
});

// Server başlatma
async function startServer() {
    try {
        logger.info(`Server başlatılıyor... v${SERVER_VERSION}`);
        
        // Veritabanını başlat
        const db = getDatabase();
        const stats = db.getStats();
        
        logger.info('Database başlatıldı', {
            musicFiles: stats.musicFiles,
            historyTracks: stats.historyTracks,
            playlists: stats.playlists || 0,
            dbSize: stats.dbSize
        });

        const PORT = process.env.PORT || 50001;
        const server = app.listen(PORT, () => {
            logger.info(`Server çalışıyor: http://localhost:${PORT}`);
            logger.info(`API Endpoints:`);
            logger.info(`  - Health: GET /api/health`);
                logger.info(`  - History: /api/history/*`);
                logger.info(`  - Import: /api/import/*`);
                logger.info(`  - Playlist: /api/playlist/*`);
                logger.info(`  - Search: /api/search/*`);
                logger.info(`  - Analytics: /api/analytics/*`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM alındı, server kapatılıyor...');
            server.close(() => {
                logger.info('Server kapatıldı');
                db.close();
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT alındı, server kapatılıyor...');
            server.close(() => {
                logger.info('Server kapatıldı');
                db.close();
                process.exit(0);
            });
        });

    } catch (error) {
        logger.error(`Server başlatma hatası: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

// Server'ı başlat
if (require.main === module) {
    startServer();
}

module.exports = app;
