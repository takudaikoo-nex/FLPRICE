import React, { useState, useMemo } from 'react';
import { PublicProduct, CartLine } from '../lib/api';
import { formatYen } from '../../lib/format';

interface Props {
    products: PublicProduct[];
    taxRate: number;
    lines: CartLine[];
    onAdd: (product: PublicProduct, quantity: number, nafudaName: string) => void;
    onRemove: (productId: string) => void;
}

const taxIncluded = (price: number, taxRate: number) => Math.round(price * (1 + taxRate));

const ProductList: React.FC<Props> = ({ products, taxRate, lines, onAdd, onRemove }) => {
    const [category, setCategory] = useState('all');
    const [selected, setSelected] = useState<PublicProduct | null>(null);
    const [imageIndex, setImageIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [nafuda, setNafuda] = useState('');

    const categories = useMemo(() => {
        const found = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
        return ['all', ...found];
    }, [products]);

    const visibleProducts = category === 'all'
        ? products
        : products.filter(p => p.category === category);

    const openProduct = (product: PublicProduct) => {
        const existing = lines.find(line => line.product.id === product.id);
        setSelected(product);
        setImageIndex(0);
        setQuantity(existing?.quantity ?? 1);
        setNafuda(existing?.nafuda_name ?? '');
    };

    const closeModal = () => setSelected(null);

    const handleAdd = () => {
        if (!selected) return;
        onAdd(selected, quantity, nafuda.trim());
        closeModal();
    };

    const isSelected = (productId: string) => lines.some(line => line.product.id === productId);

    return (
        <div className="section">
            <h2 className="section-title">お供物をお選びください</h2>

            {categories.length > 2 && (
                <div className="category-tabs">
                    {categories.map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setCategory(c)}
                            className={`category-tab${category === c ? ' is-active' : ''}`}
                        >
                            {c === 'all' ? 'すべて' : c}
                        </button>
                    ))}
                </div>
            )}

            <div className="product-grid">
                {visibleProducts.map(product => (
                    <button
                        key={product.id}
                        type="button"
                        onClick={() => openProduct(product)}
                        className={`product-card${isSelected(product.id) ? ' is-selected' : ''}`}
                    >
                        {product.image_paths[0]
                            ? <img className="product-thumb" src={product.image_paths[0]} alt={product.name} />
                            : <div className="product-thumb-empty">準備中</div>}

                        <div className="product-body">
                            <span className="product-category">{product.category}</span>
                            <span className="product-name">{product.name}</span>
                            <span className="product-price">
                                {formatYen(taxIncluded(product.price, taxRate))}
                                <small>税込</small>
                            </span>
                            {isSelected(product.id) && (
                                <span className="product-selected-badge">選択中</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {visibleProducts.length === 0 && (
                <p className="loading">現在お選びいただける商品がありません。</p>
            )}

            {selected && (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <span className="product-category">{selected.category}</span>
                                <h3 className="modal-title">{selected.name}</h3>
                            </div>
                            <button type="button" className="icon-button" onClick={closeModal} aria-label="閉じる">×</button>
                        </div>

                        {selected.image_paths.length > 0 && (
                            <>
                                <img
                                    className="modal-image"
                                    src={selected.image_paths[imageIndex]}
                                    alt={selected.name}
                                />
                                {selected.image_paths.length > 1 && (
                                    <div className="modal-thumbs">
                                        {selected.image_paths.map((path, index) => (
                                            <img
                                                key={path}
                                                src={path}
                                                alt=""
                                                className={index === imageIndex ? 'is-active' : ''}
                                                onClick={() => setImageIndex(index)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {selected.description && <p>{selected.description}</p>}

                        <p className="product-price">
                            {formatYen(taxIncluded(selected.price, taxRate))}
                            <small>税込 / 配送・設営費込み</small>
                        </p>

                        <div className="field" style={{ marginTop: 20 }}>
                            <label htmlFor="nafuda">
                                名札のお名前
                                <span className="required">必須</span>
                            </label>
                            <input
                                id="nafuda"
                                type="text"
                                value={nafuda}
                                onChange={e => setNafuda(e.target.value)}
                                placeholder="例）株式会社〇〇 代表取締役 〇〇 〇〇"
                            />
                            <p className="hint">名札に記載するお名前をそのままご入力ください（1行）</p>
                        </div>

                        <div className="field">
                            <label>ご注文数</label>
                            <div className="quantity">
                                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                                <span>{quantity}</span>
                                <button type="button" onClick={() => setQuantity(q => Math.min(20, q + 1))}>＋</button>
                            </div>
                        </div>

                        <div className="btn-row">
                            {isSelected(selected.id) && (
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => { onRemove(selected.id); closeModal(); }}
                                >
                                    選択を取り消す
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-primary btn-block"
                                onClick={handleAdd}
                                disabled={nafuda.trim().length === 0}
                            >
                                {isSelected(selected.id) ? '内容を更新する' : 'これを選ぶ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductList;
