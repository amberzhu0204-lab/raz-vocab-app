import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLessons } from '../hooks/useLessons';
import {
  getReadingLogsByDate, addReadingLog, getWordsByLesson, addWord, updateWord,
  seedInitialProgress, getLesson, addLesson,
} from '../db/database';
import { initialReviewDate } from '../utils/spaced-repetition';
import { todayISO, formatDateCN } from '../utils/date';
import type { ReadingLog, Lesson, Word } from '../types';

interface Row {
  word: string;
  chinese: string;
  example: string;
}

const emptyRow = (): Row => ({ word: '', chinese: '', example: '' });

interface SavedInfo {
  lessonId: number;
  lessonName: string;
  added: number;
  merged: number;
}

export default function Today() {
  const { lessons, refresh: refreshLessons } = useLessons();
  const navigate = useNavigate();

  const [date, setDate] = useState(todayISO());
  const [bookMode, setBookMode] = useState<'existing' | 'new'>('existing');
  const [lessonId, setLessonId] = useState<number>(0);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [showBatch, setShowBatch] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<SavedInfo | null>(null);
  const [dayLogs, setDayLogs] = useState<{ log: ReadingLog; lesson?: Lesson }[]>([]);

  // 默认选中最近的一本书
  useEffect(() => {
    if (bookMode === 'existing' && !lessonId && lessons.length > 0) {
      setLessonId(lessons[0].id!);
    }
  }, [lessons, bookMode, lessonId]);

  const loadDayLogs = useCallback(async () => {
    const logs = await getReadingLogsByDate(date);
    const withLessons = await Promise.all(
      logs.map(async log => ({ log, lesson: await getLesson(log.lessonId) }))
    );
    setDayLogs(withLessons);
  }, [date]);

  useEffect(() => { loadDayLogs(); }, [loadDayLogs]);

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const filledRows = rows.filter(r => r.word.trim());

  const applyBatch = () => {
    // 每行：单词 | 中文 | 例句
    const parsed: Row[] = batchText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|').map(p => p.trim());
        return { word: parts[0] || '', chinese: parts[1] || '', example: parts[2] || '' };
      })
      .filter(r => r.word);

    if (parsed.length === 0) {
      setError('没有解析出任何单词，检查一下每行是不是「单词 | 中文 | 例句」');
      return;
    }
    setError('');
    setRows(prev => [...prev.filter(r => r.word.trim()), ...parsed, emptyRow()]);
    setBatchText('');
    setShowBatch(false);
  };

  const handleSave = async () => {
    setError('');
    if (bookMode === 'new' && !newName.trim()) {
      setError('给这本书起个名字，比如「RAZ 60: All About Ants」');
      return;
    }
    if (bookMode === 'existing' && !lessonId) {
      setError('先选一本书，或者点「新建一本书」');
      return;
    }
    if (filledRows.length === 0) {
      setError('至少要填一个生词');
      return;
    }

    setSaving(true);
    try {
      // 1. 确定课程
      let targetLessonId = lessonId;
      let lessonName = lessons.find(l => l.id === lessonId)?.name || '';
      if (bookMode === 'new') {
        targetLessonId = await addLesson({ name: newName.trim(), description: newDesc.trim() });
        lessonName = newName.trim();
        await refreshLessons();
      }

      // 2. 写入单词（同课同名视为同一个词，只补中文和例句）
      const existingWords = await getWordsByLesson(targetLessonId);
      const byName = new Map(existingWords.map(w => [w.word.toLowerCase(), w]));
      const nextReview = initialReviewDate(date);
      let added = 0;
      let merged = 0;

      for (const row of filledRows) {
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
          lessonId: targetLessonId,
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
        byName.set(key, {
          id: wordId,
          lessonId: targetLessonId,
          word: row.word.trim(),
          phrase: '',
          example: row.example.trim(),
          chinese: row.chinese.trim(),
          imageUrl: '',
          imageStatus: 'pending',
          learnedDate: date,
          createdAt: new Date(),
        } as Word);
        added += 1;
      }

      // 3. 记下「这天读了这本书」
      await addReadingLog({ date, lessonId: targetLessonId });

      setSaved({ lessonId: targetLessonId, lessonName, added, merged });
      setRows([emptyRow(), emptyRow(), emptyRow()]);
      setNewName('');
      setNewDesc('');
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
        <h1 className="text-2xl font-bold text-gray-800 mb-1">✏️ 记录今天的阅读</h1>
        <p className="text-sm text-gray-500 mb-5">{formatDateCN(date)}</p>

        {saved ? (
          <SavedSummary
            info={saved}
            onReview={() => navigate(`/lesson/${saved.lessonId}/review?all=1`)}
            onMore={() => setSaved(null)}
          />
        ) : (
          <>
            {/* 日期 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">日期</label>
              <input
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value || todayISO())}
                className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
              />
            </div>

            {/* 选书 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">今天读的是</label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setBookMode('existing')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    bookMode === 'existing' ? 'bg-kid-primary text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  已有的书
                </button>
                <button
                  onClick={() => setBookMode('new')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    bookMode === 'new' ? 'bg-kid-primary text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  ＋ 新建一本
                </button>
              </div>

              {bookMode === 'existing' ? (
                <select
                  value={lessonId}
                  onChange={(e) => setLessonId(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
                >
                  {lessons.length === 0 && <option value={0}>还没有书，点上面「新建一本」</option>}
                  {lessons.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="书名，如 RAZ 60: All About Ants"
                    className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
                  />
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="主题（可选），如 昆虫"
                    className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
                  />
                </div>
              )}
            </div>

            {/* 生词 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-600">生词</label>
                <button
                  onClick={() => setShowBatch(v => !v)}
                  className="text-xs text-kid-primary font-medium"
                >
                  {showBatch ? '收起批量粘贴' : '📋 批量粘贴'}
                </button>
              </div>

              {showBatch && (
                <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-2">
                    每行一个词，格式：<span className="font-mono">单词 | 中文 | 例句</span>
                  </p>
                  <textarea
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    rows={5}
                    placeholder={'sugarcane | 甘蔗 | Farmers grow sugarcane in the field.\ncotton | 棉花 | This shirt is made of cotton.'}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-700 bg-white font-mono"
                  />
                  <button
                    onClick={applyBatch}
                    disabled={!batchText.trim()}
                    className="w-full mt-2 bg-kid-accent-2 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-40"
                  >
                    解析并填入
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={row.word}
                      onChange={(e) => updateRow(i, { word: e.target.value })}
                      placeholder="单词"
                      className="col-span-4 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-700 bg-gray-50"
                    />
                    <input
                      type="text"
                      value={row.chinese}
                      onChange={(e) => updateRow(i, { chinese: e.target.value })}
                      placeholder="中文"
                      className="col-span-3 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-700 bg-gray-50"
                    />
                    <input
                      type="text"
                      value={row.example}
                      onChange={(e) => updateRow(i, { example: e.target.value })}
                      placeholder="例句"
                      className="col-span-5 rounded-xl border border-gray-200 p-2.5 text-sm text-gray-700 bg-gray-50"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setRows(prev => [...prev, emptyRow()])}
                className="w-full mt-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-kid-primary hover:text-kid-primary"
              >
                ＋ 添加一行
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">{error}</div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || filledRows.length === 0}
              className="w-full bg-kid-primary text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all"
            >
              {saving ? '保存中...' : `保存（${filledRows.length} 个词）`}
            </button>
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
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{lesson?.name || '未知书本'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{lesson?.wordCount ?? 0} 个词</p>
                  </div>
                  <button
                    onClick={() => navigate(`/lesson/${log.lessonId}/review`)}
                    className="text-xs text-kid-primary font-medium px-3 py-1.5 rounded-lg bg-indigo-50"
                  >
                    复习
                  </button>
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
}: { info: SavedInfo; onReview: () => void; onMore: () => void }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
      <span className="text-5xl block mb-3">🎉</span>
      <h2 className="text-xl font-bold text-gray-800 mb-2">记好了！</h2>
      <p className="text-sm text-gray-500 mb-1">{info.lessonName}</p>
      <p className="text-sm text-gray-600 mb-5">
        新增 <span className="font-bold text-kid-primary">{info.added}</span> 个生词
        {info.merged > 0 && <>，更新 {info.merged} 个已有的词</>}
      </p>
      <p className="text-xs text-gray-400 mb-5">
        这些词明天开始第一次复习，之后按 1、2、4、7、15、30 天自动安排
      </p>
      <div className="space-y-2">
        <button
          onClick={onReview}
          className="w-full bg-kid-primary text-white py-3 rounded-xl font-medium hover:opacity-90"
        >
          现在就陪他看一遍
        </button>
        <button
          onClick={onMore}
          className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200"
        >
          再记一本
        </button>
      </div>
    </div>
  );
}
