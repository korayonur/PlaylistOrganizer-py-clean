export interface FileExistsResponse {
  found: boolean;
  path?: string;
  similarity?: number;
}
