import { Plan, Item } from './types';

export const PLANS: Plan[] = [
  { id: 'plan_01', name: 'シンプル直葬', price: 110000, description: '費用を最小限に抑え、火葬のみを誠実に行う形' },
  { id: 'plan_02', name: '面会火葬式', price: 165000, description: '火葬前にお顔を見てお別れする時間を設ける形' },
  { id: 'plan_03', name: 'お別れ火葬式', price: 275000, description: '安置所に集合し、お花に囲まれてお別れする火葬式' },
  { id: 'plan_04', name: '1日葬', price: 385000, description: '通夜を省略し、告別式と火葬を1日で行う形' },
  { id: 'plan_05', name: '自宅葬', price: 440000, description: '住み慣れた我が家で、温かくお見送りする形' },
  { id: 'plan_06', name: '自社斎場プラン', price: 495000, description: 'ファーストリーフ自社斎場で、式場利用料0円の家族葬' },
  { id: 'plan_07', name: '家族葬', price: 550000, description: '親しい方々で通夜・告別式をきちんと行う家族葬' },
  { id: 'plan_08', name: '2日葬（通夜・告別式）', price: 770000, description: '通夜と告別式を2日間かけて、手厚くお見送りする形' },
];

export const ITEMS: Item[] = [
  { id: 1, name: '火葬料金', description: '基本料金には含まれず地域・自治体により異なります（実費）', basePrice: 0, allowedPlans: [] },
  { id: 2, name: '外部式場利用料', description: '自社斎場以外をご利用の場合に発生します（実費）', basePrice: 0, allowedPlans: [] },
  { id: 3, name: '料理・通夜振る舞い', description: 'ご希望・参列者数に応じて手配いたします', basePrice: 0, allowedPlans: [] },
  { id: 4, name: '返礼品', description: 'ご希望・参列者数に応じて手配いたします', basePrice: 0, allowedPlans: [] },
  { id: 5, name: '精進落とし', description: '火葬後の会食費用です', basePrice: 0, allowedPlans: [] },
  { id: 6, name: 'お布施・戒名料', description: '宗派やご依頼先のお寺様により異なります', basePrice: 0, allowedPlans: [] },
  { id: 7, name: '搬送追加料金（30km超）', description: '搬送距離が30kmを超える場合に発生します', basePrice: 0, allowedPlans: [] },
  { id: 8, name: 'ドライアイス追加費用', description: '規定の回数を超える安置が必要な場合に発生します', basePrice: 0, allowedPlans: [] },
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
