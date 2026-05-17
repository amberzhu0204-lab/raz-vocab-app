import { useState, useEffect } from 'react';
import { useLessons } from '../hooks/useLessons';
import { useWords } from '../hooks/useWords';
import { exportAllData, mergeImportWords, bulkAddWords, db } from '../db/database';
import LessonForm from '../components/LessonForm';
import WordForm from '../components/WordForm';
import ImagePicker from '../components/ImagePicker';
import type { Lesson, Word } from '../types';
import { unsplashService } from '../services/unsplash';

type Tab = 'lessons' | 'words' | 'settings';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('lessons');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [showWordForm, setShowWordForm] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [unsplashKey, setUnsplashKey] = useState('');
  const [pickingImageFor, setPickingImageFor] = useState<Word | null>(null);

  // Batch import state
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchLessonId, setBatchLessonId] = useState<number | null>(null);
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchResult, setBatchResult] = useState('');

  const { lessons, loading, create, update, remove } = useLessons();
  const { words, refresh, create: createWord, update: updateWord, remove: removeWord } = useWords(selectedLessonId);

  useEffect(() => {
    if (lessons.length > 0 && !selectedLessonId) {
      setSelectedLessonId(lessons[0].id!);
    }
  }, [lessons, selectedLessonId]);

  useEffect(() => {
    if (lessons.length > 0 && !batchLessonId) {
      setBatchLessonId(lessons[0].id!);
    }
  }, [lessons, batchLessonId]);

  useEffect(() => {
    const load = async () => {
      const all = await db.words.toArray();
      setAllWords(all);
    };
    load();
  }, [words, lessons]);

  const handleExport = async () => {
    const json = await exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raz-vocab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        // If it's a full export or just words array
        if (Array.isArray(data)) {
          // Just words array
          if (!confirm(`将合并导入 ${data.length} 个单词（已存在的会更新），确定继续？`)) return;
          await mergeImportWords(data);
        } else {
          // Full data export
          if (!confirm('检测到完整备份文件。合并导入（更新已有+新增）还是覆盖导入？\n\n"确定" = 合并导入\n"取消" = 不导入')) {
            return;
          }
          if (data.words && Array.isArray(data.words)) {
            await mergeImportWords(data.words);
          }
        }
        window.location.reload();
      } catch {
        alert('文件格式错误，请检查 JSON 内容');
      }
    };
    input.click();
  };

  const handleBatchImport = async () => {
    if (!batchLessonId || !batchText.trim()) return;
    setBatchImporting(true);
    setBatchResult('');

    const lines = batchText.split('\n').filter(l => l.trim());
    const words: Omit<Word, 'id' | 'createdAt'>[] = [];

    for (const line of lines) {
      // Support formats:
      // "word"
      // "word | chinese"
      // "word | chinese | phrase"
      // "word | chinese | phrase | imageUrl"
      const parts = line.split('|').map(s => s.trim());
      words.push({
        lessonId: batchLessonId,
        word: parts[0] || '',
        chinese: parts[1] || '',
        phrase: parts[2] || '',
        imageUrl: parts[3] || '',
        imageStatus: parts[3] ? 'ready' : 'pending',
      });
    }

    const valid = words.filter(w => w.word);
    if (valid.length === 0) {
      setBatchResult('没有有效的单词');
      setBatchImporting(false);
      return;
    }

    await bulkAddWords(valid);
    setBatchResult(`成功导入 ${valid.length} 个单词！`);
    setBatchText('');
    await refresh();
    setBatchImporting(false);
  };

  const handleImageSelect = async (url: string) => {
    if (pickingImageFor) {
      await updateWord(pickingImageFor.id!, { imageUrl: url, imageStatus: 'ready' });
      setPickingImageFor(null);
    }
  };

  const tabs = [
    { key: 'lessons' as Tab, label: '课程', icon: '📚' },
    { key: 'words' as Tab, label: '单词', icon: '📝' },
    { key: 'settings' as Tab, label: '设置', icon: '⚙️' },
  ];

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="max-w-md mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">⚙️ 管理后台</h1>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1.5 mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.key ? 'bg-white text-kid-primary shadow-sm' : 'text-gray-500'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Lessons Tab ── */}
        {tab === 'lessons' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">课程管理</h2>
              <button
                onClick={() => { setEditingLesson(null); setShowLessonForm(true); }}
                className="bg-kid-primary text-white px-4 py-2 rounded-xl text-sm font-medium"
              >
                + 新建
              </button>
            </div>

            {showLessonForm && (
              <div className="mb-4">
                <LessonForm
                  lesson={editingLesson || undefined}
                  onSave={async (data) => {
                    if (editingLesson) {
                      await update(editingLesson.id!, data);
                    } else {
                      await create(data);
                    }
                    setShowLessonForm(false);
                    setEditingLesson(null);
                  }}
                  onCancel={() => { setShowLessonForm(false); setEditingLesson(null); }}
                />
              </div>
            )}

            {loading ? (
              <p className="text-gray-400 text-center py-8">加载中...</p>
            ) : lessons.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl">
                <span className="text-4xl block mb-2">📭</span>
                <p className="text-gray-500">还没有课程</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lessons.map(lesson => (
                  <div key={lesson.id} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-medium text-gray-800">{lesson.name}</p>
                      <p className="text-xs text-gray-500">{lesson.wordCount} 个单词</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingLesson(lesson); setShowLessonForm(true); }}
                        className="text-sm text-kid-primary font-medium"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => remove(lesson.id!)}
                        className="text-sm text-red-400 font-medium"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Words Tab ── */}
        {tab === 'words' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">单词管理</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBatchImport(!showBatchImport)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium ${
                    showBatchImport ? 'bg-kid-accent-2 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  📋 批量
                </button>
                <button
                  onClick={() => { setEditingWord(null); setShowWordForm(true); }}
                  className="bg-kid-primary text-white px-4 py-2 rounded-xl text-sm font-medium"
                >
                  + 添加
                </button>
              </div>
            </div>

            {/* Batch Import Panel */}
            {showBatchImport && (
              <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                <h3 className="font-bold text-gray-800 mb-3">📋 批量导入单词</h3>
                <p className="text-xs text-gray-500 mb-3">
                  每行一个单词，支持以下格式（用 | 分隔）：<br />
                  <code className="text-xs bg-gray-100 px-1 rounded">word</code> 或{' '}
                  <code className="text-xs bg-gray-100 px-1 rounded">word | 中文 | 例句</code> 或{' '}
                  <code className="text-xs bg-gray-100 px-1 rounded">word | 中文 | 例句 | 图片URL</code>
                </p>

                <select
                  value={batchLessonId ?? ''}
                  onChange={(e) => setBatchLessonId(Number(e.target.value) || null)}
                  className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50 mb-3"
                >
                  <option value="">选择目标课程...</option>
                  {lessons.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>

                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder={"apple | 苹果 | a red apple\ngigantic | 巨大的 | a gigantic elephant"}
                  rows={8}
                  className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50 text-sm resize-none mb-3"
                />

                {batchResult && (
                  <div className={`text-sm mb-3 p-2 rounded-lg ${
                    batchResult.includes('成功') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {batchResult}
                  </div>
                )}

                <button
                  onClick={handleBatchImport}
                  disabled={batchImporting || !batchText.trim() || !batchLessonId}
                  className="w-full bg-kid-primary text-white py-3 rounded-xl font-medium disabled:opacity-50 hover:opacity-90"
                >
                  {batchImporting ? '导入中...' : `导入 ${batchText.split('\n').filter(l => l.trim()).length} 个单词`}
                </button>
              </div>
            )}

            {/* Lesson selector */}
            <select
              value={selectedLessonId ?? ''}
              onChange={(e) => setSelectedLessonId(Number(e.target.value) || null)}
              className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-white mb-4"
            >
              <option value="">选择课程...</option>
              {lessons.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

            {showWordForm && (
              <div className="mb-4">
                <WordForm
                  lessons={lessons}
                  lessonId={selectedLessonId ?? undefined}
                  word={editingWord || undefined}
                  onSave={async (data) => {
                    if (editingWord) {
                      await updateWord(editingWord.id!, data);
                    } else {
                      await createWord(data);
                    }
                    setShowWordForm(false);
                    setEditingWord(null);
                  }}
                  onCancel={() => { setShowWordForm(false); setEditingWord(null); }}
                />
              </div>
            )}

            {selectedLessonId && words.length === 0 && !showBatchImport ? (
              <div className="text-center py-12 bg-white rounded-2xl">
                <span className="text-4xl block mb-2">📝</span>
                <p className="text-gray-500 mb-3">该课程还没有单词</p>
                <button
                  onClick={() => setShowBatchImport(true)}
                  className="text-kid-primary text-sm font-medium underline"
                >
                  批量导入 →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {words.map(word => (
                  <div key={word.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-bold text-gray-800 text-lg">{word.word}</span>
                        {word.chinese && <span className="text-gray-400 ml-2 text-sm">{word.chinese}</span>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingWord(word); setShowWordForm(true); }}
                          className="text-sm text-kid-primary font-medium"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => removeWord(word.id!)}
                          className="text-sm text-red-400 font-medium"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    {word.phrase && <p className="text-sm text-gray-500 mb-2">{word.phrase}</p>}

                    <div className="flex items-center gap-3">
                      {word.imageUrl && word.imageStatus === 'ready' ? (
                        <img src={word.imageUrl} alt={word.word} className="w-16 h-16 object-cover rounded-lg" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                          无图
                        </div>
                      )}
                      <button
                        onClick={() => setPickingImageFor(word)}
                        className="text-xs text-kid-primary font-medium"
                      >
                        {word.imageUrl ? '更换图片' : '搜索图片'}
                      </button>
                    </div>

                    {pickingImageFor?.id === word.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => setPickingImageFor(null)}
                          className="text-xs text-gray-400 mb-2 block"
                        >
                          关闭
                        </button>
                        <ImagePicker
                          query={word.word}
                          currentUrl={word.imageUrl}
                          onSelect={handleImageSelect}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Settings Tab ── */}
        {tab === 'settings' && (
          <div className="space-y-6">
            {/* Unsplash API Key */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-2">🔑 Unsplash API 密钥</h3>
              <p className="text-sm text-gray-500 mb-3">
                设置后可以自动搜索匹配单词的图片。
                <a href="https://unsplash.com/developers" target="_blank" rel="noopener" className="text-kid-primary ml-1 underline">
                  获取免费密钥 →
                </a>
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={unsplashKey}
                  onChange={(e) => setUnsplashKey(e.target.value)}
                  placeholder="输入 API Key..."
                  className="flex-1 rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50 text-sm"
                />
                <button
                  onClick={() => { unsplashService.accessKey = unsplashKey; }}
                  className="bg-kid-primary text-white px-4 rounded-xl text-sm font-medium"
                >
                  保存
                </button>
              </div>
            </div>

            {/* Quick Import from Claude */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-2">🤖 AI 辅助导入</h3>
              <p className="text-sm text-gray-500 mb-3">
                将 Claude 准备的单词数据（含中文、例句、图片）直接粘贴导入。格式为 JSON 数组。
              </p>
              <button
                onClick={handleImport}
                className="w-full bg-kid-accent-3 text-white py-3 rounded-xl font-medium hover:opacity-90"
              >
                导入 JSON 文件
              </button>
            </div>

            {/* Data stats */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-2">📊 数据统计</h3>
              <div className="text-sm text-gray-500 space-y-1">
                <p>课程数: {lessons.length}</p>
                <p>总单词数: {allWords.length}</p>
              </div>
            </div>

            {/* Import / Export */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3">💾 数据备份</h3>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  className="flex-1 bg-kid-success text-white py-3 rounded-xl font-medium hover:opacity-90"
                >
                  导出数据
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 bg-kid-secondary text-white py-3 rounded-xl font-medium hover:opacity-90"
                >
                  导入数据
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
