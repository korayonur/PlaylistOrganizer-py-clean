'use strict';

/**
 * Import Modülü Type Definitions
 */

/**
 * @typedef {Object} ImportSession
 * @property {number|null} id
 * @property {string} path
 * @property {string} status - 'scanning', 'completed', 'failed'
 * @property {number} totalFiles
 * @property {number} processedFiles
 * @property {number} addedFiles
 * @property {number} skippedFiles
 * @property {number} errorFiles
 * @property {string} createdAt
 * @property {string|null} completedAt
 */

/**
 * @typedef {Object} ImportFile
 * @property {string} path
 * @property {string} name
 * @property {number} size
 * @property {Date} modified
 * @property {string} extension
 */

/**
 * @typedef {Object} ImportResult
 * @property {boolean} success
 * @property {string} message
 * @property {ImportSession} session
 * @property {ImportFile[]} files
 * @property {Object[]} errors
 */

/**
 * @typedef {Object} ImportStats
 * @property {number} totalSessions
 * @property {number} completedSessions
 * @property {number} failedSessions
 * @property {number} totalFiles
 * @property {number} addedFiles
 * @property {number} skippedFiles
 * @property {number} errorFiles
 */

/**
 * @typedef {Object} ImportOptions
 * @property {boolean} includeAudio - Audio dosyalarını dahil et
 * @property {boolean} includeVideo - Video dosyalarını dahil et
 * @property {boolean} recursive - Alt klasörleri tara
 * @property {number} maxDepth - Maksimum derinlik
 * @property {boolean} skipExisting - Mevcut dosyaları atla
 * @property {boolean} verifyFiles - Dosya varlığını doğrula
 */

/**
 * @typedef {Object} ImportProgress
 * @property {number} sessionId
 * @property {string} status
 * @property {number} totalFiles
 * @property {number} processedFiles
 * @property {number} addedFiles
 * @property {number} skippedFiles
 * @property {number} errorFiles
 * @property {number} percentage
 * @property {string} currentFile
 * @property {string} message
 */

module.exports = {
    // Types are exported for JSDoc usage
};
