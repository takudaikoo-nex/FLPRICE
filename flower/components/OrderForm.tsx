import React, { useState } from 'react';
import { OrdererInput } from '../lib/api';

interface Props {
    orderer: OrdererInput;
    onChange: (orderer: OrdererInput) => void;
    paymentMethod: 'card' | 'invoice';
    onChangePaymentMethod: (method: 'card' | 'invoice') => void;
    cardPaymentEnabled: boolean;
    onBack: () => void;
    onNext: () => void;
}

const OrderForm: React.FC<Props> = ({
    orderer, onChange, paymentMethod, onChangePaymentMethod, cardPaymentEnabled, onBack, onNext,
}) => {
    const [error, setError] = useState('');

    const update = (patch: Partial<OrdererInput>) => onChange({ ...orderer, ...patch });

    const handleNext = () => {
        if (!orderer.name.trim()) return setError('お名前をご入力ください。');
        if (!orderer.phone.trim()) return setError('電話番号をご入力ください。');
        if (!orderer.email.trim()) return setError('メールアドレスをご入力ください。');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderer.email.trim())) {
            return setError('メールアドレスの形式をご確認ください。');
        }
        setError('');
        onNext();
    };

    return (
        <div className="section">
            <h2 className="section-title">お申込者さまの情報</h2>

            <div className="form-card">
                <div className="form-row">
                    <div className="field">
                        <label htmlFor="name">お名前<span className="required">必須</span></label>
                        <input
                            id="name"
                            type="text"
                            value={orderer.name}
                            onChange={e => update({ name: e.target.value })}
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="kana">ふりがな</label>
                        <input
                            id="kana"
                            type="text"
                            value={orderer.kana}
                            onChange={e => update({ kana: e.target.value })}
                        />
                    </div>
                </div>

                <div className="field">
                    <label htmlFor="company">会社名・団体名</label>
                    <input
                        id="company"
                        type="text"
                        value={orderer.company}
                        onChange={e => update({ company: e.target.value })}
                    />
                </div>

                <div className="form-row">
                    <div className="field">
                        <label htmlFor="phone">電話番号<span className="required">必須</span></label>
                        <input
                            id="phone"
                            type="tel"
                            value={orderer.phone}
                            onChange={e => update({ phone: e.target.value })}
                            placeholder="09012345678"
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="email">メールアドレス<span className="required">必須</span></label>
                        <input
                            id="email"
                            type="email"
                            value={orderer.email}
                            onChange={e => update({ email: e.target.value })}
                        />
                        <p className="hint">ご注文内容の確認メールをお送りします</p>
                    </div>
                </div>

                <div className="form-row">
                    <div className="field">
                        <label htmlFor="postal">郵便番号</label>
                        <input
                            id="postal"
                            type="text"
                            value={orderer.postal_code}
                            onChange={e => update({ postal_code: e.target.value })}
                            placeholder="2480000"
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="relation">故人さまとのご関係</label>
                        <input
                            id="relation"
                            type="text"
                            value={orderer.relation}
                            onChange={e => update({ relation: e.target.value })}
                            placeholder="例）ご友人、取引先"
                        />
                    </div>
                </div>

                <div className="field">
                    <label htmlFor="address">ご住所</label>
                    <input
                        id="address"
                        type="text"
                        value={orderer.address}
                        onChange={e => update({ address: e.target.value })}
                    />
                    <p className="hint">請求書をお送りする場合に使用します</p>
                </div>

                <div className="field">
                    <label htmlFor="remarks">ご要望・備考</label>
                    <textarea
                        id="remarks"
                        value={orderer.remarks}
                        onChange={e => update({ remarks: e.target.value })}
                    />
                </div>
            </div>

            <h2 className="section-title" style={{ marginTop: 28 }}>お支払い方法</h2>

            <div className="form-card">
                <label className={`radio-card${paymentMethod === 'invoice' ? ' is-selected' : ''}`}>
                    <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'invoice'}
                        onChange={() => onChangePaymentMethod('invoice')}
                    />
                    <span>
                        <span className="label">請求書でのお支払い</span>
                        <span className="desc">ご注文後、メールで請求書をお送りします。</span>
                    </span>
                </label>

                {cardPaymentEnabled && (
                    <label className={`radio-card${paymentMethod === 'card' ? ' is-selected' : ''}`}>
                        <input
                            type="radio"
                            name="payment"
                            checked={paymentMethod === 'card'}
                            onChange={() => onChangePaymentMethod('card')}
                        />
                        <span>
                            <span className="label">クレジットカード</span>
                            <span className="desc">ご注文の最後に決済画面へ進みます。</span>
                        </span>
                    </label>
                )}
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="btn-row">
                <button type="button" className="btn btn-ghost" onClick={onBack}>戻る</button>
                <button type="button" className="btn btn-primary btn-block" onClick={handleNext}>
                    ご確認へ進む
                </button>
            </div>
        </div>
    );
};

export default OrderForm;
