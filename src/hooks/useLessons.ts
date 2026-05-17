import { useState, useEffect, useCallback } from 'react';
import type { Lesson } from '../types';
import { getAllLessons, addLesson, updateLesson, deleteLesson, getLesson } from '../db/database';

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllLessons();
    setLessons(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (data: Omit<Lesson, 'id' | 'createdAt' | 'wordCount'>) => {
    await addLesson(data);
    await refresh();
  };

  const update = async (id: number, data: Partial<Lesson>) => {
    await updateLesson(id, data);
    await refresh();
  };

  const remove = async (id: number) => {
    if (confirm('确定要删除这个课程及其所有单词吗？')) {
      await deleteLesson(id);
      await refresh();
    }
  };

  return { lessons, loading, refresh, create, update, remove, getLesson };
}
