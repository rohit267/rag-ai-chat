export interface SourceItem {
  source: string;
  displayName: string;
  icon: string;
  type: "web" | "pdf" | "markdown" | "text" | "unknown";
}

export interface ChatQuery {
  query: string;
}

export interface AddSourceRequest {
  url: string;
}

export interface AddFileRequest {
  file: File;
}

export interface RAGResponse {
  content?: string;
  text?: string;
  [key: string]: any;
}

export interface DatabaseRow {
  source: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type FileType = "application/pdf" | "text/markdown" | "text/plain";

export interface UploadedFile {
  name: string;
  type: FileType;
  size: number;
  path: string;
}
