# 見積オプション画像 生成指示書

> 対象: 見積システムのオプション画像カタログ
> 作成日: 2026-07-26
> 登録先: `/admin` →「アイテム管理」→ 各アイテムの画像欄

---

## 0. まず仕分けから

登録済みの45アイテムのうち、画像が要るものは20点ほどです。ただし**すべてを生成で用意すべきではありません。**

| 区分 | 対象 | 方針 |
|---|---|---|
| **A. 生成でよい** | 枕飾り、白木位牌、受付セット、後飾り祭壇、花束、骨壷、遺影額など | AIで生成 → 実物写真が撮れたら差し替え |
| **B. 生成は要注意** | 会葬礼状、案内看板 | 文字が入る商品。AIは日本語を正しく描けない |
| **C. 生成に向かない** | **お棺（楽園・風雅・COSMO等）、祭壇（FO-33・BC-21等）** | **仕入先のカタログ写真を使う** |

### Cを生成しない理由

祭壇は `FO-33 (W3,000 大型) ピンク基調`、棺は `月見桜` のように **型番・商品名で選ぶ実在商品**です。お客様は「この祭壇」を選んだつもりで¥200,000〜¥700,000を支払います。生成画像を載せると、当日実際に飾られるものとの差がそのままクレームになります。金額が大きいぶん影響も大きいです。

**仕入先に商品写真の提供を依頼してください。** 通常はカタログデータをもらえます。これが最優先です。

どうしても暫定で用意する場合は、カタログに「※ 実際の商品とは異なります」と明示したうえで、**社内の確認用にとどめて**ください。

---

## 1. 共通スタイル指定

すべてのプロンプトの先頭に付けます。**統一感が最重要**です。

```
Product catalog photograph for a Japanese funeral service.
Plain, very light warm-gray (near-white) seamless background.
Soft, diffused natural lighting. No harsh shadows, low contrast.
Straight-on eye-level angle, the entire object fully in frame, centered.
Muted, desaturated, dignified color palette.
Photorealistic. Not illustration, not CGI-looking.
A single product only. No room interior, no funeral hall, no people.
No text, no logos, no watermark.
Square 1:1 composition.
```

カタログのカードが**正方形**なので、1:1で作ると切れません。

### 避けるもの（ネガティブ指定）

```
text, japanese characters, calligraphy, logos, watermark,
people, hands, faces, portrait of a person,
religious symbols, crosses, buddhist statues,
bright red, neon colors, oversaturated,
wedding style, celebratory, festive,
dark background, dramatic lighting, heavy shadows,
blurry, low quality, distorted, duplicated objects
```

---

## 2. アイテム別プロンプト（区分A）

### 枕飾り一式（ID 5）

```
A Japanese funeral bedside altar set (makurakazari): a small plain white wooden
table holding an incense burner, a small bell (rin), a candlestick with an
unlit white candle, and a slim incense box. Neatly arranged, viewed straight on.
```

### 白木位牌（ID 9）

```
A plain unpainted white wooden Japanese memorial tablet (shiraki ihai)
standing upright on its lotus-shaped base. The face of the tablet is
completely blank with no writing of any kind.
```

**文字を書かせないこと。** 戒名が入ると特定の故人のものになってしまいます。

### 受付セット（ID 10）

```
A Japanese funeral reception desk set laid out on a table: a black-covered
guest book, a fountain pen on a stand, a small tray for offerings,
and a stack of plain envelopes. Neat, formal arrangement, viewed from above
at a slight angle. All paper surfaces are blank.
```

### 後飾り祭壇（ID 15）

```
A small two-tier Japanese home memorial altar (atokazari saidan) covered with
plain white cloth. On the tiers: an incense burner, a candlestick,
a flower vase with white chrysanthemums, and an empty urn box.
No portrait photo, no writing.
```

### お別れ用お盆花（ID 12）

```
A small tray of fresh cut flowers for placing inside a coffin:
white chrysanthemums, white carnations and small white spray flowers,
loosely laid on a shallow lacquered tray. Soft and gentle impression.
```

### お別れ用花束（ID 13）

```
A hand-tied bouquet of white funeral flowers wrapped in plain white paper:
white chrysanthemums, white lilies and green foliage.
Restrained, formal, no ribbon decoration.
```

### 骨壷・骨箱（基本）（ID 14）

```
A plain white porcelain Japanese cremation urn with its lid,
standing next to a plain white cloth-covered box. No pattern, no writing.
```

### 骨壷アップグレード（ID 34）

3種とも**同じアングル・同じ距離**で作ってください。並べたときに柄の違いだけが伝わるようにします。

| グレード | 差し替え文 |
|---|---|
| 上質骨壷A | `A white porcelain cremation urn with a subtle pale blue floral pattern around the body` |
| 上質骨壷B | `A cream porcelain cremation urn with a delicate gold-rimmed camellia motif` |
| 上質骨壷C | `A pale gray porcelain cremation urn with a fine matte texture and a thin silver rim` |

```
[差し替え文], with its matching lid, standing upright.
Straight-on angle, plain background.
```

### 遺影写真（基本）（ID 8）

```
An empty Japanese memorial photo frame standing upright.
A simple dark wood frame with a plain white mat.
The photo area is empty and neutral gray.
No face, no portrait, no person.
```

**`empty` と `no face` を必ず入れてください。** 入れないと人物の顔が生成されます。

### 遺影写真アップグレード（ID 33）

| グレード | 差し替え文 |
|---|---|
| カラー額＋手札＋リボン | `A dark wood memorial photo frame with a black mourning ribbon on the upper left corner, displayed together with a smaller matching desk-sized frame` |
| 自立式スリム写真額＋手札 | `A slim modern free-standing photo frame in light wood, displayed together with a smaller matching desk-sized frame` |

いずれも `The photo areas are empty and neutral gray. No face, no portrait.` を末尾に付けます。

### 棺前装飾生花（ID 35）

```
A low arrangement of white funeral flowers placed in front of where a coffin
would stand: white chrysanthemums and lilies with green foliage,
arranged wide and low on the floor. No coffin visible in frame.
```

### お棺・仏衣一式・布団（ID 7）

棺そのものではなく**旅支度の一式**として撮るのが安全です。

```
A Japanese funeral burial garment set (shini-shozoku) neatly folded and laid out:
a white kimono-style robe, a white head cloth, white hand covers,
white tabi socks, and a folded white futon. Arranged flat, viewed from above.
```

---

## 3. 区分B（文字が入るもの）

### 会葬礼状（ID 11）／案内看板（ID 16）

AIは日本語の文章を正しく描けません。生成すると**崩れた文字**が入り、かえって不信感につながります。

対応は次のいずれかを推奨します。

1. **実物をスマホで撮る**（白い机に置いて真上から。これが一番早く確実です）
2. 生成する場合は、文字が入らない構図にする

```
A blank cream-colored formal Japanese greeting card with a plain envelope,
lying flat on a plain background. The card surface is completely blank,
with no text and no printing of any kind.
```

看板も同様に `a blank white standing sign board, no text` として、文字のない状態で作ります。

---

## 4. 区分C（お棺・祭壇）の扱い

**仕入先のカタログ写真の取り寄せを最優先**でお願いします。

- お棺: 楽園 / 風雅（アイボリー・パープル・シルバー）/ COSMO（白銀・桃・琥珀）/ 月見桜 / 扇富士
- 祭壇: FO-01〜FO-04, FO-14, FO-18, FO-19, FO-30〜FO-35, BC-21〜BC-24, BC-39, BC-40

祭壇は幅（W1,800 / W3,000 / W4,500）と色基調（ピンク・ブルー・パープル・イエロー・グリーン＋ホワイト）が明記されているので、**カタログ写真さえあればそのまま登録できます**。

写真をいただければ、こちらで一括アップロードする仕組みを用意することもできます。ファイル名を型番（`FO-33.jpg` など）にしておいていただけると自動で紐付けられます。

---

## 5. 登録手順

1. `/admin` →「アイテム管理」→ 対象アイテムを編集
2. アイテム全体の画像は「基本情報」の**画像**欄へ
3. グレードごとの画像は、プルダウンの各選択肢の行にある「**画像**」ボタンから
4. **アップロード時に自動で圧縮されます**（長辺1400px・JPEG）。生成したままのサイズで構いません
5. TOP画面の「オプション画像カタログ」で確認

---

## 6. チェックリスト

- [ ] 背景の色・明るさが全アイテムで揃っている
- [ ] 文字・ロゴ・人物が写り込んでいない
- [ ] 遺影フレームに顔が生成されていない
- [ ] 白木位牌に文字が入っていない
- [ ] 骨壷3種が同じアングル・同じ距離になっている
- [ ] 正方形（1:1）で切れていない
- [ ] お棺・祭壇は仕入先の写真を使っている（生成画像を使う場合は注記を確認）
- [ ] カタログに並べたときに違和感がない
