# Test System Integration and Model Refactoring Tasks

## Phase 1: Test System Integration (Priority: High)

### 1.1 Test Project Migration
- [x] Move `/Tests` folder to `/PlaylistOrganizerAvalonia/Tests`
- [x] Update project references in TestHierarchy.csproj
- [x] Update PlaylistOrganizerAvalonia.csproj to include test project
- [x] Verify `dotnet test` command works
- [x] Update CI/CD pipeline if exists

### 1.2 Test Dependencies Update
- [x] Review and update NuGet packages in test project
- [x] Ensure all required dependencies are available
- [x] Update Microsoft.Extensions.* packages to latest versions
- [x] Verify test runner compatibility

### 1.3 Test Configuration
- [x] Configure test discovery and execution
- [x] Set up test data directories
- [x] Configure test database for integration tests
- [x] Set up logging for test execution

## Phase 2: Model Refactoring (Priority: High)

### 2.1 Remove Duplicate Models
- [x] Delete `/PlaylistOrganizerAvalonia/Models` folder
- [x] Update all references from Models to Domain.Entities
- [x] Fix compilation errors after model removal
- [x] Update using statements across the project

### 2.2 ViewModels Refactoring
- [x] Create PlaylistViewModel wrapping Domain.Entities.Playlist
- [x] Create TrackViewModel wrapping Domain.Entities.Track
- [x] Create MusicFileViewModel wrapping Domain.Entities.MusicFile
- [x] Move UI concerns (INotifyPropertyChanged) to ViewModels
- [x] Update MainWindowViewModel to use new ViewModels

### 2.3 Service Layer Updates
- [x] Update DatabaseManager to work with Domain.Entities
- [x] Update ImportService to use Domain.Entities
- [x] Update all services to use Domain.Entities instead of Models
- [x] Verify business logic remains in Domain layer

## Phase 3: Test Coverage Enhancement (Priority: Medium)

### 3.1 Parser Service Tests
- [x] Create M3UParserServiceTests.cs
  - [x] Test valid M3U file parsing
  - [x] Test invalid M3U file handling
  - [x] Test empty M3U file
  - [x] Test M3U with metadata (EXTVDJ)
  - [x] Test file path validation
- [x] Create VDJFolderParserServiceTests.cs
  - [x] Test valid VDJFolder XML parsing
  - [x] Test invalid XML handling
  - [x] Test missing track elements
  - [x] Test metadata parsing
  - [x] Test file update functionality

### 3.2 Import Service Tests
- [x] Create ImportServiceTests.cs
  - [x] Test full import workflow
  - [x] Test music files import
  - [x] Test playlist files import
  - [x] Test track import and linking
  - [x] Test error handling and recovery
  - [x] Test progress reporting

### 3.3 File Scanner Tests
- [x] Create FileScannerServiceTests.cs
  - [x] Test playlist file scanning
  - [x] Test music file scanning
  - [x] Test exclude paths functionality
  - [x] Test file extension filtering
  - [x] Test directory traversal limits

### 3.4 Database Manager Tests
- [x] Enhance existing DatabaseManagerTests.cs
  - [x] Test connection management
  - [x] Test CRUD operations for all entities
  - [x] Test transaction handling
  - [x] Test error scenarios
  - [x] Test performance with large datasets

### 3.5 Integration Tests
- [x] Create IntegrationTests.cs
  - [x] Test end-to-end import workflow
  - [x] Test database schema migrations
  - [x] Test service integration
  - [x] Test error propagation
  - [x] Test performance benchmarks

## Phase 4: Quality Assurance (Priority: Medium)

### 4.1 Code Quality
- [ ] Run code analysis tools
- [ ] Fix code quality issues
- [ ] Ensure consistent coding standards
- [ ] Update documentation

### 4.2 Test Quality
- [ ] Achieve >80% code coverage
- [ ] Ensure all critical paths are tested
- [ ] Verify test reliability and stability
- [ ] Document test scenarios

### 4.3 Performance Testing
- [ ] Test import performance with large datasets
- [ ] Test memory usage during operations
- [ ] Test database query performance
- [ ] Optimize slow operations

## Phase 5: Documentation and Cleanup (Priority: Low)

### 5.1 Documentation
- [ ] Update README with new architecture
- [ ] Document test execution procedures
- [ ] Create architecture diagrams
- [ ] Update OpenSpec documentation

### 5.2 Cleanup
- [ ] Remove unused code and files
- [ ] Clean up temporary test data
- [ ] Optimize project structure
- [ ] Final code review

## Success Criteria
- [ ] All tests pass with `dotnet test`
- [ ] Code coverage >80%
- [ ] No compilation errors or warnings
- [ ] Clean Architecture principles followed
- [ ] No code duplication
- [ ] All services properly tested
- [ ] Documentation updated
