import { useState } from 'react';
import type { Lesson } from '../types';

interface LessonFormProps {
  lesson?: Lesson;
  onSave: (data: Omit<Lesson, 'id' | 'createdAt' | 'wordCount'>) => Promise<void>;
  onCancel: () => void;
}

export default function LessonForm({ lesson, onSave, onCancel }: LessonFormProps) {
  const [form, setForm] = useState({
    name: lesson?.name || '',
    description: lesson?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({
      name: form.name.trim(),
      description: form.description.trim(),
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800">
        {lesson ? '编辑课程' : '创建课程'}
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">课程名称 *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="如：RAZ Level C - Lesson 5"
          className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">描述</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="如：关于动物的形容词..."
          rows={2}
          className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 bg-gray-50 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !form.name.trim()}
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
