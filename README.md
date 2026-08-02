# movie-compresson

Discord向けに動画を目標容量まで圧縮するツール。CLI版（`scripts/compress.sh`）とFastAPI版（`app/`）を提供する。

## セットアップ

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

ffmpeg / ffprobeが必要（`brew install ffmpeg`など）。

## CLIの使い方

```bash
./scripts/compress.sh input/sample.mp4 output/result.mp4 9.5
```

引数は `入力ファイル 出力ファイル 目標サイズ(MB, 省略時9.5)`。

## APIの起動

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

起動後、Swagger UIは http://127.0.0.1:8000/docs で確認できる。

## APIの使い方

### ヘルスチェック

```bash
curl http://127.0.0.1:8000/health
```

### 動画の圧縮

```bash
curl -X POST http://127.0.0.1:8000/compress \
  -F "file=@input/sample.mp4;type=video/mp4" \
  -F "target_size_mb=9.5"
```

レスポンス例:

```json
{
  "status": "completed",
  "filename": "UUID.mp4",
  "download_url": "/download/UUID.mp4",
  "original_size_bytes": 47116829,
  "output_size_bytes": 9430284,
  "target_size_bytes": 9500000
}
```

対応形式は `.mp4` `.mov` `.webm` `.mkv`、アップロード上限は500MB。

### 圧縮済み動画のダウンロード

```bash
curl -o result.mp4 http://127.0.0.1:8000/download/UUID.mp4
```

## 補足

- アップロードされた元動画は成功・失敗にかかわらず処理後に削除される
- 圧縮処理はバックグラウンドジョブではなく同期処理（完了までリクエストがブロックされる）
