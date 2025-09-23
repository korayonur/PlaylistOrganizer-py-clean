const fs = require('fs');
const path = require('path');

// Test M3U dosyasını oku
const testFile = '/Users/koray/Library/Application Support/VirtualDJ/History/2018-11-23.m3u';

console.log('=== DEBUG HISTORY SCAN ===');
console.log(`Test file: ${testFile}`);

if (!fs.existsSync(testFile)) {
    console.log('❌ Test file not found!');
    process.exit(1);
}

const fileContent = fs.readFileSync(testFile, 'utf8');
const lines = fileContent.split(/\r?\n/);

console.log(`Total lines: ${lines.length}`);

let trackCount = 0;
for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    
    console.log(`Line ${i + 1}: "${line}"`);
    
    if (!line || line.startsWith('#')) {
        console.log(`  → Skipped (empty or comment)`);
        continue;
    }
    
    if (line.toLowerCase().includes('.vdjcache')) {
        console.log(`  → Skipped (cache file)`);
        continue;
    }
    
    trackCount++;
    console.log(`  → ✅ TRACK FOUND: ${line}`);
}

console.log(`\n=== RESULT ===`);
console.log(`Total tracks found: ${trackCount}`);
