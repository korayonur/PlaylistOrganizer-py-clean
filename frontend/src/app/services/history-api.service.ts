import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { ConfigService } from "./config.service";

export interface HistoryScanStatusResponse {
  status: "idle" | "running" | "completed" | "error";
  jobId?: string;
  progress: number;
  processed: number;
  totalFiles: number;
  lastFile?: string | null;
  summaries: Array<{
    filePath: string;
    historyId: number;
    totalTracks: number;
    matches: number;
    pending: number;
    missing: number;
  }>;
  startedAt?: string;
  completedAt?: string | null;
  error?: string | null;
  options?: {
    performMatching?: boolean;
  };
}

@Injectable({ providedIn: "root" })
export class HistoryApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ConfigService,
  ) {}

  private get apiUrl() {
    return this.config.getApiUrl();
  }

  scanHistory(payload?: { filePath?: string; files?: string[] }): Observable<HistoryScanStatusResponse> {
    return this.http.post<HistoryScanStatusResponse>(`${this.apiUrl}/history/scan`, payload ?? {});
  }

  getHistoryScanStatus(): Observable<HistoryScanStatusResponse> {
    return this.http.get<HistoryScanStatusResponse>(`${this.apiUrl}/history/scan/status`);
  }

  getHistoryFiles(params?: { limit?: number; offset?: number; search?: string }) {
    let httpParams = new HttpParams();
    if (params?.limit !== undefined) httpParams = httpParams.set("limit", params.limit.toString());
    if (params?.offset !== undefined) httpParams = httpParams.set("offset", params.offset.toString());
    if (params?.search) httpParams = httpParams.set("search", params.search);
    return this.http.get<{ status: string; items: any[] }>(`${this.apiUrl}/history/files`, { params: httpParams });
  }

  getMissing(params?: { status?: string; limit?: number; offset?: number }) {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set("status", params.status);
    if (params?.limit !== undefined) httpParams = httpParams.set("limit", params.limit.toString());
    if (params?.offset !== undefined) httpParams = httpParams.set("offset", params.offset.toString());
    return this.http.get<{ status: string; items: any[] }>(`${this.apiUrl}/history/missing`, { params: httpParams });
  }

  getMissingDetail(id: number) {
    return this.http.get<{ status: string; item: any }>(`${this.apiUrl}/history/missing/${id}`);
  }

  fixTrack(payload: { trackId: number; newPath: string; similarity?: number; method?: string; missingId?: number }) {
    return this.http.post<{ status: string }>(`${this.apiUrl}/history/fix`, payload);
  }

  bulkFix(payload: { fixes: Array<{ trackId: number; newPath: string; similarity?: number; method?: string; missingId?: number }> }) {
    return this.http.post<{ status: string; results: any[] }>(`${this.apiUrl}/history/fix/bulk`, payload);
  }

  ignoreMissing(payload: { missingId?: number; trackId?: number; reason?: string }) {
    return this.http.post<{ status: string }>(`${this.apiUrl}/history/ignore`, payload);
  }
}
