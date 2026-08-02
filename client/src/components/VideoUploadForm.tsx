import { useEffect, useRef } from "react";

import {
  ALLOWED_EXTENSIONS,
  MAX_UPLOAD_SIZE_LABEL,
  TARGET_SIZE_PRESETS,
  getFileExtension,
  targetSizeMbToBytes,
} from "@/lib/constants";
import { formatBytes } from "@/lib/format";

interface VideoUploadFormProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  targetSizeMb: number;
  onTargetSizeChange: (value: number) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export default function VideoUploadForm({
  selectedFile,
  onFileSelect,
  targetSizeMb,
  onTargetSizeChange,
  onSubmit,
  disabled,
}: VideoUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedFile === null && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [selectedFile]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    onFileSelect(file);
  }

  function handleRemoveFile() {
    onFileSelect(null);
  }

  const alreadySmallEnough =
    selectedFile !== null &&
    selectedFile.size <= targetSizeMbToBytes(targetSizeMb);

  return (
    <section className="upload-form">
      <div className="field">
        <label htmlFor="video-file">動画ファイル</label>
        <input
          ref={fileInputRef}
          id="video-file"
          type="file"
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={handleFileChange}
          disabled={disabled}
        />
      </div>

      {selectedFile && (
        <div className="selected-file-info">
          <p className="file-name" title={selectedFile.name}>
            {selectedFile.name}
          </p>
          <p className="file-meta">
            {formatBytes(selectedFile.size)} ・{" "}
            {getFileExtension(selectedFile.name) || "不明な形式"}
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={handleRemoveFile}
            disabled={disabled}
          >
            選択解除
          </button>
        </div>
      )}

      {alreadySmallEnough && (
        <p className="notice">
          この動画はすでに目標サイズ以下です。圧縮を実行するかどうかはご自由にお選びください。
        </p>
      )}

      <div className="field">
        <label htmlFor="target-size">目標サイズ</label>
        <select
          id="target-size"
          value={targetSizeMb}
          onChange={(event) => onTargetSizeChange(Number(event.target.value))}
          disabled={disabled}
        >
          {TARGET_SIZE_PRESETS.map((preset) => (
            <option key={preset.targetSizeMb} value={preset.targetSizeMb}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="primary-button"
        onClick={onSubmit}
        disabled={disabled}
      >
        圧縮開始
      </button>

      <dl className="format-info">
        <div>
          <dt>対応形式</dt>
          <dd>MP4 / MOV / WebM / MKV</dd>
        </div>
        <div>
          <dt>最大アップロードサイズ</dt>
          <dd>{MAX_UPLOAD_SIZE_LABEL}</dd>
        </div>
      </dl>
    </section>
  );
}
