-- =====================================================
-- DİNAMİK VIEW'LAR - is_matched ve matched_music_file_id olmadan
-- Tüm eşleşme bilgileri dinamik olarak hesaplanıyor
-- =====================================================

-- 1. TAM EŞLEŞEN KAYITLAR (Exact Path Matches) - Dinamik
CREATE VIEW IF NOT EXISTS v_exact_path_matches AS
SELECT 
    t.id as track_id,
    t.path as track_path,
    t.fileName as track_fileName,
    t.fileNameOnly as track_fileNameOnly,
    t.normalizedFileName as track_normalized,
    t.source as track_source,
    t.source_file as track_source_file,
    mf.id as music_file_id,
    mf.path as music_file_path,
    mf.fileName as music_file_name,
    mf.fileNameOnly as music_file_nameOnly,
    mf.normalizedFileName as music_file_normalized,
    mf.extension as music_file_extension,
    mf.size as music_file_size,
    mf.modifiedTime as music_file_modified,
    'exact_path' as match_type,
    1.0 as match_confidence,
    t.created_at as track_created_at,
    t.updated_at as track_updated_at,
    1 as is_matched,
    mf.id as matched_music_file_id
FROM tracks t
INNER JOIN music_files mf ON t.path = mf.path
WHERE t.path IS NOT NULL 
  AND t.path != '' 
  AND t.path LIKE '/%';

-- 2. DOSYA ADI EŞLEŞMELERİ (Filename Matches) - Dinamik
CREATE VIEW IF NOT EXISTS v_filename_matches AS
SELECT 
    t.id as track_id,
    t.path as track_path,
    t.fileName as track_fileName,
    t.fileNameOnly as track_fileNameOnly,
    t.normalizedFileName as track_normalized,
    t.source as track_source,
    t.source_file as track_source_file,
    mf.id as music_file_id,
    mf.path as music_file_path,
    mf.fileName as music_file_name,
    mf.fileNameOnly as music_file_nameOnly,
    mf.normalizedFileName as music_file_normalized,
    mf.extension as music_file_extension,
    mf.size as music_file_size,
    mf.modifiedTime as music_file_modified,
    'filename' as match_type,
    0.9 as match_confidence,
    t.created_at as track_created_at,
    t.updated_at as track_updated_at,
    1 as is_matched,
    mf.id as matched_music_file_id
FROM tracks t
INNER JOIN music_files mf ON t.fileName = mf.fileName
WHERE t.path NOT IN (
    SELECT DISTINCT mf2.path 
    FROM music_files mf2 
    WHERE mf2.path IS NOT NULL 
      AND mf2.path != '' 
      AND mf2.path LIKE '/%'
)
AND t.fileName IS NOT NULL 
AND t.fileName != '';

-- 3. UZANTISIZ DOSYA ADI EŞLEŞMELERİ (Filename-Only Matches) - Dinamik
CREATE VIEW IF NOT EXISTS v_filename_only_matches AS
SELECT 
    t.id as track_id,
    t.path as track_path,
    t.fileName as track_fileName,
    t.fileNameOnly as track_fileNameOnly,
    t.normalizedFileName as track_normalized,
    t.source as track_source,
    t.source_file as track_source_file,
    mf.id as music_file_id,
    mf.path as music_file_path,
    mf.fileName as music_file_name,
    mf.fileNameOnly as music_file_nameOnly,
    mf.normalizedFileName as music_file_normalized,
    mf.extension as music_file_extension,
    mf.size as music_file_size,
    mf.modifiedTime as music_file_modified,
    'filename_only' as match_type,
    0.8 as match_confidence,
    t.created_at as track_created_at,
    t.updated_at as track_updated_at,
    1 as is_matched,
    mf.id as matched_music_file_id
FROM tracks t
INNER JOIN music_files mf ON t.fileNameOnly = mf.fileNameOnly
WHERE t.path NOT IN (
    SELECT DISTINCT mf2.path 
    FROM music_files mf2 
    WHERE mf2.path IS NOT NULL 
      AND mf2.path != '' 
      AND mf2.path LIKE '/%'
)
AND t.fileName != mf.fileName  -- Filename match değil
AND t.fileNameOnly IS NOT NULL 
AND t.fileNameOnly != '';

-- 4. NORMALIZE EDİLMİŞ DOSYA ADI EŞLEŞMELERİ (Normalized Matches) - Dinamik
CREATE VIEW IF NOT EXISTS v_normalized_matches AS
SELECT 
    t.id as track_id,
    t.path as track_path,
    t.fileName as track_fileName,
    t.fileNameOnly as track_fileNameOnly,
    t.normalizedFileName as track_normalized,
    t.source as track_source,
    t.source_file as track_source_file,
    mf.id as music_file_id,
    mf.path as music_file_path,
    mf.fileName as music_file_name,
    mf.fileNameOnly as music_file_nameOnly,
    mf.normalizedFileName as music_file_normalized,
    mf.extension as music_file_extension,
    mf.size as music_file_size,
    mf.modifiedTime as music_file_modified,
    'normalized' as match_type,
    0.7 as match_confidence,
    t.created_at as track_created_at,
    t.updated_at as track_updated_at,
    1 as is_matched,
    mf.id as matched_music_file_id
FROM tracks t
INNER JOIN music_files mf ON t.normalizedFileName = mf.normalizedFileName
WHERE t.path NOT IN (
    SELECT DISTINCT mf2.path 
    FROM music_files mf2 
    WHERE mf2.path IS NOT NULL 
      AND mf2.path != '' 
      AND mf2.path LIKE '/%'
)
AND t.fileName != mf.fileName  -- Filename match değil
AND t.fileNameOnly != mf.fileNameOnly  -- Filename-only match değil
AND t.normalizedFileName IS NOT NULL 
AND t.normalizedFileName != '';

-- 5. TAM EŞLEŞMEYEN KAYITLAR (Non-Exact Matches) - Dinamik
CREATE VIEW IF NOT EXISTS v_non_exact_matches AS
SELECT 
    t.id as track_id,
    t.path as track_path,
    t.fileName as track_fileName,
    t.fileNameOnly as track_fileNameOnly,
    t.normalizedFileName as track_normalized,
    t.source as track_source,
    t.source_file as track_source_file,
    t.created_at as track_created_at,
    t.updated_at as track_updated_at,
    'non_exact' as match_type,
    0.0 as match_confidence,
    0 as is_matched,
    NULL as matched_music_file_id
FROM tracks t
WHERE t.path NOT IN (
    SELECT DISTINCT mf.path 
    FROM music_files mf 
    WHERE mf.path IS NOT NULL 
      AND mf.path != '' 
      AND mf.path LIKE '/%'
)
AND NOT EXISTS (
    SELECT 1 FROM music_files mf 
    WHERE mf.fileName = t.fileName 
      AND mf.fileName IS NOT NULL 
      AND mf.fileName != ''
)
AND NOT EXISTS (
    SELECT 1 FROM music_files mf 
    WHERE mf.fileNameOnly = t.fileNameOnly 
      AND mf.fileNameOnly IS NOT NULL 
      AND mf.fileNameOnly != ''
)
AND NOT EXISTS (
    SELECT 1 FROM music_files mf 
    WHERE mf.normalizedFileName = t.normalizedFileName 
      AND mf.normalizedFileName IS NOT NULL 
      AND mf.normalizedFileName != ''
);

-- 6. EŞLEŞMEMİŞ KAYITLAR (Unmatched Records) - Dinamik
CREATE VIEW IF NOT EXISTS v_unmatched_tracks AS
SELECT 
    t.id as track_id,
    t.path as track_path,
    t.fileName as track_fileName,
    t.fileNameOnly as track_fileNameOnly,
    t.normalizedFileName as track_normalized,
    t.source as track_source,
    t.source_file as track_source_file,
    t.created_at as track_created_at,
    t.updated_at as track_updated_at,
    'unmatched' as status,
    CASE 
        WHEN t.path IS NULL OR t.path = '' OR t.path NOT LIKE '/%' THEN 'invalid_path'
        WHEN t.fileName IS NULL OR t.fileName = '' THEN 'no_filename'
        ELSE 'no_match'
    END as unmatched_reason,
    0 as is_matched,
    NULL as matched_music_file_id
FROM tracks t
WHERE t.path NOT IN (
    SELECT DISTINCT mf.path 
    FROM music_files mf 
    WHERE mf.path IS NOT NULL 
      AND mf.path != '' 
      AND mf.path LIKE '/%'
)
AND NOT EXISTS (
    SELECT 1 FROM music_files mf 
    WHERE mf.fileName = t.fileName 
      AND mf.fileName IS NOT NULL 
      AND mf.fileName != ''
)
AND NOT EXISTS (
    SELECT 1 FROM music_files mf 
    WHERE mf.fileNameOnly = t.fileNameOnly 
      AND mf.fileNameOnly IS NOT NULL 
      AND mf.fileNameOnly != ''
)
AND NOT EXISTS (
    SELECT 1 FROM music_files mf 
    WHERE mf.normalizedFileName = t.normalizedFileName 
      AND mf.normalizedFileName IS NOT NULL 
      AND mf.normalizedFileName != ''
);

-- 7. TÜM EŞLEŞMELERİN ÖZETİ (All Matches Summary) - Dinamik
CREATE VIEW IF NOT EXISTS v_all_matches_summary AS
SELECT 
    match_type,
    COUNT(*) as match_count,
    AVG(match_confidence) as avg_confidence,
    MIN(track_created_at) as first_match,
    MAX(track_updated_at) as last_match
FROM (
    SELECT 'exact_path' as match_type, match_confidence, track_created_at, track_updated_at FROM v_exact_path_matches
    UNION ALL
    SELECT 'filename' as match_type, match_confidence, track_created_at, track_updated_at FROM v_filename_matches
    UNION ALL
    SELECT 'filename_only' as match_type, match_confidence, track_created_at, track_updated_at FROM v_filename_only_matches
    UNION ALL
    SELECT 'normalized' as match_type, match_confidence, track_created_at, track_updated_at FROM v_normalized_matches
) matches
GROUP BY match_type;

-- 8. TÜM EŞLEŞMELER (All Matches) - Dinamik
CREATE VIEW IF NOT EXISTS v_all_matches AS
SELECT * FROM v_exact_path_matches
UNION ALL
SELECT * FROM v_filename_matches
UNION ALL
SELECT * FROM v_filename_only_matches
UNION ALL
SELECT * FROM v_normalized_matches;
