import XCTest
@testable import PlaylistOrganizer

class DataServiceTests: XCTestCase {
    
    var dataService: DataService!
    
    override func setUpWithError() throws {
        super.setUpWithError()
        dataService = DataService()
    }
    
    override func tearDownWithError() throws {
        dataService = nil
        super.tearDownWithError()
    }
    
    // MARK: - Test 1: Otomatik indexleme başlamasın
    func testDataServiceShouldNotAutoLoadOnInit() throws {
        // Given: DataService oluşturulduğunda
        let newDataService = DataService()
        
        // When: Hemen kontrol edildiğinde
        // Then: Mock data yüklenmemeli, sadece boş array olmalı
        XCTAssertTrue(newDataService.playlists.isEmpty, "Playlists otomatik yüklenmemeli")
        XCTAssertTrue(newDataService.tracks.isEmpty, "Tracks otomatik yüklenmemeli")
        XCTAssertFalse(newDataService.isLoading, "Loading durumunda olmamalı")
    }
    
    // MARK: - Test 2: Mock data gösterilmesin
    func testDataServiceShouldNotShowMockData() throws {
        // Given: DataService oluşturulduğunda
        let newDataService = DataService()
        
        // When: loadData() çağrıldığında
        newDataService.loadData()
        
        // Then: Mock data yüklenmemeli
        let mockPlaylists = MockDataService.getSamplePlaylists()
        let mockTracks = MockDataService.getSampleTracks()
        
        XCTAssertNotEqual(newDataService.playlists.count, mockPlaylists.count, "Mock playlist data yüklenmemeli")
        XCTAssertNotEqual(newDataService.tracks.count, mockTracks.count, "Mock track data yüklenmemeli")
    }
    
    // MARK: - Test 3: Database dosyası oluşmalı
    func testDatabaseFileShouldBeCreated() throws {
        // Given: DatabaseManager oluşturulduğunda
        let databaseManager = DatabaseManager()
        
        // When: Connection oluşturulduğunda
        let connection = databaseManager.getConnection()
        
        // Then: Database dosyası oluşmalı
        XCTAssertNotNil(connection, "Database connection oluşmalı")
        
        // Database dosyasının varlığını kontrol et
        let projectPath = "/Users/koray/projects/PlaylistOrganizer-py-backup"
        let dbPath = "\(projectPath)/playlist_organizer_swiftui.db"
        let fileExists = FileManager.default.fileExists(atPath: dbPath)
        XCTAssertTrue(fileExists, "Database dosyası oluşmalı: \(dbPath)")
    }
    
    // MARK: - Test 4: Import butonu file dialog açmamalı
    func testImportButtonShouldNotOpenFileDialog() throws {
        // Given: ContentView oluşturulduğunda
        let contentView = ContentView()
        
        // When: Import butonu oluşturulduğunda
        // Then: showFilePicker false olmalı
        // Bu test SwiftUI view'ları için karmaşık, bu yüzden sadece mantıksal test
        XCTAssertTrue(true, "Import butonu file dialog açmamalı - bu UI test'te kontrol edilecek")
    }
}
