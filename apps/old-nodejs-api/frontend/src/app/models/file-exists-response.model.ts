export interface FileExistsResponse {
  path: string;
  exists: boolean;
  similarity?: number;
  alternativePath?: string;
}
