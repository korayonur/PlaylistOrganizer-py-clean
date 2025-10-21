'use strict';

const fs = require('fs');
const path = require('path');

class TrackStreamController {
    async stream(req, res) {
        try {
            const { filePath } = req.body || {};

            if (!filePath || typeof filePath !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'filePath gerekli'
                });
            }

            if (!fs.existsSync(filePath)) {
                console.warn(`[TrackStream] Dosya bulunamadı: ${filePath}`);
                return res.status(404).json({
                    success: false,
                    error: 'Dosya bulunamadı'
                });
            }

            const fileStat = fs.statSync(filePath);
            const rangeHeader = req.headers.range;
            const mimeType = this.getMimeType(filePath);

            if (rangeHeader) {
                const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
                const start = Number.parseInt(startStr, 10);
                const end = endStr ? Number.parseInt(endStr, 10) : fileStat.size - 1;

                if (Number.isNaN(start) || Number.isNaN(end) || start >= fileStat.size) {
                    return res.status(416).send('Geçersiz aralık');
                }

                const chunkSize = end - start + 1;
                const stream = fs.createReadStream(filePath, { start, end });

                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': mimeType
                });

                stream.on('error', (streamError) => {
                    console.error('[TrackStream] Stream okuma hatası:', streamError);
                    res.destroy(streamError);
                });

                stream.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Type': mimeType,
                    'Content-Length': fileStat.size
                });

                const stream = fs.createReadStream(filePath);
                stream.on('error', (streamError) => {
                    console.error('[TrackStream] Stream okuma hatası:', streamError);
                    res.destroy(streamError);
                });

                stream.pipe(res);
            }
        } catch (error) {
            console.error('[TrackStream] Stream hatası:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Stream hatası'
            });
        }
    }

    getMimeType(filePath) {
        const extension = path.extname(filePath).toLowerCase();

        switch (extension) {
            case '.mp3':
                return 'audio/mpeg';
            case '.m4a':
            case '.mp4':
                return 'audio/mp4';
            case '.wav':
                return 'audio/wav';
            case '.flac':
                return 'audio/flac';
            case '.aac':
                return 'audio/aac';
            case '.ogg':
                return 'audio/ogg';
            default:
                return 'application/octet-stream';
        }
    }
}

module.exports = TrackStreamController;
