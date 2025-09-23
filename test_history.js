const fs = require('fs');
const path = require('path');

// Test M3U dosyasını oku
const filePath = '/Users/koray/Library/Application Support/VirtualDJ/History/2018-11-23.m3u';
const fileContent = fs.readFileSync(filePath, 'utf8');
const lines = fileContent.split(/\r?\n/);

console.log(`Total lines: ${lines.length}`);

let trackCount = 0;
for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
        continue;
    }
    
    if (line.toLowerCase().includes('.vdjcache')) {
        continue;
    }
    
    trackCount++;
    console.log(`Track ${trackCount}: ${line}`);
}

console.log(`Total tracks found: ${trackCount}`);
