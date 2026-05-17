import { useState, useEffect, useCallback } from 'react';
import type { WordProgress } from '../types';
import { getLessonProgress, upsertProgress, getAllProgress } from '../db/database';

export function useProgress(lessonId: number | null) {
  const [progress, setProgress] = useState<WordProgress[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (lessonId == null) { setProgress([]); return; }
    setLoading(true);
    const data = await getLessonProgress(lessonId);
    setProgress(data);
    setLoading(false);
  }, [lessonId]);

  useEffect(() => { refresh(); }, [refresh]);

  const update = async (p: Omit<WordProgress, 'id'>) => {
    await upsertProgress(p);
    await refresh();
  };

  return { progress, loading, refresh, update };
}

export function useAllProgress() {
  const [progress, setProgress] = useState<WordProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllProgress();
    setProgress(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { progress, loading, refresh };
}
