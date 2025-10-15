const express = require('express');
const router = express.Router();

module.exports = (importController) => {
    router.post('/start', importController.startImport.bind(importController));
    router.get('/status', importController.getStatus.bind(importController));
    
    // Backward compatibility routes
    router.post('/scan', importController.startImport.bind(importController));
    
    return router;
};
