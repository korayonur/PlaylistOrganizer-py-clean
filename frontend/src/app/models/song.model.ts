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

export interface Song {
  id: string;
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
}
