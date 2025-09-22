'use strict';

const path = require('path');
const HistoryScanner = require('./history-scanner');
const HistoryRepository = require('./history-repository');
const HistoryMatchService = require('./history-match-service');

class HistoryService {
    constructor(options = {}) {
        this.scanner = options.scanner || new HistoryScanner(options);
        this.repository = options.repository || new HistoryRepository(options.databasePath);
        this.matchService = options.matchService || new HistoryMatchService(options.databaseInstance);
    }

    /**
     * Tüm history klasörünü tarayıp DB'yi günceller.
     * @returns {Array<Object>} işlemlerin özetleri
     */
    scanAll(options = {}) {
        const historyFiles = this.scanner.listHistoryFiles();
        const summaries = [];
        for (const filePath of historyFiles) {
            summaries.push(this.scanSingleFile(filePath, options));
        }
        return summaries;
    }

    /**
     * @param {string} filePath
     * @returns {Object}
     */
    scanSingleFile(filePath, options = {}) {
        const performMatching = options.performMatching !== false;
        const parsed = this.scanner.parseHistoryFile(filePath);
        const historyId = this.repository.upsertHistoryFile({
            filePath: parsed.filePath,
            fileName: parsed.fileName,
            year: parsed.year,
            month: parsed.month,
            day: parsed.day,
            totalTracks: parsed.tracks.length,
            missingTracks: 0,
            status: performMatching ? 'scanned' : 'imported'
        });

        this.repository.deleteTracksForHistory(historyId);
        this.repository.insertTracks(historyId, parsed.tracks);

        const summary = {
            filePath,
            historyId,
            totalTracks: parsed.tracks.length,
            matches: 0,
            autoFixed: 0,
            pending: performMatching ? 0 : parsed.tracks.length,
            missing: performMatching ? 0 : parsed.tracks.length,
            candidatesStored: 0,
            matchingPerformed: performMatching
        };

        if (!performMatching) {
            this.repository.clearMissingForHistory(historyId);
            this.repository.updateHistoryStats(historyId, {
                total: summary.totalTracks,
                missing: summary.missing
            });
            this.repository.updateHistoryStatus(historyId, 'imported');
            return summary;
        }

        this.repository.clearMissingForHistory(historyId);

        for (const trackRow of this.repository.getTracks(historyId)) {
            const matchResult = this.matchService.matchTrack({
                originalPath: trackRow.original_path,
                normalizedName: trackRow.normalized_name
            });

            if (matchResult.status === 'matched' && matchResult.matchedPath) {
                this.repository.updateTrackMatch({
                    id: trackRow.id,
                    status: matchResult.method === 'similarity_search' && matchResult.similarity < 0.85 ? 'suggested' : 'matched',
                    matchedPath: matchResult.matchedPath,
                    matchMethod: matchResult.method,
                    similarity: matchResult.similarity
                });

                if (matchResult.method === 'similarity_search' && matchResult.similarity < 0.85) {
                    summary.pending += 1;
                    this.repository.upsertMissing({
                        trackId: trackRow.id,
                        originalPath: trackRow.original_path,
                        candidatePaths: matchResult.candidates,
                        similarity: matchResult.similarity,
                        status: 'pending'
                    });
                } else {
                    summary.matches += 1;
                    this.repository.removeMissing(trackRow.id);
                }
            } else {
                if (matchResult.status === 'pending') {
                    summary.pending += 1;
                } else {
                    summary.missing += 1;
                }
                this.repository.updateTrackMatch({
                    id: trackRow.id,
                    status: matchResult.status || 'missing',
                    matchedPath: null,
                    matchMethod: null,
                    similarity: null
                });
                this.repository.upsertMissing({
                    trackId: trackRow.id,
                    originalPath: trackRow.original_path,
                    candidatePaths: matchResult.candidates,
                    similarity: matchResult.similarity,
                    status: matchResult.status || 'pending'
                });
            }

            if (matchResult.candidates && matchResult.candidates.length > 0) {
                summary.candidatesStored += 1;
            }
        }

        this.repository.updateHistoryStats(historyId, {
            total: summary.totalTracks,
            missing: summary.missing + summary.pending
        });
        this.repository.updateHistoryStatus(historyId, 'scanned');

        return summary;
    }

    dispose() {
        if (this.repository) {
            this.repository.close?.();
        }
        if (this.matchService) {
            this.matchService.dispose();
        }
    }
}

module.exports = HistoryService;
