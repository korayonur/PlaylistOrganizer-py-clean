class HealthController {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }

    async check(req, res) {
        try {
            // Database bağlantısını test et
            let databaseStatus = false;
            let databaseError = null;
            
            try {
                const result = this.dbManager.db.prepare('SELECT 1 as test').get();
                databaseStatus = result && result.test === 1;
            } catch (error) {
                databaseError = error.message;
            }
            
            const healthData = {
                status: 'ok',
                version: '2.0.0',
                timestamp: new Date().toISOString(),
                database: {
                    connected: databaseStatus,
                    error: databaseError
                },
                uptime: process.uptime(),
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                    unit: 'MB'
                }
            };
            
            // Database bağlantısı yoksa status'u error yap
            if (!databaseStatus) {
                healthData.status = 'error';
                return res.status(503).json({
                    success: false,
                    data: healthData
                });
            }
            
            res.json({
                success: true,
                data: healthData
            });
            
        } catch (error) {
            console.error('[API] Health check hatası:', error);
            res.status(500).json({
                success: false,
                data: {
                    status: 'error',
                    version: '2.0.0',
                    timestamp: new Date().toISOString(),
                    error: 'Health check başarısız'
                }
            });
        }
    }
}

module.exports = HealthController;
