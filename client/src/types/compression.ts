export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type UiStatus =
  | "idle"
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface CreateJobResponse {
  job_id: string;
  status: JobStatus;
  status_url: string;
}

export interface CompressionJob {
  job_id: string;
  status: JobStatus;
  progress_percent: number;
  original_size_bytes: number;
  target_size_bytes: number;
  output_size_bytes: number | null;
  download_url: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}
