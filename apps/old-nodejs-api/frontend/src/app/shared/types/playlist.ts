export interface Song {
  path: string;
  isFileExists: boolean;
  status: "exists" | "missing" | "updated";
  alternativePath?: string;
  similarity?: number;
}
