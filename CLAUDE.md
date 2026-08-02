1で進めてください。

第二段階では、既存の`compress.sh`をFastAPIから呼び出す同期型APIを実装してください。バックグラウンド処理やジョブ管理は、まだ実装しないでください。

実装するAPIは以下です。

* `GET /health`

  * APIの動作確認
  * レスポンス：`{"status": "ok"}`

* `POST /compress`

  * `multipart/form-data`で動画を受け取る
  * パラメータ：

    * `file`: 動画ファイル
    * `target_size_mb`: 目標容量。初期値は`9.5`
  * 対応形式：

    * `.mp4`
    * `.mov`
    * `.webm`
    * `.mkv`
  * アップロードされた動画は`uploads/`へUUID名で一時保存する
  * 既存の`scripts/compress.sh`を`subprocess.run`で実行する
  * `shell=True`は禁止
  * タイムアウトは600秒
  * 圧縮後の動画は`outputs/UUID.mp4`へ保存する
  * 入力動画は成功・失敗にかかわらず削除する
  * 成功時は以下を返す

```json
{
  "status": "completed",
  "filename": "UUID.mp4",
  "download_url": "/download/UUID.mp4",
  "original_size_bytes": 50000000,
  "output_size_bytes": 9430284,
  "target_size_bytes": 9500000
}
```

* `GET /download/{filename}`

  * `outputs/`内の圧縮済み動画を返す
  * `Path(filename).name`を使用してパストラバーサルを防ぐ
  * 存在しない場合は404
  * `FileResponse`でMP4としてダウンロードさせる

追加要件は以下です。

* 最大アップロード容量は500MB
* ファイルを一度にメモリへ読み込まず、1MBずつ保存する
* UUIDをファイル名に使用する
* `target_size_mb`は0より大きいことを検証する
* 対応外拡張子は400を返す
* 500MB超過は413を返す
* FFmpeg失敗は500を返す
* タイムアウトは504を返す
* 出力ファイルが存在することを確認する
* 出力ファイルが0バイトより大きいことを確認する
* 出力サイズが目標サイズ以下であることを確認する
* FFmpegの長大なログをAPIレスポンスへそのまま返さない
* Pythonでは型ヒントを使用する

構成は以下を基本にしてください。

```text
app/
├── __init__.py
├── main.py
├── config.py
├── routers/
│   ├── __init__.py
│   ├── compression.py
│   ├── downloads.py
│   └── health.py
├── services/
│   ├── __init__.py
│   └── compressor.py
└── schemas/
    ├── __init__.py
    └── compression.py
```

ただし、現在の構成を確認し、過剰な変更は避けてください。

実装手順は以下です。

1. 現在のファイル構成を確認
2. `scripts/compress.sh`の引数と動作を確認
3. 必要なPython依存関係を追加
4. `GET /health`を実装
5. `POST /compress`を実装
6. `GET /download/{filename}`を実装
7. Swagger UIで確認
8. curlで実際の動画を圧縮
9. 出力動画の再生と容量を確認
10. READMEへ起動方法と使い方を追記

まず変更予定のファイルを説明してから実装してください。実装後は、作成・変更したファイル、実行したテスト、確認結果、残課題を報告してください。

この段階では、Redis、Celery、バックグラウンドジョブ、Next.js、DB、Docker、R2、ログイン、Stripeは実装しないでください。
