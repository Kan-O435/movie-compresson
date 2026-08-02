import { clampProgressPercent } from "@/lib/format";
import type { CompressionJob, UiStatus } from "@/types/compression";

interface CompressionStatusProps {
  uiStatus: UiStatus;
  job: CompressionJob | null;
}

const STATUS_LABELS: Record<UiStatus, string> = {
  idle: "",
  uploading: "動画をアップロードしています",
  queued: "圧縮処理を待っています",
  processing: "動画を圧縮しています",
  completed: "圧縮が完了しました",
  failed: "動画の圧縮に失敗しました",
};

export default function CompressionStatus({ uiStatus, job }: CompressionStatusProps) {
  if (uiStatus === "idle") {
    return null;
  }

  const progress =
    uiStatus === "uploading"
      ? 0
      : job
        ? clampProgressPercent(job.progress_percent)
        : null;

  return (
    <div className="compression-status" aria-live="polite">
      <p className={`status-label status-${uiStatus}`}>{STATUS_LABELS[uiStatus]}</p>
      {progress !== null && (
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
