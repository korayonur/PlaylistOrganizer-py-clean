/**
 * SPESİFİK DOSYA EŞLEŞMESİ DEBUG ARACI
 */

const fs = require('fs');
const path = require('path');

class SpecificMatchDebugger {
    constructor() {
        this.musicDatabase = null;
    }

    async loadDatabase() {
        if (this.musicDatabase) return this.musicDatabase;
        
        try {
            const dbPath = '/Users/koray/projects/PlaylistOrganizer-py/musicfiles.db.json';
            const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            this.musicDatabase = dbData;
            console.log(`📊 Veritabanı yüklendi: ${dbData.musicFiles.length} dosya`);
            return dbData;
        } catch (error) {
            console.error('❌ Veritabanı yükleme hatası:', error.message);
            return null;
        }
    }

    /**
     * Server.js'deki extractImprovedWords fonksiyonunu simüle et
     */
    extractImprovedWords(fileName, filePath) {
        // Türkçe karakter haritası
        const ENHANCED_CHAR_MAP = {
            "ğ": "g", "Ğ": "G", "ı": "i", "I": "I", "İ": "I", "ş": "s", "Ş": "S",
            "ç": "c", "Ç": "C", "ü": "u", "Ü": "U", "ö": "o", "Ö": "O"
        };

        function normalizeText(text, options = {}) {
            if (typeof text !== 'string') return '';
            
            const keepSpaces = options.keepSpaces !== false;
            let normalized = text;
            
            // NFKC normalizasyonu ve karakter dönüşümü
            normalized = normalized.normalize("NFKC");
            normalized = normalized.split('').map(c => ENHANCED_CHAR_MAP[c] || c).join('');
            normalized = normalized.toLowerCase();
            normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
            normalized = normalized.replace(/\s+/g, ' ');
            
            return normalized.trim();
        }

        function hybridParenthesesFilter(text) {
            // Ana metni parantezlerden temizle
            const mainText = text
                .replace(/\([^)]*\)/g, '')
                .replace(/\[[^\]]*\]/g, '')
                .replace(/\{[^}]*\}/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            // Parantez içeriklerini çıkar
            const parenthesesMatches = text.match(/\([^)]*\)/g) || [];
            const bracketMatches = text.match(/\[[^\]]*\]/g) || [];
            const braceMatches = text.match(/\{[^}]*\}/g) || [];
            
            const allMatches = [...parenthesesMatches, ...bracketMatches, ...braceMatches];
            
            const importantParenthesesWords = [];
            const noiseWords = [
                'official', 'audio', 'video', 'music', 'hd', 'stereo', 'mono',
                'remaster', 'remastered', 'enhanced', 'deluxe', 'high', 'quality',
                'feat', 'featuring', 'ft', 'with', 'vs', 'and', 've', 'ile',
                'youtube', 'spotify', 'apple', 'lyric', 'lyrics', 'karaoke',
                'resmi', 'muzik', 'sarki', 'klip', 'canli', 'performans'
            ];
            
            allMatches.forEach(match => {
                const content = match.replace(/[\(\)\[\]\{\}]/g, '');
                const words = content.split(/[\s\-_,&]+/).filter(w => w.length > 1);
                
                words.forEach(word => {
                    const normalizedWord = normalizeText(word, { keepSpaces: false });
                    
                    const isNoise = noiseWords.includes(normalizedWord);
                    const isNumber = /^\d{1,4}$/.test(normalizedWord);
                    
                    if (!isNoise && !isNumber && normalizedWord.length >= 3) {
                        importantParenthesesWords.push(normalizedWord);
                    }
                });
            });
            
            return {
                mainText: mainText,
                parenthesesWords: importantParenthesesWords,
                hybridText: mainText + (importantParenthesesWords.length > 0 ? ' ' + importantParenthesesWords.join(' ') : '')
            };
        }

        const pathParts = path.dirname(filePath).split(path.sep).filter(p => p && p !== "." && !p.startsWith("/"));
        const relevantFolders = pathParts;
        
        // Dosya adını normalize et
        const fileNameWithoutExt = path.parse(fileName).name;
        
        // PARANTEZ İÇİ SAYI NORMALIZASYONU
        const cleanedNameForParentheses = fileNameWithoutExt.replace(/\(\d+\)/g, '').trim();
        
        // HİBRİT PARANTEZ SİSTEMİ
        const hybridFiltered = hybridParenthesesFilter(cleanedNameForParentheses);
        const cleanedFileName = hybridFiltered.mainText;
        
        // Kelime ayırma
        const fileNameParts = cleanedFileName.split(/[-_\s\.\,\&\+\|\~\!\@\#\$\%\^\*\(\)\[\]\{\}]+/).map(part => part.trim()).filter(part => part.length > 0);
        
        // Klasör kelimelerini normalize et
        const folderWords = [];
        for (const folder of relevantFolders) {
            const normalizedFolder = normalizeText(folder, { keepSpaces: false });
            const camelCaseWords = normalizedFolder.replace(/([a-z])([A-Z])/g, '$1 $2');
            folderWords.push(...camelCaseWords.split(/\s+/).filter(w => w.length > 1));
        }
        
        // Dosya adı kelimelerini normalize et
        const fileWords = [];
        for (const part of fileNameParts) {
            if (part.trim()) {
                const normalizedPart = normalizeText(part, { keepSpaces: false });
                const words = normalizedPart.split(/\s+/).filter(w => w.length > 1);
                fileWords.push(...words);
            }
        }
        
        // Parantez kelimeleri
        const parenthesesWords = hybridFiltered.parenthesesWords;
        
        return {
            'folder_words': folderWords,
            'file_words': fileWords,
            'parentheses_words': parenthesesWords,
            'all_words': [...folderWords, ...fileWords, ...parenthesesWords]
        };
    }

    /**
     * İki dosya arasındaki benzerliği hesapla
     */
    calculateNewSimilarity(searchWords, targetWords) {
        // Exact match
        const searchFile = searchWords['file_words'];
        const targetFile = targetWords['file_words'];
        
        if (searchFile.length === 0 || targetFile.length === 0) {
            return { exactScore: 0, fuzzyScore: 0, contextScore: 0, specialScore: 0, parenthesesScore: 0, finalScore: 0 };
        }
        
        let exactMatches = 0;
        for (const searchWord of searchFile) {
            if (targetFile.includes(searchWord)) {
                exactMatches++;
            }
        }
        const exactScore = exactMatches / searchFile.length;
        
        // Fuzzy match
        let fuzzyScore = 0;
        let comparisons = 0;
        for (const searchWord of searchFile) {
            let bestSimilarity = 0;
            for (const targetWord of targetFile) {
                if (targetWord.includes(searchWord) && searchWord.length >= 3) {
                    bestSimilarity = Math.max(bestSimilarity, 0.8);
                }
                if (searchWord.includes(targetWord) && targetWord.length >= 3) {
                    bestSimilarity = Math.max(bestSimilarity, 0.7);
                }
            }
            if (bestSimilarity > 0) {
                fuzzyScore += bestSimilarity;
                comparisons++;
            }
        }
        fuzzyScore = comparisons > 0 ? fuzzyScore / comparisons : 0.0;
        
        // Context match
        const searchFolder = searchWords['folder_words'];
        const targetFolder = targetWords['folder_words'];
        let contextScore = 0.0;
        if (searchFolder.length > 0 && targetFolder.length > 0) {
            let exactFolderMatches = 0;
            for (const searchWord of searchFolder) {
                if (targetFolder.includes(searchWord)) {
                    exactFolderMatches++;
                }
            }
            contextScore = exactFolderMatches / Math.max(searchFolder.length, targetFolder.length);
        }
        
        // Parantez match
        let parenthesesScore = 0.0;
        const searchParentheses = searchWords['parentheses_words'];
        const targetParentheses = targetWords['parentheses_words'];
        
        if (searchParentheses.length > 0 && targetParentheses.length > 0) {
            let parenthesesMatches = 0;
            for (const searchWord of searchParentheses) {
                if (targetParentheses.includes(searchWord)) {
                    parenthesesMatches++;
                }
            }
            parenthesesScore = parenthesesMatches / searchParentheses.length;
        }
        
        // Final score
        const baseScore = (exactScore * 0.5) + (fuzzyScore * 0.2) + (contextScore * 0.05) + (0.15 * 0.15) + (parenthesesScore * 0.1);
        const finalScore = Math.max(0.0, Math.min(1.0, baseScore));
        
        return {
            exactScore,
            fuzzyScore,
            contextScore,
            specialScore: 0.15, // Sabit
            parenthesesScore,
            finalScore
        };
    }

    /**
     * Spesifik iki dosyayı karşılaştır
     */
    async compareSpecificFiles(searchPath, targetPath) {
        console.log('🔍 SPESİFİK DOSYA KARŞILAŞTIRMASI');
        console.log('='.repeat(50));
        
        const db = await this.loadDatabase();
        if (!db) return;

        // Arama dosyası analizi
        const searchFileName = path.basename(searchPath);
        const searchWords = this.extractImprovedWords(searchFileName, searchPath);
        
        console.log(`\n📝 ARAMA DOSYASI: ${searchFileName}`);
        console.log(`   Dosya kelimeleri: [${searchWords.file_words.join(', ')}]`);
        console.log(`   Parantez kelimeleri: [${searchWords.parentheses_words.join(', ')}]`);
        console.log(`   Klasör kelimeleri: [${searchWords.folder_words.join(', ')}]`);

        // Hedef dosyayı veritabanında bul
        const targetFile = db.musicFiles.find(f => f.path === targetPath);
        if (!targetFile) {
            console.log(`❌ Hedef dosya veritabanında bulunamadı: ${targetPath}`);
            return;
        }

        console.log(`\n📝 HEDEF DOSYA: ${targetFile.name}`);
        console.log(`   Dosya kelimeleri: [${targetFile.fileWords.join(', ')}]`);
        console.log(`   Parantez kelimeleri: [${(targetFile.parenthesesWords || []).join(', ')}]`);
        console.log(`   Klasör kelimeleri: [${targetFile.folderWords.join(', ')}]`);

        // Benzerlik hesapla
        const targetWords = {
            'folder_words': targetFile.folderWords,
            'file_words': targetFile.fileWords,
            'parentheses_words': targetFile.parenthesesWords || [],
            'all_words': [...targetFile.folderWords, ...targetFile.fileWords, ...(targetFile.parenthesesWords || [])]
        };

        const similarity = this.calculateNewSimilarity(searchWords, targetWords);

        console.log(`\n📊 BENZERLİK HESAPLAMA:`);
        console.log(`   Exact Score: ${similarity.exactScore.toFixed(4)}`);
        console.log(`   Fuzzy Score: ${similarity.fuzzyScore.toFixed(4)}`);
        console.log(`   Context Score: ${similarity.contextScore.toFixed(4)}`);
        console.log(`   Special Score: ${similarity.specialScore.toFixed(4)}`);
        console.log(`   Parentheses Score: ${similarity.parenthesesScore.toFixed(4)}`);
        console.log(`   FINAL SCORE: ${similarity.finalScore.toFixed(4)}`);

        // Detaylı eşleşme analizi
        console.log(`\n🔤 DETAYLI EŞLEŞME ANALİZİ:`);
        
        // Exact matches
        const exactMatches = searchWords.file_words.filter(sw => targetWords.file_words.includes(sw));
        console.log(`   Exact eşleşmeler: [${exactMatches.join(', ')}] (${exactMatches.length}/${searchWords.file_words.length})`);
        
        // Parantez eşleşmeleri
        if (searchWords.parentheses_words.length > 0 && targetWords.parentheses_words.length > 0) {
            const parenthesesMatches = searchWords.parentheses_words.filter(sw => targetWords.parentheses_words.includes(sw));
            console.log(`   Parantez eşleşmeleri: [${parenthesesMatches.join(', ')}] (${parenthesesMatches.length}/${searchWords.parentheses_words.length})`);
        }
        
        // Klasör eşleşmeleri
        const folderMatches = searchWords.folder_words.filter(fw => targetWords.folder_words.includes(fw));
        console.log(`   Klasör eşleşmeleri: [${folderMatches.join(', ')}] (${folderMatches.length}/${searchWords.folder_words.length})`);

        return similarity;
    }
}

// CLI kullanımı
if (require.main === module) {
    const analyzer = new SpecificMatchDebugger();
    
    const searchPath = process.argv[2];
    const targetPath = process.argv[3];
    
    if (!searchPath || !targetPath) {
        console.log('🔧 SPESİFİK DOSYA EŞLEŞMESİ DEBUG ARACI');
        console.log('='.repeat(40));
        console.log('Kullanım:');
        console.log('  node debug_specific_match.js <arama_dosyası> <hedef_dosya>');
        console.log('\nÖrnek:');
        console.log('  node debug_specific_match.js \\');
        console.log('    "/path/to/search.mp3" \\');
        console.log('    "/path/to/target.mp3"');
        process.exit(1);
    }
    
    analyzer.compareSpecificFiles(searchPath, targetPath)
        .then(() => {
            console.log('\n✅ Analiz tamamlandı');
        })
        .catch(error => {
            console.error('❌ Fatal error:', error);
        });
}

module.exports = SpecificMatchDebugger;
