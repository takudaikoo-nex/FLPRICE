# タスク進捗（喪主）サイト デプロイ手順

**方式: Vercel（供花サイトと同じ）**

同じGitHubリポジトリから、**3つ目のVercelプロジェクト**として配信します。
ビルドコマンドと出力ディレクトリだけを切り替える形なので、既存プロジェクトの設定には影響しません。

| | 見積システム | 供花サイト | 喪主サイト（新規） |
|---|---|---|---|
| Root Directory | （変更しない） | （変更しない） | **（変更しない）** |
| Build Command | `npm run build` | `npm run build:flower` | `npm run build:tasks` |
| Output Directory | `dist` | `dist-flower` | `dist-tasks` |
| エントリ | `index.html` / `admin/index.html` | `flower/index.html` | `tasks/index.html` |

> **Root Directory は `tasks/` にしないでください。**
> ビルドはリポジトリ直下の `package.json` と `vite.tasks.config.ts` を使います。
> `tasks/` を指定すると `package.json` が見つからず失敗します。
> vite の `root` が `tasks/` を指しているので、これで `tasks/index.html` が入口になります。

---

## 0. デプロイ前チェックリスト

- [ ] Supabase SQL Editor で `migrations/019_case_tasks.sql` を実行した
- [ ] Supabase SQL Editor で `migrations/020_case_credentials_functions.sql` を実行した
- [ ] `npx supabase functions deploy task-public` を実行した
- [ ] `/admin` →「タスクマスタ管理」で **喪主サイトのURL** を登録した
- [ ] テスト用の案件でアイパスを発行し、ログインできることを確認した

> **2と3は続けて行ってください。** 関数をデプロイしないと、喪主サイトはログインできません。

### 個人情報の扱い

このサイトには葬儀の日程・進捗に加えて**請求金額**が表示されます。
URLだけでは開けず、案件ごとに発行したID／パスワードが必要です。
一般公開のサイトではないため、`robots` は `noindex, nofollow` にしてあります。

---

## 1. Vercelプロジェクトの作成（初回のみ）

1. Vercel ダッシュボード → **Add New** → **Project**
2. リポジトリ **`takudaikoo-nex/FLPRICE`** を選択（見積システムと同じリポジトリ）
3. **Project Name**: `flprice-tasks` など、既存と区別できる名前
4. **Framework Preset**: `Vite`（または `Other`）
5. **Build and Output Settings** を開いて以下を設定

   | 項目 | 値 |
   |---|---|
   | Root Directory | **（変更しない）** |
   | Build Command | `npm run build:tasks` |
   | Output Directory | `dist-tasks` |
   | Install Command | （既定のまま） |

6. **Deploy** を実行

### ルーティング

このサイトはトップ（`/`）だけで完結します。画面の切り替えはログイン後の状態で行うため、
供花サイトのような書き換え（`vercel.json` の `/order/:token`）は不要です。

### ドメイン

- そのままで良ければ `https://<プロジェクト名>.vercel.app` が使えます
- 独自ドメインを使う場合は Vercel の **Settings → Domains** から追加し、DNSを指示どおり設定します

決まったURLを `/admin` →「タスクマスタ管理」の **喪主サイトのURL** に登録してください。
案件画面で「まとめてコピー」を押したときに、このURLが一緒に入ります。

---

## 2. 以降の更新

リポジトリにpushすると自動でデプロイされます。手動で行う場合は Vercel ダッシュボードの **Redeploy** を使います。

ローカルでの事前確認:

```bash
npm run build:tasks   # dist-tasks/ に出力
npm run preview:tasks # ビルド結果をローカルで表示
```

Edge Function を直したときは、pushとは別に手動でデプロイが必要です。

```bash
npx supabase functions deploy task-public
```

---

## 3. デプロイ後の確認

1. トップにアクセスするとログイン画面が出る
2. 見積システムの「タスク進捗」→ 案件を開く →「発行」でアイパスを作る
3. そのID／パスワードでログインし、案件の情報とタスクが出る
4. 自分の担当タスクをタップすると「確認済み・FL確認中」になる
5. スタッフ側の案件詳細で、その項目に「喪主 確認済み」が付く
6. お支払いのタスクに請求額が出る。「内訳を見る」で明細が開く
7. 同じログイン画面に**スタッフのメールアドレス**を入れると、スタッフ表示に切り替わる
8. 「再発行」すると、開いたままの喪主の画面がログアウトされる

### うまくいかないとき

| 症状 | 原因 |
|---|---|
| ログインで必ず失敗する | `task-public` が未デプロイ／`020` が未実行 |
| ログインできるがタスクが空 | その案件のタスクが未生成（見積システムの「タスクを生成」） |
| 請求額が 0 円 | 案件に見積の内容（`content`）が保存されていない |
| コピーしたURLが「（未設定）」 | `/admin` の「タスクマスタ管理」で喪主サイトのURLが未登録 |
