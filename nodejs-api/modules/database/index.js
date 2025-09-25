const express = require('express');
const databaseRoutes = require('./database-routes');

const router = express.Router();

// Database yönetim rotalarını ekle
router.use('/', databaseRoutes);

module.exports = {
    name: 'database',
    version: '5.0.0',
    description: 'Database yönetim modülü - Tabloları sil/oluştur/reset işlemleri',
    router
};
