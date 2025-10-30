'use strict';

const fs = require('fs');
const path = require('path');
const FuzzySearchService = require('../../../application/services/FuzzySearchService');
const WordIndexService = require('../../../application/services/WordIndexService');
const { DatabaseManager } = require('../../../infrastructure/persistence/DatabaseManager');

/**
 * Test Search Command
 * Comprehensive search algorithm testing
 */
class TestSearchCommand {
    constructor() {
        this.dbManager = null;
        this.fuzzySearchService = null;
        this.wordIndexService = null;
        this.testResults = [];
        this.startTime = null;
        this.verbose = false;
        this.reportFile = null;
    }

    async execute(options = {}) {
        this.verbose = options.verbose || false;
        this.reportFile = options.report || null;
        
        try {
            console.log('🧪 Search Algorithm Test Suite Başlatılıyor...\n');
            
            // Initialize services
            await this.initializeServices();
            
            // Load test scenarios
            const testScenarios = this.loadTestScenarios();
            
            // Filter tests based on options
            const testsToRun = this.filterTests(testScenarios, options);
            
            console.log(`📋 ${testsToRun.length} test senaryosu yüklendi\n`);
            
            // Run tests
            this.startTime = Date.now();
            const results = await this.runTests(testsToRun);
            
            // Generate report
            this.generateReport(results, options);
            
        } catch (error) {
            console.error('❌ Test suite hatası:', error.message);
            process.exit(1);
        }
    }

    async initializeServices() {
        console.log('🔧 Servisler başlatılıyor...');
        
        // Database
        this.dbManager = new DatabaseManager();
        await this.dbManager.initialize();
        
        // Word Index Service
        this.wordIndexService = new WordIndexService(this.dbManager.db);
        
        // Fuzzy Search Service
        this.fuzzySearchService = new FuzzySearchService(this.dbManager.db, this.wordIndexService);
        
        console.log('✅ Servisler başlatıldı\n');
    }

    loadTestScenarios() {
        const scenariosPath = path.join(__dirname, '../../../../tests/search-test-scenarios.json');
        
        if (!fs.existsSync(scenariosPath)) {
            throw new Error(`Test senaryoları bulunamadı: ${scenariosPath}`);
        }
        
        const content = fs.readFileSync(scenariosPath, 'utf8');
        const scenarios = JSON.parse(content);
        
        // Flatten all tests
        const allTests = [];
        scenarios.testSuites.forEach(suite => {
            suite.tests.forEach(test => {
                allTests.push({
                    ...test,
                    suiteName: suite.name,
                    suiteDescription: suite.description
                });
            });
        });
        
        return allTests;
    }

    filterTests(allTests, options) {
        if (options.test) {
            return allTests.filter(test => test.id === options.test);
        }
        
        if (options.suite) {
            return allTests.filter(test => test.suiteName.toLowerCase().includes(options.suite.toLowerCase()));
        }
        
        return allTests;
    }

    async runTests(tests) {
        const results = {
            total: tests.length,
            passed: 0,
            failed: 0,
            tests: [],
            summary: {
                avgExecutionTime: 0,
                avgScore: 0,
                totalExecutionTime: 0
            }
        };

        console.log('🚀 Testler çalıştırılıyor...\n');
        
        for (let i = 0; i < tests.length; i++) {
            const test = tests[i];
            const testStartTime = Date.now();
            
            if (this.verbose) {
                console.log(`[${i + 1}/${tests.length}] ${test.id}: ${test.description}`);
            }
            
            try {
                const testResult = await this.runSingleTest(test);
                const testEndTime = Date.now();
                const executionTime = testEndTime - testStartTime;
                
                testResult.executionTime = executionTime;
                testResult.passed = testResult.failures.length === 0;
                
                if (testResult.passed) {
                    results.passed++;
                    if (this.verbose) {
                        console.log(`  ✅ PASS (${executionTime}ms)`);
                    }
                } else {
                    results.failed++;
                    console.log(`  ❌ FAIL (${executionTime}ms)`);
                    if (this.verbose) {
                        testResult.failures.forEach(failure => {
                            console.log(`    - ${failure}`);
                        });
                    }
                }
                
                results.tests.push(testResult);
                results.summary.totalExecutionTime += executionTime;
                
                if (testResult.actualResults.length > 0) {
                    const avgScore = testResult.actualResults.reduce((sum, r) => sum + r.score, 0) / testResult.actualResults.length;
                    results.summary.avgScore += avgScore;
                }
                
            } catch (error) {
                results.failed++;
                results.tests.push({
                    id: test.id,
                    query: test.query,
                    passed: false,
                    executionTime: Date.now() - testStartTime,
                    error: error.message,
                    failures: [`Test execution error: ${error.message}`]
                });
                console.log(`  💥 ERROR: ${error.message}`);
            }
        }
        
        // Calculate averages
        results.summary.avgExecutionTime = results.summary.totalExecutionTime / results.total;
        results.summary.avgScore = results.summary.avgScore / results.passed;
        
        return results;
    }

    async runSingleTest(test) {
        const testResult = {
            id: test.id,
            suiteName: test.suiteName,
            query: test.query,
            description: test.description,
            expectedResults: test.expectedResults || [],
            actualResults: [],
            failures: [],
            executionTime: 0
        };

        try {
            // Run search
            const searchOptions = {
                limit: test.limit10 || test.limit1 || 10,
                includeScoreDetails: true,
                tableType: 'music_words',
                enableFuzzy: true,
                fuzzyThreshold: 0.5
            };

            const results = await this.fuzzySearchService.searchTracks(test.query, searchOptions);
            testResult.actualResults = results;

            // Validate results
            this.validateTestResults(test, testResult);

        } catch (error) {
            testResult.failures.push(`Search execution error: ${error.message}`);
        }

        return testResult;
    }

    validateTestResults(test, testResult) {
        const { expectedResults = [] } = test;
        
        if (expectedResults.length === 0) {
            // Performance test or empty result test
            if (test.maxExecutionTime && testResult.executionTime > test.maxExecutionTime) {
                testResult.failures.push(`Execution time exceeded: ${testResult.executionTime}ms > ${test.maxExecutionTime}ms`);
            }
            if (test.maxResults && testResult.actualResults.length > test.maxResults) {
                testResult.failures.push(`Too many results: ${testResult.actualResults.length} > ${test.maxResults}`);
            }
            return;
        }

        // Validate each expected result
        expectedResults.forEach(expected => {
            const actual = testResult.actualResults.find(r => {
                const fileName = r.fileName.toLowerCase();
                const expectedName = expected.fileName.toLowerCase();
                return fileName.includes(expectedName) || expectedName.includes(fileName.split(' - ')[0]);
            });

            if (!actual) {
                const actualFiles = testResult.actualResults.map(r => r.fileName).join(', ');
                testResult.failures.push(`Expected file not found: ${expected.fileName}`);
                testResult.failures.push(`Actual files: ${actualFiles}`);
                return;
            }

            const actualPosition = testResult.actualResults.indexOf(actual) + 1;

            // Check position
            if (expected.mustBeInTop && actualPosition > expected.mustBeInTop) {
                testResult.failures.push(
                    `File "${expected.fileName}" should be in top ${expected.mustBeInTop}, but found at position ${actualPosition}`
                );
            }

            // Check score
            if (expected.minScore && actual.score < expected.minScore) {
                testResult.failures.push(
                    `File "${expected.fileName}" score too low: ${actual.score} < ${expected.minScore}`
                );
            }

            // Check match count
            if (expected.matchCount && actual.match_count !== expected.matchCount) {
                testResult.failures.push(
                    `File "${expected.fileName}" match count wrong: ${actual.match_count} !== ${expected.matchCount}`
                );
            }

            // Check consecutive bonus
            if (expected.consecutiveBonus && !actual.score_details?.consecutive) {
                testResult.failures.push(
                    `File "${expected.fileName}" should have consecutive bonus`
                );
            }
        });

        // Special limit consistency test
        if (test.limit1 && test.limit10) {
            this.validateLimitConsistency(test, testResult);
        }
    }

    async validateLimitConsistency(test, testResult) {
        try {
            const limit1Results = await this.fuzzySearchService.searchTracks(test.query, {
                limit: 1,
                includeScoreDetails: true,
                tableType: 'music_words',
                enableFuzzy: true,
                fuzzyThreshold: 0.5
            });

            const limit10Results = await this.fuzzySearchService.searchTracks(test.query, {
                limit: 10,
                includeScoreDetails: true,
                tableType: 'music_words',
                enableFuzzy: true,
                fuzzyThreshold: 0.5
            });

            if (limit1Results.length > 0 && limit10Results.length > 0) {
                if (limit1Results[0].fileName !== limit10Results[0].fileName) {
                    testResult.failures.push(
                        `Limit consistency failed: limit=1 gives "${limit1Results[0].fileName}", limit=10 gives "${limit10Results[0].fileName}"`
                    );
                }
            }
        } catch (error) {
            testResult.failures.push(`Limit consistency test error: ${error.message}`);
        }
    }

    generateReport(results, options) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const passRate = ((results.passed / results.total) * 100).toFixed(2);
        
        console.log('\n📊 Test Sonuçları:');
        console.log('═══════════════════════════════════════');
        console.log(`Toplam Test: ${results.total}`);
        console.log(`Başarılı: ${results.passed} (${passRate}%)`);
        console.log(`Başarısız: ${results.failed}`);
        console.log(`Ortalama Süre: ${results.summary.avgExecutionTime.toFixed(2)}ms`);
        console.log(`Ortalama Skor: ${results.summary.avgScore.toFixed(2)}`);
        
        // Failed tests summary
        if (results.failed > 0) {
            console.log('\n❌ Başarısız Testler:');
            results.tests
                .filter(t => !t.passed)
                .forEach(test => {
                    console.log(`\n${test.id}: ${test.description}`);
                    console.log(`Query: "${test.query}"`);
                    test.failures.forEach(failure => {
                        console.log(`  - ${failure}`);
                    });
                });
        }

        // Generate files if requested
        if (this.reportFile || options.report) {
            this.saveReportFiles(results, timestamp);
        }
    }

    saveReportFiles(results, timestamp) {
        const resultsDir = path.join(__dirname, '../../../../tests/test-results');
        
        // Ensure directory exists
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        // JSON report
        const jsonReport = {
            timestamp: new Date().toISOString(),
            totalTests: results.total,
            passed: results.passed,
            failed: results.failed,
            passRate: ((results.passed / results.total) * 100).toFixed(2),
            avgScore: results.summary.avgScore.toFixed(2),
            avgExecutionTime: results.summary.avgExecutionTime.toFixed(2),
            failedTests: results.tests.filter(t => !t.passed).map(t => ({
                id: t.id,
                query: t.query,
                failures: t.failures,
                error: t.error
            })),
            suiteResults: this.groupResultsBySuite(results.tests)
        };

        const jsonPath = path.join(resultsDir, `${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
        console.log(`\n📄 JSON rapor kaydedildi: ${jsonPath}`);

        // Markdown report
        const mdReport = this.generateMarkdownReport(results, jsonReport);
        const mdPath = path.join(resultsDir, `${timestamp}.md`);
        fs.writeFileSync(mdPath, mdReport);
        console.log(`📄 Markdown rapor kaydedildi: ${mdPath}`);

        // Custom report file if specified
        if (this.reportFile) {
            fs.writeFileSync(this.reportFile, mdReport);
            console.log(`📄 Özel rapor kaydedildi: ${this.reportFile}`);
        }
    }

    groupResultsBySuite(tests) {
        const suiteGroups = {};
        tests.forEach(test => {
            if (!suiteGroups[test.suiteName]) {
                suiteGroups[test.suiteName] = { passed: 0, failed: 0, total: 0 };
            }
            suiteGroups[test.suiteName].total++;
            if (test.passed) {
                suiteGroups[test.suiteName].passed++;
            } else {
                suiteGroups[test.suiteName].failed++;
            }
        });
        return suiteGroups;
    }

    generateMarkdownReport(results, jsonReport) {
        const timestamp = new Date().toLocaleString('tr-TR');
        let markdown = `# Search Algorithm Test Report\n`;
        markdown += `**Date:** ${timestamp}\n\n`;
        
        markdown += `## Summary\n`;
        markdown += `- **Total Tests:** ${results.total}\n`;
        markdown += `- **Passed:** ${results.passed} (${jsonReport.passRate}%)\n`;
        markdown += `- **Failed:** ${results.failed}\n`;
        markdown += `- **Avg Score:** ${jsonReport.avgScore}\n`;
        markdown += `- **Avg Time:** ${jsonReport.avgExecutionTime}ms\n\n`;

        if (results.failed > 0) {
            markdown += `## Failed Tests\n\n`;
            results.tests
                .filter(t => !t.passed)
                .forEach(test => {
                    markdown += `### ${test.id}: ${test.description}\n`;
                    markdown += `**Query:** "${test.query}"\n\n`;
                    if (test.error) {
                        markdown += `**Error:** ${test.error}\n\n`;
                    }
                    if (test.failures.length > 0) {
                        markdown += `**Issues:**\n`;
                        test.failures.forEach(failure => {
                            markdown += `- ${failure}\n`;
                        });
                        markdown += `\n`;
                    }
                });
        }

        markdown += `## Suite Results\n\n`;
        Object.entries(jsonReport.suiteResults).forEach(([suite, stats]) => {
            const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
            markdown += `- **${suite}:** ${stats.passed}/${stats.total} (${passRate}%)\n`;
        });

        return markdown;
    }
}

module.exports = TestSearchCommand;
