export interface SearchResult {
  originalPath: string;
  found: boolean;
  matchType: "tamYolEsleme" | "farkliKlasor" | "ayniKlasorFarkliUzanti" | "farkliKlasorveUzanti" | "benzerDosya";
  foundPath?: string;
  algoritmaYontemi: string;
  processTime: string;
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
  totalSearched: number;
  found: number;
  notFound: number;
  executionTimeMs: number;
  cacheHit: boolean;
  matchDetails: MatchDetails;
}

export interface SearchResponse {
  status: "success" | "error";
  results: SearchResult[];
  stats: SearchStats;
}
