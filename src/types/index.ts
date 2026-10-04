export interface Lesson {
  id?: number;
  name: string;
  description: string;
  createdAt: Date;
  wordCount: number;
  /** RAZ 系列级别：'aa' / 'A' … 'Z'。老数据没有这个字段 */
  level?: string;
  /** 该系列里的第几本，从 1 开始 */
  bookNumber?: number;
  /** 纯书名，不含编号前缀 */
  title?: string;
}

/** 预置书目里的一本（来自 public/raz-books.json，只读） */
export interface CatalogBook {
  n: number;
  title: string;
  text?: string;
}

export interface CatalogLevel {
  level: string;
  books: CatalogBook[];
}

/** 录生词时自动补的内容（来自 public/word-hints.json，只读） */
export interface WordHint {
  /** 中文释义 */
  zh?: string;
  /** 例句 —— 取自孩子读过的那本书的原文 */
  ex?: string;
}

export interface Word {
  id?: number;
  lessonId: number;
  word: string;
  phrase: string;
  /** 简单例句。展示时优先用它，为空则回落到 phrase */
  example?: string;
  chinese?: string;
  imageUrl: string;
  imageStatus: 'pending' | 'ready' | 'fallback';
  /** 首次录入日期 'YYYY-MM-DD' */
  learnedDate?: string;
  createdAt: Date;
}

export interface WordProgress {
  id?: number;
  wordId: number;
  masteryLevel: MasteryLevel;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewed: Date | null;
  nextReviewDate: Date | null;
}

export interface DailyLog {
  id?: number;
  date: string;
  lessonId: number;
  wordsReviewed: number;
  wordsCorrect: number;
  wordsWrong: number;
  durationMinutes: number;
}

/** 今天读了哪本书 */
export interface ReadingLog {
  id?: number;
  date: string;
  lessonId: number;
  createdAt: Date;
}

export type ReviewOutcome = 'correct' | 'unknown' | 'wrong';

/** 每个词每次复习一条，用来记录复习历史 */
export interface ReviewLog {
  id?: number;
  wordId: number;
  lessonId: number;
  date: string;
  result: ReviewOutcome;
  reviewedAt: Date;
}

export interface UnsplashPhoto {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  author: string;
}

/** 0 未学 → 5 掌握，对应复习间隔 1/2/4/7/15/30 天 */
export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const MASTERY_LEVELS: MasteryLevel[] = [0, 1, 2, 3, 4, 5];

/** 达到这个等级算「已掌握」 */
export const MASTERED_LEVEL: MasteryLevel = 5;

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  0: '未学',
  1: '初识',
  2: '眼熟',
  3: '认识',
  4: '熟悉',
  5: '掌握',
};

export const MASTERY_COLORS: Record<MasteryLevel, string> = {
  0: 'bg-gray-200 text-gray-600',
  1: 'bg-red-100 text-red-600',
  2: 'bg-orange-100 text-orange-600',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-lime-100 text-lime-700',
  5: 'bg-green-100 text-green-600',
};

/** 掌握分布堆叠条用的纯色（顺序同 MASTERY_LEVELS） */
export const MASTERY_BAR_COLORS: Record<MasteryLevel, string> = {
  0: 'bg-gray-300',
  1: 'bg-red-400',
  2: 'bg-orange-400',
  3: 'bg-yellow-400',
  4: 'bg-lime-400',
  5: 'bg-green-500',
};

export const OUTCOME_LABELS: Record<ReviewOutcome, string> = {
  correct: '认识',
  unknown: '不确定',
  wrong: '不认识',
};
