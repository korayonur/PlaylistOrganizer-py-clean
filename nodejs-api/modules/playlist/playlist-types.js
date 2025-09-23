'use strict';

/**
 * @typedef {Object} Playlist
 * @property {number|null} id
 * @property {string} name
 * @property {string} path
 * @property {string} format - 'm3u' | 'vdjfolder'
 * @property {string} source - 'history' | 'folders' | 'mylists'
 * @property {number} fileCount
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} PlaylistTrack
 * @property {number|null} id
 * @property {number} playlistId
 * @property {string} trackPath
 * @property {number} trackOrder
 * @property {string} createdAt
 */

/**
 * @typedef {Object} PlaylistStats
 * @property {number} totalPlaylists
 * @property {number} historyPlaylists
 * @property {number} foldersPlaylists
 * @property {number} mylistsPlaylists
 * @property {number} totalTracks
 * @property {number} averageTracksPerPlaylist
 */

/**
 * @typedef {Object} ImportResult
 * @property {boolean} success
 * @property {number} processedFiles
 * @property {number} totalTracks
 * @property {number} addedPlaylists
 * @property {number} addedTracks
 * @property {number} errors
 * @property {string} message
 */

module.exports = {
    // Types are exported for JSDoc usage
};
