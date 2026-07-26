import React from 'react';
import { CompanyInfo, contactTel } from '../lib/api';

interface Props {
    company: CompanyInfo | null;
}

/** 全ページ共通のフッター。問い合わせ先と規約類への導線を置く */
const SiteFooter: React.FC<Props> = ({ company }) => {
    const tel = contactTel(company);

    return (
        <footer className="site-footer">
            <div className="footer-contact">
                <div className="footer-contact-label">お申し込みに関するお問い合わせ</div>
                <div className="footer-company">{company?.company_name || 'ファーストリーフ'}</div>
                {tel && (
                    <a className="footer-tel" href={`tel:${tel.replace(/-/g, '')}`}>{tel}</a>
                )}
                {company?.contact_hours && (
                    <div className="footer-hours">{company.contact_hours}</div>
                )}
            </div>

            <nav className="footer-links">
                <a href="?p=tokushoho">特定商取引法に基づく表記</a>
                <a href="?p=privacy">プライバシーポリシー</a>
            </nav>

            <div className="footer-copyright">
                © {company?.company_name || 'ファーストリーフ'}
            </div>
        </footer>
    );
};

export default SiteFooter;
