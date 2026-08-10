const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0B";
  }

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1000)),
    BYTE_UNITS.length - 1
  );
  const value = bytes / Math.pow(1000, exponent);
  const decimals = exponent === 0 ? 0 : 2;

  return `${value.toFixed(decimals)}${BYTE_UNITS[exponent]}`;
}

export function calculateReductionPercent(
  originalBytes: number,
  outputBytes: number
): number {
  if (!Number.isFinite(originalBytes) || originalBytes <= 0) {
    return 0;
  }
  const reduction = ((originalBytes - outputBytes) / originalBytes) * 100;
  return Math.round(reduction * 10) / 10;
}

export function clampProgressPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}
