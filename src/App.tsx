import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Lessons from './pages/Lessons';
import Review from './pages/Review';
import Quiz from './pages/Quiz';
import Admin from './pages/Admin';
import Records from './pages/Records';
import { db, mergeImportWords } from './db/database';

function AutoImport({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const init = async () => {
      const lessonCount = await db.lessons.count();
      if (lessonCount === 0) {
        setStatus('正在导入单词数据...');
        try {
          const res = await fetch(import.meta.env.BASE_URL + 'raz-import-data.json');
          if (res.ok) {
            const data = await res.json();
            if (data.lessons && data.words) {
              await db.lessons.bulkAdd(data.lessons);
              await mergeImportWords(data.words);
              setStatus('导入完成！');
            }
          }
        } catch (e) {
          console.warn('Auto import failed:', e);
        }
      }
      setReady(true);
    };
    init();
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
