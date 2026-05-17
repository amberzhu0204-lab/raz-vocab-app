import { useState, useEffect, useCallback } from 'react';
import type { Word } from '../types';
import { getWordsByLesson, addWord, updateWord, deleteWord } from '../db/database';

export function useWords(lessonId: number | null) {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (lessonId == null) { setWords([]); return; }
    setLoading(true);
    const data = await getWordsByLesson(lessonId);
    setWords(data);
    setLoading(false);
  }, [lessonId]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (data: Omit<Word, 'id' | 'createdAt'>) => {
    await addWord(data);
    await refresh();
  };

  const update = async (id: number, data: Partial<Word>) => {
    await updateWord(id, data);
    await refresh();
  };

  const remove = async (id: number) => {
    if (confirm('确定要删除这个单词吗？')) {
      await deleteWord(id);
      await refresh();
    }
  };

  return { words, loading, refresh, create, update, remove };
}
