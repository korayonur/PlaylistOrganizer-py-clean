'use strict';

const Database = require('better-sqlite3');
const path = require('path');

/**
 * SQLite UDF (User Defined Function) - Levenshtein Distance
 * Benzerlik hesaplaması için SQL fonksiyonu
 */
class SQLiteSimilarityUDF {
    constructor(databasePath) {
        this.db = new Database(databasePath);
        this.setupUDF();
    }

    /**
     * UDF fonksiyonlarını kaydet
     */
    setupUDF() {
        // Levenshtein distance hesaplama
        this.db.function('levenshtein', (str1, str2) => {
            if (!str1 || !str2) return 0;
            return this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        });

        // Benzerlik oranı hesaplama (0.0 - 1.0)
        this.db.function('similarity', (str1, str2) => {
            if (!str1 || !str2) return 0;
            const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
            const maxLength = Math.max(str1.length, str2.length);
            return maxLength === 0 ? 1 : 1 - (distance / maxLength);
        });

        // Kelime bazlı benzerlik (daha gelişmiş)
        this.db.function('word_similarity', (str1, str2) => {
            if (!str1 || !str2) return 0;
            return this.calculateWordSimilarity(str1.toLowerCase(), str2.toLowerCase());
        });

        console.log('✅ SQLite UDF fonksiyonları yüklendi');
    }

    /**
     * Levenshtein distance hesapla
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;

        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,  // substitution
                        matrix[i][j - 1] + 1,      // insertion
                        matrix[i - 1][j] + 1       // deletion
                    );
                }
            }
        }

        return matrix[len2][len1];
    }

    /**
     * Kelime bazlı benzerlik hesapla
     */
    calculateWordSimilarity(str1, str2) {
        const words1 = str1.split(/\s+/).filter(w => w.length > 0);
        const words2 = str2.split(/\s+/).filter(w => w.length > 0);
        
        if (words1.length === 0 || words2.length === 0) return 0;

        let matchedWords = 0;
        const usedWords2 = new Set();

        for (const word1 of words1) {
            let bestMatch = null;
            let bestScore = 0;

            for (let i = 0; i < words2.length; i++) {
                if (usedWords2.has(i)) continue;

                const word2 = words2[i];
                const distance = this.levenshteinDistance(word1, word2);
                const maxLength = Math.max(word1.length, word2.length);
                const similarity = maxLength === 0 ? 1 : 1 - (distance / maxLength);

                if (similarity > bestScore) {
                    bestMatch = i;
                    bestScore = similarity;
                }
            }

            if (bestMatch !== null && bestScore > 0.6) { // Threshold
                matchedWords++;
                usedWords2.add(bestMatch);
            }
        }

        return matchedWords / words1.length;
    }

    /**
     * Test fonksiyonu
     */
    testSimilarity() {
        console.log('🧪 Benzerlik testleri:');
        
        const tests = [
            ['hello world', 'hello world'],
            ['hello world', 'hello word'],
            ['hello world', 'world hello'],
            ['hello world', 'hi world'],
            ['hello world', 'completely different'],
            ['billie eilish bad guy', 'billie eilish bad guy'],
            ['billie eilish bad guy', 'billie eilish bad guy remix'],
            ['billie eilish bad guy', 'billie bad guy'],
            ['billie eilish bad guy', 'completely different song']
        ];

        for (const [str1, str2] of tests) {
            const similarity = this.db.prepare('SELECT similarity(?, ?) as sim').get(str1, str2).sim;
            const wordSim = this.db.prepare('SELECT word_similarity(?, ?) as sim').get(str1, str2).sim;
            console.log(`"${str1}" vs "${str2}": similarity=${similarity.toFixed(3)}, word_sim=${wordSim.toFixed(3)}`);
        }
    }

    close() {
        this.db.close();
    }
}

module.exports = SQLiteSimilarityUDF;
