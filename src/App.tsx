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
import { resetAllContent } from './db/database';
import { loadCatalog } from './utils/catalog';

const GENERATION_KEY = 'raz-data-generation';
/** 改成 2：老数据没有系列/册号，一次性清空重新录 */
const CURRENT_GENERATION = 2;

/**
 * 启动只跑一次。React StrictMode 在开发模式下会把 effect 跑两遍，
 * 用单例 Promise 兜住，避免并发清库。
 */
let bootOnce: Promise<void> | null = null;

function runBootOnce(onStatus?: (s: string) => void): Promise<void> {
  if (!bootOnce) bootOnce = doBoot(onStatus);
  return bootOnce;
}

async function doBoot(onStatus?: (s: string) => void): Promise<void> {
  try {
    const stored = Number(localStorage.getItem(GENERATION_KEY) || 0);
    if (stored < CURRENT_GENERATION) {
      onStatus?.('正在整理数据...');
      await resetAllContent();
      localStorage.setItem(GENERATION_KEY, String(CURRENT_GENERATION));
      localStorage.removeItem('raz-data-version');
    }
    await loadCatalog();
  } catch (e) {
    console.warn('Boot failed:', (e as Error)?.message || e);
  }
}

function Bootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    runBootOnce(setStatus).finally(() => setReady(true));
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
      <Bootstrap>
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
      </Bootstrap>
    </HashRouter>
  );
}
