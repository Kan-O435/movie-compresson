# CLAUDE.md

## 1. プロジェクト概要

このプロジェクトは、動画をDiscordへ送信可能な指定ファイルサイズ以下に圧縮するWebサービスです。

ユーザーが動画をアップロードし、目標サイズを指定すると、FFmpegを使用して動画を圧縮し、圧縮後のMP4ファイルをダウンロードできる状態を目指します。

最初の主な対象は、Discord無料ユーザー向けの10MB制限です。

安全マージンを考慮し、初期の目標サイズには9.5MBを使用します。

---

## 2. 開発状況

### 第一段階：ローカルFFmpeg圧縮

第一段階は完了しています。

実装・確認済みの内容は以下です。

* FFmpegとffprobeの導入
* 動画時間の取得
* 目標サイズから映像ビットレートを計算
* H.264とAACによるMP4変換
* 2-passエンコード
* 10MB未満への圧縮
* 圧縮後動画の再生確認
* シェルスクリプトによる圧縮

実際に以下の出力を確認しています。

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

第二段階は完了しています。

現在の実装には、以下が含まれている想定です。

* FastAPIアプリケーション
* `GET /health`
* 動画アップロード
* 同期型動画圧縮API
* `compress.sh`の呼び出し
* 圧縮済み動画のダウンロード
* UUIDによる安全なファイル名生成
* 拡張子バリデーション
* アップロードサイズ制限
* FFmpegのエラー処理
* 入力ファイルの削除
* Swagger UIおよびcurlによる動作確認

作業開始時に必ず実際のコードを確認し、実装済み機能を推測だけで判断しないでください。

---

## 3. 現在の開発段階

現在は第三段階です。

第三段階では、同期型動画圧縮APIを、ジョブIDを返すローカル非同期型APIへ拡張します。

目標とする流れは以下です。

```text
動画をアップロード
↓
アップロード完了後にjob_idを返す
↓
バックグラウンドでFFmpeg圧縮
↓
ステータス確認APIで処理状況を確認
↓
圧縮完了後に動画をダウンロード
```

HTTPリクエスト内で圧縮終了まで待つ現在の同期型処理から、ジョブ管理方式へ移行します。

---

## 4. 第三段階の完成条件

以下をすべて満たした時点で、第三段階を完了とします。

* 動画アップロード後にHTTP 202を返せる
* レスポンスに一意な`job_id`が含まれる
* 圧縮処理がHTTPレスポンス後に実行される
* `GET /jobs/{job_id}`で状態を取得できる
* ジョブ状態を`queued`、`processing`、`completed`、`failed`で管理できる
* 完了前のダウンロードを拒否できる
* 完了後に動画をダウンロードできる
* 存在しないジョブIDで404を返せる
* 圧縮失敗時に`failed`へ更新できる
* エラー内容を安全なメッセージとして保存できる
* 入力ファイルを成功・失敗にかかわらず削除できる
* 失敗時の不完全な出力ファイルを削除できる
* ジョブ情報の管理責務がルーターから分離されている
* CPU負荷の高い圧縮処理をイベントループ上で直接実行しない
* 単体テストではFFmpeg処理をモックできる
* 実動画による手動統合テストが成功する
* READMEに新しいAPIの使用方法が記載されている

---

## 5. 第三段階では実装しないもの

以下は第三段階では実装しません。

* Redis
* Celery
* PostgreSQL
* SQLiteによるジョブ永続化
* Cloudflare R2
* Amazon S3
* Next.js
* React
* WebSocket
* Server-Sent Events
* Docker
* ユーザー登録
* ログイン
* Stripe
* Discord Bot
* 複数ワーカー
* サーバー再起動後のジョブ復元
* 詳細なFFmpeg進捗解析
* 複数ファイルの一括アップロード
* 本番デプロイ

将来必要になることを理由に過剰実装しないでください。

---

## 6. 使用技術

第三段階では以下を使用します。

```text
Python
FastAPI
Uvicorn
python-multipart
Pydantic
asyncio
FFmpeg
ffprobe
Bash
pytest
```

外部のジョブキューやデータベースは使用しません。

---

## 7. API仕様

### GET /health

APIの動作確認用です。

レスポンス例：

```json
{
  "status": "ok"
}
```

既存実装がある場合は再利用してください。

---

### POST /jobs

動画圧縮ジョブを作成します。

リクエスト形式は`multipart/form-data`です。

受け取る項目：

```text
file
target_size_mb
```

`target_size_mb`の初期値：

```text
9.5
```

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

処理内容：

1. 入力値を検証する
2. UUIDでジョブIDを生成する
3. 動画をチャンク単位で`uploads/`へ保存する
4. ジョブ情報を`queued`として登録する
5. バックグラウンド処理を開始する
6. 圧縮完了を待たずにHTTP 202を返す

レスポンス例：

```json
{
  "job_id": "7d6835949da8432fa2cb9f409927e752",
  "status": "queued",
  "status_url": "/jobs/7d6835949da8432fa2cb9f409927e752"
}
```

---

### GET /jobs/{job_id}

ジョブの現在状態を取得します。

処理中のレスポンス例：

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

完了時のレスポンス例：

```json
{
  "job_id": "7d6835949da8432fa2cb9f409927e752",
  "status": "completed",
  "progress_percent": 100,
  "original_size_bytes": 47116829,
  "target_size_bytes": 9500000,
  "output_size_bytes": 9430284,
  "download_url": "/jobs/7d6835949da8432fa2cb9f409927e752/download",
  "error_message": null,
  "created_at": "2026-08-03T10:00:00Z",
  "started_at": "2026-08-03T10:00:01Z",
  "completed_at": "2026-08-03T10:00:45Z"
}
```

失敗時のレスポンス例：

```json
{
  "job_id": "7d6835949da8432fa2cb9f409927e752",
  "status": "failed",
  "progress_percent": 10,
  "original_size_bytes": 47116829,
  "target_size_bytes": 9500000,
  "output_size_bytes": null,
  "download_url": null,
  "error_message": "Video compression failed.",
  "created_at": "2026-08-03T10:00:00Z",
  "started_at": "2026-08-03T10:00:01Z",
  "completed_at": "2026-08-03T10:00:05Z"
}
```

存在しないジョブの場合は404を返してください。

---

### GET /jobs/{job_id}/download

圧縮完了後の動画をダウンロードします。

条件：

* ジョブが存在しない場合：404
* ジョブが`queued`の場合：409
* ジョブが`processing`の場合：409
* ジョブが`failed`の場合：409
* ジョブが`completed`でもファイルがない場合：404
* 正常完了している場合：`FileResponse`

レスポンスのメディアタイプ：

```text
video/mp4
```

ダウンロードファイル名は安全な名称を使用してください。

ユーザー入力をファイルパスとして直接使用してはいけません。

---

## 8. ジョブ状態

ジョブ状態にはEnumを使用してください。

```python
from enum import Enum


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
```

状態遷移：

```text
queued
↓
processing
↓
completed
```

エラー発生時：

```text
queuedまたはprocessing
↓
failed
```

完了後のジョブを再度`processing`へ戻さないでください。

---

## 9. 進捗率

第三段階では、FFmpegの正確な進捗率解析を行いません。

以下の簡易進捗を使用してください。

```text
queued: 0
processing開始: 10
completed: 100
failed: 失敗時点の値
```

`progress_percent`の型は整数とし、0から100の範囲にしてください。

正確な進捗率は後続段階で実装します。

---

## 10. ジョブデータ

ジョブごとに最低限、以下を保持してください。

```text
job_id
status
progress_percent
original_filename
input_path
output_path
original_size_bytes
target_size_bytes
output_size_bytes
error_message
created_at
started_at
completed_at
```

日時はタイムゾーン付きUTCで保持してください。

推奨例：

```python
from datetime import datetime, timezone

datetime.now(timezone.utc)
```

APIレスポンスでは内部ファイルパスを公開しないでください。

---

## 11. ジョブストア

第三段階ではインメモリストアを使用します。

例：

```python
dict[str, CompressionJob]
```

ただし、グローバル辞書を複数のルーターから直接操作しないでください。

ジョブ管理を担当するクラスを作成してください。

責務の例：

```text
create
get
update_status
mark_processing
mark_completed
mark_failed
```

複数の処理から更新される可能性を考慮し、必要であれば`asyncio.Lock`または`threading.Lock`を使用してください。

この段階では単一プロセスでの動作のみ保証します。

Uvicornを複数ワーカーで起動しないでください。

---

## 12. バックグラウンド処理

圧縮処理はHTTPレスポンス後に実行してください。

以下のいずれかを使用できます。

```text
FastAPI BackgroundTasks
asyncio.create_task
asyncio.to_thread
スレッドプール
```

FFmpeg実行をイベントループ上で直接ブロックさせないでください。

既存の同期圧縮関数を再利用する場合は、以下のような方法を使用してください。

```python
result = await asyncio.to_thread(
    compressor.compress,
    input_path,
    output_path,
    target_size_mb,
)
```

バックグラウンド処理中に例外が発生した場合は、必ずジョブを`failed`へ更新してください。

タスク内の例外を未回収のまま放置しないでください。

---

## 13. 圧縮処理

既存の`scripts/compress.sh`または既存の圧縮サービスを再利用してください。

`subprocess.run`では以下を守ってください。

* `shell=True`を使用しない
* 引数を配列で指定する
* タイムアウトを設定する
* `capture_output=True`を使用する
* `text=True`を使用する
* 戻り値を確認する
* 出力ファイルの存在を確認する
* 出力ファイルサイズを確認する
* 目標サイズ以下か確認する

例：

```python
subprocess.run(
    [
        str(script_path),
        str(input_path),
        str(output_path),
        str(target_size_mb),
    ],
    capture_output=True,
    text=True,
    timeout=600,
    check=False,
)
```

FFmpegの長大な標準エラー出力をAPIレスポンスへそのまま含めないでください。

内部ログには必要な範囲で記録してください。

---

## 14. ファイル管理

アップロードファイル：

```text
uploads/{job_id}.{extension}
```

出力ファイル：

```text
outputs/{job_id}.mp4
```

元のファイル名を保存先ファイル名に使用しないでください。

入力ファイルは、圧縮成功・失敗にかかわらず削除してください。

削除は`finally`で行ってください。

失敗時に不完全な出力ファイルが存在する場合は削除してください。

完了済み出力ファイルは第三段階では残して構いません。

自動削除機能は後続段階で実装します。

---

## 15. アップロード処理

動画全体を一度にメモリへ読み込まないでください。

1MB程度のチャンク単位で保存してください。

```python
CHUNK_SIZE_BYTES = 1024 * 1024
```

最大サイズ：

```python
MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024
```

サイズ超過時は413を返し、途中まで作成したファイルを削除してください。

---

## 16. バリデーション

以下を検証してください。

* `target_size_mb`が0より大きい
* 必要に応じて目標サイズの最大値を制限する
* ファイル名に拡張子が存在する
* 許可された拡張子である
* アップロードサイズが500MB以内である
* 入力ファイルが正常に保存された
* FFmpegが正常終了した
* 出力ファイルが存在する
* 出力サイズが0より大きい
* 出力サイズが目標サイズ以下である

MBからbytesへの変換は10進数を使用してください。

```python
target_size_bytes = int(target_size_mb * 1_000_000)
```

---

## 17. エラー処理

想定するHTTPステータス：

```text
202
ジョブ作成成功

400
対応外形式
不正な入力値

404
存在しないジョブ
存在しない出力ファイル

409
未完了または失敗したジョブのダウンロード

413
アップロード上限超過

422
FastAPIまたはPydanticによる入力検証エラー

500
予期しないサーバーエラー

504
同期型APIを残す場合の圧縮タイムアウト
```

バックグラウンド処理の失敗は、すでに202を返した後に起きるため、後からHTTP 500を返すことはできません。

その場合はジョブを`failed`へ更新し、`GET /jobs/{job_id}`から確認できるようにしてください。

エラー内容に以下を含めないでください。

* 内部の絶対パス
* シェルコマンド全体
* 長大なFFmpegログ
* 環境変数
* 機密情報

---

## 18. 推奨ディレクトリ構成

現在の構成を確認したうえで、以下を参考にしてください。

```text
app/
├── __init__.py
├── main.py
├── config.py
├── models/
│   ├── __init__.py
│   └── job.py
├── repositories/
│   ├── __init__.py
│   └── job_repository.py
├── routers/
│   ├── __init__.py
│   ├── health.py
│   ├── compression.py
│   └── jobs.py
├── schemas/
│   ├── __init__.py
│   ├── compression.py
│   └── job.py
└── services/
    ├── __init__.py
    ├── compressor.py
    └── job_service.py
```

既存構成に合わない場合は、無理にすべて変更しないでください。

責務を分けつつ、第三段階に不要な抽象化を避けてください。

---

## 19. 責務分担

### main.py

* FastAPIアプリケーション生成
* ルーター登録
* 必要に応じたlifespan処理

### routers/jobs.py

* HTTPリクエストの受付
* 入力バリデーション
* ジョブ作成サービスの呼び出し
* レスポンスモデルへの変換
* ダウンロードレスポンス

### services/job_service.py

* アップロード保存
* ジョブ登録
* バックグラウンド処理開始
* 状態更新
* 圧縮サービスの呼び出し
* ファイル削除

### services/compressor.py

* `compress.sh`またはFFmpegの実行
* タイムアウト処理
* 出力ファイル検証
* 圧縮結果の返却

### repositories/job_repository.py

* ジョブ作成
* ジョブ取得
* 状態更新
* インメモリデータの排他制御

### schemas/job.py

* APIレスポンスモデル
* ジョブ作成レスポンス
* ジョブ状態レスポンス

### models/job.py

* 内部で使用するジョブモデル
* JobStatus Enum

---

## 20. テスト方針

pytestを使用してください。

### 単体テスト

FFmpegを直接実行せず、圧縮サービスをモックしてください。

最低限テストする内容：

* ジョブ作成で202
* `job_id`が返る
* `status_url`が返る
* ジョブ取得で状態を返せる
* 存在しないジョブで404
* 未完了ジョブのダウンロードで409
* 失敗ジョブのダウンロードで409
* 対応外拡張子で400
* 不正な目標サイズで400または422
* 圧縮成功時に`completed`へ更新される
* 圧縮失敗時に`failed`へ更新される
* 成功時にダウンロードURLが設定される
* 入力ファイルが削除される
* 失敗時の不完全な出力ファイルが削除される

### 手動統合テスト

既存の`input/sample.mp4`を使用してください。

確認内容：

* ジョブ作成
* 状態確認
* 完了までポーリング
* 動画ダウンロード
* 出力サイズ確認
* 動画再生確認
* 入力ファイル削除確認

---

## 21. 動作確認コマンド

仮想環境：

```bash
source .venv/bin/activate
```

サーバー起動：

```bash
uvicorn app.main:app --reload
```

Swagger UI：

```text
http://127.0.0.1:8000/docs
```

ジョブ作成：

```bash
curl -X POST \
  "http://127.0.0.1:8000/jobs" \
  -F "file=@input/sample.mp4" \
  -F "target_size_mb=9.5"
```

状態確認：

```bash
curl \
  "http://127.0.0.1:8000/jobs/JOB_ID"
```

ダウンロード：

```bash
curl -OJ \
  "http://127.0.0.1:8000/jobs/JOB_ID/download"
```

テスト：

```bash
pytest
```

---

## 22. README更新

READMEへ最低限、以下を追記してください。

* 第三段階の概要
* 環境構築
* サーバー起動方法
* API一覧
* ジョブ状態一覧
* curlによるジョブ作成
* 状態確認
* ダウンロード
* ローカルジョブストアの制約
* サーバー再起動でジョブ情報が消えること
* 単一プロセスのみ対応していること

---

## 23. 既存同期APIの扱い

既存の同期型`POST /compress`は、互換性や比較のために残して構いません。

ただし、新しい主機能は`POST /jobs`です。

既存APIを削除または変更する場合は、実装前に以下を確認してください。

* 既存テストへの影響
* READMEへの影響
* 既存のcurl手順への影響
* 再利用できる圧縮サービスの有無

不要なコード重複を避け、同期APIと非同期APIで同じ圧縮サービスを再利用してください。

---

## 24. コーディング方針

* Pythonの型ヒントを使用する
* Pydanticモデルを適切に使用する
* Enumで状態を管理する
* 内部モデルとAPIレスポンスを必要に応じて分離する
* ルーターへ圧縮処理を書かない
* グローバル辞書をルーターから直接操作しない
* エラーを握りつぶさない
* タスク内の例外を放置しない
* コードから明らかなコメントを書きすぎない
* 処理理由が分かりにくい部分だけコメントする
* 既存機能を壊さない
* 大規模なリファクタリングを避ける
* 第三段階の完成に必要な最小構成を優先する

---

## 25. セキュリティ方針

以下を守ってください。

* `shell=True`を使用しない
* 元ファイル名を保存パスに使用しない
* UUIDを使用する
* 拡張子を検証する
* ファイル全体をメモリへ読み込まない
* 最大アップロードサイズを検証する
* 内部パスをレスポンスへ含めない
* ユーザー入力をコマンド文字列へ埋め込まない
* ダウンロード対象はジョブ情報から取得する
* 失敗した一時ファイルを削除する
* FFmpegログをそのまま利用者へ返さない

---

## 26. Claude Codeへの作業指示

作業開始時に、以下を必ず確認してください。

1. 現在のファイル構成
2. 現在のGit差分
3. 既存FastAPIルーター
4. 既存の圧縮サービス
5. `compress.sh`
6. 現在のテスト
7. README
8. requirements.txtまたはpyproject.toml

実装前に以下を報告してください。

* 現在実装されている機能
* 変更予定のファイル
* 新規作成予定のファイル
* 既存処理の再利用方針
* 採用するバックグラウンド処理方式

報告後は、必要な実装、テスト、README更新まで進めてください。

一つの巨大なファイルへすべて実装しないでください。

一度に大規模な変更をせず、機能単位で実装・確認してください。

実装後は以下を報告してください。

* 作成したファイル
* 変更したファイル
* 実装したエンドポイント
* ジョブ状態の管理方法
* バックグラウンド実行方法
* 実行した自動テスト
* 手動統合テストの結果
* 出力動画のサイズ
* 残っている制約
* 次段階の課題

---

## 27. 実行してはいけない操作

以下はユーザーの明示的な指示なしに実行しないでください。

* GitHubへのpush
* 本番環境へのデプロイ
* 外部サービスへの登録
* 課金が発生する操作
* APIキーの作成や変更
* プロジェクト外のファイル削除
* Git履歴を破壊する操作
* `git reset --hard`
* `git clean -fd`
* 強制push
* 既存の動作する圧縮スクリプトの無断削除

第三段階の完成条件を満たした時点で、大きな追加実装は停止してください。
