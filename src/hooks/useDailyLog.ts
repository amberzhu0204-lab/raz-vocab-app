import { useState, useEffect, useCallback } from 'react';
import type { DailyLog } from '../types';
import { getDailyLogs, upsertDailyLog } from '../db/database';

export function useDailyLog(limit = 30) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getDailyLogs(limit);
    setLogs(data);
    setLoading(false);
  }, [limit]);

  useEffect(() => { refresh(); }, [refresh]);

  const logSession = async (log: Omit<DailyLog, 'id'>) => {
    await upsertDailyLog(log);
    await refresh();
  };

  return { logs, loading, refresh, logSession };
}
