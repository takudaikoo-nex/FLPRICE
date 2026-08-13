import React, { useState, useEffect } from 'react';
import {
    readTokenFromUrl, lookupFuneral, fetchProducts, submitOrder, toUserMessage,
    calcDiscount, fetchCompany,
    FuneralPublic, PublicProduct, CartLine, OrdererInput, OrderResult, CompanyInfo,
} from './lib/api';
import { isDemoMode, DEMO_FUNERAL, DEMO_PRODUCTS, demoSubmit } from './lib/demoData';
import { formatYen } from '../lib/format';
import FuneralHeader from './components/FuneralHeader';
import ProductList from './components/ProductList';
import OrderForm from './components/OrderForm';
import ConfirmView from './components/ConfirmView';
import CompleteView from './components/CompleteView';
import Notice from './components/Notice';
import SiteFooter from './components/SiteFooter';
import LegalPage from './components/LegalPage';
import PaymentView from './components/PaymentView';

type Step = 'catalog' | 'form' | 'confirm' | 'payment' | 'complete';

const emptyOrderer: OrdererInput = {
    name: '', kana: '', company: '', phone: '', email: '',
    postal_code: '', address: '', relation: '', remarks: '',
};

const App: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [funeral, setFuneral] = useState<FuneralPublic | null>(null);
    const [products, setProducts] = useState<PublicProduct[]>([]);
    const [loadFailed, setLoadFailed] = useState(false);

    const [lines, setLines] = useState<CartLine[]>([]);
    const [step, setStep] = useState<Step>('catalog');
    const [orderer, setOrderer] = useState<OrdererInput>(emptyOrderer);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'invoice'>('invoice');

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [result, setResult] = useState<OrderResult | null>(null);

    const [company, setCompany] = useState<CompanyInfo | null>(null);

    const demo = isDemoMode();
    const token = readTokenFromUrl();
    const legalPage = new URLSearchParams(window.location.search).get('p');

    // 事業者情報はどの画面でもフッターに出すため、最初に読んでおく
    useEffect(() => {
        fetchCompany()
            .then(setCompany)
            .catch(error => console.error('Failed to load company info:', error));
    }, []);

    useEffect(() => {
        if (demo) {
            setFuneral(DEMO_FUNERAL);
            setProducts(DEMO_PRODUCTS);
            setLoading(false);
            return;
        }

        if (!token) {
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const [funeralData, productData] = await Promise.all([
                    lookupFuneral(token),
                    fetchProducts(),
                ]);
                setFuneral(funeralData);
                setProducts(productData);
            } catch (error) {
                console.error('Failed to load order page:', error);
                setLoadFailed(true);
            } finally {
                setLoading(false);
            }
        })();
    }, [demo, token]);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [step]);

    const handleAdd = (product: PublicProduct, quantity: number, nafudaName: string) => {
        setLines(prev => {
            const existing = prev.find(line => line.product.id === product.id);
            if (existing) {
                return prev.map(line => line.product.id === product.id
                    ? { ...line, quantity, nafuda_name: nafudaName }
                    : line);
            }
            return [...prev, { product, quantity, nafuda_name: nafudaName }];
        });
    };

    const handleRemove = (productId: string) => {
        setLines(prev => prev.filter(line => line.product.id !== productId));
    };

    const handleSubmit = async () => {
        if (!demo && !token) return;
        setSubmitting(true);
        setSubmitError('');
        try {
            const demoSubtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
            const orderResult = demo
                ? await demoSubmit(
                    demoSubtotal,
                    calcDiscount(demoSubtotal, DEMO_FUNERAL),
                    DEMO_FUNERAL.tax_rate,
                )
                : await submitOrder(token!, orderer, lines, paymentMethod);

            setResult(orderResult);
            // カード払いは注文を作ったうえで決済へ進む。
            // 入金の確定・メール送信は決済後に Stripe の Webhook 側で行う。
            setStep(orderResult.client_secret ? 'payment' : 'complete');
        } catch (error) {
            console.error('Failed to submit order:', error);
            setSubmitError(toUserMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    if (legalPage === 'tokushoho' || legalPage === 'privacy') {
        return (
            <>
                <LegalPage page={legalPage} company={company} />
                <SiteFooter company={company} />
            </>
        );
    }

    if (loading) {
        return <div className="loading">読み込んでいます...</div>;
    }

    if ((!demo && !token) || loadFailed || !funeral || funeral.status === 'not_found') {
        return (
            <>
                <Notice
                    title="ページが見つかりません"
                    message="お手元のご案内に記載されたURLをご確認ください。ご不明な場合は下記までお問い合わせください。"
                />
                <SiteFooter company={company} />
            </>
        );
    }

    if (funeral.status === 'closed') {
        return (
            <>
                <Notice
                    title="供花の受付は終了しました"
                    message={`故 ${funeral.deceased_name} 様への供花のお申し込みは締め切らせていただきました。`}
                />
                <SiteFooter company={company} />
            </>
        );
    }

    if (funeral.status === 'deadline_passed') {
        return (
            <>
                <Notice
                    title="受付締切を過ぎています"
                    message={`故 ${funeral.deceased_name} 様への供花のお申し込みは受付を終了いたしました。お急ぎの場合は下記までお問い合わせください。`}
                />
                <SiteFooter company={company} />
            </>
        );
    }

    const demoBanner = demo
        ? <div className="demo-banner">デモ表示です。実際の注文は保存されません。</div>
        : null;

    if (step === 'complete' && result) {
        return (
            <>
                {demoBanner}
                <CompleteView
                    result={result}
                    paymentMethod={paymentMethod}
                    email={orderer.email}
                />
                <SiteFooter company={company} />
            </>
        );
    }

    const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
    const discount = calcDiscount(subtotal, funeral);
    const total = (subtotal - discount) + Math.round((subtotal - discount) * funeral.tax_rate);

    return (
        <>
            {demoBanner}

            <header className="site-header">
                <h1>供花のお申し込み</h1>
                <p>心を込めてお届けいたします</p>
            </header>

            <div className="page">
                <FuneralHeader funeral={funeral} />

                {step === 'catalog' && (
                    <ProductList
                        products={products}
                        taxRate={funeral.tax_rate}
                        discountLabel={discount > 0 || funeral.discount_type !== 'none'
                            ? (funeral.discount_note || '割引')
                            : ''}
                        lines={lines}
                        onAdd={handleAdd}
                        onRemove={handleRemove}
                    />
                )}

                {step === 'form' && (
                    <OrderForm
                        orderer={orderer}
                        onChange={setOrderer}
                        paymentMethod={paymentMethod}
                        onChangePaymentMethod={setPaymentMethod}
                        cardPaymentEnabled={funeral.card_payment_enabled}
                        onBack={() => setStep('catalog')}
                        onNext={() => setStep('confirm')}
                    />
                )}

                {step === 'confirm' && (
                    <ConfirmView
                        funeral={funeral}
                        lines={lines}
                        orderer={orderer}
                        paymentMethod={paymentMethod}
                        submitting={submitting}
                        error={submitError}
                        onBack={() => setStep('form')}
                        onSubmit={handleSubmit}
                    />
                )}

                {step === 'payment' && result?.client_secret && result?.publishable_key && (
                    <PaymentView
                        clientSecret={result.client_secret}
                        publishableKey={result.publishable_key}
                        total={result.total}
                        orderNumber={result.order_number}
                        onPaid={() => setStep('complete')}
                    />
                )}

            </div>

            <SiteFooter company={company} />

            {step === 'catalog' && lines.length > 0 && (
                <div className="cart-bar">
                    <div className="cart-bar-inner">
                        <div className="cart-total">
                            <div className="label">{lines.length}点 / 合計（税込）</div>
                            {discount > 0 && (
                                <div className="cart-discount">
                                    {funeral.discount_note || '割引'} -{formatYen(discount)}
                                </div>
                            )}
                            <div className="value">{formatYen(total)}</div>
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setStep('form')}
                        >
                            お申し込みへ進む
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default App;
