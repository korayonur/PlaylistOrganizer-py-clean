export interface SearchInfo {
  originalQuery: string;
  normalizedQuery: string;
  totalWords: number;
  matchedAt: 'exact' | 'partial' | 'single' | 'none';
  matchedWords: number;
  matchedWordIndex?: number;
  matchedWord?: string;
  searchStage: string;
  searchStep: number;
  searchStepDescription: string;
  searchedTerm?: string;
  inputType: 'query' | 'filePath';
  inputValue: string;
}

export interface SearchResult {
  originalPath: string;
  found: boolean;
  matchType: "tamYolEsleme" | "farkliKlasor" | "ayniKlasorFarkliUzanti" | "farkliKlasorveUzanti" | "benzerDosya";
  foundPath?: string;
  algoritmaYontemi: string;
  processTime: string;
  searchInfo?: SearchInfo;
  // Global mode için son okunan playlist bilgisi
  lastPlaylistName?: string;
  lastPlaylistPath?: string;
}

export interface MatchDetail {
  count: number;
  time: string;
  algoritmaYontemi: string;
}

export interface MatchDetails {
  tamYolEsleme: MatchDetail;
  ayniKlasorFarkliUzanti: MatchDetail;
  farkliKlasorveUzanti: MatchDetail;
  farkliKlasor: MatchDetail;
  benzerDosya: MatchDetail;
}

export interface SearchStats {
  totalProcessed: number;
  executionTime: number;
  averageProcessTime: number;
  matchDetails: MatchDetails;
  foundCount?: number;
  notFoundCount?: number;
}

export interface SearchResponse {
  status: "success" | "error";
  data: SearchResult[];
  stats: SearchStats;
}
