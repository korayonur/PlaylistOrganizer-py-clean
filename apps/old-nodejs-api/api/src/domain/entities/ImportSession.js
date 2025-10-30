'use strict';

const BaseEntity = require('./BaseEntity');

/**
 * ImportSession Entity
 * Import session domain modeli
 */
class ImportSession extends BaseEntity {
    constructor(data = {}) {
        super(data);
        this.path = data.path || '';
        this.total_files = data.total_files || 0;
        this.processed_files = data.processed_files || 0;
        this.added_files = data.added_files || 0;
        this.skipped_files = data.skipped_files || 0;
        this.error_files = data.error_files || 0;
        
        // YENİ: Detaylı tracking kolonları
        this.operation_type = data.operation_type || 'import';
        this.music_files_count = data.music_files_count || 0;
        this.tracks_count = data.tracks_count || 0;
        this.playlists_count = data.playlists_count || 0;
        this.index_count = data.index_count || 0;
    }

    /**
     * Import tamamlandı mı?
     */
    isCompleted() {
        return this.processed_files >= this.total_files;
    }

    /**
     * Import yüzdesi
     */
    getProgressPercentage() {
        if (this.total_files === 0) return 0;
        return Math.round((this.processed_files / this.total_files) * 100);
    }

    /**
     * Başarı oranı
     */
    getSuccessRate() {
        if (this.processed_files === 0) return 0;
        return Math.round((this.added_files / this.processed_files) * 100);
    }

    /**
     * Session'ı güncelle
     */
    update(stats) {
        this.processed_files = stats.processed_files || this.processed_files;
        this.added_files = stats.added_files || this.added_files;
        this.skipped_files = stats.skipped_files || this.skipped_files;
        this.error_files = stats.error_files || this.error_files;
    }

    /**
     * Validation
     */
    isValid() {
        return this.path && this.total_files >= 0;
    }

    /**
     * Static factory method
     */
    static create(path, totalFiles) {
        return new ImportSession({
            path,
            total_files: totalFiles,
            processed_files: 0,
            added_files: 0,
            skipped_files: 0,
            error_files: 0
        });
    }
}

module.exports = ImportSession;

