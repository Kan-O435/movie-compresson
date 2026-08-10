import { calculateReductionPercent, formatBytes } from "@/lib/format";
import type { CompressionJob } from "@/types/compression";

interface CompressionResultProps {
  job: CompressionJob;
  downloadUrl: string;
  onReset: () => void;
}

export default function CompressionResult({
  job,
  downloadUrl,
  onReset,
}: CompressionResultProps) {
  const outputSizeBytes = job.output_size_bytes ?? 0;
  const reductionPercent = calculateReductionPercent(
    job.original_size_bytes,
    outputSizeBytes
  );

  return (
    <div className="compression-result">
      <p className="result-heading">圧縮が完了しました</p>
      <dl className="result-details">
        <div>
          <dt>元のサイズ</dt>
          <dd>{formatBytes(job.original_size_bytes)}</dd>
        </div>
        <div>
          <dt>圧縮後のサイズ</dt>
          <dd>{formatBytes(outputSizeBytes)}</dd>
        </div>
        <div>
          <dt>削減率</dt>
          <dd>{reductionPercent}%</dd>
        </div>
      </dl>
      <div className="result-actions">
        <a
          className="download-button"
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          動画をダウンロード
        </a>
        <button type="button" className="secondary-button" onClick={onReset}>
          別の動画を圧縮する
        </button>
      </div>
    </div>
  );
}
