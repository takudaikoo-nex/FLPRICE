# 供花サイトのクレジットカード決済（Stripe）

供花の公開サイトだけで使う。葬儀本体の見積・請求には入れていない。

## 決済の流れ

```
P2 注文内容の確認
  ↓ create_order（注文を作成し、Stripe の PaymentIntent を用意）
P2.5 お支払い（カード入力欄はStripeのiframe。カード番号は自社サイトを通らない）
  ↓ 決済成功
P3 完了画面

     ＋ 別経路で Stripe → stripe-webhook
        payment_status を paid にして、
        ご注文確認メール（お客様）と受注通知（自社）を送る
```

請求書払いは今までどおり、注文が入った時点でメールを送る。
カード払いは**決済が完了するまでメールを送らない**（途中で離脱した方に確認メールが届かないようにするため）。

## 必要な設定

### 1. Stripe ダッシュボードで鍵を取得

- 公開可能キー `pk_test_...`（本番は `pk_live_...`）
- シークレットキー `sk_test_...`（本番は `sk_live_...`）

### 2. Supabase に鍵を登録

シークレットキーは Edge Function の中だけで使う。**フロントには置かない。**

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

公開可能キーもここに置いている。フロントに埋め込まずAPIの応答で受け取る形にしたので、
テスト↔本番の切り替えはこの2つを差し替えるだけでよく、サイトのビルドはやり直さなくてよい。

### 3. マイグレーションを実行

`migrations/026_flower_stripe.sql` を Supabase で実行する。
`flower_orders` に `stripe_payment_intent_id` と `paid_at` が増える。

### 4. Edge Function をデプロイ

```bash
supabase functions deploy flower-public
supabase functions deploy stripe-webhook
```

### 5. Webhook を登録

Stripe ダッシュボード → 開発者 → Webhook でエンドポイントを追加する。

- URL: `https://kbifluukpqhbjmhhvbgg.supabase.co/functions/v1/stripe-webhook`
- 送信するイベント:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`

登録後に表示される署名シークレット `whsec_...` を登録する。

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**この設定を忘れると入金が確定せず、注文が未決済のまま残る。**
Webhook は署名を検証できないリクエストを一切処理しない。

### 6. 管理画面でカード決済を有効にする

管理画面の供花設定で「カード決済を利用する」をオンにする（`flower_settings.card_payment_enabled`）。
オフのままだとお客様の画面に「クレジットカード」の選択肢が出ない。

## テスト

Stripe のテストモードで、発注ページからカード払いで注文する。

| カード番号 | 挙動 |
| --- | --- |
| `4242 4242 4242 4242` | 成功 |
| `4000 0025 0000 3155` | 3Dセキュアの確認が出る |
| `4000 0000 0000 9995` | 残高不足で失敗 |

有効期限は未来の日付、CVCは任意の3桁でよい。

確認すること:

1. 決済後に完了画面へ進む
2. 管理画面の注文一覧で `payment_status` が「入金済み」になる
3. お客様宛に「供花のご注文を承りました」が届く
4. 社内の通知先に受注通知が届く
5. 決済せずにブラウザを閉じた場合、注文は未決済で残り、メールは届かない

Webhook がローカルに届かない場合は Stripe CLI を使う。

```bash
stripe listen --forward-to https://kbifluukpqhbjmhhvbgg.supabase.co/functions/v1/stripe-webhook
```

## 金額について

決済金額はブラウザから受け取らず、**DBに保存済みの注文合計（税込）だけを使う**。
割引・消費税の計算は既存の `create_flower_order` がそのまま担当している。

## 未決済の注文の扱い

決済まで進まなかった注文は `payment_status = 'pending'` で残る。
管理画面から確認でき、業者への発注書には既存の判定（`include_in_purchase_order`）が使われる。
入金前の注文を発注書から外したい場合は、注文ごとに手動で指定する。
