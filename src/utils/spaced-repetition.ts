import type { MasteryLevel } from '../types';

interface ReviewResult {
  nextReviewDate: Date;
  masteryLevel: MasteryLevel;
}

const INTERVALS: Record<MasteryLevel, number> = {
  0: 0,       // 未学 — 立即复习
  1: 1,       // 认识 — 1 天后
  2: 3,       // 熟悉 — 3 天后
  3: 7,       // 掌握 — 7 天后
};

export function calcNextReview(
  currentLevel: MasteryLevel,
  isCorrect: boolean
): ReviewResult {
  let newLevel: MasteryLevel;

  if (isCorrect) {
    newLevel = Math.min(3, currentLevel + 1) as MasteryLevel;
  } else {
    newLevel = Math.max(0, currentLevel - 1) as MasteryLevel;
  }

  const days = INTERVALS[newLevel];
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + days);
  nextDate.setHours(0, 0, 0, 0);

  return { nextReviewDate: nextDate, masteryLevel: newLevel };
}

export function getDueStatus(nextReviewDate: Date | null): 'due' | 'upcoming' | 'new' {
  if (!nextReviewDate) return 'new';
  return nextReviewDate <= new Date() ? 'due' : 'upcoming';
}
