'use strict';

/**
 * @typedef {Object} HistoryTrack
 * @property {number|null} id
 * @property {string} originalPath
 * @property {string} normalizedName
 * @property {string} m3uFilePath
 * @property {boolean} isMatched
 * @property {number|null} matchedMusicFileId
 * @property {string} createdAt
 * @property {string} updatedAt
 */

module.exports = {
    /** @returns {string} */
    getDefaultHistoryRoot() {
        return process.env.VIRTUALDJ_HISTORY_ROOT || '/Users/koray/Library/Application Support/VirtualDJ/History';
    }
};
