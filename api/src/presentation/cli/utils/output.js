'use strict';

/**
 * CLI Output Formatter
 * Terminal çıktılarını formatlar
 */

// ANSI renk kodları
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Renkler
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Arka plan renkleri
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m'
};

/**
 * Başarı mesajı (yeşil)
 */
function formatSuccess(message) {
    return `${colors.green}${message}${colors.reset}`;
}

/**
 * Hata mesajı (kırmızı)
 */
function formatError(message) {
    return `${colors.red}${message}${colors.reset}`;
}

/**
 * Bilgi mesajı (mavi)
 */
function formatInfo(message) {
    return `${colors.cyan}${message}${colors.reset}`;
}

/**
 * Uyarı mesajı (sarı)
 */
function formatWarning(message) {
    return `${colors.yellow}${message}${colors.reset}`;
}

/**
 * Başlık (bold + mavi)
 */
function formatHeader(message) {
    return `${colors.bright}${colors.blue}${message}${colors.reset}`;
}

/**
 * Tablo formatla
 * @param {Array<Array<string>>} rows - Satırlar (ilk satır başlık)
 */
function formatTable(rows) {
    if (!rows || rows.length === 0) {
        return '';
    }

    // Kolon genişliklerini hesapla
    const colWidths = [];
    for (let i = 0; i < rows[0].length; i++) {
        const maxWidth = Math.max(...rows.map(row => (row[i] || '').toString().length));
        colWidths.push(maxWidth);
    }

    // Ayırıcı çizgi
    const separator = '─'.repeat(colWidths.reduce((a, b) => a + b + 3, 0) + 1);

    // Başlık (ilk satır)
    const header = rows[0].map((cell, i) => 
        cell.toString().padEnd(colWidths[i])
    ).join(' │ ');

    // Veri satırları
    const dataRows = rows.slice(1).map(row =>
        row.map((cell, i) => 
            cell.toString().padEnd(colWidths[i])
        ).join(' │ ')
    );

    return [
        separator,
        header,
        separator,
        ...dataRows,
        separator
    ].join('\n');
}

/**
 * Progress bar
 * @param {number} current - Mevcut değer
 * @param {number} total - Toplam değer
 * @param {number} width - Bar genişliği
 */
function formatProgress(current, total, width = 40) {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((width * current) / total);
    const empty = width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${percentage}% (${current}/${total})`;
}

module.exports = {
    colors,
    formatSuccess,
    formatError,
    formatInfo,
    formatWarning,
    formatHeader,
    formatTable,
    formatProgress
};

