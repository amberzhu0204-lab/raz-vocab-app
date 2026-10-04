import type { MasteryLevel, ReviewOutcome } from '../types';
import { addDaysISO, startOfDayISO, todayISO } from './date';

/** 每个掌握等级对应的复习间隔（天） */
export const INTERVALS: Record<MasteryLevel, number> = {
  0: 1,
  1: 2,
  2: 4,
  3: 7,
  4: 15,
  5: 30,
};

export const MAX_LEVEL: MasteryLevel = 5;

/** 新录入的词：当天不考，第二天首考 */
export function initialReviewDate(learnedDateISO: string): Date {
  return startOfDayISO(addDaysISO(learnedDateISO, 1));
}

interface NextReview {
  nextReviewDate: Date;
  masteryLevel: MasteryLevel;
}

/**
 * 答对 → 升一级，按新等级排下次；
 * 不确定 → 等级不变，明天再来；
 * 答错 → 降一级，明天再来。
 */
export function calcNextReview(
  currentLevel: MasteryLevel,
  result: ReviewOutcome
): NextReview {
  let newLevel: MasteryLevel;
  if (result === 'correct') {
    newLevel = Math.min(MAX_LEVEL, currentLevel + 1) as MasteryLevel;
  } else if (result === 'wrong') {
    newLevel = Math.max(0, currentLevel - 1) as MasteryLevel;
  } else {
    newLevel = currentLevel;
  }

  // 只有答对才走间隔阶梯；不确定/答错一律明天再出现
  const days = result === 'correct' ? INTERVALS[newLevel] : 1;
  return {
    nextReviewDate: startOfDayISO(addDaysISO(todayISO(), days)),
    masteryLevel: newLevel,
  };
}

/** 当前等级若答对，下次间隔多少天（用于界面提示） */
export function nextIntervalLabel(level: MasteryLevel): string {
  const next = Math.min(MAX_LEVEL, level + 1) as MasteryLevel;
  return `${INTERVALS[next]} 天后`;
}

export function getDueStatus(nextReviewDate: Date | null): 'due' | 'upcoming' | 'new' {
  if (!nextReviewDate) return 'new';
  return nextReviewDate <= new Date() ? 'due' : 'upcoming';
}
