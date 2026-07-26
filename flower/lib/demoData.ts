import { FuneralPublic, PublicProduct, OrderResult } from './api';

// ================================================
// デモモード（?demo=1）用のサンプルデータ
// Supabaseに接続せず、画面と操作の流れだけを確認するために使用する。
// 本番のデータ・処理には一切影響しない。
// ================================================

/** デモ用の商品画像（flower/public/products/ に配置） */
const productImage = (code: string): string => `/products/${code}_1.jpg`;

const hoursFromNow = (hours: number): string =>
    new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

export const DEMO_FUNERAL: FuneralPublic = {
    status: 'open',
    deceased_name: '山田 太郎',
    chief_mourner_name: '山田 花子',
    venue_name: 'ファーストリーフホール鎌倉',
    venue_address: '神奈川県鎌倉市〇〇 1-2-3',
    wake_at: hoursFromNow(48),
    ceremony_at: hoursFromNow(72),
    order_deadline: hoursFromNow(48),
    tax_rate: 0.1,
    card_payment_enabled: true,
};

export const DEMO_PRODUCTS: PublicProduct[] = [
    {
        id: 'demo-1', code: 'KY-01', name: '供花 一基（白上がり）',
        description: '白菊とカーネーションを中心にまとめた、格式のある一基です。宗派を問わずお使いいただけます。',
        category: '供花', price: 15000,
        image_paths: [productImage('KY-01')],
    },
    {
        id: 'demo-2', code: 'KY-02', name: '供花 一基（洋花ミックス）',
        description: '白を基調に淡いグリーンを添えた、やわらかな印象の洋花アレンジです。',
        category: '供花', price: 18000,
        image_paths: [productImage('KY-02')],
    },
    {
        id: 'demo-3', code: 'KY-03', name: '供花 一対（白上がり）',
        description: '祭壇の左右に一対でお飾りいたします。ご親族さま・法人さまに多くお選びいただいております。',
        category: '供花', price: 30000,
        image_paths: [productImage('KY-03')],
    },
    {
        id: 'demo-4', code: 'KW-01', name: '花環 一基',
        description: '式場の入口にお飾りする花環です。設営・撤去まで含みます。',
        category: '花環', price: 20000,
        image_paths: [productImage('KW-01')],
    },
    {
        id: 'demo-5', code: 'MK-01', name: '盛籠（果物）',
        description: '季節の果物を詰め合わせた盛籠です。',
        category: '盛籠', price: 12000,
        image_paths: [productImage('MK-01')],
    },
    {
        id: 'demo-6', code: 'MK-02', name: '盛籠（缶詰・乾物）',
        description: '日持ちする品を詰め合わせた盛籠です。',
        category: '盛籠', price: 12000,
        image_paths: [productImage('MK-02')],
    },
    {
        id: 'demo-7', code: 'MB-01', name: '枕花',
        description: 'ご安置中のお枕元にお供えするお花です。',
        category: '枕花', price: 10000,
        image_paths: [productImage('MB-01')],
    },
];

export const isDemoMode = (): boolean =>
    new URLSearchParams(window.location.search).get('demo') === '1';

/** デモ用のダミー注文結果（DBには何も保存されない） */
export const demoSubmit = (subtotal: number, taxRate: number): Promise<OrderResult> => {
    const tax = Math.round(subtotal * taxRate);
    return new Promise(resolve => {
        setTimeout(() => resolve({
            order_number: 'FO-DEMO01',
            subtotal,
            tax,
            total: subtotal + tax,
        }), 700);
    });
};
