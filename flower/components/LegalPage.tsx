import React from 'react';
import { CompanyInfo, contactTel } from '../lib/api';

interface Props {
    page: 'tokushoho' | 'privacy';
    company: CompanyInfo | null;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="legal-row">
        <div className="legal-label">{label}</div>
        <div className="legal-value">{children}</div>
    </div>
);

const LegalPage: React.FC<Props> = ({ page, company }) => {
    const name = company?.company_name || 'ファーストリーフ';
    const tel = contactTel(company);
    const address = [
        company?.company_postal_code ? `〒${company.company_postal_code}` : '',
        company?.company_address || '',
    ].filter(Boolean).join(' ');

    const payments = ['請求書によるお支払い（銀行振込）'];
    if (company?.card_payment_enabled) payments.push('クレジットカード決済');

    return (
        <>
            <header className="site-header">
                <h1>{page === 'tokushoho' ? '特定商取引法に基づく表記' : 'プライバシーポリシー'}</h1>
            </header>

            <div className="page legal-page">
                {page === 'tokushoho' ? (
                    <div className="legal-table">
                        <Row label="販売業者">{name}</Row>
                        {company?.representative_name && (
                            <Row label="運営統括責任者">{company.representative_name}</Row>
                        )}
                        {address && <Row label="所在地">{address}</Row>}
                        {tel && <Row label="電話番号">{tel}</Row>}
                        {company?.contact_hours && (
                            <Row label="受付時間">{company.contact_hours}</Row>
                        )}
                        {company?.mail_from && (
                            <Row label="メールアドレス">{company.mail_from}</Row>
                        )}
                        <Row label="販売価格">
                            各商品ページに表示された金額（税込）
                        </Row>
                        <Row label="商品代金以外の必要料金">
                            配送料・設営費は商品価格に含まれます。<br />
                            銀行振込をご利用の場合、振込手数料はお客様のご負担となります。
                        </Row>
                        <Row label="お支払い方法">
                            {payments.map(p => <div key={p}>{p}</div>)}
                        </Row>
                        <Row label="お支払い時期">
                            請求書によるお支払いの場合、請求書の発行日から
                            {company?.payment_due_days ?? 30}日以内にお振込みください。
                            {company?.card_payment_enabled && (
                                <><br />クレジットカード決済の場合、ご注文時にお支払いが確定します。</>
                            )}
                        </Row>
                        <Row label="商品の引渡し時期">
                            ご指定の葬儀の告別式開始までに、式場へお届け・設営いたします。
                        </Row>
                        <Row label="返品・キャンセルについて">
                            {(company?.cancellation_policy || '受付締切前までにお電話にてご連絡ください。')
                                .split('\n')
                                .map((line, index) => <div key={index}>{line}</div>)}
                        </Row>
                    </div>
                ) : (
                    <div className="legal-body">
                        <p>
                            {name}（以下「当社」）は、供花のお申し込みに際してお客様からお預かりする
                            個人情報の重要性を認識し、以下のとおり取り扱います。
                        </p>

                        <h2>1. 取得する情報</h2>
                        <p>
                            お名前、ふりがな、会社名・団体名、電話番号、メールアドレス、郵便番号、
                            ご住所、故人さまとのご関係、名札の表記、ご要望・備考。
                        </p>

                        <h2>2. 利用目的</h2>
                        <ul>
                            <li>ご注文の確認、供花の手配および式場への配送・設営のため</li>
                            <li>ご請求およびお支払いに関するご連絡のため</li>
                            <li>ご注文内容に関するお問い合わせへの対応のため</li>
                        </ul>

                        <h2>3. 第三者への提供</h2>
                        <p>
                            供花の手配・配送のため、必要な範囲に限り、生花店等の委託先へ
                            お名前および名札の表記を提供します。
                            これら以外の第三者へは、法令に基づく場合を除き提供しません。
                        </p>

                        <h2>4. 安全管理</h2>
                        <p>
                            お預かりした情報は、暗号化された通信により送信され、
                            アクセスを制限した環境で保管します。
                        </p>

                        <h2>5. 開示・訂正・削除のご請求</h2>
                        <p>
                            ご本人からのお申し出により、保有する個人情報の開示・訂正・削除に応じます。
                            下記の連絡先までご連絡ください。
                        </p>

                        {company?.privacy_note && (
                            <>
                                <h2>6. その他</h2>
                                {company.privacy_note.split('\n').map((line, index) => (
                                    <p key={index}>{line}</p>
                                ))}
                            </>
                        )}

                        <h2>お問い合わせ窓口</h2>
                        <p>
                            {name}<br />
                            {address && <>{address}<br /></>}
                            {tel && <>電話: {tel}<br /></>}
                            {company?.mail_from && <>メール: {company.mail_from}</>}
                        </p>
                    </div>
                )}

                <div className="btn-row">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => window.history.length > 1 ? window.history.back() : window.close()}
                    >
                        戻る
                    </button>
                </div>
            </div>
        </>
    );
};

export default LegalPage;
