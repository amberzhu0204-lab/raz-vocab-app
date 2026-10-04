import { useNavigate } from 'react-router-dom';
import { useLessons } from '../hooks/useLessons';
import { getLessonProgress } from '../db/database';
import { useEffect, useMemo, useState } from 'react';
import type { WordProgress } from '../types';
import { MASTERED_LEVEL } from '../types';
import { groupByLevel } from '../utils/catalog';

export default function Lessons() {
  const { lessons, loading, remove } = useLessons();
  const [progressMap, setProgressMap] = useState<Record<number, WordProgress[]>>({});
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const map: Record<number, WordProgress[]> = {};
      for (const l of lessons) {
        map[l.id!] = await getLessonProgress(l.id!);
      }
      setProgressMap(map);
    };
    if (lessons.length > 0) load();
  }, [lessons]);

  const groups = useMemo(() => {
    const shown = filter
      ? lessons.filter(l => l.level === filter)
      : lessons;
    return groupByLevel(shown);
  }, [lessons, filter]);

  const levels = useMemo(
    () => [...new Set(lessons.map(l => l.level).filter(Boolean))].sort() as string[],
    [lessons]
  );

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
        <h1 className="text-2xl font-bold text-gray-800 mb-4">📚 读过的书</h1>

        {lessons.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">📭</span>
            <p className="text-gray-500 mb-4">还没有记录任何书</p>
            <button
              onClick={() => navigate('/today')}
              className="bg-kid-primary text-white px-6 py-3 rounded-xl font-medium"
            >
              去记一笔
            </button>
          </div>
        ) : (
          <>
            {levels.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                <button
                  onClick={() => setFilter('')}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold ${
                    filter === '' ? 'bg-kid-primary text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  全部
                </button>
                {levels.map(lv => (
                  <button
                    key={lv}
                    onClick={() => setFilter(lv)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold ${
                      filter === lv ? 'bg-kid-primary text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {lv} 级
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-6">
              {groups.map(([level, items]) => (
                <div key={level}>
                  <h2 className="text-sm font-bold text-gray-500 mb-2 px-1">
                    {level === '未分类' ? '未分类' : `RAZ ${level} 级`}
                    <span className="font-normal text-gray-400 ml-2">{items.length} 本</span>
                  </h2>
                  <div className="space-y-3">
                    {items.map((lesson) => {
                      const progress = progressMap[lesson.id!] || [];
                      const mastered = progress.filter(p => p.masteryLevel === MASTERED_LEVEL).length;
                      const pct = lesson.wordCount > 0 ? Math.round((mastered / lesson.wordCount) * 100) : 0;

                      return (
                        <div key={lesson.id} className="bg-white rounded-2xl p-5 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-800">
                                {lesson.bookNumber ? `第${lesson.bookNumber}本` : lesson.name}
                                {lesson.bookNumber && lesson.title ? ` · ${lesson.title}` : ''}
                              </h3>
                              {lesson.description && (
                                <p className="text-sm text-gray-500 mt-1">{lesson.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {lesson.wordCount} 个单词 · {mastered} 已掌握
                              </p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); remove(lesson.id!); }}
                              className="text-gray-300 hover:text-kid-danger text-sm ml-2 shrink-0"
                            >
                              🗑
                            </button>
                          </div>

                          {lesson.wordCount > 0 && (
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                              <div
                                className="h-full bg-kid-success rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/lesson/${lesson.id}/review`)}
                              disabled={lesson.wordCount === 0}
                              className="flex-1 bg-kid-primary text-white py-2 rounded-xl text-sm font-medium disabled:opacity-30 hover:opacity-90"
                            >
                              📖 复习
                            </button>
                            <button
                              onClick={() => navigate(`/lesson/${lesson.id}/quiz`)}
                              disabled={lesson.wordCount === 0}
                              className="flex-1 bg-kid-accent-2 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-30 hover:opacity-90"
                            >
                              ✏️ 测验
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
