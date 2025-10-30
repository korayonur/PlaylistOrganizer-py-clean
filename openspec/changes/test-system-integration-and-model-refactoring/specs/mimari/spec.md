# Mimari Specification - Test System Integration and Model Refactoring

## Overview
Bu spec, Clean Architecture prensiplerine uygun test sistemi entegrasyonu ve model refactoring gereksinimlerini tanımlar.

## MODIFIED Requirements

### Requirement: Clean Architecture Compliance
- **REQUIREMENT**: Test system SHALL comply with Clean Architecture principles
- **ACCEPTANCE CRITERIA**:
  - Domain katmanı UI'dan bağımsızdır
  - Business logic Domain katmanında bulunur
  - UI concerns ViewModels katmanında bulunur
  - Test katmanı tüm katmanları test eder
  - Dependency Inversion prensibi uygulanır
- #### Scenario: Developer organizes code according to Clean Architecture layers

## ADDED Requirements

### Requirement: Domain Entities
- **REQUIREMENT**: Domain Entities SHALL be pure business objects
- **ACCEPTANCE CRITERIA**:
  - UI dependencies yoktur (INotifyPropertyChanged yok)
  - Business logic içerir
  - Data validation içerir
  - Navigation properties içerir
  - Immutable where possible
- #### Scenario: Domain entities contain business logic independently from UI

### Requirement: ViewModels
- **REQUIREMENT**: ViewModels SHALL manage UI state
- **ACCEPTANCE CRITERIA**:
  - INotifyPropertyChanged implement eder
  - UI-specific properties içerir
  - Domain Entities wrap eder
  - Command pattern kullanır
  - UI validation içerir
- #### Scenario: ViewModels manage UI state and expose Domain Entities appropriately for UI

### Requirement: Test Architecture
- **REQUIREMENT**: Test layer SHALL be comprehensive
- **ACCEPTANCE CRITERIA**:
  - Unit tests for all services
  - Integration tests for workflows
  - Mock objects for dependencies
  - Test data management
  - Performance tests
- #### Scenario: Test layer comprehensively tests all layers

## REMOVED Requirements

### Requirement: Duplicate Models
- **REQUIREMENT**: Duplicate model classes SHALL be removed
- **ACCEPTANCE CRITERIA**:
  - Models klasörü kaldırılır
  - Domain/Entities tek model kaynağı olur
  - ViewModels Domain Entities wrap eder
  - Kod tekrarı yoktur
  - Single source of truth
- #### Scenario: Developer uses only model classes from Domain/Entities