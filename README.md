# technomix-check

VPSでログイン付き死活監視を実行し、GitHub Pagesで成功/失敗ログを公開するための最小構成です。

## 構成

- `scripts/check.js`: 07:30-09:00 は毎分監視し、時間外は毎時1回監視します。時間外チェックで失敗した場合は10分間隔で数回リトライし、VPSローカルの `logs/check-history.jsonl` に追記します。
- `scripts/publish.js`: 監視ログを `docs/status.json` に変換します。朝時間帯は10分ごと、時間外は新しい監視ログがある時だけ commit / push します。
- `docs/`: GitHub Pagesで公開する静的画面です。

## 初期設定

```bash
npm install
cp .env.example .env
```

`.env` にログイン情報を設定します。

```bash
LOGIN_ID=your-login-id
LOGIN_PASS=your-login-password
GIT_PUSH=true
```

時間外監視の既定値は以下です。

```bash
OUTSIDE_CHECK_MINUTE=0
OUTSIDE_RETRY_INTERVAL_MINUTES=10
OUTSIDE_RETRY_ATTEMPTS=3
```

この設定では、時間外は毎時0分ごろに1回チェックし、失敗時はその後10分間隔で最大3回追加チェックします。

## 手動実行

時間帯を無視して監視する場合:

```bash
npm run check:force
```

公開JSONを作成する場合:

```bash
npm run publish:force
```

commit まで行う場合:

```bash
node scripts/publish.js --force --commit
```

`GIT_PUSH=true` の場合は push も行います。

## cron例

監視は毎分起動し、スクリプト側で実行タイミングを判定します。

```cron
* * * * * cd /opt/technomix_check && /usr/bin/npm run check
*/10 * * * * cd /opt/technomix_check && /usr/bin/npm run publish
```

GitHubへの公開は、朝時間帯は既定で 07:30-09:10 の間に10分ごとに行います。時間外は新しい監視ログが発生した場合だけ公開JSONを更新します。

## GitHub Pages

GitHub Pagesの公開元を `docs/` に設定してください。

公開される情報は、成功/失敗、確認時刻、応答時間、簡単なメッセージのみです。ログインID、パスワード、Cookie、HTML本文は公開しません。
