using System;
using System.Collections.Generic;
using System.Linq;
using PlaylistOrganizerAvalonia.Shared.Services;

namespace PlaylistOrganizerAvalonia.Application.Services
{
    /// <summary>
    /// Hibrit benzerlik hesaplayıcı: Kelime + Harf bazlı algoritma
    /// </summary>
    public class HybridSimilarityCalculator
    {
        /// <summary>
        /// Ana benzerlik hesaplama (0.0 - 1.0)
        /// Kelime bazlı (70%) + Harf bazlı (30%)
        /// </summary>
        public double CalculateSimilarity(string str1, string str2)
        {
            // Normalize
            var normalized1 = StringNormalizationService.NormalizeFileName(str1);
            var normalized2 = StringNormalizationService.NormalizeFileName(str2);

            if (normalized1 == normalized2)
                return 1.0;

            // Kelimelere ayır
            var words1 = normalized1.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList();
            var words2 = normalized2.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList();

            // 1. KELİME BAZLI EŞLEŞME (70% ağırlık) - ÖNCELİKLİ
            var wordScore = CalculateWordLevelSimilarity(words1, words2);

            // 2. HARF BAZLI EŞLEŞME (30% ağırlık) - İKİNCİL
            var charScore = CalculateCharacterLevelSimilarity(normalized1, normalized2);

            // Weighted average
            return (wordScore * 0.7) + (charScore * 0.3);
        }

        /// <summary>
        /// Kelime seviyesinde benzerlik (ÖNCELİKLİ)
        /// </summary>
        private double CalculateWordLevelSimilarity(List<string> words1, List<string> words2)
        {
            if (words1.Count == 0 && words2.Count == 0) return 1.0;
            if (words1.Count == 0 || words2.Count == 0) return 0;

            // A. EXACT WORD MATCHES (tam eşleşen kelimeler)
            // Query'deki unique kelimeleri bul (arama sorgusu genelde kısa)
            var uniqueWords1 = words1.Distinct().ToList();
            var uniqueWords2 = words2.Distinct().ToList();
            
            // Query'deki unique kelimelerin ne kadarının dosyada olduğunu hesapla
            var exactMatches = uniqueWords1.Intersect(uniqueWords2).Count();
            
            // Query'deki tüm unique kelimeler dosyada varsa, yüksek skor ver
            // Eğer query kısa ise (1-3 kelime), tüm kelimelerin eşleşmesi çok önemli
            var queryCoverage = uniqueWords1.Count > 0 
                ? (double)exactMatches / uniqueWords1.Count 
                : 0;
            
            // Dosyadaki kelimelerin ne kadarının query'de olduğunu da hesapla (daha az önemli)
            var fileCoverage = uniqueWords2.Count > 0 
                ? (double)exactMatches / uniqueWords2.Count 
                : 0;
            
            // Query coverage daha önemli (query'deki kelimelerin hepsi dosyada olmalı)
            // Ama dosya coverage de önemli (dosya çok uzunsa, query'deki kelimelerin oranı düşer)
            var exactRatio = (queryCoverage * 0.7) + (fileCoverage * 0.3);
            
            // Eğer query'deki TÜM unique kelimeler dosyada varsa, yüksek bonus ver
            // Bu çok önemli bir sinyal - query'deki her şey dosyada var!
            if (queryCoverage >= 1.0 && uniqueWords1.Count >= 2)
            {
                exactRatio = Math.Min(1.0, exactRatio + 0.15); // %15 bonus
            }

            // B. FUZZY WORD MATCHES (kelime içi harf benzerliği)
            var fuzzyMatches = 0;
            var matchedWords2 = new HashSet<int>();

            foreach (var word1 in words1)
            {
                double bestMatch = 0;
                int bestIndex = -1;

                for (int i = 0; i < words2.Count; i++)
                {
                    if (matchedWords2.Contains(i)) continue;

                    // Her kelimeyi HARF BAZLI benzerlik ile karşılaştır
                    var similarity = CalculateWordCharacterSimilarity(word1, words2[i]);

                    if (similarity > bestMatch && similarity >= 0.7) // %70 eşik
                    {
                        bestMatch = similarity;
                        bestIndex = i;
                    }
                }

                if (bestIndex >= 0)
                {
                    fuzzyMatches++;
                    matchedWords2.Add(bestIndex);
                }
            }

            var fuzzyRatio = words1.Count > 0 ? (double)fuzzyMatches / words1.Count : 0;

            // C. KELİME SIRASI BENZERLİĞİ
            var orderScore = CalculateWordOrderSimilarity(words1, words2);

            // D. BAŞLANGIÇ KELİMESİ EŞLEŞMESİ
            var startsWithBonus = words1.Count > 0 && words2.Count > 0 && words1[0] == words2[0] ? 0.1 : 0;

            // E. ARDIŞIK KELİME EŞLEŞMESİ
            var consecutiveBonus = CalculateConsecutiveWordsBonus(words1, words2);

            // Weighted combination
            return Math.Min(1.0,
                (exactRatio * 0.4) +           // Exact matches
                (fuzzyRatio * 0.3) +          // Fuzzy word matches (HARF BAZLI KELİME İÇİ)
                (orderScore * 0.2) +           // Word order
                (startsWithBonus) +             // Başlangıç bonusu
                (consecutiveBonus * 0.1)       // Ardışık kelime bonusu
            );
        }

        /// <summary>
        /// Kelime içi harf benzerliği (her kelimeyi ayrı ayrı)
        /// </summary>
        private double CalculateWordCharacterSimilarity(string word1, string word2)
        {
            if (word1 == word2) return 1.0;

            // Kısa kelimeler için basit edit distance
            if (word1.Length <= 3 || word2.Length <= 3)
            {
                var distance = LevenshteinDistance(word1, word2);
                var maxLen = Math.Max(word1.Length, word2.Length);
                return maxLen > 0 ? 1.0 - (double)distance / maxLen : 0;
            }

            // Uzun kelimeler için hibrit (edit + ngram)
            var editScore = CalculateEditDistance(word1, word2);
            var ngramScore = CalculateNgramSimilarity(word1, word2, 2);
            var prefixScore = CalculatePrefixSimilarity(word1, word2);

            return (editScore * 0.5) + (ngramScore * 0.3) + (prefixScore * 0.2);
        }

        /// <summary>
        /// String seviyesinde harf benzerliği (tüm string için)
        /// </summary>
        private double CalculateCharacterLevelSimilarity(string s1, string s2)
        {
            var editScore = CalculateEditDistance(s1, s2);
            var ngramScore = s1.Length < 30 && s2.Length < 30
                ? CalculateNgramSimilarity(s1, s2, 2)
                : 0;
            var prefixScore = CalculatePrefixSimilarity(s1, s2);

            return (editScore * 0.6) + (ngramScore * 0.2) + (prefixScore * 0.2);
        }

        /// <summary>
        /// Kelime sırası benzerliği
        /// </summary>
        private double CalculateWordOrderSimilarity(List<string> words1, List<string> words2)
        {
            int matches = 0;
            int maxLen = Math.Max(words1.Count, words2.Count);

            for (int i = 0; i < Math.Min(words1.Count, words2.Count); i++)
            {
                if (words1[i] == words2[i]) matches++;
            }

            return maxLen > 0 ? (double)matches / maxLen : 0;
        }

        /// <summary>
        /// Ardışık kelime bonusu
        /// </summary>
        private double CalculateConsecutiveWordsBonus(List<string> words1, List<string> words2)
        {
            int consecutivePairs = 0;

            for (int i = 0; i < words1.Count - 1; i++)
            {
                for (int j = 0; j < words2.Count - 1; j++)
                {
                    if (words1[i] == words2[j] && words1[i + 1] == words2[j + 1])
                    {
                        consecutivePairs++;
                    }
                }
            }

            int maxPairs = Math.Max(words1.Count - 1, words2.Count - 1);
            return maxPairs > 0 ? Math.Min(0.2, (double)consecutivePairs / maxPairs) : 0;
        }

        /// <summary>
        /// Edit Distance (Levenshtein)
        /// </summary>
        private double CalculateEditDistance(string s1, string s2)
        {
            if (Math.Abs(s1.Length - s2.Length) > 3) return 0;

            int distance = LevenshteinDistance(s1, s2);
            int maxLen = Math.Max(s1.Length, s2.Length);

            return maxLen > 0 ? Math.Max(0, 1.0 - (double)distance / maxLen) : 0;
        }

        /// <summary>
        /// Levenshtein Distance hesaplama
        /// </summary>
        private int LevenshteinDistance(string s1, string s2)
        {
            var matrix = new int[s1.Length + 1, s2.Length + 1];

            for (int i = 0; i <= s1.Length; i++)
                matrix[i, 0] = i;

            for (int j = 0; j <= s2.Length; j++)
                matrix[0, j] = j;

            for (int i = 1; i <= s1.Length; i++)
            {
                for (int j = 1; j <= s2.Length; j++)
                {
                    var cost = s1[i - 1] == s2[j - 1] ? 0 : 1;
                    matrix[i, j] = Math.Min(
                        Math.Min(matrix[i - 1, j] + 1, matrix[i, j - 1] + 1),
                        matrix[i - 1, j - 1] + cost);
                }
            }

            return matrix[s1.Length, s2.Length];
        }

        /// <summary>
        /// N-gram Similarity
        /// </summary>
        private double CalculateNgramSimilarity(string s1, string s2, int n = 2)
        {
            var ngrams1 = GetNgrams(s1, n);
            var ngrams2 = GetNgrams(s2, n);

            if (ngrams1.Count == 0 && ngrams2.Count == 0) return 1.0;
            if (ngrams1.Count == 0 || ngrams2.Count == 0) return 0;

            var intersection = ngrams1.Intersect(ngrams2).Count();
            var union = ngrams1.Union(ngrams2).Count();

            return (double)intersection / union;
        }

        /// <summary>
        /// N-gram'ları çıkar
        /// </summary>
        private HashSet<string> GetNgrams(string str, int n)
        {
            var ngrams = new HashSet<string>();
            for (int i = 0; i <= str.Length - n; i++)
            {
                ngrams.Add(str.Substring(i, n));
            }
            return ngrams;
        }

        /// <summary>
        /// Prefix/Suffix Similarity
        /// </summary>
        private double CalculatePrefixSimilarity(string s1, string s2)
        {
            int minLen = Math.Min(s1.Length, s2.Length);
            int maxLen = Math.Max(s1.Length, s2.Length);

            // Prefix
            int prefixMatch = 0;
            for (int i = 0; i < minLen; i++)
            {
                if (s1[i] == s2[i]) prefixMatch++;
                else break;
            }

            // Suffix
            int suffixMatch = 0;
            for (int i = 1; i <= minLen; i++)
            {
                if (s1[s1.Length - i] == s2[s2.Length - i]) suffixMatch++;
                else break;
            }

            var prefixScore = (double)prefixMatch / maxLen;
            var suffixScore = (double)suffixMatch / maxLen;
            var lengthPenalty = 1.0 - Math.Abs(s1.Length - s2.Length) / (double)maxLen;

            return (prefixScore + suffixScore + lengthPenalty) / 3.0;
        }
    }
}

