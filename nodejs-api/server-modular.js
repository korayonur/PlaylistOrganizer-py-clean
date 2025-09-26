'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Modülleri import et (sadece çalışan modüller)
const importRoutes = require('./modules/import/import-routes');
const similarityRoutes = require('./modules/similarity/similarity-routes');
const databaseModule = require('./modules/database');

// Hatalı modüller geçici olarak devre dışı
// const historyRoutes = require('./modules/history/history-routes');
// const playlistRoutes = require('./modules/playlist/playlist-routes');
// const searchRoutes = require('./modules/search/search-routes');
// const analyticsRoutes = require('./modules/analytics/analytics-routes');

// Ortak servisleri import et
// const { getLogger } = require('./shared/logger'); // Artık gerek yok - console.log kullanıyoruz
const { getDatabase } = require('./shared/database');
const versionManager = require('./shared/version');

const app = express();
// const logger = getLogger().module('Server'); // Artık gerek yok - console.log kullanıyoruz

// Server versiyonu
const SERVER_VERSION = '5.0.0';


/**
 * Port'ta çalışan süreçleri kontrol et ve öldür
 * @param {number} port - Kontrol edilecek port
 */
async function killProcessOnPort(port) {
    try {
        console.log(`🔍 Port ${port} kontrol ediliyor...`);
        
        // macOS/Linux için lsof komutu ile port kullanımını kontrol et
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        
        if (stdout.trim()) {
            const pids = stdout.trim().split('\n');
            console.log(`⚠️ Port ${port} kullanımda, ${pids.length} süreç bulundu: ${pids.join(', ')}`);
            
            // Her PID'i öldür
            for (const pid of pids) {
                try {
                    await execAsync(`kill -9 ${pid}`);
                    console.log(`✅ Süreç ${pid} öldürüldü`);
                } catch (killError) {
                    console.warn(`⚠️ Süreç ${pid} öldürülemedi: ${killError.message}`);
                }
            }
            
            // Kısa bir bekleme
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`✅ Port ${port} temizlendi`);
        } else {
            console.log(`✅ Port ${port} boş`);
        }
    } catch (error) {
        // Port boşsa lsof hata verir, bu normal
        if (error.code === 1) {
            console.log(`✅ Port ${port} boş`);
        } else {
            console.warn(`⚠️ Port ${port} kontrol hatası: ${error.message}`);
        }
    }
}

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
            modules: ['import', 'similarity', 'database']
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
        console.error(`❌ Versiyon bilgisi alma hatası: ${error.message}`);
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
        console.error(`❌ Modül versiyon bilgisi alma hatası: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Modül versiyon bilgisi alınamadı',
            error: error.message
        });
    }
});

// Route'ları bağla (sadece çalışan modüller)
app.use('/api/import', importRoutes);
app.use('/api/similarity', similarityRoutes);
app.use('/api/database', databaseModule.router);

// Hatalı modüller geçici olarak devre dışı
// app.use('/api/history', historyRoutes);
// app.use('/api/playlist', playlistRoutes);
// app.use('/api/search', searchRoutes);
// app.use('/api/analytics', analyticsRoutes);

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
    console.error(`❌ Server hatası: ${err.message}`);

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
        console.log(`🚀 Server başlatılıyor... v${SERVER_VERSION}`);
        
        // Port'u temizle
        const PORT = process.env.PORT || 50001;
        await killProcessOnPort(PORT);
        
        // Veritabanını başlat
        const db = getDatabase();
        const stats = db.getStats();
        
        console.log(`📊 Database başlatıldı`, {
            musicFiles: stats.musicFiles,
            historyTracks: stats.historyTracks,
            playlists: stats.playlists || 0,
            dbSize: stats.dbSize
        });

        const server = app.listen(PORT, () => {
            console.log(`✅ Server çalışıyor: http://localhost:${PORT}`);
            console.log(`📋 API Endpoints:`);
            console.log(`  - Health: GET /api/health`);
                console.log(`  - Import: /api/import/*`);
                console.log(`  - Similarity: /api/similarity/*`);
                console.log(`  - Database: /api/database/*`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log(`🛑 SIGTERM alındı, server kapatılıyor...`);
            server.close(() => {
                console.log(`✅ Server kapatıldı`);
                db.close();
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log(`🛑 SIGINT alındı, server kapatılıyor...`);
            server.close(() => {
                console.log(`✅ Server kapatıldı`);
                db.close();
                process.exit(0);
            });
        });

    } catch (error) {
        console.error(`❌ Server başlatma hatası: ${error.message}`);
        process.exit(1);
    }
}

// Server'ı başlat
if (require.main === module) {
    startServer();
}

module.exports = app;
