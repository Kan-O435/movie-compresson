import type { CompressionJob, CreateJobResponse } from "@/types/compression";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  return raw.replace(/\/+$/, "");
}

export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "入力内容を確認してください。";
    case 404:
      return "圧縮ジョブが見つかりません。";
    case 409:
      return "圧縮処理がまだ完了していません。";
    case 413:
      return "ファイルサイズが上限を超えています。";
    case 422:
      return "入力内容が正しくありません。";
    case 500:
      return "圧縮処理に失敗しました。";
    case 504:
      return "圧縮処理がタイムアウトしました。";
    default:
      return "予期しないエラーが発生しました。";
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof (body as { detail: unknown }).detail === "string" &&
      (body as { detail: string }).detail.length > 0
    ) {
      return (body as { detail: string }).detail;
    }
  } catch {
    // レスポンスがJSONでない場合はステータスコード別メッセージへフォールバック
  }
  return messageForStatus(response.status);
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new ApiError(
      0,
      "APIサーバーに接続できません。FastAPIが起動しているか確認してください。"
    );
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response));
  }

  return (await response.json()) as T;
}

export async function createCompressionJob(
  file: File,
  targetSizeMb: number
): Promise<CreateJobResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target_size_mb", String(targetSizeMb));

  return requestJson<CreateJobResponse>(buildApiUrl("/jobs"), {
    method: "POST",
    body: formData,
  });
}

export async function getCompressionJob(jobId: string): Promise<CompressionJob> {
  return requestJson<CompressionJob>(buildApiUrl(`/jobs/${jobId}`));
}

export function getCompressionDownloadUrl(jobId: string): string {
  return buildApiUrl(`/jobs/${jobId}/download`);
}
