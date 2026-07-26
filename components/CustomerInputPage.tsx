import React, { useState } from 'react';
import { CustomerInfo } from '../types';
import { DateInput, DateMode } from './DateInput';
import { ArrowLeft, Printer, Save } from 'lucide-react';

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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-30 shadow-sm">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-emerald-700 transition-colors font-bold"
                    >
                        <ArrowLeft size={20} />
                        <span>見積り選択へ戻る</span>
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">顧客情報・見積書情報入力</h1>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
                <form id="customer-form" className="space-y-8">

                    {/* Deceased Info */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-6 border-b pb-2">
                            <span className="text-2xl">🕊️</span>
                            <h3 className="font-bold text-lg text-gray-800">故人様について</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">死亡月日</label>
                                <DateInput
                                    value={formData.deathDate}
                                    mode={formData.deathDateMode || 'western'}
                                    onChange={(val, mode) => handleDateChange('deathDate', 'deathDateMode', val, mode)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">お葬式の日程（葬祭日）</label>
                                <DateInput
                                    value={formData.funeralDate || ''}
                                    mode={formData.funeralDateMode || 'western'}
                                    onChange={(val, mode) => handleDateChange('funeralDate', 'funeralDateMode', val, mode)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">式場名</label>
                                <input
                                    type="text"
                                    name="venueName"
                                    value={formData.venueName || ''}
                                    onChange={handleChange}
                                    placeholder="例: ファーストリーフホール鎌倉"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">式場住所</label>
                                <input
                                    type="text"
                                    name="venueAddress"
                                    value={formData.venueAddress || ''}
                                    onChange={handleChange}
                                    placeholder="例: 神奈川県鎌倉市〇〇 1-2-3"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">故人様氏名</label>
                                <input
                                    type="text"
                                    name="deceasedName"
                                    value={formData.deceasedName}
                                    onChange={handleChange}
                                    placeholder="例: 佐藤 太郎"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">生年月日</label>
                                <DateInput
                                    value={formData.birthDate}
                                    mode={formData.birthDateMode || 'western'}
                                    onChange={(val, mode) => handleDateChange('birthDate', 'birthDateMode', val, mode)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">享年 (才)</label>
                                <input
                                    type="text"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    placeholder="自動計算"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">郵便番号</label>
                                    <input
                                        type="text"
                                        value={postalCodeInput}
                                        onChange={handlePostalCodeChange}
                                        placeholder="例: 2530085 (ハイフンなし)"
                                        maxLength={7}
                                        className="w-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">現住所</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="自動入力または手動入力"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">本籍</label>
                                <input
                                    type="text"
                                    name="honseki"
                                    value={formData.honseki}
                                    onChange={handleChange}
                                    placeholder="例: 神奈川県茅ヶ崎市..."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Applicant Info */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-6 border-b pb-2">
                            <span className="text-2xl">📋</span>
                            <h3 className="font-bold text-lg text-gray-800">申込者・喪主様について</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">申込者氏名</label>
                                <input
                                    type="text"
                                    name="applicantName"
                                    value={formData.applicantName}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">続柄</label>
                                <input
                                    type="text"
                                    name="applicantRelation"
                                    value={formData.applicantRelation}
                                    onChange={handleChange}
                                    placeholder="例: 長男"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">生年月日</label>
                                <DateInput
                                    value={formData.applicantBirthDate}
                                    mode={formData.applicantBirthDateMode || 'western'}
                                    onChange={(val, mode) => handleDateChange('applicantBirthDate', 'applicantBirthDateMode', val, mode)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">年齢 (才)</label>
                                <input
                                    type="text"
                                    name="applicantAge"
                                    value={formData.applicantAge || ''}
                                    onChange={handleChange}
                                    placeholder="自動計算"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div className="md:col-span-3 space-y-4 border-t border-gray-100 pt-4 mt-2 mb-2">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">申込者郵便番号</label>
                                        <input
                                            type="text"
                                            value={applicantPostalCodeInput}
                                            onChange={handleApplicantPostalCodeChange}
                                            placeholder="例: 2530085"
                                            maxLength={7}
                                            className="w-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">申込者住所</label>
                                        <input
                                            type="text"
                                            name="applicantAddress"
                                            value={formData.applicantAddress || ''}
                                            onChange={handleChange}
                                            placeholder="自動入力または手動入力"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">申込者電話番号</label>
                                    <input
                                        type="tel"
                                        name="applicantPhone"
                                        value={formData.applicantPhone || ''}
                                        onChange={handleChange}
                                        placeholder="例: 090-1234-5678"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">喪主様氏名</label>
                                <input
                                    type="text"
                                    name="chiefMournerName"
                                    value={formData.chiefMournerName}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">喪主様住所 (上記と異なる場合)</label>
                                <input
                                    type="text"
                                    name="chiefMournerAddress"
                                    value={formData.chiefMournerAddress}
                                    onChange={handleChange}
                                    placeholder="申込み者と同じ場合は空欄で構いません"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">電話番号</label>
                                <input
                                    type="tel"
                                    name="chiefMournerPhone"
                                    value={formData.chiefMournerPhone}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">携帯番号</label>
                                <input
                                    type="tel"
                                    name="chiefMournerMobile"
                                    value={formData.chiefMournerMobile}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Other Info */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-6 border-b pb-2">
                            <span className="text-2xl">🙏</span>
                            <h3 className="font-bold text-lg text-gray-800">宗教・寺院について</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">宗派</label>
                                <input
                                    type="text"
                                    name="religion"
                                    value={formData.religion}
                                    onChange={handleChange}
                                    placeholder="例: 浄土真宗本願寺派"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">菩提寺名称</label>
                                <input
                                    type="text"
                                    name="templeName"
                                    value={formData.templeName}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">菩提寺電話</label>
                                <input
                                    type="tel"
                                    name="templePhone"
                                    value={formData.templePhone}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">菩提寺FAX</label>
                                <input
                                    type="tel"
                                    name="templeFax"
                                    value={formData.templeFax}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all"
                                />
                            </div>
                        </div>
                    </div>


                    {/* Remarks */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-6 border-b pb-2">
                            <span className="text-2xl">📝</span>
                            <h3 className="font-bold text-lg text-gray-800">備考</h3>
                        </div>
                        <div>
                            <textarea
                                name="remarks"
                                value={formData.remarks || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                                placeholder="備考事項があればご記入ください"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 transition-all min-h-[100px]"
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap justify-end gap-4 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-6 py-3 rounded-full border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold transition-all"
                        >
                            戻る
                        </button>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={(e) => handlePrintClick(e, 'quote')}
                                className="px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-lg transition-all flex items-center gap-2"
                            >
                                <Printer size={20} />見積書
                            </button>
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={(e) => handlePrintClick(e, 'invoice')}
                                className="px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-lg transition-all flex items-center gap-2"
                            >
                                <Printer size={20} />請求書
                            </button>
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={(e) => handlePrintClick(e, 'receipt')}
                                className="px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-lg transition-all flex items-center gap-2"
                            >
                                <Printer size={20} />領収書
                            </button>
                        </div>
                    </div>

                </form>
            </main>
        </div >
    );
};

export default CustomerInputPage;
