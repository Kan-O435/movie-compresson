export const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".webm", ".mkv"] as const;

export const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024;
export const MAX_UPLOAD_SIZE_LABEL = "500MB";

export const DEFAULT_TARGET_SIZE_MB = 9.5;

export const POLLING_INTERVAL_MS = 2000;
export const MAX_POLLING_DURATION_MS = 600_000;
export const MAX_CONSECUTIVE_POLL_ERRORS = 5;

export interface TargetSizePreset {
  label: string;
  targetSizeMb: number;
}

export const TARGET_SIZE_PRESETS: TargetSizePreset[] = [
  { label: "Discord無料向け（9.5MB）", targetSizeMb: 9.5 },
  { label: "Nitro Basic向け（49MB）", targetSizeMb: 49 },
  { label: "Nitro向け（499MB）", targetSizeMb: 499 },
];

export function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    return "";
  }
  return filename.slice(dotIndex).toLowerCase();
}

export function isAllowedExtension(filename: string): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(
    getFileExtension(filename)
  );
}

export function targetSizeMbToBytes(targetSizeMb: number): number {
  return Math.round(targetSizeMb * 1_000_000);
}
