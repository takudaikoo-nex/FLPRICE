import React, { useState } from 'react';
import { stripHonorific } from '../lib/format';
import { CustomerInfo } from '../types';
import { DateInput, DateMode } from './DateInput';
import { ArrowLeft, Printer } from 'lucide-react';

interface CustomerInputPageProps {
    onBack: () => void;
    onSaveAndPrint: (info: CustomerInfo, documentType: 'quote' | 'invoice' | 'receipt') => void;
    isSaving: boolean;
    initialData?: CustomerInfo | null;
}

const CustomerInputPage: React.FC<CustomerInputPageProps> = ({ onBack, onSaveAndPrint, isSaving, initialData }) => {
    const [formData, setFormData] = useState<CustomerInfo>(initialData || {
        deathDate: '',
        deathDateMode: 'western',
        funeralDate: '',
        funeralDateMode: 'western',
        deceasedName: '',
        venueName: '',
        venueAddress: '',
        birthDate: '',
        birthDateMode: 'western',
        age: '',
        address: '',
        honseki: '',
        applicantName: '',
        applicantRelation: '',
        applicantBirthDate: '',
        applicantBirthDateMode: 'western',
        applicantPostalCode: '',
        applicantAddress: '',
        applicantPhone: '',
        chiefMournerName: '',
        chiefMournerAddress: '',
        chiefMournerPhone: '',
        chiefMournerMobile: '',
        religion: '',
        templeName: '',
        templePhone: '',

        templeFax: '',
        remarks: '',
    });



    const [postalCodeInput, setPostalCodeInput] = useState('');
    const [applicantPostalCodeInput, setApplicantPostalCodeInput] = useState('');

    const calculateAge = (birthDate: string, deathDateStr?: string): string => {
        if (!birthDate) return '';
        const birth = new Date(birthDate);
        if (isNaN(birth.getTime())) return '';
        
        let endDate = new Date();
        if (deathDateStr) {
            const death = new Date(deathDateStr);
            if (!isNaN(death.getTime())) {
                endDate = death;
            }
        }

        let age = endDate.getFullYear() - birth.getFullYear();
        const m = endDate.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && endDate.getDate() < birth.getDate())) {
            age--;
        }
        return age.toString();
    };

    const fetchAddress = async (zip: string) => {
        try {
            const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`);
            const data = await response.json();
            if (data.results && data.results[0]) {
                const res = data.results[0];
                const address = `${res.address1}${res.address2}${res.address3}`;
                // Format: 〒000-0000 Address
                const formattedZip = `〒${zip.slice(0, 3)}-${zip.slice(3)}`;
                const fullAddress = `${formattedZip} ${address}`;

                setFormData(prev => ({ ...prev, address: fullAddress }));
            }
        } catch (error) {
            console.error('Failed to fetch address:', error);
        }
    };

    const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/-/g, '');
        setPostalCodeInput(val);
        if (val.length === 7) {
            fetchAddress(val);
        }
    };

    const fetchApplicantAddress = async (zip: string) => {
        try {
            const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`);
            const data = await response.json();
            if (data.results && data.results[0]) {
                const res = data.results[0];
                const address = `${res.address1}${res.address2}${res.address3}`;
                // Format: 〒000-0000 Address
                const formattedZip = `〒${zip.slice(0, 3)}-${zip.slice(3)}`;
                const fullAddress = `${formattedZip} ${address}`;

                setFormData(prev => ({ ...prev, applicantAddress: fullAddress }));
            }
        } catch (error) {
            console.error('Failed to fetch address:', error);
        }
    };

    const handleApplicantPostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/-/g, '');
        setApplicantPostalCodeInput(val);
        setFormData(prev => ({ ...prev, applicantPostalCode: val }));
        if (val.length === 7) {
            fetchApplicantAddress(val);
        }
    };

    React.useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            // Try to extract postal code from address if present
            const match = initialData.address.match(/〒(\d{3}-\d{4})/);
            if (match) {
                setPostalCodeInput(match[1].replace('-', ''));
            }
            if (initialData.applicantPostalCode) {
                setApplicantPostalCodeInput(initialData.applicantPostalCode);
            } else if (initialData.applicantAddress) {
                const matchApp = initialData.applicantAddress.match(/〒(\d{3}-\d{4})/);
                if (matchApp) setApplicantPostalCodeInput(matchApp[1].replace('-', ''));
            }
        }
    }, [initialData]);

    /**
     * 氏名欄から離れたときに末尾の「様」を落とす。
     * 表示側で「様」を付けるため、含めたままだと二重になり顧客も重複する。
     */
    const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const cleaned = stripHonorific(value);
        if (cleaned !== value) setFormData(prev => ({ ...prev, [name]: cleaned }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // Auto-calculate age (for standard inputs if any left, but DateInput uses handleDateChange)
            if (name === 'birthDate') {
                newData.age = calculateAge(value, newData.deathDate);
            } else if (name === 'applicantBirthDate') {
                newData.applicantAge = calculateAge(value);
            }

            return newData;
        });
    };

    const handleDateChange = (field: keyof CustomerInfo, modeField: keyof CustomerInfo, val: string, mode: DateMode) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: val, [modeField]: mode };

            if (field === 'birthDate') {
                newData.age = calculateAge(val, newData.deathDate);
            } else if (field === 'applicantBirthDate') {
                newData.applicantAge = calculateAge(val);
            } else if (field === 'deathDate') {
                if (newData.birthDate) {
                    newData.age = calculateAge(newData.birthDate, val);
                }
            }

            return newData;
        });
    };

    const handlePrintClick = (e: React.MouseEvent, type: 'quote' | 'invoice' | 'receipt') => {
        e.preventDefault();
        onSaveAndPrint(formData, type);
    };

    return (
        <div className="fl-shell">
            <header className="fl-header">
                <div className="fl-header-left">
                    <button type="button" className="fl-back" onClick={onBack}>
                        <ArrowLeft size={16} />
                        見積り選択へ戻る
                    </button>
                    <h1>顧客情報・見積書情報入力</h1>
                </div>
            </header>

            <main>
                <form id="customer-form" className="fl-form-page">

                    {/* ---------- 故人様 ---------- */}
                    <section className="fl-form-section">
                        <div className="fl-form-section-head">
                            <span>🕊️</span>
                            <h3>故人様について</h3>
                        </div>
                        <div className="fl-form-grid">
                            <div className="fl-field">
                                <label>死亡月日</label>
                                <DateInput
                                    value={formData.deathDate}
                                    mode={formData.deathDateMode || 'western'}
                                    onChange={(val, mode) => handleDateChange('deathDate', 'deathDateMode', val, mode)}
                                />
                            </div>
                            <div className="fl-field">
                                <label>お葬式の日程（葬祭日）</label>
                                <DateInput
                                    value={formData.funeralDate || ''}
                                    mode={formData.funeralDateMode || 'western'}
                                    onChange={(val, mode) => handleDateChange('funeralDate', 'funeralDateMode', val, mode)}
                                />
                            </div>
                            <div className="fl-field">
                                <label>式場名</label>
                                <input
                                    type="text"
                                    name="venueName"
                                    value={formData.venueName || ''}
                                    onChange={handleChange}
                                    placeholder="例: ファーストリーフホール鎌倉"
                                />
                            </div>
                            <div className="fl-field">
                                <label>式場住所</label>
                                <input
                                    type="text"
                                    name="venueAddress"
                                    value={formData.venueAddress || ''}
                                    onChange={handleChange}
                                    placeholder="例: 神奈川県鎌倉市〇〇 1-2-3"
                                />
                            </div>
                            <div className="fl-field">
                                <label>故人様氏名</label>
                                <input
                                    type="text"
                                    name="deceasedName"
                                    value={formData.deceasedName}
                                    onChange={handleChange}
                                    onBlur={handleNameBlur}
                                    placeholder="例: 佐藤 太郎"
                                />
                            </div>
                            <div className="fl-field">
                                <label>生年月日</label>
                                <DateInput
                                    value={formData.birthDate}
                                    mode={formData.birthDateMode || 'western'}
                                    onChange={(val, mode) => handleDateChange('birthDate', 'birthDateMode', val, mode)}
                                />
                            </div>
                            <div className="fl-field is-short">
                                <label>享年（才）</label>
                                <input
                                    type="text"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    placeholder="自動計算"
                                />
                            </div>
                            <div className="fl-field is-short">
                                <label>郵便番号</label>
                                <input
                                    type="text"
                                    value={postalCodeInput}
                                    onChange={handlePostalCodeChange}
                                    placeholder="例: 2530085（ハイフンなし）"
                                    maxLength={7}
                                />
                            </div>
                            <div className="fl-field span-2">
                                <label>現住所</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="郵便番号から自動入力されます"
                                />
                            </div>
                            <div className="fl-field span-2">
                                <label>本籍</label>
                                <input
                                    type="text"
                                    name="honseki"
                                    value={formData.honseki}
                                    onChange={handleChange}
                                    placeholder="例: 神奈川県茅ヶ崎市..."
                                />
                            </div>
                        </div>
                    </section>

                    {/* ---------- 申込者・喪主様 ---------- */}
                    <section className="fl-form-section">
                        <div className="fl-form-section-head">
                            <span>📋</span>
                            <h3>申込者・喪主様について</h3>
                        </div>
                        <div className="fl-form-grid cols-3">
                            <div className="fl-field">
                                <label>申込者氏名</label>
                                <input
                                    type="text"
                                    name="applicantName"
                                    value={formData.applicantName}
                                    onChange={handleChange}
                                    onBlur={handleNameBlur}
                                />
                            </div>
                            <div className="fl-field">
                                <label>続柄</label>
                                <input
                                    type="text"
                                    name="applicantRelation"
                                    value={formData.applicantRelation}
                                    onChange={handleChange}
                                    placeholder="例: 長男"
                                />
                            </div>
                            <div className="fl-field">
                                <label>生年月日</label>
                                <DateInput
                                    value={formData.applicantBirthDate}
                                    mode={formData.applicantBirthDateMode || 'western'}
                                    onChange={(val, mode) => handleDateChange('applicantBirthDate', 'applicantBirthDateMode', val, mode)}
                                />
                            </div>
                            <div className="fl-field is-short">
                                <label>年齢（才）</label>
                                <input
                                    type="text"
                                    name="applicantAge"
                                    value={formData.applicantAge || ''}
                                    onChange={handleChange}
                                    placeholder="自動計算"
                                />
                            </div>

                            <div className="span-3 fl-form-subgroup">
                                <div className="fl-form-row">
                                    <div className="fl-field is-short">
                                        <label>申込者郵便番号</label>
                                        <input
                                            type="text"
                                            value={applicantPostalCodeInput}
                                            onChange={handleApplicantPostalCodeChange}
                                            placeholder="例: 2530085"
                                            maxLength={7}
                                        />
                                    </div>
                                    <div className="fl-field is-grow">
                                        <label>申込者住所</label>
                                        <input
                                            type="text"
                                            name="applicantAddress"
                                            value={formData.applicantAddress || ''}
                                            onChange={handleChange}
                                            placeholder="郵便番号から自動入力されます"
                                        />
                                    </div>
                                </div>
                                <div className="fl-field" style={{ marginTop: '14px', marginBottom: 0 }}>
                                    <label>申込者電話番号</label>
                                    <input
                                        type="tel"
                                        name="applicantPhone"
                                        value={formData.applicantPhone || ''}
                                        onChange={handleChange}
                                        placeholder="例: 090-1234-5678"
                                    />
                                </div>
                            </div>

                            <div className="fl-field">
                                <label>喪主様氏名</label>
                                <input
                                    type="text"
                                    name="chiefMournerName"
                                    value={formData.chiefMournerName}
                                    onChange={handleChange}
                                    onBlur={handleNameBlur}
                                />
                            </div>
                            <div className="fl-field span-2">
                                <label>喪主様住所（上記と異なる場合）</label>
                                <input
                                    type="text"
                                    name="chiefMournerAddress"
                                    value={formData.chiefMournerAddress}
                                    onChange={handleChange}
                                    placeholder="申込者と同じ場合は空欄で構いません"
                                />
                            </div>
                            <div className="fl-field">
                                <label>電話番号</label>
                                <input
                                    type="tel"
                                    name="chiefMournerPhone"
                                    value={formData.chiefMournerPhone}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="fl-field">
                                <label>携帯番号</label>
                                <input
                                    type="tel"
                                    name="chiefMournerMobile"
                                    value={formData.chiefMournerMobile}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ---------- 宗教・寺院 ---------- */}
                    <section className="fl-form-section">
                        <div className="fl-form-section-head">
                            <span>🙏</span>
                            <h3>宗教・寺院について</h3>
                        </div>
                        <div className="fl-form-grid">
                            <div className="fl-field">
                                <label>宗派</label>
                                <input
                                    type="text"
                                    name="religion"
                                    value={formData.religion}
                                    onChange={handleChange}
                                    placeholder="例: 浄土真宗本願寺派"
                                />
                            </div>
                            <div className="fl-field">
                                <label>菩提寺名称</label>
                                <input
                                    type="text"
                                    name="templeName"
                                    value={formData.templeName}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="fl-field">
                                <label>菩提寺電話</label>
                                <input
                                    type="tel"
                                    name="templePhone"
                                    value={formData.templePhone}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="fl-field">
                                <label>菩提寺FAX</label>
                                <input
                                    type="tel"
                                    name="templeFax"
                                    value={formData.templeFax}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ---------- 備考 ---------- */}
                    <section className="fl-form-section">
                        <div className="fl-form-section-head">
                            <span>📝</span>
                            <h3>備考</h3>
                        </div>
                        <div className="fl-field" style={{ marginBottom: 0 }}>
                            <textarea
                                name="remarks"
                                value={formData.remarks || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                                placeholder="備考事項があればご記入ください"
                            />
                        </div>
                    </section>

                    <div className="fl-form-actions">
                        <button type="button" className="fl-btn fl-btn-ghost" onClick={onBack}>
                            戻る
                        </button>
                        <div className="fl-form-actions-right">
                            <button
                                type="button"
                                className="fl-btn fl-btn-primary"
                                disabled={isSaving}
                                onClick={(e) => handlePrintClick(e, 'quote')}
                            >
                                <Printer size={18} />
                                見積書
                            </button>
                            <button
                                type="button"
                                className="fl-btn fl-btn-primary"
                                disabled={isSaving}
                                onClick={(e) => handlePrintClick(e, 'invoice')}
                            >
                                <Printer size={18} />
                                請求書
                            </button>
                            <button
                                type="button"
                                className="fl-btn fl-btn-primary"
                                disabled={isSaving}
                                onClick={(e) => handlePrintClick(e, 'receipt')}
                            >
                                <Printer size={18} />
                                領収書
                            </button>
                        </div>
                    </div>

                </form>
            </main>
        </div>
    );
};

export default CustomerInputPage;
