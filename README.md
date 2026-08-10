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

## 補足（同期API）

- アップロードされた元動画は成功・失敗にかかわらず処理後に削除される
- 圧縮処理はバックグラウンドジョブではなく同期処理（完了までリクエストがブロックされる）

## ジョブAPI（非同期）

動画のアップロードとFFmpeg圧縮を切り離した非同期API。アップロード完了時点で`job_id`を返し、圧縮はHTTPレスポンス送信後にバックグラウンドで実行される。

### ジョブ状態

| status | 意味 |
|---|---|
| `queued` | 受付済み、処理待ち |
| `processing` | 圧縮処理中 |
| `completed` | 圧縮完了、ダウンロード可能 |
| `failed` | 圧縮失敗 |

### ジョブの作成

```bash
curl -X POST "http://127.0.0.1:8000/jobs" \
  -F "file=@input/sample.mp4;type=video/mp4" \
  -F "target_size_mb=9.5"
```

レスポンス例（HTTP 202）:

```json
{
  "job_id": "841e56eaa9e9497ab37c536f833e96df",
  "status": "queued",
  "status_url": "/jobs/841e56eaa9e9497ab37c536f833e96df"
}
```

### ジョブ状態の確認

```bash
curl "http://127.0.0.1:8000/jobs/JOB_ID"
```

完了時のレスポンス例:

```json
{
  "job_id": "841e56eaa9e9497ab37c536f833e96df",
  "status": "completed",
  "progress_percent": 100,
  "original_size_bytes": 47116829,
  "target_size_bytes": 9500000,
  "output_size_bytes": 9430284,
  "download_url": "/jobs/841e56eaa9e9497ab37c536f833e96df/download",
  "error_message": null,
  "created_at": "2026-08-03T03:16:18.330099Z",
  "started_at": "2026-08-03T03:16:18.330281Z",
  "completed_at": "2026-08-03T03:16:30.043353Z"
}
```

存在しない`job_id`は404を返す。

### 圧縮済み動画のダウンロード

```bash
curl -OJ "http://127.0.0.1:8000/jobs/JOB_ID/download"
```

`queued` / `processing` / `failed` 状態でのダウンロードは409を返す。ジョブが存在しない場合は404。

### 制約

- ジョブ情報はインメモリで管理しており、サーバー再起動で消える
- 単一プロセス・単一ワーカーでの動作のみを想定している（`uvicorn`を複数ワーカーで起動しない）
- 進捗率（`progress_percent`）はFFmpegの実進捗を解析しておらず、`queued=0` / `processing開始=10` / `completed=100` の簡易値

## テスト

```bash
source .venv/bin/activate
python -m pytest
```

単体テストはFFmpeg呼び出しをモックしている。実動画による統合確認は`input/sample.mp4`を使い、上記のジョブAPIの手順（作成→状態確認→ダウンロード）を手動で実行する。

## クライアント（Next.js）

`client/`にジョブAPIを操作するNext.jsクライアント（App Router, TypeScript）がある。動画選択→目標サイズ選択→アップロード→ジョブ状態のポーリング→ダウンロードの一連の操作をトップページ1画面で行える。

### 前提条件

- Node.js 20以上（動作確認はNode.js v24.12.0）
- FastAPIバックエンドが起動していること

### インストール

```bash
cd client
npm install
```

### 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local`の`NEXT_PUBLIC_API_BASE_URL`にFastAPIのURLを指定する（デフォルトは`http://127.0.0.1:8000`）。

### 起動方法

1. FastAPIを起動する

   ```bash
   source .venv/bin/activate
   uvicorn app.main:app --reload
   ```

2. 別ターミナルでNext.jsを起動する

   ```bash
   cd client
   npm run dev
   ```

3. ブラウザで `http://localhost:3000` を開く

### 操作方法

1. 「動画ファイル」から`.mp4` `.mov` `.webm` `.mkv`のいずれかを選択する（最大500MB）
2. 「目標サイズ」からプリセット（Discord無料向け 9.5MB / Nitro Basic向け 49MB / Nitro向け 499MB）を選択する
3. 「圧縮開始」を押すとアップロード後にジョブが作成され、2秒間隔で状態を自動確認する
4. 圧縮完了後、元サイズ・圧縮後サイズ・削減率が表示され、「動画をダウンロード」からダウンロードできる
5. 「別の動画を圧縮する」で状態をリセットし、別の動画を選び直せる

### 利用するAPI

```text
GET  /health
POST /jobs
GET  /jobs/{job_id}
GET  /jobs/{job_id}/download
```

### 現在の制約

- ジョブ情報はバックエンドのインメモリストアで管理されており、FastAPI再起動でジョブ状態は失われる
- ポーリングは最大10分でタイムアウトする（`POLLING_INTERVAL_MS=2000`, `MAX_POLLING_DURATION_MS=600000`）
- 状態管理ライブラリ・UIライブラリ・axios等は導入しておらず、React標準の`useState`/`useEffect`と`fetch`のみで構成
- 任意サイズ入力（プリセット以外の目標サイズ指定）は未実装
- 複数動画の同時アップロード・圧縮履歴・認証は未実装

### CORS

FastAPI側で`http://localhost:3000`と`http://127.0.0.1:3000`をローカル開発用に許可済み（`app/main.py`の`CORSMiddleware`）。許可オリジンは環境変数`ALLOWED_ORIGINS`（カンマ区切り）で上書きできる。

### Lint / Build / Test

```bash
cd client
npm run lint
npm run build
npm test
```
