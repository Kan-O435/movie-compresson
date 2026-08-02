#!/bin/bash

set -euo pipefail

INPUT_FILE="${1:-}"
OUTPUT_FILE="${2:-output/discord-compressed.mp4}"
TARGET_SIZE_MB="${3:-9.5}"
AUDIO_BITRATE_KBPS=96

if [ -z "$INPUT_FILE" ]; then
  echo "使い方:"
  echo "./scripts/compress.sh input/sample.mp4 output/result.mp4 9.5"
  exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
  echo "入力ファイルが見つかりません: $INPUT_FILE"
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

DURATION=$(ffprobe \
  -v error \
  -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 \
  "$INPUT_FILE")

if [ -z "$DURATION" ]; then
  echo "動画時間を取得できませんでした"
  exit 1
fi

VIDEO_BITRATE_KBPS=$(awk \
  -v size="$TARGET_SIZE_MB" \
  -v duration="$DURATION" \
  -v audio="$AUDIO_BITRATE_KBPS" \
  'BEGIN {
    total = size * 8192 / duration;
    video = total - audio;

    if (video < 100) {
      video = 100;
    }

    printf "%.0f", video;
  }')

PASSLOG_FILE="/tmp/discord-compressor-pass-$$"

echo "入力ファイル: $INPUT_FILE"
echo "動画時間: ${DURATION}秒"
echo "目標サイズ: ${TARGET_SIZE_MB}MB"
echo "映像ビットレート: ${VIDEO_BITRATE_KBPS}kbps"
echo "音声ビットレート: ${AUDIO_BITRATE_KBPS}kbps"

ffmpeg \
  -y \
  -i "$INPUT_FILE" \
  -c:v libx264 \
  -b:v "${VIDEO_BITRATE_KBPS}k" \
  -preset medium \
  -pass 1 \
  -passlogfile "$PASSLOG_FILE" \
  -an \
  -f null \
  /dev/null

ffmpeg \
  -y \
  -i "$INPUT_FILE" \
  -c:v libx264 \
  -b:v "${VIDEO_BITRATE_KBPS}k" \
  -preset medium \
  -pass 2 \
  -passlogfile "$PASSLOG_FILE" \
  -c:a aac \
  -b:a "${AUDIO_BITRATE_KBPS}k" \
  -movflags +faststart \
  -pix_fmt yuv420p \
  "$OUTPUT_FILE"

rm -f "${PASSLOG_FILE}"*

OUTPUT_SIZE_BYTES=$(stat -f "%z" "$OUTPUT_FILE")
OUTPUT_SIZE_MB=$(awk \
  -v bytes="$OUTPUT_SIZE_BYTES" \
  'BEGIN { printf "%.2f", bytes / 1000000 }')

echo ""
echo "圧縮が完了しました"
echo "出力ファイル: $OUTPUT_FILE"
echo "出力サイズ: ${OUTPUT_SIZE_MB}MB"