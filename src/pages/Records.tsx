import { useDailyLog } from '../hooks/useDailyLog';
import { useAllProgress } from '../hooks/useProgress';
import StatsCard from '../components/StatsCard';
import { MASTERY_LABELS } from '../types';

export default function Records() {
  const { logs, loading: logLoading } = useDailyLog(60);
  const { progress, loading: progLoading } = useAllProgress();

  const totalReviewed = progress.filter(p => p.reviewCount > 0).length;
  const mastered = progress.filter(p => p.masteryLevel === 3).length;
  const totalReviews = progress.reduce((sum, p) => sum + p.reviewCount, 0);
  const totalCorrect = progress.reduce((sum, p) => sum + p.correctCount, 0);
  const avgAccuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

  const loading = logLoading || progLoading;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center pb-20">
        <div className="text-gray-400 animate-pulse">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20 px-4 pt-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">📊 学习记录</h1>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatsCard icon="🔄" value={totalReviews} label="总复习次数" color="bg-kid-accent-2" />
          <StatsCard icon="⭐" value={mastered} label="已掌握单词" color="bg-kid-success" />
          <StatsCard icon="📝" value={totalReviewed} label="已复习单词" color="bg-kid-accent-3" />
          <StatsCard icon="🎯" value={`${avgAccuracy}%`} label="正确率" color="bg-kid-primary" />
        </div>

        {/* Mastery Distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <h3 className="font-bold text-gray-800 mb-3">掌握分布</h3>
          <div className="flex gap-2">
            {([0, 1, 2, 3] as const).map(level => {
              const count = progress.filter(p => p.masteryLevel === level).length;
              const pct = progress.length > 0 ? Math.round((count / progress.length) * 100) : 0;
              return (
                <div key={level} className="flex-1 text-center">
                  <div className="text-2xl font-bold text-gray-800">{count}</div>
                  <div className="text-xs text-gray-500">{MASTERY_LABELS[level]}</div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        level === 0 ? 'bg-gray-300' :
                        level === 1 ? 'bg-red-400' :
                        level === 2 ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Logs */}
        <h2 className="text-lg font-bold text-gray-800 mb-3">📅 每日记录</h2>
        {logs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <span className="text-4xl block mb-2">📭</span>
            <p className="text-gray-500 text-sm">还没有学习记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{log.date}</p>
                  <p className="text-xs text-gray-500">
                    复习 {log.wordsReviewed} 词 · 正确 {log.wordsCorrect} · 错误 {log.wordsWrong}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-kid-primary">{Math.round((log.wordsCorrect / Math.max(1, log.wordsReviewed)) * 100)}%</p>
                  <p className="text-xs text-gray-400">{log.durationMinutes} 分钟</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
