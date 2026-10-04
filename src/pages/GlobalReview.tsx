import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllDueWords, getAllLessons, recordReview, upsertDailyLog,
} from '../db/database';
import Flashcard from '../components/Flashcard';
import { calcNextReview } from '../utils/spaced-repetition';
import { todayISO } from '../utils/date';
import type { Word, WordProgress, MasteryLevel, ReviewOutcome } from '../types';

/** 一次复习最多做多少个词 —— 小朋友注意力有限，剩下的下次继续 */
const SESSION_SIZE = 15;

export default function GlobalReview() {
  const navigate = useNavigate();

  const [items, setItems] = useState<{ word: Word; progress?: WordProgress }[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [lessonNames, setLessonNames] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showImage, setShowImage] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [startTime] = useState(Date.now());
  const [sessionStats, setSessionStats] = useState({ correct: 0, unknown: 0, wrong: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [due, lessons] = await Promise.all([getAllDueWords(), getAllLessons()]);
      const map: Record<number, string> = {};
      for (const l of lessons) map[l.id!] = l.name;
      setLessonNames(map);
      setRemaining(Math.max(0, due.length - SESSION_SIZE));
      setItems(due.slice(0, SESSION_SIZE));
      setLoading(false);
    };
    load();
  }, []);

  const handleResult = useCallback(async (result: ReviewOutcome) => {
    const item = items[currentIndex];
    if (!item) return;

    const currentLevel: MasteryLevel = item.progress?.masteryLevel ?? 0;
    const { nextReviewDate, masteryLevel } = calcNextReview(currentLevel, result);

    await recordReview({
      wordId: item.word.id!,
      lessonId: item.word.lessonId,
      date: todayISO(),
      result,
      progress: {
        masteryLevel,
        reviewCount: (item.progress?.reviewCount ?? 0) + 1,
        correctCount: (item.progress?.correctCount ?? 0) + (result === 'correct' ? 1 : 0),
        wrongCount: (item.progress?.wrongCount ?? 0) + (result === 'wrong' ? 1 : 0),
        lastReviewed: new Date(),
        nextReviewDate,
      },
    });

    const nextStats = {
      correct: sessionStats.correct + (result === 'correct' ? 1 : 0),
      unknown: sessionStats.unknown + (result === 'unknown' ? 1 : 0),
      wrong: sessionStats.wrong + (result === 'wrong' ? 1 : 0),
    };
    setSessionStats(nextStats);

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    } else {
      await upsertDailyLog({
        date: todayISO(),
        lessonId: 0, // 0 = 综合复习（跨课程）
        wordsReviewed: items.length,
        wordsCorrect: nextStats.correct,
        wordsWrong: nextStats.wrong + nextStats.unknown,
        durationMinutes: Math.max(1, Math.round((Date.now() - startTime) / 60000)),
      });
      setDone(true);
    }
  }, [currentIndex, items, sessionStats, startTime]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center pb-20">
        <div className="text-gray-400 animate-pulse">加载中...</div>
      </div>
    );
  }

  if (done || items.length === 0) {
    const total = sessionStats.correct + sessionStats.unknown + sessionStats.wrong;
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 pb-20">
        <span className="text-6xl mb-4">{items.length === 0 ? '😌' : '🎉'}</span>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {items.length === 0 ? '今天没有要复习的词' : '复习完成！'}
        </h2>

        {total > 0 && (
          <div className="flex gap-5 mb-4 mt-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-kid-success">{sessionStats.correct}</div>
              <div className="text-xs text-gray-500">认识</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-kid-secondary">{sessionStats.unknown}</div>
              <div className="text-xs text-gray-500">不确定</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-kid-danger">{sessionStats.wrong}</div>
              <div className="text-xs text-gray-500">不认识</div>
            </div>
          </div>
        )}

        {remaining > 0 && (
          <p className="text-sm text-gray-500 mb-6">还有 {remaining} 个词等着，下次接着来 💪</p>
        )}

        <button
          onClick={() => navigate('/')}
          className="bg-kid-primary text-white px-8 py-3 rounded-xl font-medium hover:opacity-90"
        >
          回首页
        </button>
      </div>
    );
  }

  const current = items[currentIndex];
  const sourceLesson = lessonNames[current.word.lessonId];

  return (
    <div className="h-full flex flex-col pb-6">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between max-w-md mx-auto mb-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium"
          >
            ← 退出
          </button>
          <span className="text-sm font-medium text-gray-500">
            {currentIndex + 1} / {items.length}
            {remaining > 0 && <span className="text-gray-300"> · 还有 {remaining}</span>}
          </span>
          <button
            onClick={() => setShowImage(!showImage)}
            className={`text-sm font-medium ${showImage ? 'text-kid-primary' : 'text-gray-400'}`}
          >
            {showImage ? '🖼 图片' : '🙈 隐藏'}
          </button>
        </div>

        <div className="max-w-md mx-auto">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-kid-primary rounded-full transition-all duration-300"
              style={{ width: `${(currentIndex / items.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {sourceLesson && (
          <p className="text-xs text-gray-400 mb-3">📖 {sourceLesson}</p>
        )}
        <Flashcard
          word={current.word}
          index={currentIndex}
          showImage={showImage}
          flipped={flipped}
          onFlip={setFlipped}
        />
      </div>

      <div className="px-4 pt-4">
        {flipped ? (
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
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="w-full max-w-md mx-auto block bg-kid-primary text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 active:scale-95"
          >
            看中文 →
          </button>
        )}
      </div>
    </div>
  );
}
