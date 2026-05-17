import { useState } from 'react';
import type { Word, Lesson } from '../types';

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
    chinese: word?.chinese || '',
    lessonId: word?.lessonId ?? lessonId ?? (lessons[0]?.id ?? 0),
    imageUrl: word?.imageUrl || '',
    imageStatus: word?.imageStatus || 'pending' as const,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.word.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      word: form.word.trim(),
      phrase: form.phrase.trim(),
      chinese: form.chinese.trim(),
      lessonId: Number(form.lessonId),
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
        <input
          type="text"
          value={form.word}
          onChange={(e) => setForm({ ...form, word: e.target.value })}
          placeholder="如：gigantic"
          className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">词组/例句</label>
        <input
          type="text"
          value={form.phrase}
          onChange={(e) => setForm({ ...form, phrase: e.target.value })}
          placeholder="如：a gigantic elephant"
          className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
        />
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
