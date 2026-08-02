"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ApiError,
  createCompressionJob,
  getCompressionDownloadUrl,
  getCompressionJob,
} from "@/lib/api";
import CompressionResult from "@/components/CompressionResult";
import CompressionStatus from "@/components/CompressionStatus";
import ErrorMessage from "@/components/ErrorMessage";
import VideoUploadForm from "@/components/VideoUploadForm";
import {
  DEFAULT_TARGET_SIZE_MB,
  MAX_CONSECUTIVE_POLL_ERRORS,
  MAX_POLLING_DURATION_MS,
  MAX_UPLOAD_SIZE_BYTES,
  POLLING_INTERVAL_MS,
  isAllowedExtension,
} from "@/lib/constants";
import type { CompressionJob, UiStatus } from "@/types/compression";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetSizeMb, setTargetSizeMb] = useState<number>(DEFAULT_TARGET_SIZE_MB);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<CompressionJob | null>(null);
  const [uiStatus, setUiStatus] = useState<UiStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollTokenRef = useRef(0);
  const pollTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    pollTokenRef.current += 1;
    if (pollTimeoutIdRef.current !== null) {
      clearTimeout(pollTimeoutIdRef.current);
      pollTimeoutIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const startPolling = useCallback(
    (targetJobId: string) => {
      stopPolling();
      const token = pollTokenRef.current;
      const startedAt = Date.now();

      const poll = async (errorCount: number) => {
        if (pollTokenRef.current !== token) {
          return;
        }

        if (Date.now() - startedAt > MAX_POLLING_DURATION_MS) {
          setUiStatus("failed");
          setErrorMessage(
            "状態確認がタイムアウトしました。時間をおいて再度お試しください。"
          );
          return;
        }

        try {
          const latestJob = await getCompressionJob(targetJobId);
          if (pollTokenRef.current !== token) {
            return;
          }

          setJob(latestJob);

          if (latestJob.status === "completed") {
            setUiStatus("completed");
            return;
          }

          if (latestJob.status === "failed") {
            setUiStatus("failed");
            setErrorMessage(latestJob.error_message ?? "動画の圧縮に失敗しました。");
            return;
          }

          setUiStatus(latestJob.status);
          pollTimeoutIdRef.current = setTimeout(() => {
            void poll(0);
          }, POLLING_INTERVAL_MS);
        } catch (error) {
          if (pollTokenRef.current !== token) {
            return;
          }

          const nextErrorCount = errorCount + 1;
          if (nextErrorCount >= MAX_CONSECUTIVE_POLL_ERRORS) {
            setUiStatus("failed");
            setErrorMessage(
              error instanceof ApiError
                ? error.message
                : "状態確認に失敗しました。ネットワーク接続を確認してください。"
            );
            return;
          }

          pollTimeoutIdRef.current = setTimeout(() => {
            void poll(nextErrorCount);
          }, POLLING_INTERVAL_MS);
        }
      };

      pollTimeoutIdRef.current = setTimeout(() => {
        void poll(0);
      }, POLLING_INTERVAL_MS);
    },
    [stopPolling]
  );

  function handleFileSelect(file: File | null) {
    stopPolling();
    setSelectedFile(file);
    setJobId(null);
    setJob(null);
    setUiStatus("idle");
    setErrorMessage(null);
  }

  function handleReset() {
    stopPolling();
    setSelectedFile(null);
    setJobId(null);
    setJob(null);
    setUiStatus("idle");
    setErrorMessage(null);
  }

  async function handleSubmit() {
    setErrorMessage(null);

    if (!selectedFile) {
      setErrorMessage("動画ファイルを選択してください。");
      return;
    }

    if (!isAllowedExtension(selectedFile.name)) {
      setErrorMessage("対応していないファイル形式です。MP4 / MOV / WebM / MKVのいずれかを選択してください。");
      return;
    }

    if (selectedFile.size > MAX_UPLOAD_SIZE_BYTES) {
      setErrorMessage("ファイルサイズが上限(500MB)を超えています。");
      return;
    }

    if (!(targetSizeMb > 0)) {
      setErrorMessage("目標サイズは0より大きい値を指定してください。");
      return;
    }

    stopPolling();
    setJob(null);
    setJobId(null);
    setUiStatus("uploading");

    try {
      const created = await createCompressionJob(selectedFile, targetSizeMb);
      setJobId(created.job_id);
      setUiStatus("queued");
      startPolling(created.job_id);
    } catch (error) {
      setUiStatus("failed");
      setErrorMessage(
        error instanceof ApiError ? error.message : "ジョブの作成に失敗しました。"
      );
    }
  }

  const isBusy = uiStatus === "uploading" || uiStatus === "queued" || uiStatus === "processing";

  return (
    <main className="page">
      <header className="page-header">
        <h1>Discord Video Compressor</h1>
        <p>動画をDiscordへ送信できるサイズまで圧縮します。</p>
      </header>

      <VideoUploadForm
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        targetSizeMb={targetSizeMb}
        onTargetSizeChange={setTargetSizeMb}
        onSubmit={() => {
          void handleSubmit();
        }}
        disabled={isBusy}
      />

      <CompressionStatus uiStatus={uiStatus} job={job} />

      <ErrorMessage message={errorMessage} />

      {uiStatus === "completed" && job && jobId && (
        <CompressionResult
          job={job}
          downloadUrl={getCompressionDownloadUrl(jobId)}
          onReset={handleReset}
        />
      )}

      {uiStatus === "failed" && (
        <div className="failed-actions">
          <button type="button" className="secondary-button" onClick={handleReset}>
            別の動画を圧縮する
          </button>
        </div>
      )}
    </main>
  );
}
