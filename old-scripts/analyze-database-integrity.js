#!/usr/bin/env node

/**
 * Veritabanı Tutarlılık Analizi
 * Tüm tablolar arası tutarsızlıkları tespit eder
 */

const { getDatabase } = require('./shared/database');
const fs = require('fs');
const path = require('path');
const kelimeArama = require('./shared/kelime-arama-servisi');

const db = getDatabase().getDatabase();

console.log('═══════════════════════════════════════════════════════');
console.log('  VERİTABANI TUTARLILIK ANALİZİ');
console.log('═══════════════════════════════════════════════════════');
console.log('');

const results = {
    pathMismatches: {},
    normalizationIssues: {},
    wordIndexIssues: {},
    uniqueConstraintIssues: {},
    totalIssues: 0
};

// ============================================================================
// 1. PATH EŞLEŞME SORUNLARI
// ============================================================================

console.log('📊 1. PATH EŞLEŞME SORUNLARI');
console.log('─────────────────────────────────────────────────────');

// music_files var, music_words yok
console.log('   Kontrol: music_files var, music_words yok...');
const filesWithoutWords = db.prepare(`
    SELECT mf.path, mf.fileName
    FROM music_files mf
    LEFT JOIN (SELECT DISTINCT music_path FROM music_words) mw ON mf.path = mw.music_path
    WHERE mw.music_path IS NULL
`).all();
results.pathMismatches.filesWithoutWords = filesWithoutWords.length;
console.log(`   ✓ Sonuç: ${filesWithoutWords.length} dosya`);

// music_words var, music_files yok (orphan words)
console.log('   Kontrol: music_words var, music_files yok...');
const wordsWithoutFiles = db.prepare(`
    SELECT DISTINCT mw.music_path
    FROM music_words mw
    LEFT JOIN music_files mf ON mw.music_path = mf.path
    WHERE mf.path IS NULL
`).all();
results.pathMismatches.wordsWithoutFiles = wordsWithoutFiles.length;
console.log(`   ✓ Sonuç: ${wordsWithoutFiles.length} orphan path`);

// tracks var, track_words yok
console.log('   Kontrol: tracks var, track_words yok...');
const tracksWithoutWords = db.prepare(`
    SELECT t.path, t.fileName
    FROM tracks t
    LEFT JOIN (SELECT DISTINCT track_path FROM track_words) tw ON t.path = tw.track_path
    WHERE tw.track_path IS NULL
`).all();
results.pathMismatches.tracksWithoutWords = tracksWithoutWords.length;
console.log(`   ✓ Sonuç: ${tracksWithoutWords.length} track`);

// Orphan tracks (playlist'e bağlı olmayan)
console.log('   Kontrol: Orphan tracks (playlist\'e bağlı olmayan)...');
const orphanTracks = db.prepare(`
    SELECT t.id, t.path, t.fileName
    FROM tracks t
    LEFT JOIN playlist_tracks pt ON t.id = pt.track_id
    WHERE pt.track_id IS NULL
`).all();
results.pathMismatches.orphanTracks = orphanTracks.length;
console.log(`   ✓ Sonuç: ${orphanTracks.length} orphan track`);

// Empty playlists
console.log('   Kontrol: Empty playlists (track\'i olmayan)...');
const emptyPlaylists = db.prepare(`
    SELECT p.id, p.name, p.path
    FROM playlists p
    LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
    WHERE pt.playlist_id IS NULL
`).all();
results.pathMismatches.emptyPlaylists = emptyPlaylists.length;
console.log(`   ✓ Sonuç: ${emptyPlaylists.length} empty playlist`);

// FOREIGN KEY violations - invalid playlist_id
console.log('   Kontrol: FOREIGN KEY violations (playlist_id)...');
const invalidPlaylistRefs = db.prepare(`
    SELECT pt.id, pt.playlist_id, pt.track_id
    FROM playlist_tracks pt
    LEFT JOIN playlists p ON pt.playlist_id = p.id
    WHERE p.id IS NULL
`).all();
results.pathMismatches.invalidPlaylistRefs = invalidPlaylistRefs.length;
console.log(`   ✓ Sonuç: ${invalidPlaylistRefs.length} invalid playlist_id`);

// FOREIGN KEY violations - invalid track_id
console.log('   Kontrol: FOREIGN KEY violations (track_id)...');
const invalidTrackRefs = db.prepare(`
    SELECT pt.id, pt.playlist_id, pt.track_id
    FROM playlist_tracks pt
    LEFT JOIN tracks t ON pt.track_id = t.id
    WHERE t.id IS NULL
`).all();
results.pathMismatches.invalidTrackRefs = invalidTrackRefs.length;
console.log(`   ✓ Sonuç: ${invalidTrackRefs.length} invalid track_id`);

console.log('');

// ============================================================================
// 2. NORMALİZASYON TUTARSIZLIKLARI
// ============================================================================

console.log('📊 2. NORMALİZASYON TUTARSIZLIKLARI');
console.log('─────────────────────────────────────────────────────');

// music_files normalization
console.log('   Kontrol: music_files normalizasyon tutarlılığı...');
const files = db.prepare('SELECT path, fileName, normalizedFileName FROM music_files LIMIT 1000').all();
const musicNormalizationIssues = [];

for (const file of files) {
    const expectedNormalized = kelimeArama.normalize(file.fileName);
    if (file.normalizedFileName !== expectedNormalized) {
        musicNormalizationIssues.push({
            path: file.path,
            current: file.normalizedFileName,
            expected: expectedNormalized
        });
    }
}
results.normalizationIssues.musicFiles = musicNormalizationIssues.length;
console.log(`   ✓ Sonuç: ${musicNormalizationIssues.length} tutarsızlık (ilk 1000 dosyadan)`);

// tracks normalization
console.log('   Kontrol: tracks normalizasyon tutarlılığı...');
const tracks = db.prepare('SELECT path, fileName, normalizedFileName FROM tracks LIMIT 1000').all();
const trackNormalizationIssues = [];

for (const track of tracks) {
    const expectedNormalized = kelimeArama.normalize(track.fileName);
    if (track.normalizedFileName !== expectedNormalized) {
        trackNormalizationIssues.push({
            path: track.path,
            current: track.normalizedFileName,
            expected: expectedNormalized
        });
    }
}
results.normalizationIssues.tracks = trackNormalizationIssues.length;
console.log(`   ✓ Sonuç: ${trackNormalizationIssues.length} tutarsızlık (ilk 1000 track'ten)`);

console.log('');

// ============================================================================
// 3. KELİME İNDEKSİ SORUNLARI
// ============================================================================

console.log('📊 3. KELİME İNDEKSİ SORUNLARI');
console.log('─────────────────────────────────────────────────────');

// Anormal kelime sayısı (music_words)
console.log('   Kontrol: Anormal kelime sayısı (music_words)...');
const abnormalMusicWordCount = db.prepare(`
    SELECT 
        music_path,
        COUNT(*) as word_count
    FROM music_words
    GROUP BY music_path
    HAVING word_count < 2
`).all();
results.wordIndexIssues.abnormalMusicWordCount = abnormalMusicWordCount.length;
console.log(`   ✓ Sonuç: ${abnormalMusicWordCount.length} dosya (<2 kelime - tek kelimeli dosyalar)`);

// Anormal kelime sayısı (track_words)
console.log('   Kontrol: Anormal kelime sayısı (track_words)...');
const abnormalTrackWordCount = db.prepare(`
    SELECT 
        track_path,
        COUNT(*) as word_count
    FROM track_words
    GROUP BY track_path
    HAVING word_count < 2
`).all();
results.wordIndexIssues.abnormalTrackWordCount = abnormalTrackWordCount.length;
console.log(`   ✓ Sonuç: ${abnormalTrackWordCount.length} track (<2 kelime - tek kelimeli track'ler)`);

// Duplicate word positions (music_words)
console.log('   Kontrol: Duplicate word positions (music_words)...');
const duplicateMusicPositions = db.prepare(`
    SELECT music_path, word, word_position, COUNT(*) as count
    FROM music_words
    GROUP BY music_path, word, word_position
    HAVING count > 1
`).all();
results.wordIndexIssues.duplicateMusicPositions = duplicateMusicPositions.length;
console.log(`   ✓ Sonuç: ${duplicateMusicPositions.length} duplicate pozisyon`);

// Duplicate word positions (track_words)
console.log('   Kontrol: Duplicate word positions (track_words)...');
const duplicateTrackPositions = db.prepare(`
    SELECT track_path, word, word_position, COUNT(*) as count
    FROM track_words
    GROUP BY track_path, word, word_position
    HAVING count > 1
`).all();
results.wordIndexIssues.duplicateTrackPositions = duplicateTrackPositions.length;
console.log(`   ✓ Sonuç: ${duplicateTrackPositions.length} duplicate pozisyon`);

console.log('');

// ============================================================================
// 4. UNIQUE CONSTRAINT SORUNLARI
// ============================================================================

console.log('📊 4. UNIQUE CONSTRAINT SORUNLARI');
console.log('─────────────────────────────────────────────────────');

// Duplicate music_files paths
console.log('   Kontrol: Duplicate music_files paths...');
const duplicateMusicFiles = db.prepare(`
    SELECT path, COUNT(*) as count
    FROM music_files
    GROUP BY path
    HAVING count > 1
`).all();
results.uniqueConstraintIssues.duplicateMusicFiles = duplicateMusicFiles.length;
console.log(`   ✓ Sonuç: ${duplicateMusicFiles.length} duplicate path`);

// Duplicate tracks paths
console.log('   Kontrol: Duplicate tracks paths...');
const duplicateTracks = db.prepare(`
    SELECT path, COUNT(*) as count
    FROM tracks
    GROUP BY path
    HAVING count > 1
`).all();
results.uniqueConstraintIssues.duplicateTracks = duplicateTracks.length;
console.log(`   ✓ Sonuç: ${duplicateTracks.length} duplicate path`);

// Duplicate playlist_tracks
console.log('   Kontrol: Duplicate playlist_tracks...');
const duplicatePlaylistTracks = db.prepare(`
    SELECT playlist_id, track_id, COUNT(*) as count
    FROM playlist_tracks
    GROUP BY playlist_id, track_id
    HAVING count > 1
`).all();
results.uniqueConstraintIssues.duplicatePlaylistTracks = duplicatePlaylistTracks.length;
console.log(`   ✓ Sonuç: ${duplicatePlaylistTracks.length} duplicate playlist-track çifti`);

console.log('');

// ============================================================================
// TOPLAM SORUN SAYISI
// ============================================================================

results.totalIssues = Object.values(results.pathMismatches).reduce((a, b) => a + b, 0) +
                      Object.values(results.normalizationIssues).reduce((a, b) => a + b, 0) +
                      Object.values(results.wordIndexIssues).reduce((a, b) => a + b, 0) +
                      Object.values(results.uniqueConstraintIssues).reduce((a, b) => a + b, 0);

// ============================================================================
// RAPOR OLUŞTUR
// ============================================================================

const reportPath = path.join(__dirname, '../database-integrity-report.md');
const timestamp = new Date().toISOString();

let report = `# Veritabanı Tutarlılık Raporu

**Oluşturulma Tarihi:** ${timestamp}

## Özet

- **Toplam tespit edilen sorun:** ${results.totalIssues}

## 1. Path Eşleşme Sorunları

| Sorun Türü | Sayı |
|------------|------|
| music_files var, music_words yok | ${results.pathMismatches.filesWithoutWords} |
| music_words var, music_files yok (orphan) | ${results.pathMismatches.wordsWithoutFiles} |
| tracks var, track_words yok | ${results.pathMismatches.tracksWithoutWords} |
| Orphan tracks (playlist'e bağlı olmayan) | ${results.pathMismatches.orphanTracks} |
| Empty playlists (track'i olmayan) | ${results.pathMismatches.emptyPlaylists} |
| FOREIGN KEY violations (playlist_id) | ${results.pathMismatches.invalidPlaylistRefs} |
| FOREIGN KEY violations (track_id) | ${results.pathMismatches.invalidTrackRefs} |

## 2. Normalizasyon Sorunları

| Sorun Türü | Sayı |
|------------|------|
| music_files tutarsız normalizasyon | ${results.normalizationIssues.musicFiles} |
| tracks tutarsız normalizasyon | ${results.normalizationIssues.tracks} |

## 3. Kelime İndeksi Sorunları

| Sorun Türü | Sayı |
|------------|------|
| Anormal music_words sayısı (<2 veya >100) | ${results.wordIndexIssues.abnormalMusicWordCount} |
| Anormal track_words sayısı (<2 veya >100) | ${results.wordIndexIssues.abnormalTrackWordCount} |
| Duplicate music_words positions | ${results.wordIndexIssues.duplicateMusicPositions} |
| Duplicate track_words positions | ${results.wordIndexIssues.duplicateTrackPositions} |

## 4. UNIQUE Constraint Sorunları

| Sorun Türü | Sayı |
|------------|------|
| Duplicate music_files paths | ${results.uniqueConstraintIssues.duplicateMusicFiles} |
| Duplicate tracks paths | ${results.uniqueConstraintIssues.duplicateTracks} |
| Duplicate playlist_tracks | ${results.uniqueConstraintIssues.duplicatePlaylistTracks} |

---

## Önerilen Aksiyonlar

`;

const actions = [];

if (results.pathMismatches.wordsWithoutFiles > 0) {
    actions.push('1. `node nodejs-api/fix-music-words-orphans.js` - Orphan music_words kayıtlarını düzelt');
}

if (results.pathMismatches.filesWithoutWords > 0) {
    actions.push('2. `node nodejs-api/rebuild-missing-word-indexes.js` - Eksik kelime indekslerini oluştur');
}

if (results.pathMismatches.orphanTracks > 0) {
    actions.push('3. `node nodejs-api/fix-orphan-tracks.js` - Orphan track\'leri temizle');
}

if (results.pathMismatches.invalidPlaylistRefs > 0 || results.pathMismatches.invalidTrackRefs > 0) {
    actions.push('4. `node nodejs-api/fix-foreign-key-violations.js` - FOREIGN KEY ihlallerini düzelt');
}

if (results.normalizationIssues.musicFiles > 0 || results.normalizationIssues.tracks > 0) {
    actions.push('5. `node nodejs-api/rebuild-all-normalizations.js` - Normalizasyonları yeniden oluştur (isteğe bağlı)');
}

if (actions.length === 0) {
    report += '✅ Hiçbir sorun tespit edilmedi! Veritabanı tutarlı durumda.\n';
} else {
    report += actions.join('\n') + '\n';
}

report += `
---

## Detaylı Veriler

### Orphan music_words Örnekleri (İlk 10)

\`\`\`
${wordsWithoutFiles.slice(0, 10).map(w => w.music_path).join('\n')}
\`\`\`

### music_files kelime indeksi olmayan Örnekleri (İlk 10)

\`\`\`
${filesWithoutWords.slice(0, 10).map(f => f.fileName).join('\n')}
\`\`\`

### Orphan tracks Örnekleri (İlk 10)

\`\`\`
${orphanTracks.slice(0, 10).map(t => t.fileName).join('\n')}
\`\`\`
`;

fs.writeFileSync(reportPath, report);

console.log('═══════════════════════════════════════════════════════');
console.log('  RAPOR OLUŞTURULDU');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log(`📄 Rapor: ${reportPath}`);
console.log(`🔍 Toplam Sorun: ${results.totalIssues}`);
console.log('');

if (results.totalIssues > 0) {
    console.log('⚠️  Sorunlar tespit edildi! Lütfen raporu inceleyin ve düzeltme scriptlerini çalıştırın.');
} else {
    console.log('✅ Veritabanı tutarlı durumda!');
}

console.log('');

// JSON formatında da kaydet (script'ler için)
const jsonPath = path.join(__dirname, '../database-integrity-report.json');
fs.writeFileSync(jsonPath, JSON.stringify({
    timestamp,
    results,
    detailedData: {
        filesWithoutWords: filesWithoutWords.slice(0, 100),
        wordsWithoutFiles: wordsWithoutFiles.slice(0, 100),
        orphanTracks: orphanTracks.slice(0, 100),
        invalidPlaylistRefs: invalidPlaylistRefs.slice(0, 100),
        invalidTrackRefs: invalidTrackRefs.slice(0, 100)
    }
}, null, 2));

console.log(`📊 JSON Rapor: ${jsonPath}`);
console.log('');

