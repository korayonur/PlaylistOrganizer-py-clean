'use strict';

const express = require('express');
const router = express.Router();

/**
 * Track Fix Routes
 * Eksik dosyalar için arama ve bulk fix endpoint'leri
 */
module.exports = (trackFixController) => {
    // POST /api/track/search-by-filename
    // Dosya adı ile track arama
    router.post('/search-by-filename', trackFixController.searchByFilename.bind(trackFixController));
    
    // POST /api/track/bulk-fix
    // Bulk fix preview - hangi playlist'ler etkilenecek?
    router.post('/bulk-fix', trackFixController.bulkFix.bind(trackFixController));
    
    // POST /api/track/bulk-fix/confirm
    // Bulk fix onayla ve çalıştır
    router.post('/bulk-fix/confirm', trackFixController.bulkFixConfirm.bind(trackFixController));
    
    return router;
};
