export type UploadStatus = "idle" | "uploading" | "completed" | "error";

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
  speed: number;
  eta: number;
  error?: string;
  uploadedBytes: number;
  downloadUrl?: string;
}

export interface Config {
  token: string;
  repo: string;
}
