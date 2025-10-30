# Test System Specification

## Overview
Bu spec, PlaylistOrganizerAvalonia projesi için comprehensive test sistemi gereksinimlerini tanımlar.

## ADDED Requirements

### Requirement: Test Project Integration
- **REQUIREMENT**: Test projesi SHALL be integrated into the main project
- **ACCEPTANCE CRITERIA**:
  - Test projesi `/PlaylistOrganizerAvalonia/Tests` klasöründe bulunur
  - `dotnet test` komutu çalışır
  - Test discovery otomatik çalışır
  - CI/CD pipeline'da test execution desteklenir
- #### Scenario: Developer runs `dotnet test` command and all tests are automatically discovered and executed

### Requirement: Test Framework
- **REQUIREMENT**: xUnit test framework SHALL be used
- **ACCEPTANCE CRITERIA**:
  - xUnit 2.4.2+ kullanılır
  - FluentAssertions 6.12.0+ kullanılır
  - Moq 4.20.69+ mocking için kullanılır
  - Microsoft.Extensions.* paketleri test için kullanılır
- #### Scenario: Developer writes tests using xUnit, FluentAssertions and Moq frameworks

### Requirement: M3U Parser Tests
- **REQUIREMENT**: M3UParserService SHALL be comprehensively tested
- **ACCEPTANCE CRITERIA**:
  - Valid M3U file parsing test
  - Invalid file handling test
  - Empty file handling test
  - Metadata parsing test (EXTVDJ)
  - File path validation test
  - Error scenarios test
- #### Scenario: M3U file parsing tests cover all scenarios including valid, invalid, and edge cases

### Requirement: VDJFolder Parser Tests
- **REQUIREMENT**: VDJFolderParserService SHALL be comprehensively tested
- **ACCEPTANCE CRITERIA**:
  - Valid VDJFolder XML parsing test
  - Invalid XML handling test
  - Missing elements handling test
  - Metadata parsing test
  - File update functionality test
  - Error scenarios test
- #### Scenario: VDJFolder file parsing tests cover all scenarios including valid XML, invalid XML, and missing elements

### Requirement: Import Service Tests
- **REQUIREMENT**: ImportService SHALL be comprehensively tested
- **ACCEPTANCE CRITERIA**:
  - Full import workflow test
  - Music files import test
  - Playlist files import test
  - Track import and linking test
  - Progress reporting test
  - Error handling and recovery test
- #### Scenario: Import service tests cover complete workflow from file scanning to database insertion

### Requirement: Test Coverage
- **REQUIREMENT**: Minimum 80% code coverage SHALL be achieved
- **ACCEPTANCE CRITERIA**:
  - All critical paths covered
  - All error scenarios covered
  - All public methods covered
  - Edge cases covered
  - Integration points covered
- #### Scenario: Test execution generates 80%+ code coverage report