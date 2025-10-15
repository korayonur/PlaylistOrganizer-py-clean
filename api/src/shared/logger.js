'use strict';

const fs = require('fs-extra');
const path = require('path');

/**
 * Ortak Logging Sistemi
 * Tüm modüller için merkezi log yönetimi
 * Console.log'ları otomatik olarak log dosyasına yazar
 */
class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../../../api/logs');
        this.ensureLogDir();
        this.interceptConsole();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    // Console.log'ları yakala ve log dosyasına yaz
    interceptConsole() {
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        // Console.log'u yakala
        console.log = (...args) => {
            originalConsoleLog(...args);
            this.writeConsoleToFile('CONSOLE', args.join(' '));
        };

        // Console.error'u yakala
        console.error = (...args) => {
            originalConsoleError(...args);
            this.writeConsoleToFile('ERROR', args.join(' '));
        };

        // Console.warn'u yakala
        console.warn = (...args) => {
            originalConsoleWarn(...args);
            this.writeConsoleToFile('WARN', args.join(' '));
        };
    }

    // Console mesajlarını log dosyasına yaz
    writeConsoleToFile(level, message) {
        const timestamp = new Date().toISOString();
        const logFile = path.join(this.logDir, `${level.toLowerCase()}_${new Date().toISOString().split('T')[0]}.log`);
        const formattedMessage = `[${timestamp}] ${level}: ${message}`;
        
        try {
            fs.appendFileSync(logFile, formattedMessage + '\n');
        } catch (error) {
            // Log yazma hatası olursa sessizce geç
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
        // Sadece dosyaya yaz, console.log'u tetikleme
        this.writeToFile('INFO', message, context);
        // Orijinal console.log'u kullan (intercept edilmiş değil)
        process.stdout.write(formattedMessage + '\n');
    }

    // Console.log'ları da log dosyasına yaz
    console(message, context = {}) {
        const formattedMessage = this.formatMessage('CONSOLE', message, context);
        console.log(formattedMessage);
        this.writeToFile('CONSOLE', message, context);
    }

    error(message, context = {}) {
        const formattedMessage = this.formatMessage('ERROR', message, context);
        // Sadece dosyaya yaz, console.error'u tetikleme
        this.writeToFile('ERROR', message, context);
        // Orijinal console.error'u kullan (intercept edilmiş değil)
        process.stderr.write(formattedMessage + '\n');
    }

    warn(message, context = {}) {
        const formattedMessage = this.formatMessage('WARN', message, context);
        // Sadece dosyaya yaz, console.warn'u tetikleme
        this.writeToFile('WARN', message, context);
        // Orijinal console.warn'u kullan (intercept edilmiş değil)
        process.stderr.write(formattedMessage + '\n');
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
