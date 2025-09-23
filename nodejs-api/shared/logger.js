'use strict';

const fs = require('fs-extra');
const path = require('path');

/**
 * Ortak Logging Sistemi
 * Tüm modüller için merkezi log yönetimi
 */
class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, context = {}) {
        const timestamp = new Date().toISOString();
        const contextStr = Object.keys(context).length > 0 ? 
            ` [${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}]` : '';
        
        return `[${timestamp}] ${level}${contextStr}: ${message}`;
    }

    writeToFile(level, message, context = {}) {
        const logFile = path.join(this.logDir, `${level.toLowerCase()}_${new Date().toISOString().split('T')[0]}.log`);
        const formattedMessage = this.formatMessage(level, message, context);
        
        fs.appendFileSync(logFile, formattedMessage + '\n');
    }

    info(message, context = {}) {
        const formattedMessage = this.formatMessage('INFO', message, context);
        console.log(formattedMessage);
        this.writeToFile('INFO', message, context);
    }

    error(message, context = {}) {
        const formattedMessage = this.formatMessage('ERROR', message, context);
        console.error(formattedMessage);
        this.writeToFile('ERROR', message, context);
    }

    warn(message, context = {}) {
        const formattedMessage = this.formatMessage('WARN', message, context);
        console.warn(formattedMessage);
        this.writeToFile('WARN', message, context);
    }

    debug(message, context = {}) {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG === '1') {
            const formattedMessage = this.formatMessage('DEBUG', message, context);
            console.debug(formattedMessage);
            this.writeToFile('DEBUG', message, context);
        }
    }

    // Modül bazlı logging
    module(moduleName) {
        return {
            info: (message, context = {}) => this.info(message, { module: moduleName, ...context }),
            error: (message, context = {}) => this.error(message, { module: moduleName, ...context }),
            warn: (message, context = {}) => this.warn(message, { module: moduleName, ...context }),
            debug: (message, context = {}) => this.debug(message, { module: moduleName, ...context })
        };
    }
}

// Singleton instance
let loggerInstance = null;

function getLogger() {
    if (!loggerInstance) {
        loggerInstance = new Logger();
    }
    return loggerInstance;
}

module.exports = {
    Logger,
    getLogger
};
