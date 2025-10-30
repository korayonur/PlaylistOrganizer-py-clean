const express = require('express');
const router = express.Router();

module.exports = (playlistController) => {
    // Backward compatibility route (specific routes first)
    router.get('/list', playlistController.getPlaylists.bind(playlistController));
    
    // Main routes
    router.get('/', playlistController.getPlaylists.bind(playlistController));
    router.get('/:id', playlistController.getPlaylistDetail.bind(playlistController));
    
    return router;
};
