# DNS設定手順（first-leaf.jp / お名前.com）

> 目的: システムから送るメールがGmailに届くようにする
> 対象ドメイン: `first-leaf.jp`（DNSはお名前.comで管理）

---

## なぜ必要か

Gmailは2024年から、**SPFかDKIMのどちらかによる送信者認証**を必須にしました。
`first-leaf.jp` には現在どちらも設定されていないため、このドメインから送るメールは
Gmail宛に届きません（`550-5.7.26 sender is unauthenticated` で拒否されます）。

これは供花システムに限らず、**このドメインから送るメール全般**に影響します。

---

## 手順1: DKIMの値をGoogleで生成する

先にGoogle側で値を作ります。お名前.comの作業はそのあとです。

1. [admin.google.com](https://admin.google.com) に管理者アカウントでログイン
2. 左メニュー **アプリ** → **Google Workspace** → **Gmail**
3. **メールの認証**（Authenticate email）を開く
4. 対象ドメインが `first-leaf.jp` になっていることを確認
5. **DKIM 鍵の長さ** を **1024ビット** にする

   > ★ 重要: 既定の2048ビットだと値が約400文字になり、
   > お名前.comのTXTレコード（255文字まで）に貼り付けられません。
   > 1024ビットなら約220文字で収まります。

6. **新しいレコードを生成** をクリック
7. 表示される次の2つを控える
   - **DNSホスト名**: `google._domainkey`
   - **TXTレコードの値**: `v=DKIM1; k=rsa; p=MIIBIjANBg...`（長い文字列）

**この時点では「認証を開始」を押さないでください。** お名前.comの設定後に押します。

---

## 手順2: お名前.comでレコードを追加する

### 設定画面までの行き方

1. [お名前.com Navi](https://navi.onamae.com/) にログイン
2. 上部メニューの **ドメイン** をクリック
3. 左メニューまたは画面内の **DNS** → **DNS設定/転送設定 - ドメイン一覧**
4. ドメイン一覧から **first-leaf.jp** を選択（ラジオボタン）→ **次へ**
5. **DNSレコード設定を利用する** の行にある **設定する** をクリック

### レコードの追加

「入力」欄が表形式で並んでいます。**1件ずつ入力して「追加」を押す**方式です。

**① SPFレコード**

| 欄 | 入力内容 |
|---|---|
| ホスト名 | **空欄のまま**（何も入れない） |
| TYPE | `TXT` |
| TTL | `3600`（既定のまま） |
| VALUE | `v=spf1 include:_spf.google.com ~all` |

入力したら右側の **追加** ボタンをクリック。

**② DKIMレコード**

| 欄 | 入力内容 |
|---|---|
| ホスト名 | `google._domainkey` |
| TYPE | `TXT` |
| TTL | `3600` |
| VALUE | 手順1で控えた `v=DKIM1; k=rsa; p=...` の値をそのまま貼り付け |

同じく **追加** をクリック。

### 保存

1. 画面を下にスクロールし、**「DNSレコード設定用ネームサーバー変更確認」** のチェックボックスが
   表示されていたら、**チェックを入れたまま**にします（お名前.comのDNSを使っているため）
2. **確認画面へ進む** → 内容を確認 → **設定する**

---

## 注意点

- **既存のレコードを消さないこと。** 特に `google-site-verification=...` のTXTレコードは
  Google Workspaceの所有権確認に使われています。消すとメール受信に影響する可能性があります
- SPFレコードは**ドメインにつき1つだけ**です。すでに `v=spf1` で始まるレコードがある場合は、
  新規追加ではなく既存のものを編集して `include:_spf.google.com` を追加してください
- 反映には数分〜1時間程度かかります

---

## 手順3: Googleで認証を開始する

お名前.comの設定が反映されたら、admin.google.com の **メールの認証** 画面に戻り、
**認証を開始** をクリックします。

「認証中」→「認証済み」に変われば完了です。反映前だとエラーになるので、その場合は少し待って再度クリックしてください。

---

## 手順4: 反映の確認

コマンドプロンプトまたはPowerShellで確認できます。

```powershell
Resolve-DnsName -Name first-leaf.jp -Type TXT | Select-Object -ExpandProperty Strings
Resolve-DnsName -Name google._domainkey.first-leaf.jp -Type TXT | Select-Object -ExpandProperty Strings
```

- 1つ目に `v=spf1 include:_spf.google.com ~all` が出れば SPF はOK
- 2つ目に `v=DKIM1; ...` が出れば DKIM はOK

---

## 手順5: 送信テスト

1. メーラーから `kota_oishi@first-leaf.jp` → `takudai.koo@gmail.com` へテスト送信
2. **受信トレイに届く**ことを確認（迷惑メールフォルダでないこと）
3. Gmailでメールを開き、右上の「…」→ **メッセージのソースを表示**
   - `SPF: PASS` と `DKIM: PASS` になっていれば完了

ここまで確認できたら、供花システムからのメール送信も動きます。

---

## 参考: 将来的にDMARCも設定する場合

SPF・DKIMが安定して動いたあとで、次のレコードを追加するとなりすまし対策が強化されます。
必須ではありませんが、推奨されています。

| 欄 | 入力内容 |
|---|---|
| ホスト名 | `_dmarc` |
| TYPE | `TXT` |
| VALUE | `v=DMARC1; p=none; rua=mailto:kota_oishi@first-leaf.jp` |

`p=none` は「監視のみ・拒否しない」設定です。しばらく運用して問題が無ければ
`p=quarantine` に上げていきます。
