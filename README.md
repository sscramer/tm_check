# technomix-check

VPSでログイン付き死活監視を実行し、GitHub Pagesで成功/失敗ログを公開するための最小構成です。

## 構成

- `scripts/check.js`: 07:30-09:00 の間だけ監視を実行し、VPSローカルの `logs/check-history.jsonl` に追記します。
- `scripts/publish.js`: 監視ログを `docs/status.json` に変換します。必要に応じて commit / push します。
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

監視は毎分起動し、スクリプト側で 07:30-09:00 だけ実行します。

```cron
* * * * * cd /opt/technomix_check && /usr/bin/npm run check
*/10 * * * * cd /opt/technomix_check && /usr/bin/npm run publish
```

GitHubへの公開を朝時間帯だけに寄せるため、`publish.js` は既定で 07:30-09:10 の間だけ動きます。

## GitHub Pages

GitHub Pagesの公開元を `docs/` に設定してください。

公開される情報は、成功/失敗、確認時刻、応答時間、簡単なメッセージのみです。ログインID、パスワード、Cookie、HTML本文は公開しません。
