'use strict';

const BaseEntity = require('./BaseEntity');

/**
 * PlaylistTrack Entity
 * Playlist-Track ilişki modeli
 */
class PlaylistTrack extends BaseEntity {
    constructor(data = {}) {
        super(data);
        this.playlist_id = data.playlist_id || null;
        this.track_id = data.track_id || null;
        this.track_order = data.track_order || 0;
        this.added_at = data.added_at || new Date().toISOString();
    }

    /**
     * Validation
     */
    isValid() {
        return this.playlist_id && this.track_id && this.track_order > 0;
    }

    /**
     * Static factory method
     */
    static create(playlistId, trackId, order) {
        return new PlaylistTrack({
            playlist_id: playlistId,
            track_id: trackId,
            track_order: order
        });
    }
}

module.exports = PlaylistTrack;

