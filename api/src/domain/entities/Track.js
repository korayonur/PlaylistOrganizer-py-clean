'use strict';

const BaseEntity = require('./BaseEntity');

/**
 * Track Entity
 * Playlist track domain modeli
 */
class Track extends BaseEntity {
    constructor(data = {}) {
        super(data);
        this.path = data.path || '';
        this.fileName = data.fileName || '';
        this.fileNameOnly = data.fileNameOnly || '';
        this.normalizedFileName = data.normalizedFileName || '';
    }

    /**
     * Validation - Track geçerli mi?
     */
    isValid() {
        return this.path && this.fileName && this.normalizedFileName;
    }

    /**
     * Track'in dosya adını al (uzantısız)
     */
    getFileNameWithoutExtension() {
        return this.fileNameOnly;
    }

    /**
     * Static factory method
     */
    static fromPlaylistEntry(entry) {
        return new Track({
            path: entry.path,
            fileName: entry.fileName,
            fileNameOnly: entry.fileNameOnly,
            normalizedFileName: entry.normalizedFileName
        });
    }
}

module.exports = Track;

