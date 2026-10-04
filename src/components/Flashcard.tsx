import { useState, useEffect } from 'react';
import type { Word } from '../types';
import { getCardColor } from '../utils/colors';

const WORD_EMOJI: Record<string, string> = {
  'Blastoff': '🚀', 'Crowd': '👥', 'Control room': '🖥️', 'Space exploration': '🛸',
  'Dairy': '🥛', 'Fried rice': '🍚', 'Ground beef': '🥩', 'Black bean': '🫘',
  'Tofu': '🧈', 'Burger': '🍔', 'Peanut butter': '🥜', 'In different ways': '🔄',
  'Food made from animals': '🐄', 'A giant rooster': '🐓', 'A fancy crown': '👑',
  'Hook': '🪝', 'Beehive': '🐝', 'Treasure chest': '💎', 'Magic': '✨', 'Unicorn': '🦄',
  'Board': '🛹', 'Wheels': '🛞', 'Stand': '🧍', 'Sit': '🪑', 'Stair': '🪜',
  'Contests': '🏆', 'Do tricks': '🤸', 'Find out': '🔍', 'Come': '👋',
  'Skyscraper': '🏙️', 'Stadium': '🏟️', 'Parking garage': '🅿️', 'Park cars': '🚗',
  'Work': '💼', 'Thirsty': '🥤', 'Spot': '👀', 'Lemon seeds': '🍋',
  'Pick out': '🤏', 'Stir': '🥄', 'Spoon': '🥄', 'Pitcher': '🫗', 'Sticker': '⭐',
  'Spill': '💧', 'Adult': '👨', 'Carve': '🔪', 'Cut out': '✂️', 'Top': '🔝',
  'Scoop out': '🥄', 'Bake': '🔥', 'Snack': '🍪', 'Draw': '✏️', 'Inside': '🔍',
  'Celebrate': '🎉', 'Light candles': '🕯️', 'Share': '🤝', 'Gift': '🎁',
  'Make crafts': '🎨', 'Eat a feast': '🍽️', 'Build': '🏗️', 'Bell tower': '🔔',
  'Take many years': '📅', 'Right away': '⚡', 'Start': '▶️', 'Lean': '📐',
  'Soft ground': '🌱', 'Skinny': '📏', 'Dig': '⛏️', 'Stop': '🛑', 'Rope': '🪢',
  'Weight': '⚖️', 'Safe': '🛡️', 'Remove': '🧹', 'Get in the way': '🚧',
  'Shovel': '🪣', 'Brush': '🧹', 'Snowblower': '❄️', 'Snowplow': '🚛',
  'Salt': '🧂', 'Snow melter': '💧', 'Take away': '🗑️', 'Snow dump': '🏔️',
  'Kitchen': '🍳', 'Muddy tracks': '👣', 'Clean': '🧼', 'Floor': '🏠',
  'Notice': '👀', 'Living room': '🛋️', 'Mop': '🧹', 'Hallway': '🚪',
  'Front door': '🚪', 'Behind': '🙈', 'Mess': '💥', 'Look at': '👁️',
  'Boots': '👢', 'Shake head': '🙅', 'Tend gardens': '🌻', 'Reuse': '♻️',
  'Recycle': '♻️', 'Save water': '💧', 'Electricity': '⚡',
  // Book 58: A Day of Firsts
  'First': '1️⃣', 'First grade': '🏫', 'Pack': '🎒', 'Yummy': '😋',
  'Exciting': '🎉', 'Lunch': '🍱', 'Bus': '🚌', 'Ride': '🛝',
  'Meet': '🤝', 'Teacher': '👩‍🏫', 'Desk': '🪑', 'Learn': '📚',
  'Fun': '🎯', 'Game': '🎮', 'Old friend': '👯',
  // Book 59: All Kinds of Farms
  'Farm': '🌾', 'Cow': '🐄', 'Milk': '🥛', 'Cheese': '🧀',
  'Butter': '🧈', 'Sheep': '🐑', 'Wool': '🧶', 'Chicken': '🐔',
  'Egg': '🥚', 'Breakfast': '🍳', 'Apple': '🍎', 'Fruit': '🍇',
  'Sugarcane': '🎋', 'Sugar': '🍬', 'Sweet': '🍭', 'Cotton': '☁️',
  'Clothing': '👕', 'Shirt': '👔', 'Pants': '👖', 'Socks': '🧦',
  // Book 57: All Kinds of Factories
  'Factory': '🏭', 'Goods': '📦', 'Building': '🏗️', 'Machine': '⚙️',
  'Huge': '🐘', 'Small': '🐜', 'Robot': '🤖', 'Wood': '🪵',
  'Paper': '📄', 'Cloth': '🧵', 'Sand': '🏖️', 'Glass': '🪟',
  'Window': '🪟', 'Part': '🧩', 'Together': '🔗', 'Drive': '🚗',
};

function emojiFor(word: Word): string {
  return WORD_EMOJI[word.word] || '📖';
}

interface FlashcardProps {
  word: Word;
  index: number;
  /** 翻面后是否显示图片 */
  showImage: boolean;
  /** 受控翻面状态；不传则内部自管 */
  flipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  onSwipe?: (direction: 'left' | 'right') => void;
}

export default function Flashcard({
  word, index, showImage, flipped: flippedProp, onFlip, onSwipe,
}: FlashcardProps) {
  const [flippedState, setFlippedState] = useState(false);
  const flipped = flippedProp ?? flippedState;

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const isLocalImg = word.imageUrl?.startsWith('images/');
  const hasImage = Boolean(word.imageUrl && word.imageStatus === 'ready');
  const cardColor = getCardColor(index);

  useEffect(() => {
    setImgLoaded(false);
    setImgFailed(false);
    // 本地图片同域必达，不需要超时；外链图片加个兜底
    if (!isLocalImg) {
      const timer = setTimeout(() => {
        setImgLoaded(l => { if (!l) setImgFailed(true); return l; });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [word.id, isLocalImg]);

  const showImg = showImage && hasImage && !imgFailed;
  const example = word.example || word.phrase;

  const toggleFlip = () => {
    const next = !flipped;
    setFlippedState(next);
    onFlip?.(next);
  };

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

  return (
    <div
      className={`relative w-full max-w-sm mx-auto h-96 rounded-3xl shadow-lg cursor-pointer select-none flashcard-flip ${flipped ? 'flashcard-flipped' : ''}`}
      onClick={toggleFlip}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flashcard-inner relative w-full h-full">
        {/* 正面：单词 + 例句（不给图片/emoji，避免直接泄露意思）*/}
        <div className={`flashcard-front absolute inset-0 rounded-3xl ${cardColor} flex flex-col items-center justify-center p-6`}>
          <h2 className="text-4xl font-bold text-gray-800 text-center leading-tight">
            {word.word}
          </h2>
          {example && (
            <p className="mt-5 text-lg text-gray-700 text-center leading-relaxed bg-white/50 rounded-2xl px-4 py-3">
              {example}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-6">点击看中文 →</p>
        </div>

        {/* 背面：中文 + 图片 */}
        <div className="flashcard-back absolute inset-0 rounded-3xl bg-white flex flex-col items-center justify-center p-6 border-2 border-gray-100">
          <h2 className="text-2xl font-bold text-kid-primary mb-1">{word.word}</h2>
          {word.chinese && (
            <p className="text-3xl font-bold text-gray-800 text-center mb-4">{word.chinese}</p>
          )}

          {showImg ? (
            <div className="relative w-full flex-1 max-h-44 rounded-2xl overflow-hidden">
              {/* emoji 占位，图片加载好后被盖住 */}
              <div className={`absolute inset-0 ${cardColor} flex items-center justify-center`}>
                <span className="text-5xl">{emojiFor(word)}</span>
              </div>
              <img
                src={word.imageUrl}
                alt={word.word}
                className={`relative w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgFailed(true)}
              />
            </div>
          ) : (
            <div className={`w-32 h-32 rounded-full ${cardColor} flex items-center justify-center mb-2 border-4 border-white/50`}>
              <span className="text-5xl">{emojiFor(word)}</span>
            </div>
          )}

          <p className="text-sm text-gray-400 mt-4">点击翻转 ←</p>
        </div>
      </div>
    </div>
  );
}
