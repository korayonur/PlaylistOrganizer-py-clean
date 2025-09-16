/**
 * BENZERLIK ALGORITMA TEST SISTEMI
 * 
 * Bu test sistemi, mevcut benzerlik algoritmasının performansını
 * global missing files listesi kullanarak test eder ve analiz eder.
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

class SimilarityTestSystem {
    constructor() {
        this.apiUrl = 'http://localhost:50001';
        this.testResults = [];
        this.stats = {
            totalTests: 0,
            foundMatches: 0,
            correctMatches: 0,
            incorrectMatches: 0,
            noMatches: 0,
            averageSimilarity: 0,
            averageProcessTime: 0
        };
        
        // Test kategorileri
        this.testCategories = {
            exactName: [], // Tam aynı isim
            similarName: [], // Benzer isim
            artistTitle: [], // Sanatçı - Başlık formatı
            remix: [], // Remix versiyonları
            differentPath: [], // Farklı klasör aynı dosya
            noMatch: [] // Eşleşme olmaması gereken
        };
    }

    /**
     * Global missing files listesini al
     */
    async getGlobalMissingFiles() {
        try {
            console.log('🔍 Global missing files listesi alınıyor...');
            const response = await axios.get(`${this.apiUrl}/api/playlistsong/global-missing`);
            
            if (response.data.success) {
                console.log(`✅ ${response.data.total_missing_files} eksik dosya bulundu`);
                return response.data.missing_files;
            } else {
                throw new Error('Global missing files alınamadı');
            }
        } catch (error) {
            console.error('❌ Global missing files hatası:', error.message);
            return [];
        }
    }

    /**
     * Dosya arama testi yap
     */
    async searchFile(filePath, options = {}) {
        try {
            const response = await axios.post(`${this.apiUrl}/api/search/files`, {
                paths: [filePath],
                options: {
                    limit: 5,
                    threshold: options.threshold || 0.1,
                    ...options
                }
            });

            if (response.data.success && response.data.data && response.data.data.length > 0) {
                return response.data.data[0];
            } else {
                // API başarılı ama sonuç yok
                return {
                    originalPath: filePath,
                    found: false,
                    status: 'not_found',
                    similarity: 0,
                    processTime: 0
                };
            }
        } catch (error) {
            console.error(`❌ Arama hatası (${filePath}):`, error.message);
            return null;
        }
    }

    /**
     * Dosya isminden kategori belirle
     */
    categorizeFile(filePath) {
        const fileName = path.basename(filePath, path.extname(filePath));
        
        // Remix kontrolü
        if (fileName.toLowerCase().includes('remix')) {
            return 'remix';
        }
        
        // Sanatçı - Başlık formatı
        if (fileName.includes(' - ')) {
            return 'artistTitle';
        }
        
        // Parantez içinde ek bilgi
        if (fileName.includes('(') && fileName.includes(')')) {
            return 'similarName';
        }
        
        return 'exactName';
    }

    /**
     * Test sonucunu analiz et
     */
    analyzeTestResult(testResult, expectedResult = null) {
        const analysis = {
            filePath: testResult.originalPath,
            found: testResult.found,
            similarity: testResult.similarity || 0,
            processTime: testResult.processTime || 0,
            category: this.categorizeFile(testResult.originalPath),
            isCorrect: false,
            issues: [],
            matchDetails: testResult.matchDetails || null
        };

        if (testResult.found) {
            const foundPath = testResult.foundPath;
            const originalName = path.basename(testResult.originalPath, path.extname(testResult.originalPath));
            const foundName = path.basename(foundPath, path.extname(foundPath));
            
            // Basit doğruluk kontrolü - dosya isimleri benzer mi?
            const originalWords = this.extractWords(originalName);
            const foundWords = this.extractWords(foundName);
            
            const commonWords = originalWords.filter(word => 
                foundWords.some(fw => fw.includes(word) || word.includes(fw))
            );
            
            const similarity = commonWords.length / Math.max(originalWords.length, foundWords.length);
            
            if (similarity > 0.5) {
                analysis.isCorrect = true;
            } else {
                analysis.isCorrect = false;
                analysis.issues.push('Bulunan dosya orijinalle çok farklı');
            }

            // Benzerlik skoru çok düşükse
            if (testResult.similarity < 0.3) {
                analysis.issues.push('Benzerlik skoru çok düşük');
            }
            
            // İşlem süresi çok uzunsa
            if (testResult.processTime > 1000) {
                analysis.issues.push('İşlem süresi çok uzun');
            }
            
        } else {
            // Bulunamadı - bu bazen doğru olabilir
            analysis.isCorrect = null; // Belirsiz
            analysis.issues.push('Hiç eşleşme bulunamadı');
        }

        return analysis;
    }

    /**
     * Kelime çıkarma (basit)
     */
    extractWords(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    /**
     * Test örnekleri seç
     */
    selectTestSamples(missingFiles, maxSamples = 50) {
        console.log('🎯 Test örnekleri seçiliyor...');
        
        // Farklı kategorilerden örnekler seç
        const samples = [];
        const categories = {};
        
        // Kategorilere ayır
        missingFiles.forEach(file => {
            const category = this.categorizeFile(file.originalPath);
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(file);
        });
        
        // Her kategoriden eşit sayıda örnek al
        const samplesPerCategory = Math.floor(maxSamples / Object.keys(categories).length);
        
        Object.keys(categories).forEach(category => {
            const categoryFiles = categories[category];
            const selectedCount = Math.min(samplesPerCategory, categoryFiles.length);
            
            // Rastgele seç
            for (let i = 0; i < selectedCount; i++) {
                const randomIndex = Math.floor(Math.random() * categoryFiles.length);
                samples.push(categoryFiles.splice(randomIndex, 1)[0]);
            }
            
            console.log(`📂 ${category}: ${selectedCount} örnek seçildi`);
        });
        
        console.log(`✅ Toplam ${samples.length} test örneği seçildi`);
        return samples;
    }

    /**
     * Batch test çalıştır
     */
    async runBatchTest(testSamples, options = {}) {
        console.log('🚀 Batch test başlatılıyor...');
        
        const results = [];
        const batchSize = options.batchSize || 5;
        const delay = options.delay || 1000; // ms
        
        for (let i = 0; i < testSamples.length; i += batchSize) {
            const batch = testSamples.slice(i, i + batchSize);
            console.log(`📊 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(testSamples.length / batchSize)} işleniyor...`);
            
            const batchPromises = batch.map(async (sample, index) => {
                try {
                    const result = await this.searchFile(sample.originalPath, options);
                    const analysis = this.analyzeTestResult(result || { 
                        originalPath: sample.originalPath, 
                        found: false 
                    });
                    
                    console.log(`  ${i + index + 1}. ${analysis.found ? '✅' : '❌'} ${path.basename(sample.originalPath)} (${analysis.similarity?.toFixed(3) || '0.000'})`);
                    
                    return {
                        sample,
                        result,
                        analysis
                    };
                } catch (error) {
                    console.error(`  ❌ Hata: ${sample.originalPath} - ${error.message}`);
                    return {
                        sample,
                        result: null,
                        analysis: {
                            filePath: sample.originalPath,
                            found: false,
                            error: error.message
                        }
                    };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Batch'ler arası bekleme
            if (i + batchSize < testSamples.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        return results;
    }

    /**
     * Test sonuçlarını analiz et
     */
    analyzeResults(testResults) {
        console.log('📈 Test sonuçları analiz ediliyor...');
        
        const stats = {
            totalTests: testResults.length,
            foundMatches: 0,
            correctMatches: 0,
            incorrectMatches: 0,
            noMatches: 0,
            averageSimilarity: 0,
            averageProcessTime: 0,
            categoryStats: {},
            commonIssues: {},
            similarityDistribution: {
                veryHigh: 0, // > 0.8
                high: 0,     // 0.6 - 0.8
                medium: 0,   // 0.4 - 0.6
                low: 0,      // 0.2 - 0.4
                veryLow: 0   // < 0.2
            }
        };
        
        let totalSimilarity = 0;
        let totalProcessTime = 0;
        let foundCount = 0;
        
        testResults.forEach(({ sample, result, analysis }) => {
            const category = analysis.category;
            
            if (!stats.categoryStats[category]) {
                stats.categoryStats[category] = {
                    total: 0,
                    found: 0,
                    correct: 0,
                    incorrect: 0,
                    averageSimilarity: 0
                };
            }
            
            stats.categoryStats[category].total++;
            
            if (analysis.found) {
                stats.foundMatches++;
                stats.categoryStats[category].found++;
                foundCount++;
                
                const similarity = analysis.similarity || 0;
                totalSimilarity += similarity;
                
                // Benzerlik dağılımı
                if (similarity > 0.8) stats.similarityDistribution.veryHigh++;
                else if (similarity > 0.6) stats.similarityDistribution.high++;
                else if (similarity > 0.4) stats.similarityDistribution.medium++;
                else if (similarity > 0.2) stats.similarityDistribution.low++;
                else stats.similarityDistribution.veryLow++;
                
                if (analysis.isCorrect) {
                    stats.correctMatches++;
                    stats.categoryStats[category].correct++;
                } else {
                    stats.incorrectMatches++;
                    stats.categoryStats[category].incorrect++;
                }
            } else {
                stats.noMatches++;
            }
            
            if (analysis.processTime) {
                totalProcessTime += analysis.processTime;
            }
            
            // Yaygın sorunları topla
            if (analysis.issues) {
                analysis.issues.forEach(issue => {
                    stats.commonIssues[issue] = (stats.commonIssues[issue] || 0) + 1;
                });
            }
        });
        
        // Ortalamalar
        stats.averageSimilarity = foundCount > 0 ? totalSimilarity / foundCount : 0;
        stats.averageProcessTime = testResults.length > 0 ? totalProcessTime / testResults.length : 0;
        
        // Kategori ortalamaları
        Object.keys(stats.categoryStats).forEach(category => {
            const catStats = stats.categoryStats[category];
            catStats.averageSimilarity = catStats.found > 0 ? 
                testResults
                    .filter(r => r.analysis.category === category && r.analysis.found)
                    .reduce((sum, r) => sum + (r.analysis.similarity || 0), 0) / catStats.found : 0;
        });
        
        return stats;
    }

    /**
     * Rapor oluştur
     */
    generateReport(testResults, stats) {
        const timestamp = new Date().toISOString();
        
        const report = {
            metadata: {
                timestamp,
                testCount: testResults.length,
                algorithmVersion: "new_similarity_v3_hybrid"
            },
            summary: stats,
            detailedResults: testResults.map(({ sample, result, analysis }) => ({
                originalPath: sample.originalPath,
                playlistName: sample.playlistName,
                found: analysis.found,
                foundPath: result?.foundPath || null,
                similarity: analysis.similarity,
                processTime: analysis.processTime,
                category: analysis.category,
                isCorrect: analysis.isCorrect,
                issues: analysis.issues,
                searchWords: result?.matchDetails?.searchWords || null,
                targetWords: result?.matchDetails?.targetWords || null,
                algorithmDebug: result?.matchDetails?.newAlgorithmDebug || null
            })),
            recommendations: this.generateRecommendations(stats, testResults)
        };
        
        return report;
    }

    /**
     * Öneriler oluştur
     */
    generateRecommendations(stats, testResults) {
        const recommendations = [];
        
        // Genel performans
        const successRate = (stats.correctMatches / stats.totalTests) * 100;
        const findRate = (stats.foundMatches / stats.totalTests) * 100;
        
        if (successRate < 70) {
            recommendations.push({
                type: 'critical',
                title: 'Düşük Başarı Oranı',
                description: `Başarı oranı %${successRate.toFixed(1)} - hedef %70+`,
                suggestion: 'Benzerlik algoritması threshold değerlerini gözden geçirin'
            });
        }
        
        if (findRate < 80) {
            recommendations.push({
                type: 'warning',
                title: 'Düşük Bulma Oranı',
                description: `Bulma oranı %${findRate.toFixed(1)} - hedef %80+`,
                suggestion: 'Threshold değerini düşürün veya fuzzy matching\'i güçlendirin'
            });
        }
        
        // Kategori bazlı öneriler
        Object.keys(stats.categoryStats).forEach(category => {
            const catStats = stats.categoryStats[category];
            const catSuccessRate = catStats.total > 0 ? (catStats.correct / catStats.total) * 100 : 0;
            
            if (catSuccessRate < 60) {
                recommendations.push({
                    type: 'category',
                    title: `${category} Kategorisi Problemi`,
                    description: `${category} kategorisinde başarı oranı %${catSuccessRate.toFixed(1)}`,
                    suggestion: `${category} kategorisi için özel algoritmik iyileştirmeler gerekli`
                });
            }
        });
        
        // Benzerlik dağılımı
        const lowSimilarityRate = (stats.similarityDistribution.low + stats.similarityDistribution.veryLow) / stats.foundMatches;
        if (lowSimilarityRate > 0.3) {
            recommendations.push({
                type: 'algorithm',
                title: 'Düşük Benzerlik Skorları',
                description: `Bulunan eşleşmelerin %${(lowSimilarityRate * 100).toFixed(1)}'i düşük benzerlik skoruna sahip`,
                suggestion: 'Exact match ve fuzzy match ağırlıklarını yeniden ayarlayın'
            });
        }
        
        // Yaygın sorunlar
        const topIssues = Object.entries(stats.commonIssues)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
            
        topIssues.forEach(([issue, count]) => {
            recommendations.push({
                type: 'issue',
                title: `Yaygın Sorun: ${issue}`,
                description: `${count} testte bu sorun görüldü`,
                suggestion: 'Bu soruna özel çözüm geliştirin'
            });
        });
        
        return recommendations;
    }

    /**
     * Ana test fonksiyonu
     */
    async runFullTest(options = {}) {
        try {
            console.log('🧪 SİMİLARİTY TEST SİSTEMİ BAŞLATIYOR...\n');
            
            // 1. Global missing files al
            const missingFiles = await this.getGlobalMissingFiles();
            if (missingFiles.length === 0) {
                throw new Error('Test için eksik dosya bulunamadı');
            }
            
            // 2. Test örnekleri seç
            const maxSamples = options.maxSamples || 30;
            const testSamples = this.selectTestSamples(missingFiles, maxSamples);
            
            // 3. Batch test çalıştır
            const testResults = await this.runBatchTest(testSamples, {
                threshold: options.threshold || 0.1,
                batchSize: options.batchSize || 3,
                delay: options.delay || 2000
            });
            
            // 4. Sonuçları analiz et
            const stats = this.analyzeResults(testResults);
            
            // 5. Rapor oluştur
            const report = this.generateReport(testResults, stats);
            
            // 6. Raporu kaydet
            const reportPath = path.join(__dirname, `similarity_test_report_${Date.now()}.json`);
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            
            console.log('\n📊 TEST SONUÇLARI:');
            console.log(`✅ Toplam Test: ${stats.totalTests}`);
            console.log(`🎯 Bulunan: ${stats.foundMatches} (${((stats.foundMatches/stats.totalTests)*100).toFixed(1)}%)`);
            console.log(`✅ Doğru: ${stats.correctMatches} (${((stats.correctMatches/stats.totalTests)*100).toFixed(1)}%)`);
            console.log(`❌ Yanlış: ${stats.incorrectMatches} (${((stats.incorrectMatches/stats.totalTests)*100).toFixed(1)}%)`);
            console.log(`⚪ Bulunamayan: ${stats.noMatches} (${((stats.noMatches/stats.totalTests)*100).toFixed(1)}%)`);
            console.log(`📈 Ortalama Benzerlik: ${stats.averageSimilarity.toFixed(3)}`);
            console.log(`⏱️ Ortalama Süre: ${stats.averageProcessTime.toFixed(0)}ms`);
            
            console.log('\n📂 KATEGORİ İSTATİSTİKLERİ:');
            Object.keys(stats.categoryStats).forEach(category => {
                const catStats = stats.categoryStats[category];
                const successRate = catStats.total > 0 ? (catStats.correct / catStats.total) * 100 : 0;
                console.log(`  ${category}: ${catStats.correct}/${catStats.total} (%${successRate.toFixed(1)})`);
            });
            
            console.log('\n💡 ÖNERİLER:');
            report.recommendations.slice(0, 5).forEach((rec, index) => {
                console.log(`  ${index + 1}. [${rec.type.toUpperCase()}] ${rec.title}`);
                console.log(`     ${rec.description}`);
                console.log(`     💡 ${rec.suggestion}`);
            });
            
            console.log(`\n📄 Detaylı rapor: ${reportPath}`);
            
            return report;
            
        } catch (error) {
            console.error('❌ Test sistemi hatası:', error.message);
            throw error;
        }
    }
}

// CLI kullanımı
if (require.main === module) {
    const testSystem = new SimilarityTestSystem();
    
    const options = {
        maxSamples: process.argv[2] ? parseInt(process.argv[2]) : 25,
        threshold: process.argv[3] ? parseFloat(process.argv[3]) : 0.1,
        batchSize: 3,
        delay: 2000
    };
    
    console.log('🎯 Test Parametreleri:');
    console.log(`  Max Samples: ${options.maxSamples}`);
    console.log(`  Threshold: ${options.threshold}`);
    console.log(`  Batch Size: ${options.batchSize}`);
    console.log(`  Delay: ${options.delay}ms\n`);
    
    testSystem.runFullTest(options)
        .then(report => {
            console.log('\n🎉 Test tamamlandı!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = SimilarityTestSystem;
