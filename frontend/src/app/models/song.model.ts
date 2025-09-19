export interface SimilarFile {
  path: string;
  similarity: number;
  analysisType: "format" | "location" | "name" | "levenshtein" | "error";
  analysisText: string;
  line?: number;
  lineText?: string;
  locationMatch?: boolean;
  extensionMatch?: boolean;
}

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

export interface Song {
  id?: string;
  filePath: string;
  isFileExists: boolean;
  status: "exists" | "missing" | "updated";
  originalPath?: string;
  newPath?: string;
  isSearching?: boolean;
  searchError?: string;
  searchMessage?: string;
  searchTime?: number;
  similarFiles?: SimilarFile[];
  searchInfo?: SearchInfo;
}
