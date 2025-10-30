const express = require('express');
const router = express.Router();

module.exports = (searchController) => {
    // Search endpoints - hem GET hem POST destekle
    router.get('/', searchController.search.bind(searchController));
    router.post('/', searchController.search.bind(searchController));
    
    // Rebuild index
    router.post('/rebuild', searchController.rebuildIndex.bind(searchController));
    
    // Stats
    router.get('/stats', searchController.getStats.bind(searchController));
    
    return router;
};
