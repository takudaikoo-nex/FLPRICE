# 供花商品画像 生成指示書（Antigravity / 画像生成AI用）

> 用途: 供花発注サイトの商品カタログ画像
> 作成日: 2026-07-26

---

## 0. 前提と注意

- ここで生成する画像は **実物写真が用意できるまでの仮画像** です。実際にお届けする品と大きく異なる画像を掲載すると、クレームや景品表示法（優良誤認）の問題になり得ます。**実物写真が撮れ次第、差し替える前提**で進めてください
- 生成画像を使う期間は、サイト上に「※画像はイメージです」の注記を入れる運用が安全です
- 葬儀という場面の商材です。**華美・派手・カジュアルな印象にならないこと**を最優先にしてください

---

## 1. 出力仕様（全商品共通）

| 項目 | 指定 |
|---|---|
| 縦横比 | **4:3（横長）** ※サイトのカードが4:3で表示されます |
| 解像度 | 1200 × 900 px 以上 |
| 形式 | JPEG（背景が単色のため軽量。PNGでも可） |
| ファイルサイズ | 1枚あたり 300KB 以下を目安 |
| 枚数 | 1商品につき 1〜2枚（正面／斜め） |
| ファイル名 | `商品コード_連番.jpg` 例: `KY-01_1.jpg`, `KY-01_2.jpg` |

---

## 2. 共通スタイル指定（すべてのプロンプトの土台）

生成AIに毎回この条件を含めてください。**統一感が最も重要**です。1商品ずつ違う雰囲気で作ると、並べたときにカタログとして成立しません。

### 日本語での指定

```
日本の葬儀用の供花を撮影した、商品カタログ用の写真。
背景は非常に淡いウォームグレー（ほぼ白）の無地。
自然光のようなやわらかい拡散光。強い影やコントラストは付けない。
正面からの水平アングル、商品全体が収まるように配置。
彩度は控えめ、落ち着いた上品な色調。
写実的な写真表現。イラスト・CG的な質感にしない。
文字・ロゴ・人物・宗教的シンボルは一切入れない。
```

### 英語での指定（そのまま貼り付け可）

```
Product catalog photograph of a Japanese funeral flower arrangement.
Plain, very light warm-gray (near-white) seamless background.
Soft, diffused natural lighting. No harsh shadows, low contrast.
Straight-on eye-level angle, entire arrangement fully in frame, centered.
Muted, desaturated, dignified color palette.
Photorealistic. Not illustration, not CGI-looking.
No text, no logos, no people, no religious symbols.
Aspect ratio 4:3.
```

---

## 3. 商品別プロンプト

各項目は「共通スタイル指定」に**続けて**書いてください。

### KY-01 供花 一基（白上がり）

```
A single-stand Japanese funeral flower arrangement (kyoka), all-white style.
White chrysanthemums, white carnations, white lilies, with soft green foliage.
Arranged in a fan shape on a simple wooden stand.
Formal, restrained, traditional Japanese funeral style.
```

補足: 最も基本の商品です。**この画像を基準**にして、他の商品の色味・明るさを合わせてください。

---

### KY-02 供花 一基（洋花ミックス）

```
A single-stand funeral flower arrangement in Western style.
White roses, white lisianthus, pale green hydrangea, soft green eucalyptus.
Slightly softer and rounder silhouette than the traditional all-white type.
Arranged on a simple wooden stand. Gentle, calm impression.
```

---

### KY-03 供花 一対（白上がり）

```
A matching pair of identical all-white Japanese funeral flower arrangements,
placed side by side, symmetrically, with even spacing between them.
White chrysanthemums, white carnations, white lilies, green foliage.
Both stands fully visible in frame.
```

補足: **必ず左右対称・同じ形**になるよう指定してください。左右で形が違うと一対に見えません。

---

### KW-01 花環 一基

```
A traditional Japanese funeral wreath (hanawa) on a tall standing frame.
Large circular wreath with white and pale green artificial flowers.
Simple, formal, no banner text, no writing anywhere.
Full height of the stand visible in frame.
```

補足: 花環には通常、社名を入れる立て札が付きますが、**文字は入れさせないでください**（名札はサイト側で別途入力するため）。

---

### MK-01 盛籠（果物）

```
A Japanese funeral offering basket (morikago) filled with fresh seasonal fruit.
Apples, oranges, melon, grapes, pears, neatly arranged in a woven basket
on a simple wooden stand. Wrapped in transparent cellophane.
Restrained, formal presentation.
```

---

### MK-02 盛籠（缶詰・乾物）

```
A Japanese funeral offering basket (morikago) filled with canned goods
and dried food items, neatly stacked in a woven basket on a wooden stand.
Plain, unbranded packaging with no readable text or logos.
Wrapped in transparent cellophane. Restrained, formal presentation.
```

補足: 缶詰のラベルに文字が出やすいので、**無地のパッケージ**を明示的に指定してください。

---

### MB-01 枕花

```
A small Japanese funeral flower arrangement (makurabana) for bedside offering.
Low, compact, rounded arrangement in a simple basket, placed on a flat surface.
White and pale pink flowers with soft green foliage.
Smaller and more intimate than a stand arrangement.
```

---

## 4. 避けるもの（ネガティブ指定）

生成AIがネガティブプロンプトに対応している場合は指定してください。対応していない場合も、出力を見て該当するものは作り直してください。

```
text, letters, japanese characters, calligraphy, signage, name plates,
logos, brand names, watermark,
people, hands, faces,
coffin, casket, altar, portrait photo of deceased,
religious symbols, crosses, buddhist statues,
bright red flowers, neon colors, oversaturated colors,
wedding style, birthday style, celebratory arrangement,
dark background, dramatic lighting, heavy shadows,
blurry, low quality, distorted flowers, extra stands
```

赤い花・派手な色は慶事の印象になるため、特に注意してください。

---

## 5. 生成後の作業

1. 生成画像を確認し、**7商品を並べて統一感があるか**を見る。1枚だけ明るさや背景が違う場合は作り直す
2. 4:3 にトリミングし、1200×900px 前後にリサイズ
3. ファイル名を `商品コード_連番.jpg` に変更
4. `/admin` →「供花商品管理」→ 対象商品を編集 →「画像を追加」からアップロード
5. 発注サイトで表示を確認（`npm run dev:flower` → 発注URL）

---

## 6. チェックリスト

- [ ] 7商品すべての画像が揃っている
- [ ] 背景の色・明るさが全商品で揃っている
- [ ] 文字・ロゴ・人物が写り込んでいない
- [ ] 赤系の派手な色が入っていない
- [ ] 一対（KY-03）が左右対称になっている
- [ ] 4:3 にトリミング済み
- [ ] 商品カードに並べたときに違和感がない
- [ ] サイトに「※画像はイメージです」の注記を入れた
- [ ] 実物写真への差し替え時期を決めた
