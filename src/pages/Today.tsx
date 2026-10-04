import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLessons } from '../hooks/useLessons';
import {
  getReadingLogsByDate, addReadingLog, getWordsByLesson, addWord, updateWord,
  seedInitialProgress, getLesson, findOrCreateLessonByBook, findOrCreateLessonByName,
} from '../db/database';
import { loadCatalog } from '../utils/catalog';
import { initialReviewDate } from '../utils/spaced-repetition';
import { todayISO, formatDateCN, addDaysISO } from '../utils/date';
import type { ReadingLog, Lesson, CatalogLevel } from '../types';

interface Row {
  word: string;
  chinese: string;
  example: string;
}

const emptyRow = (): Row => ({ word: '', chinese: '', example: '' });

/** 今天选中的一本书 + 这本书要录的生词 */
interface PickedBook {
  level: string;
  n: number;
  title: string;
  rows: Row[];
}

interface SavedInfo {
  books: { lessonId: number; label: string; added: number; merged: number }[];
  totalAdded: number;
  totalMerged: number;
}

export default function Today() {
  const { lessons, refresh: refreshLessons } = useLessons();
  const navigate = useNavigate();

  const [date, setDate] = useState(todayISO());
  const [catalog, setCatalog] = useState<CatalogLevel[]>([]);
  const [activeLevel, setActiveLevel] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<PickedBook[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<SavedInfo | null>(null);
  const [dayLogs, setDayLogs] = useState<{ log: ReadingLog; lesson?: Lesson }[]>([]);

  useEffect(() => {
    loadCatalog().then(levels => {
      setCatalog(levels);
      if (levels.length > 0) setActiveLevel(levels[0].level);
    });
  }, []);

  const loadDayLogs = useCallback(async () => {
    const logs = await getReadingLogsByDate(date);
    const withLessons = await Promise.all(
      logs.map(async log => ({ log, lesson: await getLesson(log.lessonId) }))
    );
    setDayLogs(withLessons);
  }, [date]);

  useEffect(() => { loadDayLogs(); }, [loadDayLogs]);

  /** 已经建过课的 (级别, 册号)，用来在列表里打勾 */
  const readKeys = useMemo(
    () => new Set(lessons.filter(l => l.level && l.bookNumber).map(l => `${l.level}#${l.bookNumber}`)),
    [lessons]
  );

  const levelBooks = useMemo(() => {
    const lv = catalog.find(l => l.level === activeLevel);
    if (!lv) return [];
    const q = query.trim().toLowerCase();
    return q
      ? lv.books.filter(b => b.title.toLowerCase().includes(q) || String(b.n) === q)
      : lv.books;
  }, [catalog, activeLevel, query]);

  const toggleBook = (n: number, title: string) => {
    setPicked(prev => {
      const at = prev.findIndex(p => p.level === activeLevel && p.n === n);
      if (at >= 0) return prev.filter((_, i) => i !== at);
      return [...prev, { level: activeLevel, n, title, rows: [emptyRow()] }];
    });
  };

  const updateRow = (bookIdx: number, rowIdx: number, patch: Partial<Row>) => {
    setPicked(prev => prev.map((p, i) => (
      i === bookIdx ? { ...p, rows: p.rows.map((r, j) => (j === rowIdx ? { ...r, ...patch } : r)) } : p
    )));
  };

  const totalWords = picked.reduce((sum, p) => sum + p.rows.filter(r => r.word.trim()).length, 0);
  const isBackfill = date !== todayISO();

  const handleSave = async () => {
    setError('');
    if (picked.length === 0 && !customName.trim()) {
      setError('先选一本今天读的书');
      return;
    }

    setSaving(true);
    try {
      const targets: PickedBook[] = [...picked];
      if (customName.trim()) {
        targets.push({ level: '', n: 0, title: customName.trim(), rows: [] });
      }

      const results: SavedInfo['books'] = [];
      for (const book of targets) {
        const lesson = book.level
          ? await findOrCreateLessonByBook({ level: book.level, bookNumber: book.n, title: book.title })
          : await findOrCreateLessonByName(book.title);

        const existingWords = await getWordsByLesson(lesson.id!);
        const byName = new Map(existingWords.map(w => [w.word.toLowerCase(), w]));
        const nextReview = initialReviewDate(date);
        let added = 0;
        let merged = 0;

        for (const row of book.rows.filter(r => r.word.trim())) {
          const key = row.word.trim().toLowerCase();
          const existing = byName.get(key);
          if (existing) {
            await updateWord(existing.id!, {
              chinese: row.chinese.trim() || existing.chinese,
              example: row.example.trim() || existing.example,
            });
            merged += 1;
            continue;
          }
          const wordId = await addWord({
            lessonId: lesson.id!,
            word: row.word.trim(),
            phrase: '',
            example: row.example.trim(),
            chinese: row.chinese.trim(),
            imageUrl: '',
            imageStatus: 'pending',
            learnedDate: date,
          });
          // 当天不考，明天首考
          await seedInitialProgress(wordId, nextReview);
          added += 1;
        }

        await addReadingLog({ date, lessonId: lesson.id! });
        results.push({
          lessonId: lesson.id!,
          label: book.level ? `RAZ ${book.level} 第${book.n}本 · ${book.title}` : book.title,
          added,
          merged,
        });
      }

      await refreshLessons();
      setSaved({
        books: results,
        totalAdded: results.reduce((s, r) => s + r.added, 0),
        totalMerged: results.reduce((s, r) => s + r.merged, 0),
      });
      setPicked([]);
      setCustomName('');
      setShowCustom(false);
      setQuery('');
      await loadDayLogs();
    } catch (e) {
      console.error(e);
      setError('保存出错了，再试一次');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          ✏️ {isBackfill ? '补记阅读' : '记录今天的阅读'}
        </h1>
        <p className="text-sm text-gray-500 mb-5">
          {formatDateCN(date)}
          {isBackfill && <span className="text-gray-400">（不是今天）</span>}
        </p>

        {saved ? (
          <SavedSummary
            info={saved}
            onReview={(lessonId) => navigate(`/lesson/${lessonId}/review?all=1`)}
            onMore={() => setSaved(null)}
          />
        ) : (
          <>
            {/* 日期 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-600">日期</label>
                {isBackfill && (
                  <span className="text-xs font-medium text-kid-secondary bg-orange-50 px-2 py-0.5 rounded-lg">
                    补记以前读的
                  </span>
                )}
              </div>
              <div className="flex gap-2 mb-2">
                {[
                  { label: '今天', days: 0 },
                  { label: '昨天', days: 1 },
                  { label: '前天', days: 2 },
                ].map(q => {
                  const d = addDaysISO(todayISO(), -q.days);
                  return (
                    <button
                      key={q.label}
                      onClick={() => setDate(d)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        date === d ? 'bg-kid-primary text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {q.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value || todayISO())}
                className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
              />
              <p className="text-xs text-gray-400 mt-2">
                想补记更早的，直接在上面选日期 —— 补记的生词按那天算，早就该复习了
              </p>
            </div>

            {/* 选书 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-600">今天读的是</label>
                <span className="text-xs text-gray-400">已选 {picked.length} 本</span>
              </div>

              {/* 级别 */}
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {catalog.map(lv => (
                  <button
                    key={lv.level}
                    onClick={() => { setActiveLevel(lv.level); setQuery(''); }}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      activeLevel === lv.level
                        ? 'bg-kid-primary text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {lv.level} 级
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜书名或册号，如 30 或 Mice"
                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-700 bg-gray-50 mb-3"
              />

              <div className="max-h-72 overflow-y-auto -mx-1 px-1">
                {levelBooks.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">没有匹配的书</p>
                ) : (
                  <div className="space-y-1.5">
                    {levelBooks.map(b => {
                      const isPicked = picked.some(p => p.level === activeLevel && p.n === b.n);
                      const wasRead = readKeys.has(`${activeLevel}#${b.n}`);
                      return (
                        <button
                          key={b.n}
                          onClick={() => toggleBook(b.n, b.title)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                            isPicked ? 'bg-indigo-50 ring-1 ring-kid-primary' : 'bg-gray-50'
                          }`}
                        >
                          <span className={`shrink-0 w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                            isPicked ? 'bg-kid-primary text-white' : 'bg-white text-gray-500'
                          }`}>
                            {isPicked ? '✓' : b.n}
                          </span>
                          <span className="text-sm text-gray-700 truncate flex-1">{b.title}</span>
                          {wasRead && !isPicked && <span className="text-[10px] text-gray-400 shrink-0">已记录</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowCustom(v => !v)}
                className="w-full mt-3 py-2 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 hover:border-kid-primary hover:text-kid-primary"
              >
                {showCustom ? '收起' : '＋ 书单里没有？手动加一本'}
              </button>
              {showCustom && (
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="书名，如 RAZ H 第12本"
                  className="w-full mt-2 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-700 bg-gray-50"
                />
              )}
            </div>

            {/* 每本书的生词（可以完全不填，只记「读过了」） */}
            {picked.map((book, bi) => (
              <div key={`${book.level}-${book.n}`} className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">
                      RAZ {book.level} 第{book.n}本
                    </p>
                    <p className="text-xs text-gray-500 truncate">{book.title}</p>
                  </div>
                  <button
                    onClick={() => toggleBook(book.n, book.title)}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none ml-2 shrink-0"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-2">
                  {book.rows.map((row, ri) => (
                    <div key={ri} className="grid grid-cols-12 gap-1.5">
                      <input
                        type="text"
                        value={row.word}
                        onChange={(e) => updateRow(bi, ri, { word: e.target.value })}
                        placeholder="单词"
                        className="col-span-4 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-700 bg-gray-50"
                      />
                      <input
                        type="text"
                        value={row.chinese}
                        onChange={(e) => updateRow(bi, ri, { chinese: e.target.value })}
                        placeholder="中文"
                        className="col-span-3 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-700 bg-gray-50"
                      />
                      <input
                        type="text"
                        value={row.example}
                        onChange={(e) => updateRow(bi, ri, { example: e.target.value })}
                        placeholder="例句"
                        className="col-span-5 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-700 bg-gray-50"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setPicked(prev => prev.map((p, i) => (
                    i === bi ? { ...p, rows: [...p.rows, emptyRow()] } : p
                  )))}
                  className="w-full mt-2 py-1.5 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 hover:border-kid-primary hover:text-kid-primary"
                >
                  ＋ 加一个词
                </button>
              </div>
            ))}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">{error}</div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || (picked.length === 0 && !customName.trim())}
              className="w-full bg-kid-primary text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all"
            >
              {saving
                ? '保存中...'
                : totalWords > 0
                  ? `保存（${picked.length} 本书，${totalWords} 个词）`
                  : `保存（${picked.length} 本书）`}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              生词可以留空，先记下「今天读了哪几本」也行
            </p>
          </>
        )}

        {/* 当天已记录 */}
        {dayLogs.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-gray-700 mb-2">
              📖 {formatDateCN(date)} 已记录
            </h2>
            <div className="space-y-2">
              {dayLogs.map(({ log, lesson }) => (
                <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {lesson?.level && lesson.bookNumber
                        ? `RAZ ${lesson.level} 第${lesson.bookNumber}本`
                        : lesson?.name || '未知书本'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {lesson?.title || ''} {lesson?.wordCount ? `· ${lesson.wordCount} 个词` : ''}
                    </p>
                  </div>
                  {!!lesson?.wordCount && (
                    <button
                      onClick={() => navigate(`/lesson/${log.lessonId}/review`)}
                      className="text-xs text-kid-primary font-medium px-3 py-1.5 rounded-lg bg-indigo-50 shrink-0 ml-2"
                    >
                      复习
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SavedSummary({
  info, onReview, onMore,
}: { info: SavedInfo; onReview: (lessonId: number) => void; onMore: () => void }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="text-center mb-4">
        <span className="text-5xl block mb-2">🎉</span>
        <h2 className="text-xl font-bold text-gray-800">记好了！</h2>
        <p className="text-sm text-gray-500 mt-1">
          今天读了 {info.books.length} 本书
          {info.totalAdded > 0 && <>，新增 {info.totalAdded} 个生词</>}
          {info.totalMerged > 0 && <>，更新 {info.totalMerged} 个</>}
        </p>
      </div>

      <div className="space-y-2 mb-4">
        {info.books.map(b => (
          <button
            key={b.lessonId}
            onClick={() => onReview(b.lessonId)}
            className="w-full flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3 text-left"
          >
            <span className="text-sm text-gray-700 truncate mr-2">{b.label}</span>
            <span className="text-xs text-gray-500 shrink-0">
              {b.added > 0 ? `+${b.added} 词` : '看一遍'}
            </span>
          </button>
        ))}
      </div>

      {info.totalAdded > 0 && (
        <p className="text-xs text-gray-400 text-center mb-4">
          新词明天第一次复习，之后按 1、2、4、7、15、30 天自动安排
        </p>
      )}

      <button
        onClick={onMore}
        className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200"
      >
        再记一笔
      </button>
    </div>
  );
}
