'use strict';

const express = require('express');
const router = express.Router();

/**
 * PlaylistSongs Routes
 * Playlist içerik okuma endpoint'leri
 */
module.exports = (playlistSongsController) => {
    // POST /api/playlistsongs/read - Playlist içeriğini oku
    router.post('/read', playlistSongsController.readPlaylistSongs.bind(playlistSongsController));
    
    return router;
};

