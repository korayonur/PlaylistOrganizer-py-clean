'use strict';

/**
 * @typedef {Object} HistoryTrack
 * @property {number|null} id
 * @property {number} historyFileId
 * @property {string} originalPath
 * @property {string} normalizedName
 * @property {string|null} status
 * @property {string|null} matchedPath
 * @property {number|null} similarity
 * @property {string|null} matchMethod
 * @property {Object<string, any>|null} metadata
 */

/**
 * @typedef {Object} HistoryScanOptions
 * @property {string} historyRoot
 * @property {boolean} [includeCache]
 */

module.exports = {
    /** @returns {string} */
    getDefaultHistoryRoot() {
        return process.env.VIRTUALDJ_HISTORY_ROOT || '/Users/koray/Library/Application Support/VirtualDJ/History';
    }
};
