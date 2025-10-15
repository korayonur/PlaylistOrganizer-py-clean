const express = require('express');
const router = express.Router();

module.exports = (healthController) => {
    router.get('/', healthController.check.bind(healthController));
    return router;
};
