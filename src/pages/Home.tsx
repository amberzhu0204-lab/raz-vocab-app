import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTotalStats, getDueWords, getAllLessons } from '../db/database';
import StatsCard from '../components/StatsCard';
import type { Word, WordProgress } from '../types';

export default function Home() {
  const [stats, setStats] = useState({ totalLessons: 0, totalWords: 0, masteredWords: 0, reviewedWords: 0 });
  const [dueWords, setDueWords] = useState<{ word: Word; progress?: WordProgress }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getTotalStats().then(setStats);
    // Collect due words across all lessons
    const loadDue = async () => {
      const lessons = await getAllLessons();
      const allDue: { word: Word; progress?: WordProgress }[] = [];
      for (const l of lessons) {
        const due = await getDueWords(l.id!);
        allDue.push(...due);
      }
      setDueWords(allDue.slice(0, 10));
    };
    loadDue();
  }, []);

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  return (
    <div className="h-full overflow-y-auto pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">RAZ 单词复习</h1>
        <p className="text-sm text-gray-500 mb-6">{today}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatsCard icon="📚" value={stats.totalLessons} label="课程数" color="bg-kid-primary" />
          <StatsCard icon="📝" value={stats.totalWords} label="总单词" color="bg-kid-accent-2" />
          <StatsCard icon="✅" value={stats.masteredWords} label="已掌握" color="bg-kid-success" />
          <StatsCard icon="🔄" value={stats.reviewedWords} label="已复习" color="bg-kid-accent-3" />
        </div>

        {/* Due Words */}
        {dueWords.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">📌 待复习单词</h2>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              {dueWords.map(({ word, progress }) => (
                <div key={word.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-medium text-gray-800">{word.word}</span>
                    <span className="text-sm text-gray-400 ml-2">{word.chinese}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {progress?.masteryLevel ? `等级 ${progress.masteryLevel}` : '新'}
                  </span>
                </div>
              ))}
              <button
                onClick={() => navigate('/lessons')}
                className="w-full mt-3 bg-kid-primary text-white py-2 rounded-xl text-sm font-medium hover:opacity-90"
              >
                开始复习
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/lessons')}
            className="bg-white rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow"
          >
            <span className="text-3xl">📖</span>
            <h3 className="font-bold text-gray-800 mt-2">开始学习</h3>
            <p className="text-xs text-gray-500 mt-1">选择课程进入复习</p>
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="bg-white rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow"
          >
            <span className="text-3xl">➕</span>
            <h3 className="font-bold text-gray-800 mt-2">添加单词</h3>
            <p className="text-xs text-gray-500 mt-1">管理课程和词汇</p>
          </button>
        </div>
      </div>
    </div>
  );
}
