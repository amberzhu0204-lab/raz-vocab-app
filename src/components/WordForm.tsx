import { useState } from 'react';
import type { Word, Lesson } from '../types';
import { todayISO } from '../utils/date';
import { applyHint, lookupWordHint } from '../utils/wordHints';

interface WordFormProps {
  lessons: Lesson[];
  lessonId?: number;
  word?: Word;
  onSave: (data: Omit<Word, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
}

export default function WordForm({ lessons, lessonId, word, onSave, onCancel }: WordFormProps) {
  const [form, setForm] = useState({
    word: word?.word || '',
    phrase: word?.phrase || '',
    example: word?.example || '',
    chinese: word?.chinese || '',
    lessonId: word?.lessonId ?? lessonId ?? (lessons[0]?.id ?? 0),
    imageUrl: word?.imageUrl || '',
    imageStatus: word?.imageStatus || 'pending' as const,
  });
  const [saving, setSaving] = useState(false);
  /** 上次自动补进来的值，用来判断中文/例句有没有被手改过 */
  const [auto, setAuto] = useState<{ chinese?: string; example?: string } | undefined>(undefined);

  /** 只打英文时把中文和例句补上；改过的一律不覆盖 */
  const handleWordChange = (value: string, force = false) => {
    const next = { ...form, word: value };
    const filled = applyHint(value, { chinese: next.chinese, example: next.example }, auto, force);
    if (filled) {
      next.chinese = filled.chinese;
      next.example = filled.example;
      setAuto(filled.auto);
    }
    setForm(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.word.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      word: form.word.trim(),
      phrase: form.phrase.trim(),
      example: form.example.trim(),
      chinese: form.chinese.trim(),
      lessonId: Number(form.lessonId),
      learnedDate: word?.learnedDate || todayISO(),
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800">
        {word ? '编辑单词' : '添加单词'}
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">课程</label>
        <select
          value={form.lessonId}
          onChange={(e) => setForm({ ...form, lessonId: Number(e.target.value) })}
          className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
        >
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">单词 *</label>
        <div className="relative">
          <input
            type="text"
            value={form.word}
            onChange={(e) => handleWordChange(e.target.value)}
            placeholder="如：gigantic"
            className="w-full rounded-xl border border-gray-200 p-3 pr-10 text-gray-700 bg-gray-50"
            required
          />
          {lookupWordHint(form.word) && (
            <button
              type="button"
              onClick={() => handleWordChange(form.word, true)}
              title="重新套用书里的释义和例句"
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
            >
              ✨
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          只打英文就行，中文和例句会自动补上（例句取自这本书的正文），随时能改
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">中文释义</label>
        <input
          type="text"
          value={form.chinese}
          onChange={(e) => setForm({ ...form, chinese: e.target.value })}
          placeholder="如：巨大的"
          className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">例句</label>
        <input
          type="text"
          value={form.example}
          onChange={(e) => setForm({ ...form, example: e.target.value })}
          placeholder="如：An elephant is a gigantic animal."
          className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
        />
        <p className="text-xs text-gray-400 mt-1">复习时先看到单词和这句例句，再回忆中文意思</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">词组/短语（可选）</label>
        <input
          type="text"
          value={form.phrase}
          onChange={(e) => setForm({ ...form, phrase: e.target.value })}
          placeholder="如：a gigantic elephant"
          className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">图片 URL</label>
        <input
          type="text"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value, imageStatus: e.target.value ? 'ready' : 'pending' })}
          placeholder="https://..."
          className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !form.word.trim()}
          className="flex-1 bg-kid-primary text-white py-3 rounded-xl font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {saving ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  );
}
