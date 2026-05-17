import { HashRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Lessons from './pages/Lessons';
import Review from './pages/Review';
import Quiz from './pages/Quiz';
import Admin from './pages/Admin';
import Records from './pages/Records';

export default function App() {
  return (
    <HashRouter>
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
    </HashRouter>
  );
}
