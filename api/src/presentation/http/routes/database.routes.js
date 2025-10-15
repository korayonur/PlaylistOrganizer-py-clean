const express = require('express');
const router = express.Router();

module.exports = (databaseController) => {
    router.get('/status', databaseController.getStatus.bind(databaseController));
    router.get('/settings', databaseController.getSettings.bind(databaseController));
    router.get('/config', databaseController.getConfig.bind(databaseController));
    router.post('/settings', databaseController.updateSettings.bind(databaseController));
    return router;
};
