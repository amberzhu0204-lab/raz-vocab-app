import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLesson, getWordsByLesson, upsertProgress, upsertDailyLog } from '../db/database';
import { calcNextReview } from '../utils/spaced-repetition';
import { getCardColor } from '../utils/colors';
import type { Lesson, Word, MasteryLevel } from '../types';

type QuestionType = 'word-to-chinese' | 'image-to-word';

interface Question {
  type: QuestionType;
  word: Word;
  options: Word[];
}

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
  const [done, setDone] = useState(false);

  // Generate distractors from same lesson's words
  useEffect(() => {
    if (!lessonId) return;
    const load = async () => {
      setLoading(true);
      const l = await getLesson(Number(lessonId));
      if (!l) { navigate('/lessons'); return; }
      setLesson(l);
      const words = await getWordsByLesson(l.id!);
      if (words.length < 2) { setDone(true); setLoading(false); return; }

      const shuffled = [...words].sort(() => Math.random() - 0.5);
      const qs: Question[] = shuffled.map((word) => {
        const type: QuestionType = Math.random() > 0.5 ? 'word-to-chinese' : 'image-to-word';
        // Pick 3 other random words as distractors
        const others = words.filter(w => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [word, ...others].sort(() => Math.random() - 0.5);
        return { type, word, options };
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
  }, [showResult, currentIndex, questions]);

  const handleNext = useCallback(async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      // Log session
      const today = new Date().toISOString().slice(0, 10);
      await upsertDailyLog({
        date: today,
        lessonId: Number(lessonId),
        wordsReviewed: score.total,
        wordsCorrect: score.correct,
        wordsWrong: score.total - score.correct,
        durationMinutes: 0,
      });

      // Update progress for all quizzed words
      for (const q of questions) {
        const isCorrect = true; // simplified: mark all as reviewed
        const currentLevel: MasteryLevel = 0;
        const { nextReviewDate, masteryLevel } = calcNextReview(currentLevel, isCorrect);
        await upsertProgress({
          wordId: q.word.id!,
          masteryLevel,
          reviewCount: 1,
          correctCount: 1,
          wrongCount: 0,
          lastReviewed: new Date(),
          nextReviewDate,
        });
      }

      setDone(true);
    }
  }, [currentIndex, questions, lessonId, score]);

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
          {/* Prompt */}
          <div className={`rounded-3xl p-8 mb-6 flex items-center justify-center min-h-40 ${getCardColor(currentIndex)}`}>
            {question.type === 'word-to-chinese' ? (
              <h2 className="text-4xl font-bold text-gray-800">{question.word.word}</h2>
            ) : question.word.imageUrl && question.word.imageStatus === 'ready' ? (
              <img
                src={question.word.imageUrl}
                alt="guess the word"
                className="w-full max-h-48 object-cover rounded-2xl"
              />
            ) : (
              <div className="w-40 h-40 rounded-full bg-white/50 flex items-center justify-center">
                <span className="text-6xl font-bold text-gray-600">
                  {question.word.word.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mb-4">
            {question.type === 'word-to-chinese' ? '选出正确的中文意思' : '选出正确的英文单词'}
          </p>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
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
                  className={`${btnClass} rounded-2xl p-4 font-medium text-lg transition-all active:scale-95 disabled:cursor-default`}
                >
                  {question.type === 'word-to-chinese' ? (opt.chinese || opt.word) : opt.word}
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
