export interface Lesson {
  id?: number;
  name: string;
  description: string;
  createdAt: Date;
  wordCount: number;
}

export interface Word {
  id?: number;
  lessonId: number;
  word: string;
  phrase: string;
  chinese?: string;
  imageUrl: string;
  imageStatus: 'pending' | 'ready' | 'fallback';
  createdAt: Date;
}

export interface WordProgress {
  id?: number;
  wordId: number;
  masteryLevel: 0 | 1 | 2 | 3;
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

export interface UnsplashPhoto {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  author: string;
}

export type MasteryLevel = 0 | 1 | 2 | 3;

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  0: '未学',
  1: '认识',
  2: '熟悉',
  3: '掌握',
};

export const MASTERY_COLORS: Record<MasteryLevel, string> = {
  0: 'bg-gray-200 text-gray-600',
  1: 'bg-red-100 text-red-600',
  2: 'bg-yellow-100 text-yellow-600',
  3: 'bg-green-100 text-green-600',
};
