import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Item } from '../types';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface DetailModalProps {
  item: Item | null;
  selectedGrade?: string;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ item, selectedGrade, onClose }) => {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [imageError, setImageError] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Reset state when item or grade changes
  useEffect(() => {
    if (!item) return;
    setImageError(false);
    setCurrentSlideIndex(0);

    // Try specific image first if grade is selected, otherwise generic
    if (selectedGrade) {
      setCurrentSrc(`/images/${item.id}_${selectedGrade}.jpg`);
    } else {
      setCurrentSrc(`/images/${item.id}.jpg`);
    }
  }, [item, selectedGrade]);

  const handleImageError = () => {
    // If we were trying a specific image, fallback to generic
    if (currentSrc.includes('_')) {
      if (item) setCurrentSrc(`/images/${item.id}.jpg`);
    } else {
      // If we failed on generic (or already were on generic), show gradient
      setImageError(true);
    }
  };

  if (!item) return null;

  // Prepare slides data
  // Slide 0: Main Image & Description
  // Slide 1+: Details
  const slides = [
    {
      type: 'main',
      title: item.name,
      image: currentSrc,
      description: item.description,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity no-print"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full overflow-hidden animate-fade-in-up flex flex-col max-h-[85vh] h-[600px]"
        style={{ maxWidth: '400px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Top Bar) */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white z-10">
          <div className="flex gap-1 justify-center flex-1">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ${idx === currentSlideIndex ? 'w-8 bg-emerald-500' : 'w-2 bg-gray-200'
                  }`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Carousel Content */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-gray-50">
          {/* Navigation Buttons */}
          {currentSlideIndex > 0 && (
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/80 p-2 rounded-full shadow hover:bg-white text-gray-700 hover:text-emerald-600 transition-all"
              title="前へ"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {currentSlideIndex < slides.length - 1 && (
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/80 p-2 rounded-full shadow hover:bg-white text-gray-700 hover:text-emerald-600 transition-all"
              title="次へ"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Slide Area */}
          <div className="flex-1 overflow-y-auto flex flex-col h-full animate-fade-in">
            {/* Image Section */}
            <div className="relative aspect-4-3 bg-gray-200 flex-shrink-0">
              {currentSlide.image ? (
                <img
                  src={currentSlide.image}
                  alt={currentSlide.title || item.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    if (currentSlide.isMain) {
                      handleImageError();
                    } else {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-400">
                  <div className="text-4xl mb-2">🌿</div>
                  <span className="text-xs">No Image</span>
                </div>
              )}

              {/* Title Overlay (Optional) */}
              {currentSlide.title && !currentSlide.isMain && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2">
                  <p className="font-bold text-sm truncate">{currentSlide.title}</p>
                </div>
              )}
            </div>

            {/* Text Content Section */}
            <div className="p-6 bg-white flex-1">
              {currentSlide.isMain && (
                <h3 className="text-xl font-bold text-gray-800 mb-3">{item.name}</h3>
              )}
              {currentSlide.title && !currentSlide.isMain && (
                <h4 className="font-bold text-emerald-600 mb-2">{currentSlide.title}</h4>
              )}

              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">
                {currentSlide.description || (
                  <span className="text-gray-400 italic">説明はありません</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DetailModal;