# 開発要件定義 — タスク進捗共有ページ（2026-08）

> 対象: 見積システム（`C:\Projects\FL`）への機能追加
> 起点: `FL_Obsidian/01_タスク管理/タスク_2026-08-06.md` A-4「TODOリスト共有システム」
> 作成日: 2026-08-07
> ステータス: 設計中（未確定事項は §11 を参照）
> 関連: `docs/requirements-2026-07.md`（供花システム・ログイン・RLSの方針）

---

## 0. 全体像

案件（＝1つの葬儀）ごとに **やることリストと進捗** を持ち、
**喪主とスタッフが同じ情報を別の見え方で** 確認できるようにする。

| | 目的 |
|---|---|
| 喪主側 | 「何をすればいいか分からない」という最大のストレスを解消する |
| 社内側 | 「死亡届出した？」の口頭確認をなくす。属人化を解消し、人が増えても回る状態にする |

**ゴールは「支払い（入金確認）」**。火葬で終わりではなく、入金の確認までをタスクとして持つ。

### 決定事項（2026-08-07）

| # | 論点 | 決定 |
|---|---|---|
| 1 | タスクの生成 | **見積の中身から自動生成**。判定は**プラン（カテゴリ／プランID）**で行う（§4.1の補足を参照） |
| 2 | 生成条件の管理 | **`/admin` のタスクマスタ管理から編集**できる。改修不要で増減できる |
| 3 | 支払いまわり | **タスク画面から請求書を発行できる**。喪主のタスク詳細にも請求金額・お振込先を表示する |
| 4 | 帳票との連動 | **自動連動**。請求書発行 →「請求書の送付」完了、領収書発行 →「入金の確認」完了（＝ゴール） |
| 5 | 喪主のチェック | **「確認済み」止まり**。完了の確定はスタッフが行う |
| 6 | 期日 | **告別式日からの自動計算**（マスタに「何日前」を持つ）。手修正も可 |
| 7 | 喪主画面の置き場所 | **供花と同じく別サイト**（鍵を持たない公開SPA＋Edge Function） |
| 8 | アイパスの配布 | **v1はコピーのみ**。渡し方（紙・SMS）は運用しながら決める |
| 9 | 請求の見せ方 | 喪主画面は**総額を表示し、明細はアコーディオンで開く** |
| 10 | 葬儀後の表示期限 | **設けない（無期限）**。入金完了後は葬儀後サポートへのナーチャリング導線に切り替える（§5.2） |

### v1 / v2 の切り分け

| | 内容 |
|---|---|
| **v1（今回）** | タスク一覧と進捗確認のサイト。喪主／スタッフの出し分け。スタッフによる書き換え。請求書発行までの連動 |
| **v2（次回以降）** | 外部連携（LINE通知・Gmail／メール送信）、決済連携、葬儀後サポート（手続き代行）への引き継ぎ、死亡診断書PDFの添付 |

外部連携は **v1では作らないが、繋ぎ先を1か所に寄せた設計にする**（§9）。

### 供花システムからの応用

| 供花システム | 今回の流用のしかた |
|---|---|
| 葬儀ごとに推測不可能なトークンでURLを発行（`funerals.public_token`） | 案件ごとに**ログインID＋パスワード**を発行（§3）。トークンだけではセンシティブ情報を守れないため一段強くする |
| 公開サイトに Supabase の鍵を持たせず、Edge Function（service role）経由で読み書き（`flower-public`） | **同じ方式をそのまま踏襲**する（`task-public`）。喪主サイトはビルド成果物に鍵を含まない |
| 業務データのRLSは `authenticated` のみ（`migrations/011_close_rls.sql`） | **同じ**。新規テーブルもすべて authenticated 限定にする |
| 発注URLの発行・コピーを見積システムのユーザー画面から行う（`FlowerFuneralsPage.tsx`） | **案件画面からアイパスを発行・コピー**する（§3.4） |
| 別ビルド・別ホスティング（`vite.flower.config.ts` → `dist-flower` → Vercel） | **同じ構成**で喪主サイトを追加（`vite.tasks.config.ts` → `dist-tasks`） |
| 明細を注文時点でスナップショット保存（`flower_order_items`） | **同じ考え方**。マスタからコピーして案件ごとのタスクを実体化する |

---

## 1. 用語と単位

| 用語 | 実体 |
|---|---|
| **案件** | `estimates` の1行。§17（`docs/requirements-2026-07.md`）で確立済みの「案件 #128」の単位 |
| 顧客（ご葬家） | `customers` の1行。案件の親 |
| 供花の受付 | `funerals` の1行。案件から作成される供花の発注受付単位 |

**タスクは「案件（`estimates`）」に紐づける。** 供花の `funerals` ではない。
タスクの起点が成約（案件の受注）であり、ゴールが入金（案件のステータス `paid`）であるため。
供花の手配タスクからは `funerals` を参照するだけにする。

---

## 2. 画面構成

```
┌─ 見積システム（ログイン必須・既存）────────────────────┐
│  TOP画面                                                │
│   ├ 顧客一覧 / 見積作成 / 見積検索（既存）              │
│   ├ 供花 発注URL発行 / 供花 発注者一覧（既存）          │
│   └ ★ タスク進捗（新規）                               │
│        ├ 案件一覧（進捗バー・遅延の可視化）            │
│        └ 案件詳細（タスクの編集・請求書発行・アイパス） │
└─────────────────────────────────────────────────────────┘
                    │ 同じ case_tasks を参照
┌─ 喪主サイト（新規・別ビルド・鍵なし）──────────────────┐
│  ログイン（ID/PW）                                      │
│   ├ 喪主でログイン    → 喪主画面（自分の案件のみ）      │
│   └ スタッフでログイン → スタッフ画面（同じURLで出し分け）│
└─────────────────────────────────────────────────────────┘
```

スタッフの通常運用は見積システム内の画面。
喪主サイト側にもスタッフログインを用意するのは、**現場（斎場）からスマホで進捗を更新する**ため。
どちらも同じ `case_tasks` を更新するため、見え方が分かれるだけで実体は1つ。

---

## 3. 認証・画面の出し分け

### 3.1 方式の比較

| 案 | 内容 | 判定 |
|---|---|---|
| A | 喪主にも Supabase Auth アカウントを作る | ✕ ユーザー管理・招待メール・MAUの管理が必要。喪主は1案件しか使わないため重い |
| B | **案件ごとにログインID＋パスワードを発行し、Edge Function で検証** | **◎ 採用** |
| C | 供花と同じURLトークンのみ（パスワードなし） | ✕ URLの転送・LINEの誤送信で第三者に見えてしまう。葬儀の日程・死亡届の状況・請求金額はセンシティブ |

### 3.2 採用案（B）の仕組み

```
喪主   : ログインID（例 FL-128-4K7Q） + パスワード（8桁・発行時に自動生成）
スタッフ: 既存の Supabase Auth のメールアドレス + パスワード
```

- 入力欄は**1組だけ**。入力されたIDに `@` が含まれていればスタッフ認証、含まれていなければ喪主認証として処理する
- 検証はすべて Edge Function（service role）側で行う
  - 喪主 … `case_credentials` の `password_hash` と照合（pgcrypto の `crypt`）
  - スタッフ … service role クライアントから `signInWithPassword` を実行して検証
- 成功時は **不透明なセッショントークン**（32バイトのhex）を返し、`case_sessions` に保存する
- ブラウザは localStorage にトークンだけを持つ。Supabase の鍵は一切持たない
- セッションの有効期限は既定 **14日**。以降のAPI呼び出しはトークンで役割（`mourner` / `staff`）を判定する

### 3.3 役割ごとにできること

| | 喪主（mourner） | スタッフ（staff） |
|---|---|---|
| 案件の範囲 | **自分の案件1件のみ** | 全案件 |
| タスクの表示 | `visible_to_mourner = true` のもののみ | すべて |
| チェック | **「確認済み」を付ける／外す**（自分の担当のみ）。完了にはしない | 完了・対応中・対象外を設定 |
| 期日・担当者の変更 | ✕ | ○ |
| 社内メモ（`staff_note`） | **見えない** | ○ |
| 連絡事項（`shared_note`） | 閲覧のみ | 編集可 |
| 請求情報 | 金額・お振込先・支払期限を**閲覧のみ** | 請求書の発行・再送 |
| タスクの追加・削除 | ✕ | ○（案件ごとの追加タスク） |

**「確認済み」と「完了」を分ける理由**（2026-08-07 決定）

喪主のチェックは「見ました・やりました」の意思表示にとどめ、
実際に完了かどうかはスタッフが確認して確定する。
進捗率は **完了（`done`）ベース**で数え、確認済み・未完了のものは
喪主画面では「確認済み／FL確認中」、スタッフ画面では**要対応として上に出す**。

### 3.4 アイパスの発行

**見積機能の案件画面（見積の編集モーダル）から発行する。**
供花の「発注URL発行 → コピー」と同じ操作感に揃える。

- 「喪主用ログイン情報を発行」ボタン → ID・パスワードを生成して表示（**パスワードの平文はこの1回だけ表示**）
- 「コピー」ボタンで `URL / ID / パスワード` の3行をまとめてクリップボードへ（**v1はここまで**）
- 再発行すると旧パスワードは無効になり、既存セッションも切れる
- 「停止」で `is_active = false`

---

## 4. DB設計（案）

新規マイグレーション: `migrations/019_case_tasks.sql`（未作成）

### 4.1 タスクマスタ（生成条件つき）

```sql
CREATE TABLE case_task_templates (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code               text UNIQUE NOT NULL,        -- 'temple_check' など
    title              text NOT NULL,
    description        text NOT NULL DEFAULT '',    -- 喪主向けの補足説明
    phase              text NOT NULL,               -- 'meeting' | 'prepare' | 'day' | 'payment'
    owner              text NOT NULL CHECK (owner IN ('fl', 'mourner', 'both')),
    visible_to_mourner boolean NOT NULL DEFAULT true,

    -- ---- 生成条件（すべて空なら常に生成）----
    target_categories  text[]  NOT NULL DEFAULT '{}',  -- 'funeral' | 'cremation'
    target_plan_ids    text[]  NOT NULL DEFAULT '{}',  -- plans.id
    related_item_id    integer REFERENCES items(id),   -- 関連オプション（1つだけ・任意）
    require_flower     boolean NOT NULL DEFAULT false, -- 供花の受付が作られていたら生成

    -- ---- 期日・自動完了 ----
    due_offset_days    integer,                     -- 告別式日からの相対日数（負=前）
    auto_complete_on   text CHECK (auto_complete_on IN ('quote', 'invoice', 'receipt')),

    initial_status     text NOT NULL DEFAULT 'todo'
                         CHECK (initial_status IN ('todo', 'done')),  -- 搬送・安置は done で生成
    sort_order         integer NOT NULL DEFAULT 0,
    is_active          boolean NOT NULL DEFAULT true,
    created_at         timestamptz DEFAULT now(),
    updated_at         timestamptz DEFAULT now()
);
```

**生成判定**

```
そのテンプレを生成する
  ⇔ target_categories が空 or 案件のカテゴリを含む
  ∧ target_plan_ids   が空 or 案件のプランIDを含む
  ∧ related_item_id   が空 or そのアイテムが案件のプランで選択できる（items.allowed_plans に含まれる）
  ∧ （require_flower = false or その案件の funerals が存在する）
```

`/admin` の「タスクマスタ管理」でこれらの条件を編集できるようにする（§5.5）。

#### 補足: 「オプションが選択済みか」は生成条件に使わない（2026-08-07 判断）

当初は「そのアイテムが選択されていればタスクを生成する」設計にしていたが、
実務に当てると**条件が逆向きになる**ため取りやめた。

| | 選択済み | 未選択 |
|---|---|---|
| 祭壇・遺影・骨壷・棺（アップセル） | もう決まっている＝**タスクは不要** | これから決める＝**タスクが必要** |
| 料理・会葬御礼品（`free_input`） | 2次見積（PDFカタログ＋品番手入力）で後から入る。**受注時点ではほぼ未入力** | 決めることがタスクそのもの |

つまり「選択済み → 生成」では必要なタスクほど作られない。
**タスクは「まだ決まっていないことを決める」ためのもの**なので、
生成の判定はプラン（その葬儀でそもそも発生する作業か）で行うのが正しい。

その代わり `related_item_id` を**1つだけ**持たせ、次の2つに使う。

1. **プランに存在しない作業を出さない** — 祭壇（`items.id = 31`）は火葬式プランでは選べないため、
   `allowed_plans` を見るだけで火葬式の案件に祭壇タスクが出なくなる。
   プランごとの条件を手で書かなくてよくなる
2. **カタログ画像への導線** — タスクから `/?catalog=true&item=31` を開けるようにする（§18・既存機能）。
   喪主画面でも「祭壇の写真を見る」ボタンとして使える。**これが一番効く**

選択済みかどうかは、スタッフ画面で**完了の目安**として表示するだけにする
（例: 「祭壇: FO-33 選択済み」→ スタッフが完了にする）。自動では完了させない。

### 4.2 案件ごとのタスク

マスタからコピーして実体化する。あとからマスタを直しても進行中の案件は変わらない。

```sql
CREATE TABLE case_tasks (
    id                  bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    estimate_id         bigint NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    template_id         uuid REFERENCES case_task_templates(id) ON DELETE SET NULL,
    code                text NOT NULL,
    title               text NOT NULL,
    description         text NOT NULL DEFAULT '',
    phase               text NOT NULL,
    owner               text NOT NULL CHECK (owner IN ('fl', 'mourner', 'both')),
    visible_to_mourner  boolean NOT NULL DEFAULT true,
    status              text NOT NULL DEFAULT 'todo'
                          CHECK (status IN ('todo', 'doing', 'done', 'skipped')),
    due_at              timestamptz,
    assignee_name       text NOT NULL DEFAULT '',    -- 誰が予約したかを残す（属人化の解消）
    staff_note          text NOT NULL DEFAULT '',    -- 社内メモ。喪主には返さない
    shared_note         text NOT NULL DEFAULT '',    -- 喪主にも見せる連絡事項

    -- ---- 喪主の確認（完了とは分ける）----
    mourner_confirmed_at timestamptz,

    -- ---- 完了 ----
    completed_at        timestamptz,
    completed_by_role   text,                        -- 'staff' | 'system'
    completed_by_name   text NOT NULL DEFAULT '',
    auto_complete_on    text,                        -- 帳票の発行で自動完了させる指定

    sort_order          integer NOT NULL DEFAULT 0,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    UNIQUE (estimate_id, code)
);

CREATE INDEX case_tasks_estimate_id_idx ON case_tasks (estimate_id, sort_order);
CREATE INDEX case_tasks_due_at_idx      ON case_tasks (due_at) WHERE status <> 'done';
```

### 4.3 更新履歴

「誰がいつ動かしたか」が追えないと属人化の解消にならないため、状態変化は残す。

```sql
CREATE TABLE case_task_events (
    id          bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    task_id     bigint NOT NULL REFERENCES case_tasks(id) ON DELETE CASCADE,
    action      text NOT NULL,               -- 'status' | 'confirm' | 'note' | 'due' | 'assignee'
    from_value  text,
    to_value    text,
    actor_role  text NOT NULL,               -- 'staff' | 'mourner' | 'system'
    actor_name  text NOT NULL DEFAULT '',
    created_at  timestamptz DEFAULT now()
);
```

### 4.4 喪主のログイン情報とセッション

```sql
CREATE TABLE case_credentials (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id   bigint UNIQUE NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    login_id      text UNIQUE NOT NULL,      -- 'FL-128-4K7Q'
    password_hash text NOT NULL,             -- crypt(pw, gen_salt('bf'))
    is_active     boolean NOT NULL DEFAULT true,
    expires_at    timestamptz,               -- NULL = 無期限
    issued_at     timestamptz DEFAULT now(),
    issued_by     text NOT NULL DEFAULT '',
    last_login_at timestamptz
);

CREATE TABLE case_sessions (
    token       text PRIMARY KEY,
    estimate_id bigint REFERENCES estimates(id) ON DELETE CASCADE,  -- staff は NULL
    role        text NOT NULL CHECK (role IN ('mourner', 'staff')),
    actor_name  text NOT NULL DEFAULT '',
    expires_at  timestamptz NOT NULL,
    created_at  timestamptz DEFAULT now()
);
```

### 4.5 v2 のためのフック（v1では列だけ用意し、画面には出さない）

| 追加する列 | 用途 |
|---|---|
| `case_tasks.attachment_paths text[]` | 死亡診断書PDFなどの添付（v2・A-5） |
| `case_task_templates.notify_on_complete boolean` | 完了時に喪主へ通知するか（v2・§9） |
| `case_credentials.line_user_id text` | LINE連携時の宛先（v2） |
| `case_credentials.contact_email text` | メール通知の宛先（v2） |

後からのマイグレーションを減らすため、列だけ先に用意しておく。

### 4.6 RLS

`migrations/011_close_rls.sql` の方針をそのまま適用する。

```sql
ALTER TABLE case_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_task_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_credentials    ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_sessions       ENABLE ROW LEVEL SECURITY;

-- すべて authenticated のみ。喪主サイトは Edge Function（service role）経由でのみ触る。
CREATE POLICY "case_tasks staff all" ON case_tasks
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- （他テーブルも同様）
```

`case_sessions` は authenticated にも開けない（Edge Function からのみ触る）。
`case_credentials` はアイパス発行を見積システム側で行うため authenticated に許可するが、
`password_hash` は画面では一切扱わない。

---

## 5. 画面仕様

### 5.1 喪主画面（スマホ前提）

```
─────────────────────────────
 故 山田 太郎 様
 2026年8月10日（月）11:00 告別式
 ファーストリーフホール鎌倉
─────────────────────────────
 進捗   ●●●●●○○○○   5 / 11
 次にやること: お寺（菩提寺）へのご連絡
─────────────────────────────
 ▼ お打ち合わせ
 [✓] 菩提寺（お坊さん）の確認     ご家族   完了
 [✓] 日程（通夜・告別式）の決定    ご家族・FL 完了
 [✓] 斎場・火葬場の予約           FL      完了
 [〜] プランの決定                ご家族・FL 確認済み／FL確認中
 ▼ ご準備
 [ ] 祭壇・思い出ムービー          ～8/8
 [ ] ご案内状の送付               ～8/8
 ...
 ▼ お支払い
 [ ] 請求書の送付                 FL
 [ ] お支払い（入金の確認）        320,000円 / 期限 8/31
─────────────────────────────
```

- チェックできるのは **自分の担当（`owner` が `mourner` / `both`）だけ**。FL担当は状態表示のみ
- 喪主のチェック＝**「確認済み」**。ラベルは「確認しました」。完了はFLが確定する（§3.3）
- 搬送・安置は商談時点で完了しているため、**完了表示のみ**（`initial_status = 'done'` で生成）
- タップでタスクの詳細（説明文・連絡事項・期日）を開く
- 期日を過ぎた未完了は色を変えて上に出す
- 各タスクから、関連オプションのカタログ画像を開ける（`related_item_id` があるもの）
- **支払いタスクの詳細に、請求金額・お振込先・支払期限を表示する**
  - 既定は**総額のみ**を表示し、「内訳を見る」で**アコーディオンを開くと明細が出る**（2026-08-07 決定）
  - 金額と明細は `estimates`（`total_price` / `content`）から、お振込先は `flower_settings.bank_info`
    （請求書メールと同じ値）をサーバー側で引き直す。クライアントから金額を受け取らない
- 進捗率は `done / (全体 - skipped)`。**入金確認が完了したら100%**

### 5.2 入金後の表示（葬儀後サポートへの導線）

**表示期限は設けない（無期限）**（2026-08-07 決定）。
葬儀が終わったら閉じるのではなく、**葬儀後サポート事業（`タスク_2026-08-06` C章）への入口**として残す。

入金の確認が完了したら、喪主画面を「ご葬儀の進捗」から**「これからのお手続き」**に切り替える。

```
─────────────────────────────
 ご葬儀のお手続きは完了しました
 進捗 ●●●●●●●●●● 15 / 15
 [ ご葬儀の記録を見る ]（折りたたみ）
─────────────────────────────
 ▼ これからのお手続き
 ・四十九日までにやること
 ・1年以内にやること（期限のあるもの）
   遺族年金の請求／生命保険の請求／
   行政の補助金申請／年金・保険の停止 …
 ─────────────────────────
 「お手続きの代行も承っています」
 [ 相談する ]  0467-38-5617
─────────────────────────────
```

- **v1では静的なチェックリストと問い合わせ導線まで**。期限のあるものを明示する
- 元ネタは横浜市の冊子をAIで整理したもの（C-1・大石持参分）。内容が固まるまでは項目名だけでよい
- **v2で `case_task_templates` の `phase = 'after'` として同じ仕組みに載せる**
  （四十九日・1年のタスクを同じテーブルで持てば、進捗管理も代行の受注もそのまま流用できる）
- 継続的に開いてもらえること自体がナーチャリングになるため、**アイパスは葬儀後も止めない**
  （停止はスタッフが手動で行えるようにするだけ）

### 5.3 スタッフ画面（案件一覧）

| 案件 | 故人・喪主 | 告別式 | 進捗 | 要対応 | 次のFL作業 |
|---|---|---|---|---|---|
| #128 | 故 山田太郎 / 山田花子様 | 8/10 11:00 | ▓▓▓▓▓░░░ 5/11 | 遅延1・確認2 | 死亡届の提出 |

- 既定は **進行中の案件のみ**（`estimates.status` が `ordered` / `completed` / `invoiced`）
- **要対応** = 期日超過の未完了 ＋ 喪主が確認済みでFL未確定のもの
- 検索は既存の見積検索と同じ条件（案件番号・顧客名・故人名・電話番号）

### 5.4 スタッフ画面（案件詳細）

- タスク表: 状態 / 項目 / 担当（FL・喪主） / 期日 / 担当者名 / 喪主の確認 / 更新者・更新日時
- インライン編集: 状態、期日、担当者名、社内メモ、連絡事項、喪主に表示するか
- 案件ごとのタスク追加（マスタにない突発対応用）
- **「請求書を発行」ボタン**（お支払いフェーズ）
  - 押すとその案件を読み込んで既存の請求書発行フローを開く。帳票は新規実装せず既存を再利用する
  - 発行すると「請求書の送付」タスクが自動完了し、案件ステータスが `invoiced` に進む
  - 領収書を発行すると「入金の確認」タスクが自動完了し、ステータスが `paid` に進む（＝進捗100%）
- 右上に **喪主用ログイン情報**（発行 / 再発行 / 停止 / コピー）
- 更新履歴の表示（誰がいつ完了にしたか）

### 5.5 管理画面（`/admin`）に追加

**タスクマスタ管理**

- 項目名・説明・フェーズ・担当（FL / 喪主 / 両方）・喪主への表示可否・並び順
- **生成条件**: 対象カテゴリ、対象プラン、必要アイテム（`items` から選択）、供花の受付の有無
- 期日（告別式の何日前）、帳票による自動完了の指定
- 供花商品管理・アイテム管理と同じ操作感に揃える

### 5.6 見積システム側の導線

| 場所 | 追加するもの |
|---|---|
| TOP画面 | 「タスク進捗」ボタン（供花の2ボタンと並べる） |
| 見積の編集モーダル（案件画面） | 「タスク進捗を開く」「喪主用ログイン情報の発行」 |
| 見積検索・顧客一覧の各行 | 進捗の簡易表示（`5/11`）※ 二次対応で可 |

### 5.7 タスクの生成タイミング

- 案件のステータスが **`quoted` → `ordered`（受注）に変わったとき**に、見積の内容から生成する
- 手動生成のボタンも用意する（既存案件・作り直し用）
- 生成時に `estimates` の告別式日から `due_offset_days` で期日を自動計算する
- **受注後に見積を変更した場合**は、案件詳細に「タスクを再判定」ボタンを出す
  - 条件を満たすようになったタスクを**追加する**だけ（`UNIQUE (estimate_id, code)` で二重生成を防ぐ）
  - 条件から外れたタスクは**自動で消さない**（進行中の作業を消さないため、スタッフが「対象外」にする）

---

## 6. Edge Function `task-public`

`supabase/functions/flower-public/index.ts` と同じ形（`verify_jwt = false`、CORS許可、service role）。

| action | 入力 | 出力・制限 |
|---|---|---|
| `login` | `login_id`, `password` | セッショントークン、`role`、案件の概要 |
| `session` | `token` | トークンの再検証（アプリ起動時） |
| `tasks` | `token`, `estimate_id?` | 役割で絞ったタスク一覧。喪主には `staff_note` を**返さない** |
| `cases` | `token`（staffのみ） | 進行中の案件一覧 |
| `billing` | `token` | 請求金額・支払期限・お振込先（喪主の支払いタスク用） |
| `update_task` | `token`, `task_id`, 変更内容 | 役割ごとに更新できる項目をサーバー側で制限 |
| `logout` | `token` | セッションを削除 |

**サーバー側で必ず検証すること**

1. トークンの有効性と有効期限
2. 喪主のトークンで **他の案件の `task_id` を触れないこと**（`case_tasks.estimate_id` と `case_sessions.estimate_id` の一致）
3. 喪主が変更できるのは **`mourner_confirmed_at` のみ**、かつ `owner` が `mourner` / `both` のタスクのみ
4. `visible_to_mourner = false` のタスクは喪主のレスポンスに**含めない**
5. `staff_note` は喪主向けレスポンスの組み立て時に落とす（フロントで隠すのではなくAPIで返さない）
6. ログイン失敗の連続回数を制限する（同一 `login_id` に対して 10回/時 程度）

---

## 7. タスクマスタの初期データ

8/6定例の一覧（`タスク_2026-08-06.md` A-4）に、生成条件と支払いの分割を反映したもの。

| # | code | 項目 | フェーズ | 担当 | 喪主表示 | 生成条件 | 関連アイテム | 期日 |
|---|---|---|---|---|---|---|---|---|
| 0 | `transport` | ご搬送 | 打合せ | FL | ○ | 常に（完了状態で生成） | 1 / 2 ご搬送 | — |
| 0 | `keeping` | ご安置 | 打合せ | FL | ○ | 常に（完了状態で生成） | 3 ご安置 | — |
| 1 | `temple_check` | 菩提寺（お坊さん）の確認 | 打合せ | 喪主 | ○ | 常に | — | 告別式 -5日 |
| 2 | `schedule` | 日程（通夜・告別式・火葬）の決定 | 打合せ | 両方 | ○ | 常に | — | 告別式 -5日 |
| 3 | `venue_booking` | 斎場・火葬場の予約 | 打合せ | FL | ○ | 常に | 40 火葬料金 | 告別式 -4日 |
| 4 | `plan` | プランの決定 | 打合せ | 両方 | ○ | 常に | — | 告別式 -4日 |
| 5 | `altar` | 祭壇の決定 | 準備 | 両方 | ○ | **31 が選べるプラン**（＝葬儀系のみ） | **31 祭壇** | 告別式 -3日 |
| — | `coffin` | お棺の決定 | 準備 | 両方 | ○ | 常に | **30 お棺アップグレード** | 告別式 -3日 |
| — | `portrait` | 遺影写真のお預かり | 準備 | 両方 | ○ | 常に | **33 遺影写真アップグレード** | 告別式 -3日 |
| — | `urn` | 骨壷の決定 | 準備 | 両方 | ○ | 常に | **34 骨壷アップグレード** | 告別式 -2日 |
| — | `flower` | 供花の取りまとめ | 準備 | 両方 | ○ | **供花の受付が作成済み** | **32 供花** | 告別式 -1日 |
| 6 | `death_notice` | 死亡届（＋診断書コピー） | 準備 | FL | ○ | 常に | 6 手続き代行 | 告別式 -3日 |
| 7 | `invitation` | 儀式案内状 / 当日タイムスケジュール | 準備 | 両方 | ○ | カテゴリ = 葬儀 | 16 案内看板 | 告別式 -3日 |
| 8 | `greeting_gift` | 御挨拶状 / 当日返礼品 | 準備 | 両方 | ○ | 常に | **50 会葬御礼品** | 告別式 -2日 |
| 9 | `catering` | 料理 / 香典返し | 準備 | 両方 | ○ | カテゴリ = 葬儀 | **52 料理**（51 香典返し） | 告別式 -2日 |
| 10 | `temple_fax` | 坊さん連絡FAX | 準備 | FL | **✕** | 常に（菩提寺なしは対象外にする） | **53 お布施・戒名料** | 告別式 -2日 |
| 5 | `movie` | 思い出ムービー | 準備 | 両方 | ○ | **既定で無効**（アイテム未登録） | — | 告別式 -2日 |
| 11 | `endroll` | 当日エンドロール | 当日 | FL | ○ | **既定で無効**（アイテム未登録） | — | 告別式 当日 |
| 12a | `invoice_sent` | 請求書の送付 | 支払い | FL | ○ | 常に（請求書発行で自動完了） | — | 告別式 +3日 |
| 12b | `payment_received` | **入金の確認（ゴール）** | 支払い | 両方 | ○ | 常に（領収書発行で自動完了） | — | 告別式 +21日 |

- `owner`: FLのみ = `fl` / 喪主のみ = `mourner` / 両方 = `both`
- 搬送・安置は商談時点で完了済みのため `initial_status = 'done'` で生成する
- 坊さん連絡FAXは社内作業のため喪主には出さない（`visible_to_mourner = false`）

**関連アイテムのID**（`constants.ts` / `items` の実データ・2026-08-07 時点）

| ID | 名称 | ID | 名称 |
|---|---|---|---|
| 1 / 2 | ご搬送（〜20km / 〜50km） | 32 | 供花（`multi_grade`） |
| 3 | ご安置 | 33 | 遺影写真アップグレード |
| 6 | 役所・火葬場手続き代行 | 34 | 骨壷アップグレード |
| 16 | 案内看板 | 40 | 火葬料金 |
| 30 | お棺アップグレード | 50 / 51 / 52 | 会葬御礼品 / 香典返し / 料理 |
| 31 | 祭壇（葬儀プランのみ） | 53 | お布施・戒名料 |

- **祭壇（31）は `FUNERAL_FULL` のみ**のため、火葬式の案件では `allowed_plans` の判定だけで
  祭壇タスクが出なくなる。プランごとの条件を手で書く必要がない
- **思い出ムービー・当日エンドロールは、まだアイテムマスタに存在しない**
  （8/6定例 A-7 で「オプション商品として見積に組み込む」＝中期課題）。
  マスタの行は作っておき `is_active = false` にしておく。アイテムを追加したら有効化する
- 菩提寺の有無は現状 `53 お布施・戒名料` の入力で推し量るしかない。
  A-6 で商談画面に**「お坊さん（菩提寺）の有無」フラグ**が入ったら、そちらを条件に切り替える

---

## 8. セキュリティ

| 論点 | 対応 |
|---|---|
| 喪主サイトに鍵を持たせない | 供花サイトと同じく Edge Function 経由のみ。`lib/supabase` を import しない |
| 業務データのRLS | 新規テーブルはすべて `authenticated` 限定。`case_sessions` は authenticated にも開けない |
| パスワードの保存 | pgcrypto の `crypt(pw, gen_salt('bf'))`。平文は保存しない・発行直後の1回だけ画面表示 |
| 他案件へのアクセス | `case_sessions.estimate_id` とタスクの `estimate_id` の一致をサーバー側で必ず確認 |
| 社内メモの流出 | 喪主向けレスポンスで `staff_note` を返さない |
| 請求金額の表示 | 喪主のログイン後のみ。金額はサーバー側で案件から引き直す（クライアントから受け取らない） |
| センシティブ情報 | 死亡診断書の添付は **v2**。実装時はRLS・署名付きURL・保存期間をあらためて設計する（A-5の指摘どおり） |
| セッションの失効 | 既定14日。アイパスの再発行・停止で即時無効化 |

---

## 9. 外部連携（v2・2026-08-07 時点の整理）

**v1では実装しないが、繋ぎ先を1か所に寄せておく。**
タスクの状態が変わる処理をすべて `updateTaskStatus()` 相当の1関数に通し、
そこから通知アダプタを呼ぶ形にすれば、v2で通知先を足すだけで済む。

```
case_tasks の更新 ── notifyTaskChanged(task, actor)
                         ├ (v1) 何もしない
                         ├ (v2) LINE Messaging API へ push
                         ├ (v2) メール（既存 supabase/functions/_shared/smtp.ts を再利用）
                         └ (v2) 社内向け通知
```

| 連携先 | 想定用途 | 事前に確認が必要なこと |
|---|---|---|
| **LINE公式アカウント** | 喪主への進捗通知・リマインド。8/6定例で「実現できると理想」とされたもの | 公式アカウントの開設、Messaging API の無料枠（月200通）、喪主のLINE友だち追加とID紐付けの導線 |
| **メール（SMTP）** | 請求書・案内の送付。**供花で実装済みの `smtp.ts` をそのまま使える** | 追加コストなし。v1の範囲でも小さく足せる |
| **Gmail（API連携）** | 社内のやり取りをタスクに残す／喪主への送信履歴の記録 | Google Cloud のプロジェクト・OAuth同意画面が必要。無料枠運用の前提を崩さないか要確認 |
| **Googleカレンダー** | 斎場・火葬場の予約をスタッフのカレンダーに反映 | 上と同じ。優先度は低い |
| **決済（Stripe）** | 支払いタスクをオンライン決済につなぐ | Stripeアカウントが未開設（供花と共通の課題） |

> **メールが一番安く早い。** LINEは体験として強いが、友だち追加の導線が必要になるため
> 「案内状にQR → 友だち追加 → アイパスのIDを送ってもらって紐付け」といった運用設計が要る。
> 概ね固まってから、どこから着手するかを決める。

---

## 10. 実装フェーズ

| フェーズ | 内容 | 目安 |
|---|---|---|
| **T1** | マイグレーション（§4）＋ タスクマスタ投入 ＋ 見積からの自動生成 | 1日 |
| **T2** | スタッフ画面（見積システム内）: 案件一覧・案件詳細・タスク編集 | 1.5日 |
| **T3** | `/admin` タスクマスタ管理（生成条件の編集） | 0.5日 |
| **T4** | 帳票連動（請求書・領収書の発行でタスクを自動完了）＋ タスク画面からの請求書発行 | 0.5日 |
| **T5** | アイパスの発行UI（案件画面）＋ `task-public` の `login` / `session` | 1日 |
| **T6** | 喪主サイト（`vite.tasks.config.ts` → `dist-tasks`）＋ Vercel配信 | 1.5日 |
| **T7** | 更新履歴・遅延／要対応の可視化 | 0.5日 |
| — | （v2）外部連携・死亡診断書PDF・決済（§9） | 別途 |

**適用順の注意**（供花のときと同じ落とし穴）

1. `migrations/019_case_tasks.sql` を実行
2. `npx supabase functions deploy task-public`
3. 喪主サイトをデプロイ

2を飛ばすと喪主サイトが何も表示できない。1と2は続けて行うこと。

### コスト

現状すべて Supabase / Vercel の無料枠で運用できている（8/6定例）。
今回の追加は **テーブル5つ＋Edge Function 1つ＋静的サイト1つ**で、この前提は崩さない。
外部連携（§9）は無料枠の確認をしてから着手する。

---

## 11. 未確定事項

| # | 論点 | 確認先 |
|---|---|---|
| 1 | 喪主のログインIDの形式（案件番号ベース `FL-128-4K7Q` でよいか） | 大石 |
| 2 | アイパスの渡し方（v1はコピーのみ。運用しながら紙／SMSを決める） | 大石 |
| 3 | 期日の初期値（§7の「告別式 -◯日」が実務に合っているか） | 大石 |
| 4 | 明細アコーディオンに出す粒度（見積の全品目か、プラン・アップセルの大分類だけか） | 大石 |
| 5 | 葬儀後の「これからのお手続き」に載せる項目（横浜市の冊子のAI整理待ち・C-1） | 大石 → 小尾 |
| 6 | スタッフの担当者名を Supabase Auth のユーザー名から自動で入れるか、手入力にするか | 小尾 |
| 7 | 喪主サイトのドメイン（供花サイトと分けるか、パスで分けるか） | 小尾 |
| 8 | 外部連携の着手順（§9。メール → LINE → Gmail の想定） | チーム |

**他の要件の完了待ち**

| 依存 | 内容 |
|---|---|
| A-6（商談フロー） | 「お坊さん（菩提寺）の有無」フラグが入ったら、坊さん連絡FAXの条件をそちらに切り替える |
| A-7（追加オプション） | 思い出ムービー・当日エンドロールがアイテム化されたら、該当タスクを有効にする |
| C-1（葬儀後サポート） | 「これからのお手続き」の項目が固まったら `phase = 'after'` のタスクとして載せる |

---

## 12. 確認用のサイトイメージ

`docs/mockups/task-progress.html`（ブラウザで直接開ける単体HTML）

- 喪主画面（スマホ表示）
- スタッフ画面（案件一覧 / 案件詳細）
- ログイン画面（IDで喪主・スタッフを出し分ける想定の見せ方）

**ダミーデータの静止モック**であり、実装ではない。画面の並びと情報量の確認用。

---

## 13. 実装状況（2026-08-07）

| | 内容 | 実装 |
|---|---|---|
| T1 | タスクの自動生成（受注時＋手動） | `lib/caseTasks.ts` / `components/EstimateEditModal.tsx` |
| T2 | スタッフ画面（案件一覧・案件詳細） | `components/tasks/CaseTaskPage.tsx` |
| T3 | タスクマスタ管理 | `admin/components/CaseTaskTemplatesManager.tsx` |
| T4 | 帳票との連動 | `hooks/useEstimateSystem.ts` → `completeTasksForDocument()` |
| T5 | 喪主用アイパスの発行 | `lib/caseAccess.ts` ＋ 案件詳細のパネル |
| T6 | Edge Function／喪主サイト | `supabase/functions/task-public/` / `tasks/` |

### 適用手順

```
1. migrations/019_case_tasks.sql                 を実行（テーブル・マスタ）
2. migrations/020_case_credentials_functions.sql を実行（アイパスの発行・照合）
3. npx supabase functions deploy task-public
4. npm run build:tasks  → dist-tasks/ を配信（Vercel の別プロジェクト）
5. /admin →「タスクマスタ管理」で喪主サイトのURLを設定
```

3を飛ばすと喪主サイトが何も表示できない。2と3は続けて行うこと。

### パスワードの扱い

ハッシュ化と照合は DB の SECURITY DEFINER 関数で行う（`020`）。

| 関数 | 実行できる役割 |
|---|---|
| `issue_case_credential` / `deactivate_case_credential` | `authenticated`（見積システム） |
| `case_login` / `purge_expired_case_sessions` | `service_role`（Edge Function）のみ |

平文のパスワードは保存されず、発行直後に画面へ1回だけ表示される。

### v1で入れなかったもの

- 喪主サイトからの期日・担当者・メモの編集（スタッフは状態の変更のみ。本体は見積システム側）
- 案件ごとの追加タスク（マスタにない突発対応）
- 外部連携（§9）・死亡診断書PDF・決済

---

*作成: 2026-08-07 | 参照: `FL_Obsidian/01_タスク管理/タスク_2026-08-06.md` `FL_Obsidian/02_MTG記録/FL定例/2026-08-06_FL定例まとめ.md` `docs/requirements-2026-07.md`*
