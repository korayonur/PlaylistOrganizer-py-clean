'use strict';

const ImportService = require('../../services/ImportService');

/**
 * Get Import Status Use Case
 * Import durumunu getirir
 */
class GetImportStatusUseCase {
    constructor() {
        this.importService = new ImportService();
    }

    /**
     * Import durumunu al
     * @returns {Promise<Object>} Import durumu
     */
    async execute() {
        try {
            const result = await this.importService.getImportStatus();
            return result;
        } catch (error) {
            console.error(`❌ Import status use case hatası: ${error.message}`);
            return {
                success: false,
                message: 'Import durum alma hatası',
                error: error.message
            };
        }
    }
}

module.exports = GetImportStatusUseCase;

