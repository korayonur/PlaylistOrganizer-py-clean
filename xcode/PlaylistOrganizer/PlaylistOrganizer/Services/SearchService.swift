//
//  SearchService.swift
//  PlaylistOrganizer
//
//  Created by Koray Önür on 22.10.2025.
//

import Foundation
import Combine

class SearchService: ObservableObject {
    @Published var searchText: String = ""
    @Published var searchResults: [Track] = []
    @Published var isSearching: Bool = false
    @Published var searchHistory: [String] = []
    @Published var filterOptions: SearchFilterOptions = SearchFilterOptions()
    
    private var cancellables = Set<AnyCancellable>()
    private let maxHistoryCount = 10
    
    init() {
        setupSearchObserver()
        loadSearchHistory()
    }
    
    private func setupSearchObserver() {
        $searchText
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] searchText in
                self?.performSearch(searchText)
            }
            .store(in: &cancellables)
    }
    
    func performSearch(_ query: String) {
        guard !query.isEmpty else {
            searchResults = []
            isSearching = false
            return
        }
        
        isSearching = true
        
        // Simulate search delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.executeSearch(query)
        }
    }
    
    private func executeSearch(_ query: String) {
        // TODO: Gerçek arama implementasyonu
        // Şimdilik mock data ile test edelim
        
        let mockTracks = MockDataService.getSampleTracks()
        
        let filteredTracks = mockTracks.filter { track in
            let matchesFileName = track.fileName.localizedCaseInsensitiveContains(query)
            let matchesFileNameOnly = track.fileNameOnly.localizedCaseInsensitiveContains(query)
            
            // Filter options kontrolü
            let matchesStatus = filterOptions.statusFilter == nil || track.status == filterOptions.statusFilter
            
            return (matchesFileName || matchesFileNameOnly) && matchesStatus
        }
        
        searchResults = filteredTracks
        isSearching = false
        
        // Search history'ye ekle
        addToSearchHistory(query)
    }
    
    func clearSearch() {
        searchText = ""
        searchResults = []
        isSearching = false
    }
    
    func addToSearchHistory(_ query: String) {
        guard !query.isEmpty else { return }
        
        // Duplicate'ları kaldır
        searchHistory.removeAll { $0 == query }
        
        // En başa ekle
        searchHistory.insert(query, at: 0)
        
        // Max count'u kontrol et
        if searchHistory.count > maxHistoryCount {
            searchHistory = Array(searchHistory.prefix(maxHistoryCount))
        }
        
        saveSearchHistory()
    }
    
    func removeFromSearchHistory(_ query: String) {
        searchHistory.removeAll { $0 == query }
        saveSearchHistory()
    }
    
    func clearSearchHistory() {
        searchHistory.removeAll()
        saveSearchHistory()
    }
    
    private func loadSearchHistory() {
        if let data = UserDefaults.standard.data(forKey: "searchHistory"),
           let history = try? JSONDecoder().decode([String].self, from: data) {
            searchHistory = history
        }
    }
    
    private func saveSearchHistory() {
        if let data = try? JSONEncoder().encode(searchHistory) {
            UserDefaults.standard.set(data, forKey: "searchHistory")
        }
    }
    
    func updateFilterOptions(_ options: SearchFilterOptions) {
        filterOptions = options
        // Mevcut aramayı yeniden çalıştır
        if !searchText.isEmpty {
            performSearch(searchText)
        }
    }
}

struct SearchFilterOptions {
    var statusFilter: TrackStatus?
    var dateRange: DateRange?
    var sortBy: SortOption = .title
    
    enum SortOption {
        case title
        case artist
        case dateAdded
    }
}

struct DateRange {
    let startDate: Date
    let endDate: Date
}

