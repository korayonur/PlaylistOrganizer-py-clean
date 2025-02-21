import { ApiMatchType } from "./enums";

export interface ResultItem {
  path: string;
  originalPath: string;
  foundPath?: string;
  matchType: ApiMatchType;
  similarity?: number;
  processTime?: number;
  algoritmaYontemi?: string;
  found?: boolean;
  icon: string;
  tooltip: string;
  badgeType?: "success" | "warning" | "error";
}

export interface GroupedResults {
  type: "found" | "not_found";
  title: string;
  results: SearchResult[];
  badge: string;
  badgeType: "success" | "error" | "warning";
}

export interface SearchResult {
  path: string;
  status: "found" | "not_found";
  foundPath?: string;
  processTime?: number;
}

export interface MatchDetailItem {
  count: number;
  time: string;
  algoritmaYontemi: string;
}

export interface ApiMatchDetails {
  exact: number;
  similar: number;
  notFound: number;
  tamYolEsleme: MatchDetailItem;
  ayniKlasorFarkliUzanti: MatchDetailItem;
  farkliKlasor: MatchDetailItem;
  farkliKlasorveUzanti: MatchDetailItem;
  benzerDosya: MatchDetailItem;
}

export interface ApiStats {
  searched: number;
  found: number;
  notFound: number;
  totalTime: number;
  totalSearched: number;
  executionTimeMs: number;
  matchDetails?: ApiMatchDetails;
  cacheHit?: boolean;
}

export interface GroupCounts {
  tamYolEsleme: number;
  ayniKlasorFarkliUzanti: number;
  farkliKlasor: number;
  benzerDosya: number;
  bulunamayan: number;
}
