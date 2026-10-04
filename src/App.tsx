import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Lessons from './pages/Lessons';
import Review from './pages/Review';
import Quiz from './pages/Quiz';
import Admin from './pages/Admin';
import Records from './pages/Records';
import Today from './pages/Today';
import GlobalReview from './pages/GlobalReview';
import { db, mergeImportWords } from './db/database';

const STORAGE_KEY = 'raz-data-version';

/**
 * 导入在一次会话里只跑一次。
 * React StrictMode 在开发模式下会把 effect 跑两遍，两个并发导入会撞课程主键
 * （ConstraintError: Key already exists），所以用单例 Promise 兜住。
 */
let importOnce: Promise<void> | null = null;

function runImportOnce(onStatus?: (s: string) => void): Promise<void> {
  if (!importOnce) importOnce = doImport(onStatus);
  return importOnce;
}

async function doImport(onStatus?: (s: string) => void): Promise<void> {
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'raz-import-data.json?v=2');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.lessons || !data.words) return;

    const storedVersion = localStorage.getItem(STORAGE_KEY);
    const needsImport = !storedVersion || Number(storedVersion) < (data.dataVersion || 0);
    if (!needsImport) return;

    onStatus?.('正在更新数据...');
    // 合并课程：已存在的跳过
    for (const l of data.lessons) {
      const existing = await db.lessons.get(l.id);
      if (!existing) await db.lessons.put(l);
    }
    // 单词总是合并更新，保留学习进度
    await mergeImportWords(data.words);
    localStorage.setItem(STORAGE_KEY, String(data.dataVersion || 0));
    onStatus?.('更新完成！');
  } catch (e) {
    console.warn('Auto import failed:', (e as Error)?.message || e);
  }
}

function AutoImport({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    runImportOnce(setStatus).finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center bg-kid-bg">
        <div className="text-center">
          <div className="text-5xl mb-4">📚</div>
          <div className="text-gray-600 font-medium">{status || '加载中...'}</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <AutoImport>
        <div className="h-full flex flex-col">
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/today" element={<Today />} />
              <Route path="/review" element={<GlobalReview />} />
              <Route path="/lessons" element={<Lessons />} />
              <Route path="/lesson/:lessonId/review" element={<Review />} />
              <Route path="/lesson/:lessonId/quiz" element={<Quiz />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/records" element={<Records />} />
            </Routes>
          </main>
          <Navigation />
        </div>
      </AutoImport>
    </HashRouter>
  );
}
