'use strict';

const BaseEntity = require('./BaseEntity');
const path = require('path');

/**
 * MusicFile Entity
 * Müzik dosyası domain modeli
 */
class MusicFile extends BaseEntity {
    constructor(data = {}) {
        super(data);
        this.path = data.path || '';
        this.fileName = data.fileName || '';
        this.fileNameOnly = data.fileNameOnly || '';
        this.normalizedFileName = data.normalizedFileName || '';
        this.extension = data.extension || '';
        this.size = data.size || 0;
        this.modifiedTime = data.modifiedTime || null;
    }

    /**
     * Dosya adını uzantısız al
     */
    getFileNameWithoutExtension() {
        return this.fileNameOnly;
    }

    /**
     * Audio dosyası mı?
     */
    isAudioFile() {
        const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.wma'];
        return audioExtensions.includes(this.extension.toLowerCase());
    }

    /**
     * Video dosyası mı?
     */
    isVideoFile() {
        const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'];
        return videoExtensions.includes(this.extension.toLowerCase());
    }

    /**
     * Dosya boyutunu formatla (MB)
     */
    getFormattedSize() {
        const mb = this.size / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    }

    /**
     * Validation - Dosya geçerli mi?
     */
    isValid() {
        return this.path && this.fileName && this.normalizedFileName;
    }

    /**
     * Static factory method - create from file info
     */
    static fromFileInfo(fileInfo) {
        return new MusicFile({
            path: fileInfo.path,
            fileName: fileInfo.fileName,
            fileNameOnly: path.parse(fileInfo.fileName).name,
            normalizedFileName: fileInfo.normalizedFileName,
            extension: fileInfo.extension,
            size: fileInfo.size,
            modifiedTime: fileInfo.modified?.getTime() || Date.now()
        });
    }
}

module.exports = MusicFile;

