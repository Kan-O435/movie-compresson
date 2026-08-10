# CLAUDE.md

## 1. プロジェクト概要

このプロジェクトは、動画をDiscordへ送信可能な指定ファイルサイズ以下へ圧縮するWebサービスです。

ユーザーが動画を選択し、目標ファイルサイズを指定すると、FastAPIとFFmpegを使用して動画を圧縮し、圧縮後のMP4ファイルをダウンロードできる状態を目指します。

最初の主な対象はDiscord無料ユーザー向けの10MB制限です。

上限超過を防ぐため、無料ユーザー向けプリセットでは9.5MBを使用します。

---

## 2. 開発状況

### 第一段階：ローカルFFmpeg圧縮

完了しています。

確認済み：

* FFmpegとffprobe
* 動画情報取得
* 目標サイズからビットレート計算
* H.264とAACによるMP4出力
* 2-passエンコード
* 10MB未満への圧縮
* 圧縮後動画の再生

確認した出力例：

```text
codec_name=h264
width=2940
height=1474
r_frame_rate=60/1
duration=45.866667
size=9430284
bit_rate=1644816
```

### 第二段階：同期型FastAPI

完了しています。

主な実装内容：

* FastAPIアプリケーション
* ヘルスチェック
* 動画アップロード
* 同期型圧縮API
* `compress.sh`の呼び出し
* 圧縮済み動画のダウンロード
* ファイル形式検証
* アップロードサイズ制限
* UUIDによるファイル管理
* エラー処理

### 第三段階：非同期ジョブAPI

完了しています。

主な実装内容：

* `POST /jobs`
* `GET /jobs/{job_id}`
* `GET /jobs/{job_id}/download`
* HTTP 202によるジョブ作成
* インメモリジョブ管理
* `queued`、`processing`、`completed`、`failed`
* バックグラウンド圧縮
* 簡易進捗率
* 完了後のダウンロード
* 入力ファイル削除
* 失敗時の一時ファイル削除

作業開始時に必ず実際のコードを確認し、上記が本当に実装済みか確認してください。

---

## 3. 現在の開発段階

現在は第四段階です。

第四段階では、FastAPIの非同期ジョブAPIを操作するNext.jsクライアントを実装します。

目標とする利用フロー：

```text
動画を選択
↓
Discord向けの目標サイズを選択
↓
FastAPIへアップロード
↓
job_idを受け取る
↓
ジョブ状態を定期確認
↓
圧縮完了
↓
圧縮済み動画をダウンロード
```

この段階では、ローカル環境でバックエンドとフロントエンドを接続し、1本の動画を圧縮できる画面を完成させます。

---

## 4. 第四段階の完成条件

以下をすべて満たした時点で、第四段階を完了とします。

* Next.jsクライアントを起動できる
* 動画ファイルを選択できる
* ファイル名とサイズを表示できる
* 目標サイズプリセットを選択できる
* FastAPIへ動画を送信できる
* `job_id`を受け取れる
* ジョブ状態を定期取得できる
* `queued`状態を表示できる
* `processing`状態を表示できる
* `completed`状態を表示できる
* `failed`状態を表示できる
* 進捗率を表示できる
* 圧縮前後のサイズを表示できる
* 削減率を表示できる
* 圧縮後動画をダウンロードできる
* 別の動画を再度圧縮できる
* 対応外形式をクライアント側で拒否できる
* 500MB超過をクライアント側で拒否できる
* バックエンドのエラーをユーザー向けに表示できる
* ポーリングが完了または失敗時に停止する
* コンポーネント破棄時にポーリングを停止する
* FastAPIのCORS設定がローカルクライアントに対応している
* PCとスマートフォン幅で最低限利用できる
* `npm run lint`が成功する
* `npm run build`が成功する
* 実動画による統合テストが成功する
* READMEにクライアントの起動方法が記載されている

---

## 5. 第四段階では実装しないもの

以下は第四段階では実装しません。

* ユーザー登録
* ログイン
* セッション管理
* PostgreSQL
* Redis
* Celery
* Cloudflare R2
* Amazon S3
* Stripe
* 広告
* 利用回数制限
* 圧縮履歴
* WebSocket
* Server-Sent Events
* Discord Bot
* 本番デプロイ
* Docker
* 管理画面
* 複数動画の一括処理
* 動画編集
* 動画切り抜き
* 動画プレビュー編集
* 任意コーデック選択
* 多言語対応
* UIライブラリ
* 状態管理ライブラリ
* React Query
* SWR
* axios

将来必要になることを理由に、第四段階で過剰実装しないでください。

---

## 6. 使用技術

第四段階では以下を使用します。

```text
Next.js
React
TypeScript
Fetch API
CSSまたは既存のTailwind CSS
FastAPI
```

Next.jsはApp Routerを使用してください。

既存プロジェクトですでに別の構成がある場合は、その構成を優先してください。

---

## 7. 想定ディレクトリ構成

フロントエンドが存在しない場合は、プロジェクト直下に`client/`を作成してください。

```text
discord-video-compressor/
├── app/
├── scripts/
├── uploads/
├── outputs/
├── tests/
├── client/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── VideoUploadForm.tsx
│   │   │   ├── CompressionStatus.tsx
│   │   │   ├── CompressionResult.tsx
│   │   │   └── ErrorMessage.tsx
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── constants.ts
│   │   │   └── format.ts
│   │   └── types/
│   │       └── compression.ts
│   ├── .env.local.example
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── CLAUDE.md
└── README.md
```

既存の構成がある場合は、無理にこの形へ変更しないでください。

---

## 8. バックエンドAPI

第四段階のクライアントは、現在のFastAPI実装を確認し、その実際の仕様に合わせてください。

想定API：

```text
GET /health
POST /jobs
GET /jobs/{job_id}
GET /jobs/{job_id}/download
```

### POST /jobs

リクエスト：

```text
multipart/form-data
```

項目：

```text
file
target_size_mb
```

レスポンス例：

```json
{
  "job_id": "7d6835949da8432fa2cb9f409927e752",
  "status": "queued",
  "status_url": "/jobs/7d6835949da8432fa2cb9f409927e752"
}
```

### GET /jobs/{job_id}

レスポンス例：

```json
{
  "job_id": "7d6835949da8432fa2cb9f409927e752",
  "status": "processing",
  "progress_percent": 10,
  "original_size_bytes": 47116829,
  "target_size_bytes": 9500000,
  "output_size_bytes": null,
  "download_url": null,
  "error_message": null,
  "created_at": "2026-08-03T10:00:00Z",
  "started_at": "2026-08-03T10:00:01Z",
  "completed_at": null
}
```

バックエンド実装と異なる場合は、実際のAPIに合わせて型定義を変更してください。

---

## 9. 環境変数

APIベースURLは環境変数で管理してください。

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

`.env.local.example`を作成してください。

コード内へAPI URLを直接複数箇所に記述しないでください。

末尾のスラッシュを正規化してください。

---

## 10. 画面構成

第四段階ではトップページ1画面で完結させます。

ページ内の表示領域：

```text
ヘッダー・説明
動画選択
目標サイズ選択
圧縮開始ボタン
選択ファイル情報
処理状態
エラー
圧縮結果
ダウンロードボタン
```

複雑なルーティングは不要です。

---

## 11. 動画選択

対応形式：

```text
.mp4
.mov
.webm
.mkv
```

最大アップロードサイズ：

```text
500MB
```

ファイルを選択したら以下を表示してください。

* ファイル名
* ファイルサイズ
* 拡張子
* 選択解除ボタン

長いファイル名によってレイアウトが崩れないようにしてください。

---

## 12. 目標サイズプリセット

最低限、以下を実装してください。

```text
Discord無料向け: 9.5MB
Nitro Basic向け: 49MB
Nitro向け: 499MB
```

初期値：

```text
9.5MB
```

現段階では任意サイズ入力は必須ではありません。

---

## 13. APIクライアント

API処理は`src/lib/api.ts`へまとめてください。

最低限の関数：

```ts
createCompressionJob(
  file: File,
  targetSizeMb: number
): Promise<CreateJobResponse>

getCompressionJob(
  jobId: string
): Promise<CompressionJob>

getCompressionDownloadUrl(
  jobId: string
): string
```

`fetch`を使用してください。

レスポンスが成功でない場合は、HTTPステータスとバックエンドのエラー内容を安全に解釈してください。

コンポーネントごとに同じAPI処理を重複させないでください。

---

## 14. TypeScript型

最低限、以下の型を定義してください。

```ts
export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface CreateJobResponse {
  job_id: string;
  status: JobStatus;
  status_url: string;
}

export interface CompressionJob {
  job_id: string;
  status: JobStatus;
  progress_percent: number;
  original_size_bytes: number;
  target_size_bytes: number;
  output_size_bytes: number | null;
  download_url: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}
```

バックエンドの実レスポンスに合わせて調整してください。

安易に`any`を使用しないでください。

---

## 15. クライアント状態

最低限、以下を管理してください。

```text
selectedFile
targetSizeMb
jobId
job
uiStatus
errorMessage
```

クライアント側の状態例：

```text
idle
uploading
queued
processing
completed
failed
```

必要以上に状態管理を複雑にしないでください。

この段階ではReactの`useState`と`useEffect`で十分です。

---

## 16. ポーリング

ジョブ作成後、2秒ごとに状態を確認してください。

```text
POLLING_INTERVAL_MS = 2000
```

最大待機時間：

```text
MAX_POLLING_DURATION_MS = 600000
```

停止条件：

* `completed`
* `failed`
* 最大待機時間超過
* コンポーネント破棄
* 新規処理開始
* ユーザーによるリセット

ポーリングの多重起動を防いでください。

クリーンアップ可能な実装にしてください。

---

## 17. 状態表示

表示例：

### uploading

```text
動画をアップロードしています
```

### queued

```text
圧縮処理を待っています
```

### processing

```text
動画を圧縮しています
```

### completed

```text
圧縮が完了しました
```

### failed

```text
動画の圧縮に失敗しました
```

`progress_percent`がある場合は、0から100の範囲へ調整してプログレスバーへ反映してください。

バックエンドが簡易進捗のみを返すことを考慮してください。

---

## 18. 結果表示

完了時に以下を表示してください。

* 元ファイルサイズ
* 圧縮後ファイルサイズ
* 削減率
* ダウンロードボタン
* 別の動画を圧縮するボタン

サイズ表示例：

```text
47.1MB
9.43MB
```

削減率は小数第1位程度で構いません。

元サイズが0の場合は0除算を防いでください。

---

## 19. フォーマット用ユーティリティ

`src/lib/format.ts`へ以下を実装してください。

```ts
formatBytes(bytes: number): string
calculateReductionPercent(
  originalBytes: number,
  outputBytes: number
): number
```

表示ロジックをコンポーネントへ重複記述しないでください。

---

## 20. エラー処理

クライアント側で以下を扱ってください。

```text
ファイル未選択
対応外拡張子
ファイルサイズ上限超過
API接続失敗
アップロード失敗
ジョブ作成失敗
ジョブ取得失敗
ジョブ404
圧縮失敗
ポーリングタイムアウト
ダウンロード失敗
```

内部パス、スタックトレース、長大なFFmpegログは表示しないでください。

ユーザーが次に何をすればよいか分かる表現にしてください。

---

## 21. FastAPIのCORS

Next.jsのローカル開発URLを許可してください。

```text
http://localhost:3000
http://127.0.0.1:3000
```

すでにCORS設定がある場合は重複させないでください。

本番を想定して許可オリジンを設定値として管理できる形が望ましいですが、第四段階ではローカル接続を優先してください。

---

## 22. UI方針

デザインはシンプルで構いません。

優先事項：

* 操作手順が分かりやすい
* 状態が明確
* エラーが見つけやすい
* ダウンロードボタンが目立つ
* スマートフォンでも操作できる
* ファイル名が長くても壊れない

派手なアニメーションは不要です。

---

## 23. テスト方針

最低限、以下を確認してください。

### 静的確認

```bash
npm run lint
npm run build
```

### ロジック確認

* バイト表示
* 削減率
* URL生成
* 拡張子検証
* サイズ上限検証

### 画面確認

* 初期表示
* ファイル選択
* プリセット変更
* アップロード開始
* queued表示
* processing表示
* completed表示
* failed表示
* ダウンロードボタン
* リセット

大規模なテストライブラリ導入は必須ではありません。

---

## 24. 手動統合テスト

FastAPI起動：

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

Next.js起動：

```bash
cd client
npm install
npm run dev
```

アクセス：

```text
http://localhost:3000
```

既存の`input/sample.mp4`を使用して確認してください。

確認項目：

* アップロード
* ジョブ作成
* 状態更新
* 圧縮完了
* サイズ表示
* ダウンロード
* 動画再生
* 出力サイズ
* 入力ファイル削除
* エラー表示
* ポーリング停止

---

## 25. README更新

以下を記載してください。

* クライアント概要
* 前提条件
* Node.jsバージョン
* インストール方法
* `.env.local`設定
* FastAPI起動
* Next.js起動
* 操作方法
* API一覧
* 対応動画形式
* 最大ファイルサイズ
* 現在の制約
* CORS
* Lint
* Build

---

## 26. コーディング方針

* TypeScriptを使用する
* `any`を避ける
* API型を定義する
* API処理をコンポーネントから分離する
* フォーマット処理を分離する
* コンポーネントを過剰分割しない
* 1ファイルへすべて書かない
* ポーリングを多重起動しない
* `useEffect`のクリーンアップを行う
* エラーを握りつぶさない
* 既存バックエンドを壊さない
* 不要な依存関係を追加しない
* 第四段階の完成に必要な最小構成を優先する

---

## 27. Claude Codeへの作業指示

作業開始時に以下を確認してください。

1. 現在のディレクトリ構成
2. Git差分
3. FastAPIの実際のAPI仕様
4. CORS設定
5. バックエンドの起動方法
6. requirements.txtまたはpyproject.toml
7. README
8. 既存のフロントエンド有無
9. Node.jsとnpmの利用可否

実装前に以下を報告してください。

* 現在のAPI仕様
* 新規作成予定のファイル
* 変更予定のバックエンドファイル
* コンポーネント構成
* 状態管理方法
* ポーリング方式
* CORS対応

報告後、そのまま実装、Lint、Build、統合確認、README更新まで進めてください。

実装後は以下を報告してください。

* 作成したファイル
* 変更したファイル
* 実装した画面
* API接続内容
* ポーリング処理
* CORS変更
* 実行したコマンド
* Lint結果
* Build結果
* 統合テスト結果
* 残っている制約
* 次段階の課題

---

## 28. 実行してはいけない操作

以下はユーザーの明示的な指示なしに実行しないでください。

* GitHubへのpush
* 本番環境へのデプロイ
* 外部サービスへの登録
* 課金が発生する操作
* APIキーの作成や変更
* プロジェクト外のファイル削除
* `git reset --hard`
* `git clean -fd`
* 強制push
* 既存の動作する圧縮処理の削除
* RedisやDBなど次段階の過剰実装

第四段階の完成条件を満たした時点で、大きな追加実装は停止してください。
