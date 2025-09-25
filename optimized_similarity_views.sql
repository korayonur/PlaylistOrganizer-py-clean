-- =====================================================
-- OPTİMİZE EDİLMİŞ BENZERLİK VIEW'LARI
-- CROSS JOIN yerine akıllı filtreleme kullanır
-- =====================================================

-- 1. BENZERLİK EŞLEŞMELERİ (Optimize Edilmiş)
CREATE VIEW IF NOT EXISTS v_optimized_similarity_matches AS
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
    'optimized_similarity' as match_type,
    similarity(t.normalizedFileName, mf.normalizedFileName) as match_confidence,
    word_similarity(t.normalizedFileName, mf.normalizedFileName) as word_confidence,
    t.created_at as track_created_at,
    t.updated_at as track_updated_at,
    1 as is_matched,
    mf.id as matched_music_file_id
FROM tracks t
INNER JOIN music_files mf ON (
    -- Önce uzunluk farkını kontrol et (performans için)
    ABS(LENGTH(t.normalizedFileName) - LENGTH(mf.normalizedFileName)) <= 20
    -- İlk karakter aynı mı (hızlı filtreleme)
    AND SUBSTR(t.normalizedFileName, 1, 1) = SUBSTR(mf.normalizedFileName, 1, 1)
    -- En az 3 karakter ortak (hızlı filtreleme)
    AND (
        t.normalizedFileName LIKE '%' || SUBSTR(mf.normalizedFileName, 1, 3) || '%'
        OR mf.normalizedFileName LIKE '%' || SUBSTR(t.normalizedFileName, 1, 3) || '%'
    )
)
WHERE t.path NOT IN (
    SELECT DISTINCT mf2.path 
    FROM music_files mf2 
    WHERE mf2.path IS NOT NULL 
      AND mf2.path != '' 
      AND mf2.path LIKE '/%'
)
AND NOT EXISTS (
    SELECT 1 FROM music_files mf3 
    WHERE mf3.fileName = t.fileName 
      AND mf3.fileName IS NOT NULL 
      AND mf3.fileName != ''
)
AND NOT EXISTS (
    SELECT 1 FROM music_files mf4 
    WHERE mf4.fileNameOnly = t.fileNameOnly 
      AND mf4.fileNameOnly IS NOT NULL 
      AND mf4.fileNameOnly != ''
)
AND NOT EXISTS (
    SELECT 1 FROM music_files mf5 
    WHERE mf5.normalizedFileName = t.normalizedFileName 
      AND mf5.normalizedFileName IS NOT NULL 
      AND mf5.normalizedFileName != ''
)
AND similarity(t.normalizedFileName, mf.normalizedFileName) >= 0.4  -- Düşük threshold
AND t.normalizedFileName IS NOT NULL 
AND t.normalizedFileName != ''
AND mf.normalizedFileName IS NOT NULL 
AND mf.normalizedFileName != '';

-- 2. EN İYİ BENZERLİK EŞLEŞMELERİ (Her track için en iyi)
CREATE VIEW IF NOT EXISTS v_best_optimized_similarity_matches AS
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
    'best_optimized_similarity' as match_type,
    similarity(t.normalizedFileName, mf.normalizedFileName) as match_confidence,
    word_similarity(t.normalizedFileName, mf.normalizedFileName) as word_confidence,
    t.created_at as track_created_at,
    t.updated_at as track_updated_at,
    1 as is_matched,
    mf.id as matched_music_file_id
FROM tracks t
INNER JOIN (
    SELECT 
        t2.id as track_id,
        mf2.id as music_file_id,
        similarity(t2.normalizedFileName, mf2.normalizedFileName) as sim_score,
        ROW_NUMBER() OVER (
            PARTITION BY t2.id 
            ORDER BY similarity(t2.normalizedFileName, mf2.normalizedFileName) DESC
        ) as rn
    FROM tracks t2
    INNER JOIN music_files mf2 ON (
        ABS(LENGTH(t2.normalizedFileName) - LENGTH(mf2.normalizedFileName)) <= 20
        AND SUBSTR(t2.normalizedFileName, 1, 1) = SUBSTR(mf2.normalizedFileName, 1, 1)
        AND (
            t2.normalizedFileName LIKE '%' || SUBSTR(mf2.normalizedFileName, 1, 3) || '%'
            OR mf2.normalizedFileName LIKE '%' || SUBSTR(t2.normalizedFileName, 1, 3) || '%'
        )
    )
    WHERE t2.path NOT IN (
        SELECT DISTINCT mf3.path 
        FROM music_files mf3 
        WHERE mf3.path IS NOT NULL 
          AND mf3.path != '' 
          AND mf3.path LIKE '/%'
    )
    AND NOT EXISTS (
        SELECT 1 FROM music_files mf4 
        WHERE mf4.fileName = t2.fileName 
          AND mf4.fileName IS NOT NULL 
          AND mf4.fileName != ''
    )
    AND NOT EXISTS (
        SELECT 1 FROM music_files mf5 
        WHERE mf5.fileNameOnly = t2.fileNameOnly 
          AND mf5.fileNameOnly IS NOT NULL 
          AND mf5.fileNameOnly != ''
    )
    AND NOT EXISTS (
        SELECT 1 FROM music_files mf6 
        WHERE mf6.normalizedFileName = t2.normalizedFileName 
          AND mf6.normalizedFileName IS NOT NULL 
          AND mf6.normalizedFileName != ''
    )
    AND similarity(t2.normalizedFileName, mf2.normalizedFileName) >= 0.3
    AND t2.normalizedFileName IS NOT NULL 
    AND t2.normalizedFileName != ''
    AND mf2.normalizedFileName IS NOT NULL 
    AND mf2.normalizedFileName != ''
) best_matches ON t.id = best_matches.track_id AND mf.id = best_matches.music_file_id
INNER JOIN music_files mf ON best_matches.music_file_id = mf.id
WHERE best_matches.rn = 1;

-- 3. BENZERLİK İSTATİSTİKLERİ (Optimize Edilmiş)
CREATE VIEW IF NOT EXISTS v_optimized_similarity_statistics AS
SELECT 
    'optimized_similarity_matches' as match_type,
    COUNT(*) as match_count,
    AVG(match_confidence) as avg_confidence,
    AVG(word_confidence) as avg_word_confidence,
    MIN(match_confidence) as min_confidence,
    MAX(match_confidence) as max_confidence,
    MIN(track_created_at) as first_match,
    MAX(track_updated_at) as last_match
FROM v_optimized_similarity_matches

UNION ALL

SELECT 
    'best_optimized_similarity_matches' as match_type,
    COUNT(*) as match_count,
    AVG(match_confidence) as avg_confidence,
    AVG(word_confidence) as avg_word_confidence,
    MIN(match_confidence) as min_confidence,
    MAX(match_confidence) as max_confidence,
    MIN(track_created_at) as first_match,
    MAX(track_updated_at) as last_match
FROM v_best_optimized_similarity_matches;
