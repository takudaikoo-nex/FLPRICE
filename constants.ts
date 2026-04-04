import { Plan, Item, PlanId } from './types';

// --- Plan ID groups ---
const CREMATION: PlanId[] = ['plan_01', 'plan_02'];
const FUNERAL: PlanId[] = ['plan_03', 'plan_04', 'plan_05'];
const ALL: PlanId[] = [...CREMATION, ...FUNERAL];
const FUNERAL_FULL: PlanId[] = ['plan_04', 'plan_05']; // 一日葬・二日葬（受付セット・会葬礼状・案内看板・返礼品・香典返し・料理）

// --- Plans (税抜) ---
export const PLANS: Plan[] = [
  { id: 'plan_01', name: 'シンプル直葬プラン', price: 150000, category: 'cremation', description: '費用を最小限に抑え、火葬のみを誠実に行うプランです。' },
  { id: 'plan_02', name: 'お別れ火葬式プラン', price: 275000, category: 'cremation', description: '火葬前にお花に囲まれた空間でお別れの時間を持てるプランです。' },
  { id: 'plan_03', name: 'お別れ自宅葬プラン', price: 400000, category: 'funeral', description: 'ご自宅でご家族だけでお見送りできるプランです。' },
  { id: 'plan_04', name: '一日葬プラン', price: 500000, category: 'funeral', description: '通夜を行わず、告別式から火葬までを1日で行うプランです。' },
  { id: 'plan_05', name: '二日葬プラン', price: 700000, category: 'funeral', description: '通夜・告別式を行い、2日かけてお見送りする一般的なプランです。' },
];

// --- Items ---
export const ITEMS: Item[] = [
  // ============ プランに含まれるもの（included系） ============
  {
    id: 1, name: 'ご搬送（~20kmまで）', type: 'checkbox',
    description: '出発地点～安置場所、安置場所～火葬場の搬送料金です（20km圏内）。',
    allowedPlans: ['plan_01'], includedInPlans: ['plan_01'],
  },
  {
    id: 2, name: 'ご搬送（~50kmまで）', type: 'checkbox',
    description: '出発地点～安置場所、安置場所～火葬場の搬送料金です（50km圏内）。',
    allowedPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
    includedInPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
  },
  {
    id: 3, name: 'ご安置', type: 'checkbox',
    description: '弊社にてお預かり安置室利用料が含まれます。',
    allowedPlans: ALL, includedInPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
    // plan_01は要確認 → allowedだがincludedではない
  },
  {
    id: 4, name: 'ドライアイス', type: 'checkbox',
    description: 'お預かり安置もしくはご自宅にてドライアイス処置を含みます。',
    allowedPlans: ALL, includedInPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
    // plan_01は要確認 → allowedだがincludedではない
  },
  {
    id: 5, name: '枕飾り一式', type: 'checkbox',
    description: '白木机・香炉・リン・線香・ろうそくの一式です。',
    allowedPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
    includedInPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
  },
  {
    id: 6, name: '役所・火葬場手続き代行', type: 'checkbox',
    description: '役所に提出する死亡届、死亡診断書の代行を行います。',
    allowedPlans: ALL, includedInPlans: ALL,
  },
  {
    id: 7, name: 'お棺・仏衣一式・布団（基本）', type: 'checkbox',
    description: '棺（布無し・色なし 180cm）と旅支度一式です。',
    allowedPlans: ALL, includedInPlans: ALL,
  },
  {
    id: 8, name: '遺影写真（基本）', type: 'checkbox',
    description: 'カラー額 四つ切サイズと手札サイズをご用意します。',
    allowedPlans: ALL,
    includedInPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
    // plan_01は△(optional)
  },
  {
    id: 9, name: '白木位牌', type: 'checkbox',
    description: '一般的な白木のお位牌となります。',
    allowedPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
    includedInPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
  },
  {
    id: 10, name: '受付セット', type: 'checkbox',
    description: '受付に必要な文具や芳名帳などのセット一式です。',
    allowedPlans: FUNERAL_FULL,
    includedInPlans: FUNERAL_FULL,
  },
  {
    id: 11, name: '会葬礼状', type: 'checkbox',
    description: 'オリジナル会葬礼状30枚セットです。',
    allowedPlans: FUNERAL_FULL,
    includedInPlans: FUNERAL_FULL,
  },
  {
    id: 12, name: 'お別れ用お盆花', type: 'checkbox',
    description: 'お棺の中にお入れする生花です。',
    allowedPlans: ['plan_01', 'plan_02'],
    includedInPlans: ['plan_02'],
    // plan_01は△(optional)
    basePrice: 20000,
  },
  {
    id: 13, name: 'お別れ用花束', type: 'checkbox',
    description: '火葬場にお持ちする花束です。',
    allowedPlans: ALL, includedInPlans: ALL,
  },
  {
    id: 14, name: '骨壷・骨箱（基本）', type: 'checkbox',
    description: '白壷でご遺骨を収める壺と箱です。',
    allowedPlans: ALL, includedInPlans: ALL,
  },
  {
    id: 15, name: '後飾り祭壇', type: 'checkbox',
    description: 'ご自宅で骨壺をお飾りする仮祭壇・線香・ろうそく・焼香セットです。',
    allowedPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
    includedInPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
  },
  {
    id: 16, name: '案内看板', type: 'checkbox',
    description: '式場入口や祭壇横などに飾る看板です。',
    allowedPlans: FUNERAL_FULL,
    includedInPlans: FUNERAL_FULL,
  },
  {
    id: 17, name: '進行・運営スタッフ', type: 'checkbox',
    description: 'お葬式の司会・運営のサポートをいたします。',
    allowedPlans: ALL, includedInPlans: ALL,
  },

  // ============ チェックボックスオプション ============
  {
    id: 20, name: 'プロの納棺師', type: 'checkbox',
    description: '納棺士による清拭・着せ替え・メイクを行います。',
    basePrice: 50000,
    allowedPlans: ALL,
    includedInPlans: FUNERAL, // 葬儀プランでは含まれる、火葬プランは△(optional)
  },
  {
    id: 21, name: '湯灌', type: 'checkbox',
    description: '故人の体を洗い清め、旅立ちを整える儀式です。',
    basePrice: 100000,
    allowedPlans: ALL,
    includedInPlans: [], // どのプランにも含まれない（全て△）
  },

  // ============ ドロップダウン（グレード選択） ============
  {
    id: 30, name: 'お棺アップグレード', type: 'dropdown',
    description: 'お棺をより上質なものに変更できます。',
    allowedPlans: ALL,
    includedInPlans: [],
    options: [
      { id: 'rakuen', name: '楽園', price: 34000, allowedPlans: ALL },
      { id: 'fuga_ivory', name: '風雅アイボリー', price: 37450, allowedPlans: ALL },
      { id: 'fuga_purple', name: '風雅パープル', price: 37450, allowedPlans: ALL },
      { id: 'fuga_silver', name: '風雅シルバー', price: 37450, allowedPlans: ALL },
      { id: 'cosmo_silver', name: 'COSMO【白銀】', price: 42500, allowedPlans: ALL },
      { id: 'cosmo_peach', name: 'COSMO【桃】', price: 42500, allowedPlans: ALL },
      { id: 'cosmo_amber', name: 'COSMO【琥珀】', price: 42500, allowedPlans: ALL },
      { id: 'tsukimizakura', name: '月見桜', price: 59500, allowedPlans: ALL },
      { id: 'ougifuji', name: '扇富士', price: 59500, allowedPlans: ALL },
    ],
  },
  {
    id: 31, name: '祭壇', type: 'dropdown',
    description: '式場を彩る生花祭壇です。基本プランの祭壇からランクアップできます。',
    allowedPlans: FUNERAL_FULL,
    includedInPlans: FUNERAL_FULL, // 基本祭壇は含まれる
    options: [
      { id: 'fo01', name: 'FO-01 (W1,800 カラー)', price: 100000, allowedPlans: FUNERAL_FULL,
        planPrices: { plan_04: 100000, plan_05: 100000 } },
      { id: 'fo33', name: 'FO-33 (W3,000 大型)', price: 200000, allowedPlans: FUNERAL_FULL,
        planPrices: { plan_04: 200000, plan_05: 200000 } },
      { id: 'fo14', name: 'FO-14 (W3,000 特選)', price: 250000, allowedPlans: FUNERAL_FULL },
      { id: 'fo18', name: 'FO-18 (W4,500 最上級)', price: 500000, allowedPlans: FUNERAL_FULL },
      { id: 'fo19', name: 'FO-19 (W4,500 プレミアム)', price: 700000, allowedPlans: FUNERAL_FULL },
    ],
  },
  {
    id: 32, name: '供花', type: 'dropdown',
    description: '会社関係や親族が出すお花です。祭壇との組み合わせで手配いたします。',
    allowedPlans: ['plan_03', 'plan_04', 'plan_05'],
    includedInPlans: [],
    options: [
      { id: 'yw3', name: 'YW-3', price: 18000, allowedPlans: ALL },
      { id: 'yw2', name: 'YW-2', price: 24000, allowedPlans: ALL },
      { id: 'yw1', name: 'YW-1', price: 36000, allowedPlans: ALL },
    ],
  },
  {
    id: 33, name: '遺影写真アップグレード', type: 'dropdown',
    description: '遺影写真をより上質なものに変更できます。',
    allowedPlans: ALL,
    includedInPlans: [],
    options: [
      { id: 'ribbon', name: 'カラー額＋手札＋リボン', price: 1000, allowedPlans: ALL },
      { id: 'slim', name: '自立式スリム写真額＋手札', price: 2000, allowedPlans: ALL },
    ],
  },
  {
    id: 34, name: '骨壷アップグレード', type: 'dropdown',
    description: '骨壷をより上質なものに変更できます。',
    allowedPlans: ALL,
    includedInPlans: [],
    options: [
      { id: 'upgrade_a', name: '上質骨壷A', price: 30000, allowedPlans: ALL },
      { id: 'upgrade_b', name: '上質骨壷B', price: 30000, allowedPlans: ALL },
      { id: 'upgrade_c', name: '上質骨壷C', price: 30000, allowedPlans: ALL },
    ],
  },
  {
    id: 35, name: '棺前装飾生花', type: 'checkbox',
    description: '棺前を生花で装飾します。',
    basePrice: 30000,
    allowedPlans: ['plan_03'],
    includedInPlans: ['plan_03'], // お別れ自宅葬プランに含む
  },

  // ============ 非課税（自由入力） ============
  {
    id: 40, name: '火葬料金', type: 'free_input',
    description: '地域・自治体により異なります（実費）。',
    allowedPlans: ALL, includedInPlans: [],
    nonTaxable: true,
  },
  {
    id: 41, name: '控室料金', type: 'free_input',
    description: 'ご親族様の控室利用料です。',
    allowedPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
    includedInPlans: [],
    nonTaxable: true,
  },
  {
    id: 42, name: '斎場料金', type: 'free_input',
    description: '式場の利用料金です。',
    allowedPlans: ['plan_02', 'plan_03', 'plan_04', 'plan_05'],
    includedInPlans: [],
    nonTaxable: true,
  },

  // ============ 親族ヒアリング（自由入力・課税） ============
  {
    id: 50, name: '会葬御礼品', type: 'free_input',
    description: '参列者へのお礼の品です。親族ヒアリングにて決定します。',
    allowedPlans: FUNERAL_FULL, includedInPlans: [],
  },
  {
    id: 51, name: '香典返し', type: 'free_input',
    description: '香典を頂いた方へのお返しです。親族ヒアリングにて決定します。',
    allowedPlans: FUNERAL_FULL, includedInPlans: [],
  },
  {
    id: 52, name: '料理', type: 'free_input',
    description: '通夜振る舞いや精進落としの料理です。参列者数に応じて手配いたします。',
    allowedPlans: FUNERAL_FULL, includedInPlans: [],
  },
  {
    id: 53, name: 'お布施・戒名料', type: 'free_input',
    description: '宗派やご依頼先のお寺様により異なります。',
    allowedPlans: ALL, includedInPlans: [],
  },
  {
    id: 54, name: '搬送追加料金', type: 'free_input',
    description: '搬送距離がプラン規定を超える場合に発生します。',
    allowedPlans: ALL, includedInPlans: [],
  },
  {
    id: 55, name: 'ドライアイス追加費用', type: 'free_input',
    description: '規定の回数を超える安置が必要な場合に発生します。',
    allowedPlans: ALL, includedInPlans: [],
  },
];

export const COMPANY_INFO = {
  FL: {
    name: '株式会社ファーストリーフ',
    address: '〒253-0085 神奈川県茅ヶ崎市矢畑682-10',
    contact: 'TEL: 0467-38-5617 / FAX: 0467-38-5604',
    rep: '代表取締役 大石康太',
    stamp: '/images/stamp.png',
    logo: '/images/logo.png',
    bankInfo: 'かながわ信用金庫　辻堂支店\n普通　２１６１６０７\nカ）ファーストリーフ\nダイヒョウトリシマリヤク\nオオイシコウタ'
  },
  LS: {
    name: '株式会社 リンクサービス',
    address: '〒251-0861 神奈川県藤沢市大庭5135-13',
    contact: 'TEL: 0466-52-6896 / FAX: 0466-52-6904',
    rep: '代表取締役　菅野 大輝',
    stamp: '/images/LSstamp.png',
    logo: '/images/logoLS2.png',
    bankInfo: '横浜銀行　藤沢中央支店\n普通　６２９７７２０\nカ）リンクサービス',
    registrationNumber: 'T1021001077363'
  }
};
