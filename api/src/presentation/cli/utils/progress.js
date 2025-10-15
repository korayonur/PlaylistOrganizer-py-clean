'use strict';

/**
 * Progress Bar Utilities
 * Terminal için progress bar ve ilerleme göstergeleri
 */

/**
 * Progress bar oluştur
 * @param {number} current - Mevcut değer
 * @param {number} total - Toplam değer
 * @param {number} width - Bar genişliği
 * @returns {string} Progress bar
 */
function createProgressBar(current, total, width = 40) {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((width * current) / total);
    const empty = width - filled;
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    return `[${filledBar}${emptyBar}] ${percentage}%`;
}

/**
 * Progress line oluştur (tek satırda update)
 * @param {string} label - Progress etiketi
 * @param {number} current - Mevcut değer
 * @param {number} total - Toplam değer
 * @param {string} suffix - Ek bilgi
 */
function updateProgress(label, current, total, suffix = '') {
    const bar = createProgressBar(current, total, 30);
    const info = `${current.toLocaleString()}/${total.toLocaleString()}`;
    
    // Satır başına dön ve üzerine yaz
    process.stdout.write(`\r${label} ${bar} ${info} ${suffix}`);
    
    // Tamamlandıysa yeni satıra geç
    if (current >= total) {
        process.stdout.write('\n');
    }
}

/**
 * Progress temizle (bir sonraki işlem için)
 */
function clearProgress() {
    process.stdout.write('\r' + ' '.repeat(100) + '\r');
}

/**
 * Stage progress göster (çok aşamalı işlemler için)
 * @param {string} stageName - Aşama adı
 * @param {number} stageNum - Aşama numarası
 * @param {number} totalStages - Toplam aşama sayısı
 */
function showStage(stageName, stageNum, totalStages) {
    console.log(`\n[${ stageNum}/${totalStages}] ${stageName}`);
}

/**
 * Spinner (sonsuz işlemler için)
 */
class Spinner {
    constructor(message = 'İşleniyor...') {
        this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.message = message;
        this.frameIndex = 0;
        this.interval = null;
    }

    start() {
        this.interval = setInterval(() => {
            const frame = this.frames[this.frameIndex];
            process.stdout.write(`\r${frame} ${this.message}`);
            this.frameIndex = (this.frameIndex + 1) % this.frames.length;
        }, 80);
    }

    stop(finalMessage = '') {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        process.stdout.write('\r' + ' '.repeat(100) + '\r');
        if (finalMessage) {
            console.log(finalMessage);
        }
    }

    update(message) {
        this.message = message;
    }
}

module.exports = {
    createProgressBar,
    updateProgress,
    clearProgress,
    showStage,
    Spinner
};

