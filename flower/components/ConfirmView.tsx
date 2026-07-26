import React from 'react';
import { calcDiscount, CartLine, OrdererInput, FuneralPublic } from '../lib/api';
import { formatYen } from '../../lib/format';

interface Props {
    funeral: FuneralPublic;
    lines: CartLine[];
    orderer: OrdererInput;
    paymentMethod: 'card' | 'invoice';
    submitting: boolean;
    error: string;
    onBack: () => void;
    onSubmit: () => void;
}

const ConfirmView: React.FC<Props> = ({
    funeral, lines, orderer, paymentMethod, submitting, error, onBack, onSubmit,
}) => {
    const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
    const discount = calcDiscount(subtotal, funeral);
    const tax = Math.round((subtotal - discount) * funeral.tax_rate);

    return (
        <div className="section">
            <h2 className="section-title">ご注文内容の確認</h2>

            <div className="form-card">
                <div className="summary-list">
                    {lines.map(line => (
                        <div key={line.product.id} className="summary-row">
                            <div>
                                <div className="name">{line.product.name} × {line.quantity}</div>
                                <div className="nafuda">名札: {line.nafuda_name}</div>
                            </div>
                            <div className="amount">{formatYen(line.product.price * line.quantity)}</div>
                        </div>
                    ))}
                </div>

                <div className="totals">
                    <div><span>小計（税抜）</span><span>{formatYen(subtotal)}</span></div>
                    {discount > 0 && (
                        <div>
                            <span>{funeral.discount_note || '割引'}</span>
                            <span>-{formatYen(discount)}</span>
                        </div>
                    )}
                    <div><span>消費税</span><span>{formatYen(tax)}</span></div>
                    <div className="grand">
                        <span>合計</span><span>{formatYen(subtotal - discount + tax)}</span>
                    </div>
                </div>
            </div>

            <h2 className="section-title" style={{ marginTop: 28 }}>お届け先</h2>
            <div className="form-card">
                <p><strong>故 {funeral.deceased_name} 様</strong></p>
                {funeral.venue_name && <p>{funeral.venue_name}</p>}
                {funeral.venue_address && <p className="hint">{funeral.venue_address}</p>}
            </div>

            <h2 className="section-title" style={{ marginTop: 28 }}>お申込者さま</h2>
            <div className="form-card">
                {orderer.company && <p>{orderer.company}</p>}
                <p><strong>{orderer.name} 様</strong>{orderer.kana && `（${orderer.kana}）`}</p>
                <p>{orderer.phone}</p>
                <p>{orderer.email}</p>
                {orderer.address && (
                    <p>{orderer.postal_code && `〒${orderer.postal_code} `}{orderer.address}</p>
                )}
                {orderer.relation && <p className="hint">ご関係: {orderer.relation}</p>}
                {orderer.remarks && <p className="hint">備考: {orderer.remarks}</p>}
                <p style={{ marginTop: 12 }}>
                    お支払い方法: <strong>
                        {paymentMethod === 'card' ? 'クレジットカード' : '請求書でのお支払い'}
                    </strong>
                </p>
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="btn-row">
                <button type="button" className="btn btn-ghost" onClick={onBack} disabled={submitting}>
                    戻る
                </button>
                <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={onSubmit}
                    disabled={submitting}
                >
                    {submitting ? '送信中...' : 'この内容で申し込む'}
                </button>
            </div>
        </div>
    );
};

export default ConfirmView;
