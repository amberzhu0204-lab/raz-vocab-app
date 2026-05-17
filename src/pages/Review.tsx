import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLesson, getDueWords, upsertProgress, upsertDailyLog } from '../db/database';
import Flashcard from '../components/Flashcard';
import { calcNextReview } from '../utils/spaced-repetition';
import type { Lesson, Word, WordProgress, MasteryLevel } from '../types';

export default function Review() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();

  const [, setLesson] = useState<Lesson | null>(null);
  const [items, setItems] = useState<{ word: Word; progress?: WordProgress }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showImage, setShowImage] = useState(true);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [startTime] = useState(Date.now());
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, unknown: 0 });

  useEffect(() => {
    if (!lessonId) return;
    const load = async () => {
      setLoading(true);
      const l = await getLesson(Number(lessonId));
      if (!l) { navigate('/lessons'); return; }
      setLesson(l);
      const due = await getDueWords(l.id!);
      setItems(due);
      setLoading(false);
    };
    load();
  }, [lessonId, navigate]);

  const handleResult = useCallback(async (result: 'correct' | 'wrong' | 'unknown') => {
    const item = items[currentIndex];
    if (!item) return;

    const currentLevel: MasteryLevel = item.progress?.masteryLevel ?? 0;
    const { nextReviewDate, masteryLevel } = calcNextReview(
      currentLevel,
      result === 'correct'
    );

    await upsertProgress({
      wordId: item.word.id!,
      masteryLevel,
      reviewCount: (item.progress?.reviewCount ?? 0) + 1,
      correctCount: (item.progress?.correctCount ?? 0) + (result === 'correct' ? 1 : 0),
      wrongCount: (item.progress?.wrongCount ?? 0) + (result === 'wrong' ? 1 : 0),
      lastReviewed: new Date(),
      nextReviewDate,
    });

    setSessionStats(prev => ({
      correct: prev.correct + (result === 'correct' ? 1 : 0),
      wrong: prev.wrong + (result === 'wrong' ? 1 : 0),
      unknown: prev.unknown + (result === 'unknown' ? 1 : 0),
    }));

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Log session
      const today = new Date().toISOString().slice(0, 10);
      const duration = Math.round((Date.now() - startTime) / 60000);
      await upsertDailyLog({
        date: today,
        lessonId: Number(lessonId),
        wordsReviewed: items.length,
        wordsCorrect: sessionStats.correct + (result === 'correct' ? 1 : 0),
        wordsWrong: sessionStats.wrong + sessionStats.unknown + (result !== 'correct' ? 1 : 0),
        durationMinutes: duration,
      });
      setDone(true);
    }
  }, [currentIndex, items, lessonId, startTime, sessionStats]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">加载中...</div>
      </div>
    );
  }

  if (done || items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 pb-20">
        <span className="text-6xl mb-4">🎉</span>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {items.length === 0 ? '没有待复习的单词' : '复习完成！'}
        </h2>
        {sessionStats.correct + sessionStats.wrong + sessionStats.unknown > 0 && (
          <div className="flex gap-4 mb-6 mt-2">
            <div className="text-center">
              <div className="text-xl font-bold text-kid-success">{sessionStats.correct}</div>
              <div className="text-xs text-gray-500">认识</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-kid-secondary">{sessionStats.unknown}</div>
              <div className="text-xs text-gray-500">不确定</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-kid-danger">{sessionStats.wrong}</div>
              <div className="text-xs text-gray-500">不认识</div>
            </div>
          </div>
        )}
        <button
          onClick={() => navigate('/lessons')}
          className="bg-kid-primary text-white px-8 py-3 rounded-xl font-medium hover:opacity-90"
        >
          返回课程
        </button>
      </div>
    );
  }

  const current = items[currentIndex];

  return (
    <div className="h-full flex flex-col pb-6">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between max-w-md mx-auto mb-3">
          <button
            onClick={() => navigate('/lessons')}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium"
          >
            ← 返回
          </button>
          <span className="text-sm font-medium text-gray-500">
            {currentIndex + 1} / {items.length}
          </span>
          <button
            onClick={() => setShowImage(!showImage)}
            className={`text-sm font-medium ${showImage ? 'text-kid-primary' : 'text-gray-400'}`}
          >
            {showImage ? '🖼 图片' : '🙈 隐藏'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="max-w-md mx-auto">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-kid-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex) / items.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center px-4">
        <Flashcard
          word={current.word}
          index={currentIndex}
          showImage={showImage}
        />
      </div>

      {/* Action buttons */}
      <div className="px-4 pt-4">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            onClick={() => handleResult('wrong')}
            className="flex-1 bg-red-100 text-red-600 py-4 rounded-2xl font-bold text-lg hover:bg-red-200 transition-colors active:scale-95"
          >
            ✗ 不认识
          </button>
          <button
            onClick={() => handleResult('unknown')}
            className="flex-1 bg-yellow-100 text-yellow-600 py-4 rounded-2xl font-bold text-lg hover:bg-yellow-200 transition-colors active:scale-95"
          >
            ？不确定
          </button>
          <button
            onClick={() => handleResult('correct')}
            className="flex-1 bg-green-100 text-green-600 py-4 rounded-2xl font-bold text-lg hover:bg-green-200 transition-colors active:scale-95"
          >
            ✓ 认识
          </button>
        </div>

        {/* Navigation arrows */}
        <div className="max-w-md mx-auto flex justify-between mt-4">
          <button
            onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-sm font-medium"
          >
            ← 上一张
          </button>
          <button
            onClick={() => currentIndex < items.length - 1 && setCurrentIndex(currentIndex + 1)}
            disabled={currentIndex === items.length - 1}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-sm font-medium"
          >
            下一张 →
          </button>
        </div>
      </div>
    </div>
  );
}
