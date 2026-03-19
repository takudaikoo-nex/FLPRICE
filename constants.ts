import { Plan, Item, PlanId } from './types';

// --- Plan ID groups ---
const CREMATION: PlanId[] = ['plan_01', 'plan_02', 'plan_03'];
const FUNERAL: PlanId[] = ['plan_04', 'plan_05', 'plan_06', 'plan_07', 'plan_08'];
const ALL: PlanId[] = [...CREMATION, ...FUNERAL];
const FUNERAL_FULL: PlanId[] = ['plan_04', 'plan_06', 'plan_07', 'plan_08']; // 1日葬・自社斎場・家族葬・2日葬

// --- Plans (税抜 = CSV税込÷1.1) ---
export const PLANS: Plan[] = [
  { id: 'plan_01', name: 'シンプル直葬', price: 100000, category: 'cremation', description: '費用を最小限に抑え、火葬のみを誠実に行う形' },
  { id: 'plan_02', name: '面会火葬式', price: 150000, category: 'cremation', description: '火葬前にお顔を見てお別れする時間を設ける形' },
  { id: 'plan_03', name: 'お別れ火葬式', price: 250000, category: 'cremation', description: '安置所に集合し、お花に囲まれてお別れする火葬式' },
  { id: 'plan_04', name: '1日葬', price: 350000, category: 'funeral', description: '通夜を省略し、告別式と火葬を1日で行う形' },
  { id: 'plan_05', name: '自宅葬', price: 400000, category: 'funeral', description: '住み慣れた我が家で、温かくお見送りする形' },
  { id: 'plan_06', name: '自社斎場プラン', price: 450000, category: 'funeral', description: 'ファーストリーフ自社斎場で、式場利用料0円の家族葬' },
  { id: 'plan_07', name: '家族葬', price: 500000, category: 'funeral', description: '親しい方々で通夜・告別式をきちんと行う家族葬' },
  { id: 'plan_08', name: '2日葬（通夜・告別式）', price: 700000, category: 'funeral', description: '通夜と告別式を2日間かけて、手厚くお見送りする形' },
];

// --- Items ---
export const ITEMS: Item[] = [
  // ============ プランに含まれるもの（included系） ============
  {
    id: 1, name: '搬送料金', type: 'checkbox',
    description: '出発地点～安置場所、安置場所～火葬場の搬送料金です。',
    allowedPlans: ALL, includedInPlans: ALL,
  },
  {
    id: 2, name: '安置施設', type: 'checkbox',
    description: '弊社にてお預かり安置室利用料が含まれます。',
    allowedPlans: ALL, includedInPlans: ALL,
  },
  {
    id: 3, name: 'ドライアイス', type: 'checkbox',
    description: 'お預かり安置もしくはご自宅にてドライアイス処置を含みます。',
    allowedPlans: ALL, includedInPlans: ALL,
  },
  {
    id: 4, name: '枕飾り一式', type: 'checkbox',
    description: '白木机・香炉・リン・線香・ろうそくの一式です。',
    allowedPlans: ALL.filter(p => p !== 'plan_01'),
    includedInPlans: ALL.filter(p => p !== 'plan_01'),
  },
  {
    id: 5, name: '役所・火葬場手続き代行', type: 'checkbox',
    description: '役所に提出する死亡届、死亡診断書の代行を行います。',
    allowedPlans: ALL, includedInPlans: ALL,
  },
  {
    id: 6, name: 'お棺・仏衣一式・布団（基本）', type: 'checkbox',
    description: '棺（布無し・色なし 180cm）と旅支度一式です。',
    allowedPlans: ALL, includedInPlans: ALL,
  },
  {
    id: 7, name: '遺影写真（基本）', type: 'checkbox',
    description: 'カラー額 四つ切サイズと手札サイズをご用意します。',
    allowedPlans: ALL,
    includedInPlans: ['plan_03', ...FUNERAL],
  },
  {
    id: 8, name: '骨壷・骨箱（基本）', type: 'checkbox',
    description: '白壷でご遺骨を収める壺と箱です。',
    allowedPlans: ALL, includedInPlans: ALL,
  },
  {
    id: 9, name: 'お別れ用花束', type: 'checkbox',
    description: '火葬場にお持ちする花束です。',
    allowedPlans: ALL, includedInPlans: ALL,
  },
  {
    id: 10, name: '司会進行・運営スタッフ', type: 'checkbox',
    description: 'お葬式の司会・運営のサポートをいたします。',
    allowedPlans: ALL, includedInPlans: ALL,
  },
  {
    id: 11, name: '白木位牌', type: 'checkbox',
    description: '一般的な白木のお位牌となります。',
    allowedPlans: ['plan_03', 'plan_04', 'plan_05', 'plan_06', 'plan_07', 'plan_08'],
    includedInPlans: ['plan_03', 'plan_04', 'plan_05', 'plan_06', 'plan_07', 'plan_08'],
  },
  {
    id: 12, name: '受付セット', type: 'checkbox',
    description: '受付に必要な文具や芳名帳などのセット一式です。',
    allowedPlans: FUNERAL_FULL,
    includedInPlans: FUNERAL_FULL,
  },
  {
    id: 13, name: '会葬礼状', type: 'checkbox',
    description: 'オリジナル会葬礼状30枚セットです。',
    allowedPlans: FUNERAL_FULL,
    includedInPlans: FUNERAL_FULL,
  },
  {
    id: 14, name: 'お別れ用お盆花', type: 'checkbox',
    description: 'お棺の中にお入れする生花です。',
    allowedPlans: ['plan_03'],
    includedInPlans: ['plan_03'],
  },
  {
    id: 15, name: '後飾り祭壇', type: 'checkbox',
    description: 'ご自宅で骨壺をお飾りする仮祭壇・線香・ろうそく・焼香セットです。',
    allowedPlans: ALL.filter(p => p !== 'plan_01'),
    includedInPlans: ALL.filter(p => p !== 'plan_01'),
  },
  {
    id: 16, name: '案内看板', type: 'checkbox',
    description: '式場入口や祭壇横などに飾る看板です。',
    allowedPlans: FUNERAL_FULL,
    includedInPlans: FUNERAL_FULL,
  },

  // ============ チェックボックスオプション ============
  {
    id: 20, name: 'プロの納棺師', type: 'checkbox',
    description: '納棺士による清拭・着せ替え・メイクを行います。',
    basePrice: 50000,
    allowedPlans: ALL,
    includedInPlans: FUNERAL, // 葬儀プランでは含まれる
  },
  {
    id: 21, name: '湯灌', type: 'checkbox',
    description: '故人の体を洗い清め、旅立ちを整える儀式です。',
    basePrice: 100000,
    allowedPlans: ALL,
    includedInPlans: [], // どのプランにも含まれない
  },
  {
    id: 22, name: 'お別れ用お盆花追加', type: 'checkbox',
    description: 'お盆１つ追加です。',
    basePrice: 20000,
    allowedPlans: CREMATION,
    includedInPlans: [],
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
      { id: 'fo01', name: 'FO-01 (W1,800 カラー)', price: 100000, allowedPlans: ['plan_04', 'plan_06', 'plan_07', 'plan_08'],
        planPrices: { plan_04: 100000, plan_08: 100000, plan_06: 100000, plan_07: 100000 } },
      { id: 'fo33', name: 'FO-33 (W3,000 大型)', price: 200000, allowedPlans: FUNERAL_FULL,
        planPrices: { plan_04: 200000, plan_08: 200000, plan_06: 200000, plan_07: 200000 } },
      { id: 'fo14', name: 'FO-14 (W3,000 特選)', price: 250000, allowedPlans: FUNERAL_FULL },
      { id: 'fo18', name: 'FO-18 (W4,500 最上級)', price: 500000, allowedPlans: FUNERAL_FULL },
      { id: 'fo19', name: 'FO-19 (W4,500 プレミアム)', price: 700000, allowedPlans: FUNERAL_FULL },
    ],
  },
  {
    id: 32, name: '供花', type: 'dropdown',
    description: '会社関係や親族が出すお花です。祭壇との組み合わせで手配いたします。',
    allowedPlans: [...FUNERAL_FULL, 'plan_03', 'plan_05'],
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
    id: 35, name: '祭壇前装飾生け花', type: 'checkbox',
    description: '祭壇前を生花で装飾します。',
    basePrice: 30000,
    allowedPlans: ['plan_05'],
    includedInPlans: ['plan_05'], // 自宅葬に含む
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
    allowedPlans: ALL.filter(p => p !== 'plan_01'),
    includedInPlans: [],
    nonTaxable: true,
  },
  {
    id: 42, name: '斎場料金', type: 'free_input',
    description: '式場の利用料金です。自社斎場プランでは不要です。',
    allowedPlans: ALL.filter(p => !['plan_01', 'plan_05', 'plan_06'].includes(p)),
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
