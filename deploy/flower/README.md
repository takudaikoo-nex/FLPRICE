# 供花発注サイト デプロイ手順

**方式: Vercel（既存の見積システムと同じ）**

同じGitHubリポジトリから、**見積システムとは別のVercelプロジェクト**として配信します。
ビルドコマンドと出力ディレクトリだけを切り替える形なので、既存プロジェクトの設定には影響しません。

| | 見積システム（既存） | 供花サイト（新規） |
|---|---|---|
| Build Command | `npm run build` | `npm run build:flower` |
| Output Directory | `dist` | `dist-flower` |
| エントリ | `index.html` / `admin/index.html` | `flower/index.html` |

VPS + Nginx で配信する場合の手順は末尾の「付録」にあります。

---

## 0. デプロイ前チェックリスト

**未完了の項目があるうちは、社内確認用にとどめて一般公開しないでください。**

### 必須（これが無いと動きません）

- [ ] Supabase SQL Editor で `migrations/004_flower_order_system.sql` を実行した
- [ ] Supabase SQL Editor で `migrations/005_flower_public_api.sql` を実行した
- [ ] `/admin` の「葬儀・発注受付」→「設定」で **供花サイトのベースURL** に本番URLを登録した
- [ ] 供花商品を登録し、画像をアップロードした
- [ ] テスト用の受付を作成し、発行された発注URLで表示を確認した

### 一般公開の前に（法令・運用）

- [x] 特定商取引法に基づく表記／プライバシーポリシーのページ（実装済み。`/admin` →「供花の設定」で内容を入力）
- [ ] 上記に表示する **事業者名・所在地・運営統括責任者** を入力した
- [ ] 受注通知メールの宛先を設定した（メール送信の実装はP4）
- [ ] キャンセル・返金の運用ルールを決めた
- [x] `estimates` / `customers` のRLS → 利用者が代表のみのため現状維持と判断済み（2026-07-26）

### 決済

- [ ] Stripeアカウントを開設した
- [ ] Stripe連携（P3）を実装した
- [ ] 上記が完了するまで、管理画面の「クレジットカード決済を受け付ける」は **オフのまま** にする

> カード決済がオフの間、公開サイトには請求書払いのみ表示され、DB側でもカード決済は拒否されます。

---

## 1. Vercelプロジェクトの作成（初回のみ）

1. Vercel ダッシュボード → **Add New** → **Project**
2. リポジトリ **`takudaikoo-nex/FLPRICE`** を選択（見積システムと同じリポジトリ）
3. **Project Name**: `flprice-flower` など、既存と区別できる名前
4. **Framework Preset**: `Vite`（または `Other`）
5. **Build and Output Settings** を開いて以下を設定

   | 項目 | 値 |
   |---|---|
   | Build Command | `npm run build:flower` |
   | Output Directory | `dist-flower` |
   | Install Command | （既定のまま） |

6. **Deploy** を実行

> **Root Directory は変更しないでください。** ビルド時にリポジトリ直下の `lib/` や `types.ts` を参照するため、
> ルートをリポジトリ直下のままにする必要があります。

### SPAフォールバック

リポジトリ直下の `vercel.json` で `/order/:token` を `/index.html` に書き換えています。
これにより発注URLを直接開けます。`/order` 以外のパスには影響しないため、見積システム側のプロジェクトに影響はありません。

### ドメイン

- そのままで良ければ `https://<プロジェクト名>.vercel.app` が使えます
- 独自ドメインを使う場合は Vercel の **Settings → Domains** から追加し、DNSを指示どおり設定します

決まったURLを `/admin` →「葬儀・発注受付」→「設定」の **供花サイトのベースURL** に登録してください。
発注URLは「ベースURL + `/order/<トークン>`」の形式で発行されます。

---

## 2. 以降の更新

リポジトリにpushすると自動でデプロイされます。手動で行う場合は Vercel ダッシュボードの **Redeploy** を使います。

ローカルでの事前確認:

```bash
npm run build:flower   # dist-flower/ に出力
npm run preview:flower # ビルド結果をローカルで表示
```

---

## 3. デプロイ後の確認

- トップ（`/`）にアクセスすると「ページが見つかりません」の案内が出る（トークンが無いため正常）
- `/admin` で発行した発注URLを開き、葬儀情報と商品一覧が表示される
- 商品を選択 → 名札入力 → 申込フォーム → 確認 → 完了 まで通る
- `/admin` の「供花 受注一覧」に注文が入っている
- 受付を停止した葬儀のURLで「受付は終了しました」が表示される

デモ表示（`?demo=1`）は本番でも動作します。DBに接続せずサンプルデータを表示するため接客時の説明に使えますが、
**一般の方に配るURLとしては使わないでください**。

---

## 付録: VPS + Nginx で配信する場合

同梱の `nginx.conf` と `deploy.sh` を使います。

```bash
# サーバー側（初回のみ）
sudo apt update && sudo apt install -y nginx
sudo mkdir -p /var/www/flower && sudo chown -R $USER:$USER /var/www/flower
# nginx.conf の SERVER_NAME をドメインに置換してから配置
sudo cp nginx.conf /etc/nginx/sites-available/flower
sudo ln -sf /etc/nginx/sites-available/flower /etc/nginx/sites-enabled/flower
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d kyoka.example.com

# ローカルから配置
DEPLOY_HOST=203.0.113.10 DEPLOY_USER=deploy bash deploy/flower/deploy.sh
```

| 環境変数 | 既定値 | 内容 |
|---|---|---|
| `DEPLOY_HOST` | （必須） | 接続先ホスト |
| `DEPLOY_USER` | `deploy` | SSHユーザー |
| `DEPLOY_PATH` | `/var/www/flower` | 配置先ディレクトリ |
| `DEPLOY_PORT` | `22` | SSHポート |
| `SKIP_BUILD` | `0` | `1` でビルドを省略 |
