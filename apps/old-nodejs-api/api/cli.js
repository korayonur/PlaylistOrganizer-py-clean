#!/usr/bin/env node
'use strict';

/**
 * Playlist Organizer CLI Entry Point
 * Clean Architecture CLI implementation
 */

const setupCLI = require('./src/presentation/cli/index');

// CLI'yi başlat
const program = setupCLI();

// Komutları parse et ve çalıştır
program.parse(process.argv);

// Eğer komut verilmediyse help göster
if (!process.argv.slice(2).length) {
    program.outputHelp();
}

