import { useEffect, useState } from 'react';
import { useAllProgress } from '../hooks/useProgress';
import {
  db, getReviewLogs, getReadingLogs, getAllLessons,
} from '../db/database';
import StatsCard from '../components/StatsCard';
import {
  MASTERY_LEVELS, MASTERY_LABELS, MASTERY_BAR_COLORS, MASTERED_LEVEL, OUTCOME_LABELS,
} from '../types';
import { formatDateCN } from '../utils/date';
import { shortLessonLabel } from '../utils/catalog';
import type { ReviewLog, ReadingLog, Word, Lesson } from '../types';

interface DayGroup {
  date: string;
  books: { name: string; lessonId: number; bookNumber?: number }[];
  reviewed: number;
  correct: number;
}

export default function Records() {
  const { progress, loading: progLoading } = useAllProgress();
  const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>([]);
  const [readingLogs, setReadingLogs] = useState<ReadingLog[]>([]);
  const [wordMap, setWordMap] = useState<Record<number, Word>>({});
  const [lessonMap, setLessonMap] = useState<Record<number, Lesson>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [logs, readings, words, lessons] = await Promise.all([
        getReviewLogs(1000),
        getReadingLogs(90),
        db.words.toArray(),
        getAllLessons(),
      ]);
      setReviewLogs(logs);
      setReadingLogs(readings);
      setWordMap(Object.fromEntries(words.map(w => [w.id!, w])));
      setLessonMap(Object.fromEntries(lessons.map(l => [l.id!, l])));
      setLoading(false);
    };
    load();
  }, []);

  if (loading || progLoading) {
    return (
      <div className="h-full flex items-center justify-center pb-20">
        <div className="text-gray-400 animate-pulse">加载中...</div>
      </div>
    );
  }

  const mastered = progress.filter(p => p.masteryLevel === MASTERED_LEVEL).length;
  const totalReviewed = progress.filter(p => p.reviewCount > 0).length;
  const totalCorrect = reviewLogs.filter(l => l.result === 'correct').length;
  const avgAccuracy = reviewLogs.length > 0 ? Math.round((totalCorrect / reviewLogs.length) * 100) : 0;

  // 按日期归并「读了哪本书」+「复习了多少」
  const dayMap = new Map<string, DayGroup>();
  const ensureDay = (date: string): DayGroup => {
    if (!dayMap.has(date)) dayMap.set(date, { date, books: [], reviewed: 0, correct: 0 });
    return dayMap.get(date)!;
  };
  for (const r of readingLogs) {
    const day = ensureDay(r.date);
    const lesson = lessonMap[r.lessonId];
    const name = lesson && shortLessonLabel(lesson);
    if (name && !day.books.some(b => b.lessonId === r.lessonId)) {
      day.books.push({ name, lessonId: r.lessonId, bookNumber: lesson?.bookNumber });
    }
  }
  for (const l of reviewLogs) {
    const day = ensureDay(l.date);
    day.reviewed += 1;
    if (l.result === 'correct') day.correct += 1;
  }
  // 同一天里按册号从小到大排
  for (const day of dayMap.values()) {
    day.books.sort((a, b) => (a.bookNumber || 0) - (b.bookNumber || 0));
  }
  const days = [...dayMap.values()].sort((a, b) => b.date.localeCompare(a.date));

  const recentReviews = reviewLogs.slice(0, 30);

  return (
    <div className="h-full overflow-y-auto pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">📊 学习记录</h1>

        {/* 总览 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatsCard icon="🔄" value={reviewLogs.length} label="总复习次数" color="bg-kid-accent-2" />
          <StatsCard icon="⭐" value={mastered} label="已掌握单词" color="bg-kid-success" />
          <StatsCard icon="📝" value={totalReviewed} label="已复习单词" color="bg-kid-accent-3" />
          <StatsCard icon="🎯" value={`${avgAccuracy}%`} label="正确率" color="bg-kid-primary" />
        </div>

        {/* 掌握分布 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <h3 className="font-bold text-gray-800 mb-3">掌握分布</h3>
          {progress.length === 0 ? (
            <p className="text-sm text-gray-400">还没有复习记录</p>
          ) : (
            <>
              <div className="flex w-full h-3 rounded-full overflow-hidden mb-4">
                {MASTERY_LEVELS.map(level => {
                  const count = progress.filter(p => p.masteryLevel === level).length;
                  if (count === 0) return null;
                  return (
                    <div
                      key={level}
                      className={MASTERY_BAR_COLORS[level]}
                      style={{ width: `${(count / progress.length) * 100}%` }}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-y-2">
                {MASTERY_LEVELS.map(level => {
                  const count = progress.filter(p => p.masteryLevel === level).length;
                  return (
                    <div key={level} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${MASTERY_BAR_COLORS[level]}`} />
                      <span className="text-xs text-gray-600">{MASTERY_LABELS[level]}</span>
                      <span className="text-xs font-bold text-gray-800">{count}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                答对升一级：1 → 2 → 4 → 7 → 15 → 30 天
              </p>
            </>
          )}
        </div>

        {/* 每日记录 */}
        <h2 className="text-lg font-bold text-gray-800 mb-3">📅 每日记录</h2>
        {days.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl mb-6">
            <span className="text-4xl block mb-2">📭</span>
            <p className="text-gray-500 text-sm">还没有学习记录</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {days.map(day => {
              const expanded = expandedDate === day.date;
              const dayReviews = expanded
                ? reviewLogs.filter(l => l.date === day.date)
                : [];
              return (
                <div key={day.date} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedDate(expanded ? null : day.date)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-gray-800">{formatDateCN(day.date)}</p>
                      <span className="text-xs text-gray-400">
                        {day.reviewed > 0
                          ? `${day.reviewed} 词 · ${Math.round((day.correct / day.reviewed) * 100)}%`
                          : '无复习'}
                      </span>
                    </div>
                    {day.books.length > 0 ? (
                      <p className="text-xs text-gray-500 truncate">
                        📖 读了 {day.books.map(b => b.name).join('、')}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-300">— 没有阅读记录</p>
                    )}
                  </button>

                  {expanded && dayReviews.length > 0 && (
                    <div className="border-t border-gray-50 px-4 py-3 space-y-1.5 bg-gray-50/50">
                      {dayReviews.map(r => (
                        <div key={r.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700 font-medium">
                            {wordMap[r.wordId]?.word || '(已删除)'}
                          </span>
                          <span className={
                            r.result === 'correct' ? 'text-kid-success' :
                            r.result === 'unknown' ? 'text-kid-secondary' : 'text-kid-danger'
                          }>
                            {OUTCOME_LABELS[r.result]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 最近复习明细 */}
        {recentReviews.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-3">🔍 最近复习</h2>
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
              {recentReviews.map(r => (
                <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {wordMap[r.wordId]?.word || '(已删除)'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {lessonMap[r.lessonId] ? shortLessonLabel(lessonMap[r.lessonId]) : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`text-xs font-medium ${
                      r.result === 'correct' ? 'text-kid-success' :
                      r.result === 'unknown' ? 'text-kid-secondary' : 'text-kid-danger'
                    }`}>
                      {OUTCOME_LABELS[r.result]}
                    </p>
                    <p className="text-xs text-gray-300">{formatTime(r.reviewedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatTime(d: Date | string): string {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}
