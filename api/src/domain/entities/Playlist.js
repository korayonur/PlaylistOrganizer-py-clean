'use strict';

const BaseEntity = require('./BaseEntity');

/**
 * Playlist Entity
 * Playlist domain modeli
 */
class Playlist extends BaseEntity {
    constructor(data = {}) {
        super(data);
        this.path = data.path || '';
        this.name = data.name || '';
        this.type = data.type || ''; // 'm3u' veya 'vdjfolder'
        this.track_count = data.track_count || 0;
        this.updated_at = data.updated_at || new Date().toISOString();
    }

    /**
     * M3U playlist mi?
     */
    isM3U() {
        return this.type === 'm3u';
    }

    /**
     * VDJ Folder playlist mi?
     */
    isVDJFolder() {
        return this.type === 'vdjfolder';
    }

    /**
     * Playlist boş mu?
     */
    isEmpty() {
        return this.track_count === 0;
    }

    /**
     * Track sayısını güncelle
     */
    updateTrackCount(count) {
        this.track_count = count;
        this.updated_at = new Date().toISOString();
    }

    /**
     * Validation
     */
    isValid() {
        return this.path && this.name && ['m3u', 'vdjfolder'].includes(this.type);
    }

    /**
     * Static factory method
     */
    static fromFile(filePath, playlistType) {
        const path = require('path');
        return new Playlist({
            path: filePath,
            name: path.basename(filePath, path.extname(filePath)),
            type: playlistType,
            track_count: 0
        });
    }
}

module.exports = Playlist;

