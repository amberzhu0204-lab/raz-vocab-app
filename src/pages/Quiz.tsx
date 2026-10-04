import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getLesson, getWordsByLesson, getWordProgress, recordReview, upsertDailyLog,
} from '../db/database';
import { calcNextReview } from '../utils/spaced-repetition';
import { getCardColor } from '../utils/colors';
import { todayISO } from '../utils/date';
import type { Lesson, Word, MasteryLevel, ReviewOutcome } from '../types';

interface Question {
  word: Word;
  options: Word[];
}

/** 能出题的前提是有中文意思 —— 没中文就没法「选中文」 */
const meaningOf = (w: Word) => w.chinese?.trim() || '';
const hasMeaning = (w: Word) => Boolean(meaningOf(w));

export default function Quiz() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();

  const [, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [results, setResults] = useState<ReviewOutcome[]>([]);
  const [done, setDone] = useState(false);

  // Generate distractors from same lesson's words
  useEffect(() => {
    if (!lessonId) return;
    const load = async () => {
      setLoading(true);
      const l = await getLesson(Number(lessonId));
      if (!l) { navigate('/lessons'); return; }
      setLesson(l);
      const words = (await getWordsByLesson(l.id!)).filter(hasMeaning);
      if (words.length < 2) { setDone(true); setLoading(false); return; }

      const shuffled = [...words].sort(() => Math.random() - 0.5);
      const qs: Question[] = shuffled.map((word) => {
        // 干扰项：同课里另外三个意思不同的词。
        // 按中文去重 —— 否则会出现两个一模一样的选项（比如两本书都收过「n. 象」）。
        const seen = new Set([meaningOf(word)]);
        const others: Word[] = [];
        for (const w of [...words].sort(() => Math.random() - 0.5)) {
          const zh = meaningOf(w);
          if (w.id === word.id || seen.has(zh)) continue;
          seen.add(zh);
          others.push(w);
          if (others.length === 3) break;
        }
        const options = [word, ...others].sort(() => Math.random() - 0.5);
        return { word, options };
      });

      setQuestions(qs);
      setLoading(false);
    };
    load();
  }, [lessonId, navigate]);

  const handleAnswer = useCallback((optionIndex: number) => {
    if (showResult) return;
    setSelected(optionIndex);
    setShowResult(true);

    const question = questions[currentIndex];
    const isCorrect = question.options[optionIndex].id === question.word.id;
    if (isCorrect) setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    setScore(prev => ({ ...prev, total: prev.total + 1 }));
    setResults(prev => [...prev, isCorrect ? 'correct' : 'wrong']);
  }, [showResult, currentIndex, questions]);

  const handleNext = useCallback(async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      const today = todayISO();
      await upsertDailyLog({
        date: today,
        lessonId: Number(lessonId),
        wordsReviewed: score.total,
        wordsCorrect: score.correct,
        wordsWrong: score.total - score.correct,
        durationMinutes: 0,
      });

      // 按每题实际对错更新进度，且保留已有的复习次数和等级
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const outcome: ReviewOutcome = results[i] ?? 'unknown';
        const existing = await getWordProgress(q.word.id!);
        const currentLevel: MasteryLevel = existing?.masteryLevel ?? 0;
        const { nextReviewDate, masteryLevel } = calcNextReview(currentLevel, outcome);

        await recordReview({
          wordId: q.word.id!,
          lessonId: q.word.lessonId,
          date: today,
          result: outcome,
          progress: {
            masteryLevel,
            reviewCount: (existing?.reviewCount ?? 0) + 1,
            correctCount: (existing?.correctCount ?? 0) + (outcome === 'correct' ? 1 : 0),
            wrongCount: (existing?.wrongCount ?? 0) + (outcome === 'wrong' ? 1 : 0),
            lastReviewed: new Date(),
            nextReviewDate,
          },
        });
      }

      setDone(true);
    }
  }, [currentIndex, questions, lessonId, score, results]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">加载中...</div>
      </div>
    );
  }

  if (done || questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 pb-20">
        <span className="text-6xl mb-4">{score.correct === score.total ? '🏆' : '⭐'}</span>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">测验完成！</h2>
        <p className="text-4xl font-bold text-kid-primary mb-2">
          {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
        </p>
        <p className="text-gray-500 mb-6">
          {score.correct} / {score.total} 正确
        </p>
        <button
          onClick={() => navigate('/lessons')}
          className="bg-kid-primary text-white px-8 py-3 rounded-xl font-medium hover:opacity-90"
        >
          返回课程
        </button>
      </div>
    );
  }

  const question = questions[currentIndex];

  return (
    <div className="h-full flex flex-col pb-20">
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
            {currentIndex + 1} / {questions.length}
          </span>
          <span className="text-sm font-medium text-kid-success">
            ✓ {score.correct}
          </span>
        </div>
        <div className="max-w-md mx-auto">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-kid-accent-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* 题目一律是「给英文单词」 */}
          <div className={`rounded-3xl p-8 mb-6 flex flex-col items-center justify-center min-h-40 ${getCardColor(currentIndex)}`}>
            <h2 className="text-4xl font-bold text-gray-800">{question.word.word}</h2>
            {(question.word.example || question.word.phrase) && (
              <p className="text-sm text-gray-600 mt-3 text-center">{question.word.example || question.word.phrase}</p>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mb-4">选出正确的中文意思</p>

          {/* Options —— 中文释义比英文长，单列才看得清 */}
          <div className="grid grid-cols-1 gap-2.5">
            {question.options.map((opt, idx) => {
              const isSelected = selected === idx;
              const isCorrect = opt.id === question.word.id;
              let btnClass = 'bg-white border-2 border-gray-200 text-gray-700';

              if (showResult) {
                if (isCorrect) {
                  btnClass = 'bg-green-100 border-2 border-green-400 text-green-700';
                } else if (isSelected && !isCorrect) {
                  btnClass = 'bg-red-100 border-2 border-red-400 text-red-700';
                }
              } else if (isSelected) {
                btnClass = 'bg-indigo-50 border-2 border-kid-primary text-kid-primary';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={showResult}
                  className={`${btnClass} rounded-2xl p-4 font-medium text-base leading-snug transition-all active:scale-95 disabled:cursor-default`}
                >
                  {opt.chinese}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Next button */}
      {showResult && (
        <div className="px-4 pt-2">
          <button
            onClick={handleNext}
            className="w-full max-w-md mx-auto block bg-kid-primary text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 active:scale-95"
          >
            {currentIndex < questions.length - 1 ? '下一题 →' : '查看结果 🎉'}
          </button>
        </div>
      )}
    </div>
  );
}
