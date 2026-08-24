import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CatalogProduct, Item } from '../types';
import { ITEM_IMAGE_BUCKET, storageImageUrl } from '../lib/storage';
import { resolveOption, toProductMap } from '../lib/catalogProducts';
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react';

interface DetailModalProps {
  item: Item | null;
  selectedGrade?: string;
  /** カタログに引き継ぐプラン。プランごとに金額が変わるため必ず渡す */
  planId?: string;
  /** オプション商品マスタ。紐付いている選択肢は画像と説明をここから引く */
  products?: CatalogProduct[];
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ item, selectedGrade, planId, products = [], onClose }) => {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const productMap = useMemo(() => toProductMap(products), [products]);

  /** 選択中のグレード（商品マスタに紐付いていればそちらを正とする） */
  const grade = useMemo(() => {
    if (!item || !selectedGrade) return undefined;
    const option = (item.options || []).find(o => o.id === selectedGrade);
    return option ? resolveOption(option, productMap) : undefined;
  }, [item, selectedGrade, productMap]);

  /** 管理画面から登録された画像（グレードのものを優先） */
  const catalogImages = useMemo(() => {
    if (!item) return [];
    return [
      ...(grade?.imagePaths || []),
      ...(item.imagePaths || []),
    ].map(path => storageImageUrl(ITEM_IMAGE_BUCKET, path));
  }, [item, grade]);

  /**
   * 表示を試す画像の候補。
   * 登録済みの画像を優先し、無い場合は従来の /images/ 配下を見る。
   */
  const candidates = useMemo(() => {
    if (!item) return [];
    const legacy = selectedGrade
      ? [`/images/${item.id}_${selectedGrade}.jpg`, `/images/${item.id}.jpg`]
      : [`/images/${item.id}.jpg`];
    return [...catalogImages, ...legacy];
  }, [item, selectedGrade, catalogImages]);

  // Reset state when item or grade changes
  useEffect(() => {
    if (!item) return;
    setCandidateIndex(0);
    setCurrentSlideIndex(0);
  }, [item, selectedGrade]);

  const currentSrc = candidates[candidateIndex] || '';
  const imageError = candidateIndex >= candidates.length;

  /** 表示できなかった場合は次の候補へ進む */
  const handleImageError = () => setCandidateIndex(prev => prev + 1);

  /** カタログに載せられる画像があるか */
  const hasCatalogImages = !!item && (
    (item.imagePaths || []).length > 0
    || (item.options || []).some(option => resolveOption(option, productMap).imagePaths.length > 0)
  );

  if (!item) return null;

  // Prepare slides data
  // Slide 0: Main Image & Description
  // Slide 1+: Details
  const slides = [
    {
      type: 'main',
      // グレードを選んでいれば、その商品名と説明を優先して見せる
      title: grade?.name ? `${item.name}（${grade.name}）` : item.name,
      image: currentSrc,
      description: grade?.description || item.description,
      isMain: true
    },
    ...((item as any).details || []).map((detail: any) => ({
      type: 'detail',
      title: detail.title || '',
      image: detail.imagePath,
      description: detail.description,
      isMain: false
    }))
  ];

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const currentSlide = slides[currentSlideIndex];

  const modalContent = (
    <div className="fl-modal-backdrop no-print" onClick={onClose}>
      <div
        className="fl-modal is-narrow is-flush animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 何枚目を見ているかの目印 */}
        <div className="fl-modal-head">
          <div className="fl-detail-dots">
            {slides.map((_, idx) => (
              <span
                key={idx}
                className={`fl-detail-dot ${idx === currentSlideIndex ? 'is-current' : ''}`}
              />
            ))}
          </div>
          <button type="button" className="fl-modal-close" onClick={onClose} title="閉じる">
            <X size={20} />
          </button>
        </div>

        <div className="fl-modal-body animate-fade-in">
          <div className="fl-detail-stage">
            {currentSlideIndex > 0 && (
              <button
                type="button"
                className="fl-detail-nav is-prev"
                onClick={prevSlide}
                title="前へ"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {currentSlideIndex < slides.length - 1 && (
              <button
                type="button"
                className="fl-detail-nav is-next"
                onClick={nextSlide}
                title="次へ"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* お棺などの横長画像を切らずに全体を見せる */}
            {currentSlide.image && !(currentSlide.isMain && imageError) ? (
              <img
                src={currentSlide.image}
                alt={currentSlide.title || item.name}
                onError={(e) => {
                  if (currentSlide.isMain) {
                    handleImageError();
                  } else {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }
                }}
              />
            ) : (
              <div className="fl-detail-empty">
                <span style={{ fontSize: '1.8rem' }}>🌿</span>
                No Image
              </div>
            )}

            {currentSlide.title && !currentSlide.isMain && (
              <p className="fl-detail-caption">{currentSlide.title}</p>
            )}
          </div>

          <div className="fl-detail-text">
            {currentSlide.isMain && <h3>{item.name}</h3>}
            {currentSlide.title && !currentSlide.isMain && <h4>{currentSlide.title}</h4>}

            <p className={`fl-detail-desc ${currentSlide.description ? '' : 'is-empty'}`}>
              {currentSlide.description || '説明はありません'}
            </p>

            {currentSlide.isMain && hasCatalogImages && (
              <button
                type="button"
                className="fl-btn fl-btn-ghost"
                style={{ marginTop: '14px' }}
                onClick={() => window.open(
                  `/?catalog=true&item=${item.id}${planId ? `&plan=${encodeURIComponent(planId)}` : ''}`,
                  '_blank',
                )}
              >
                <Images size={16} />
                画像を一覧で見る
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DetailModal;
