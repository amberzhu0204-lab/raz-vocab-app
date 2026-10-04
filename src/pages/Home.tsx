import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getTotalStats, getAllDueWords, getReadingLogsByDate, getReviewLogsByDate, getLesson,
} from '../db/database';
import StatsCard from '../components/StatsCard';
import { todayISO, formatDateCN } from '../utils/date';
import { formatLessonName, formatLessonTitle } from '../utils/catalog';
import type { Lesson } from '../types';

export default function Home() {
  const [stats, setStats] = useState({ totalLessons: 0, totalWords: 0, masteredWords: 0, reviewedWords: 0 });
  const [dueCount, setDueCount] = useState(0);
  const [todayBooks, setTodayBooks] = useState<
    { label: string; title: string; wordCount: number; lessonId: number }[]
  >([]);
  const [todayReviewed, setTodayReviewed] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const today = todayISO();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [s, due, logs, reviewLogs] = await Promise.all([
        getTotalStats(),
        getAllDueWords(),
        getReadingLogsByDate(today),
        getReviewLogsByDate(today),
      ]);
      setStats(s);
      setDueCount(due.length);
      setTodayReviewed(reviewLogs.length);

      const books: { label: string; title: string; wordCount: number; lessonId: number }[] = [];
      for (const log of logs) {
        const lesson: Lesson | undefined = await getLesson(log.lessonId);
        if (lesson) {
          books.push({
            label: formatLessonName(lesson),
            title: formatLessonTitle(lesson),
            wordCount: lesson.wordCount,
            lessonId: lesson.id!,
          });
        }
      }
      setTodayBooks(books);
      setLoading(false);
    };
    load();
  }, [today]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center pb-20">
        <div className="text-gray-400 animate-pulse">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">RAZ 单词复习</h1>
        <p className="text-sm text-gray-500 mb-5">{formatDateCN(today)}</p>

        {/* 今日复习 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-4">
          {dueCount > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">📌 今天要复习</p>
                  <p className="text-4xl font-bold text-kid-primary">
                    {dueCount}
                    <span className="text-base font-medium text-gray-400 ml-1">个词</span>
                  </p>
                </div>
                <span className="text-5xl">📚</span>
              </div>
              <button
                onClick={() => navigate('/review')}
                className="w-full bg-kid-primary text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all"
              >
                开始复习
              </button>
            </>
          ) : (
            <div className="text-center py-2">
              <span className="text-5xl block mb-2">🎉</span>
              <p className="font-bold text-gray-800 mb-1">今天的复习都做完了</p>
              <p className="text-xs text-gray-400">明天见 👋</p>
            </div>
          )}
        </div>

        {/* 今日阅读 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-4">
          <p className="text-sm text-gray-500 mb-3">📖 今天读了什么书？</p>

          {todayBooks.length > 0 ? (
            <div className="space-y-2 mb-4">
              {todayBooks.map(b => (
                <button
                  key={b.lessonId}
                  onClick={() => navigate(`/lesson/${b.lessonId}/review`)}
                  className="w-full flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3 text-left active:scale-[0.98] transition-transform"
                >
                  <span className="min-w-0 mr-2">
                    <span className="font-medium text-gray-800 text-sm block truncate">{b.label}</span>
                    {b.title && <span className="text-xs text-gray-500 block truncate">{b.title}</span>}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {b.wordCount > 0 ? `${b.wordCount} 个词` : '无生词'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-4">还没记录，读完后记一笔吧</p>
          )}

          <button
            onClick={() => navigate('/today')}
            className="w-full bg-kid-secondary text-white py-3 rounded-2xl font-medium hover:opacity-90 active:scale-95 transition-all"
          >
            {todayBooks.length > 0 ? '＋ 再记一本' : '＋ 记一笔'}
          </button>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatsCard icon="📝" value={stats.totalWords} label="总单词" color="bg-kid-accent-2" />
          <StatsCard icon="✅" value={stats.masteredWords} label="已掌握" color="bg-kid-success" />
          <StatsCard icon="🔄" value={todayReviewed} label="今日已复习" color="bg-kid-accent-3" />
        </div>

        {/* 快捷入口 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/lessons')}
            className="bg-white rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow"
          >
            <span className="text-3xl">📚</span>
            <h3 className="font-bold text-gray-800 mt-2">所有课程</h3>
            <p className="text-xs text-gray-500 mt-1">{stats.totalLessons} 本书</p>
          </button>
          <button
            onClick={() => navigate('/records')}
            className="bg-white rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow"
          >
            <span className="text-3xl">📊</span>
            <h3 className="font-bold text-gray-800 mt-2">学习记录</h3>
            <p className="text-xs text-gray-500 mt-1">已复习 {stats.reviewedWords} 词</p>
          </button>
        </div>
      </div>
    </div>
  );
}
