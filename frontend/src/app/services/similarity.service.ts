import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface FixSuggestion {
  // YENİ SİSTEM - ID yok artık, gerçek zamanlı sonuçlar
  track_path: string;
  track_fileName: string;
  track_normalized: string;
  track_source: string;
  track_source_file: string;
  music_file_path: string;
  music_file_name: string;
  music_file_normalized: string;
  similarity_score: number;
  match_type: 'exact' | 'high' | 'medium' | 'low';
  matched_words: string; // "calvin,harris,dua,lipa,one,kiss"
  source: string; // "kelime_arama"
}

export interface SuggestionsResponse {
  success: boolean;
  data: FixSuggestion[];
  total: number;
  count: number;
  stats: {
    exact: number;
    high: number;
    medium: number;
    low: number;
  };
  filters?: {
    type?: string;  // fix_type → type (match_type için)
    confidence_level?: string;
    min_similarity?: number;
    limit?: number;
    offset?: number;
  };
}

export interface ApplyResponse {
  success: boolean;
  message: string;
  applied: number;
  failed: number;
  tracks_updated: number;
  m3u_files_updated: number;
  vdjfolder_files_updated: number;
  errors?: Array<{ id: number; error: string }>;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  deleted: number;
  created: number;
  stats: {
    exact: number;
    high: number;
    medium: number;
    low: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SimilarityService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  private getApiUrl(): string {
    return this.configService.getApiUrl();
  }

  /**
   * Fix önerilerini getir
   */
  getSuggestions(filters?: {
    type?: string;
    confidence_level?: string;
    min_similarity?: number;
    limit?: number;
    offset?: number;
  }): Observable<SuggestionsResponse> {
    const params: any = {};
    
    if (filters?.type) params.type = filters.type;
    if (filters?.confidence_level) params.confidence_level = filters.confidence_level;
    if (filters?.min_similarity !== undefined) params.min_similarity = filters.min_similarity.toString();
    if (filters?.limit !== undefined && filters.limit !== null) params.limit = filters.limit.toString();
    if (filters?.offset !== undefined && filters.offset !== null) params.offset = filters.offset.toString();

    return this.http.get<SuggestionsResponse>(
      `${this.getApiUrl()}/similarity/suggestions`,
      { 
        params,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }

  /**
   * Seçili fix önerilerini uygula (YENİ - PATH BAZLI)
   */
  applySuggestions(suggestions: FixSuggestion[]): Observable<ApplyResponse> {
    return this.http.post<ApplyResponse>(
      `${this.getApiUrl()}/similarity/apply`,
      { 
        suggestions: suggestions.map(s => ({
          track_path: s.track_path,
          music_path: s.music_file_path,
          source: s.track_source,
          source_file: s.track_source_file
        }))
      }
    );
  }

}

