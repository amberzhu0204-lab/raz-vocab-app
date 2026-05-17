import { useState, useEffect } from 'react';
import type { Word } from '../types';
import { getCardColor } from '../utils/colors';

interface FlashcardProps {
  word: Word;
  index: number;
  showImage: boolean;
  onSwipe?: (direction: 'left' | 'right') => void;
}

export default function Flashcard({ word, index, showImage, onSwipe }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const hasImage = showImage && word.imageUrl && word.imageStatus === 'ready';
  const cardColor = getCardColor(index);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgLoading(true);
    setImgError(false);
  }, [word.id]);

  const showImg = hasImage && !imgError;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart == null || !onSwipe) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 80) {
      onSwipe(diff > 0 ? 'right' : 'left');
    }
    setTouchStart(null);
  };

  const baseCardClasses =
    'relative w-full max-w-sm mx-auto rounded-3xl shadow-lg cursor-pointer select-none flashcard-flip';
  const flipClass = flipped ? 'flashcard-flipped' : '';
  const heightClass = hasImage ? 'h-96' : 'h-64';

  return (
    <div
      className={`${baseCardClasses} ${flipClass} ${heightClass}`}
      onClick={() => setFlipped(!flipped)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flashcard-inner relative w-full h-full">
        {/* Front */}
        <div className={`flashcard-front absolute inset-0 rounded-3xl ${cardColor} flex flex-col items-center justify-center p-6`}>
          {showImg ? (
            <div className="w-full h-48 rounded-2xl mb-4 overflow-hidden relative bg-white/30">
              {imgLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-3 border-kid-primary border-t-transparent rounded-full" />
                </div>
              )}
              <img
                src={word.imageUrl}
                alt={word.word}
                className="w-full h-full object-cover"
                onLoad={() => setImgLoading(false)}
                onError={() => { setImgError(true); setImgLoading(false); }}
              />
            </div>
          ) : (
            <div className={`w-40 h-40 rounded-full ${cardColor} flex items-center justify-center mb-4 border-4 border-white/50`}>
              <span className="text-5xl font-bold text-gray-700">
                {word.word.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h2 className="text-3xl font-bold text-gray-800 text-center">{word.word}</h2>
          <p className="text-sm text-gray-500 mt-2">点击翻转 →</p>
        </div>

        {/* Back */}
        <div className={`flashcard-back absolute inset-0 rounded-3xl bg-white flex flex-col items-center justify-center p-6 border-2 border-gray-100`}>
          <h2 className="text-3xl font-bold text-kid-primary mb-4">{word.word}</h2>
          <p className="text-xl text-gray-700 text-center mb-2">{word.phrase}</p>
          {word.chinese && (
            <p className="text-lg text-gray-500 text-center">{word.chinese}</p>
          )}
          <p className="text-sm text-gray-400 mt-4">点击翻转 ←</p>
        </div>
      </div>
    </div>
  );
}
