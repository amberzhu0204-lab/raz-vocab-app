import Dexie, { type Table } from 'dexie';
import type { Lesson, Word, WordProgress, DailyLog } from '../types';

export class RazVocabDB extends Dexie {
  lessons!: Table<Lesson, number>;
  words!: Table<Word, number>;
  wordProgress!: Table<WordProgress, number>;
  dailyLogs!: Table<DailyLog, number>;

  constructor() {
    super('RazVocabDB');
    this.version(1).stores({
      lessons: '++id, name, createdAt',
      words: '++id, lessonId, word, imageStatus',
      wordProgress: '++id, wordId, masteryLevel, lastReviewed, nextReviewDate',
      dailyLogs: '++id, date, lessonId',
    });
  }
}

export const db = new RazVocabDB();

// ── Lessons ──
export async function getAllLessons(): Promise<Lesson[]> {
  return db.lessons.orderBy('createdAt').reverse().toArray();
}

export async function getLesson(id: number): Promise<Lesson | undefined> {
  return db.lessons.get(id);
}

export async function addLesson(lesson: Omit<Lesson, 'id' | 'createdAt' | 'wordCount'>): Promise<number> {
  return db.lessons.add({
    ...lesson,
    createdAt: new Date(),
    wordCount: 0,
  });
}

export async function updateLesson(id: number, data: Partial<Lesson>): Promise<number> {
  return db.lessons.update(id, data);
}

export async function deleteLesson(id: number): Promise<void> {
  await db.words.where('lessonId').equals(id).delete();
  await db.wordProgress.where('wordId').anyOf(
    (await db.words.where('lessonId').equals(id).toArray()).map(w => w.id!)
  ).delete();
  await db.lessons.delete(id);
}

// ── Words ──
export async function getWordsByLesson(lessonId: number): Promise<Word[]> {
  return db.words.where('lessonId').equals(lessonId).toArray();
}

export async function addWord(word: Omit<Word, 'id' | 'createdAt'>): Promise<number> {
  const id = await db.words.add({ ...word, createdAt: new Date() });
  const lesson = await db.lessons.get(word.lessonId);
  if (lesson) {
    await db.lessons.update(word.lessonId, { wordCount: (lesson.wordCount || 0) + 1 });
  }
  return id;
}

export async function updateWord(id: number, data: Partial<Word>): Promise<number> {
  return db.words.update(id, data);
}

export async function deleteWord(id: number): Promise<void> {
  const word = await db.words.get(id);
  if (word) {
    await db.wordProgress.where('wordId').equals(id).delete();
    await db.words.delete(id);
    const lesson = await db.lessons.get(word.lessonId);
    if (lesson) {
      await db.lessons.update(word.lessonId, { wordCount: Math.max(0, (lesson.wordCount || 1) - 1) });
    }
  }
}

// ── Word Progress ──
export async function getWordProgress(wordId: number): Promise<WordProgress | undefined> {
  return db.wordProgress.where('wordId').equals(wordId).first();
}

export async function getAllProgress(): Promise<WordProgress[]> {
  return db.wordProgress.toArray();
}

export async function getLessonProgress(lessonId: number): Promise<WordProgress[]> {
  const words = await getWordsByLesson(lessonId);
  const wordIds = words.map(w => w.id!);
  return db.wordProgress.where('wordId').anyOf(wordIds).toArray();
}

export async function upsertProgress(progress: Omit<WordProgress, 'id'>): Promise<number> {
  const existing = await db.wordProgress.where('wordId').equals(progress.wordId).first();
  if (existing) {
    await db.wordProgress.update(existing.id!, progress);
    return existing.id!;
  }
  return db.wordProgress.add(progress);
}

export async function getDueWords(lessonId: number): Promise<{ word: Word; progress: WordProgress | undefined }[]> {
  const words = await getWordsByLesson(lessonId);
  const now = new Date();
  const results: { word: Word; progress: WordProgress | undefined }[] = [];
  for (const word of words) {
    const progress = await getWordProgress(word.id!);
    if (!progress || !progress.nextReviewDate || progress.nextReviewDate <= now) {
      results.push({ word, progress });
    }
  }
  return results;
}

// ── Daily Logs ──
export async function getDailyLog(date: string): Promise<DailyLog | undefined> {
  return db.dailyLogs.where('date').equals(date).first();
}

export async function getDailyLogs(limit = 30): Promise<DailyLog[]> {
  return db.dailyLogs.orderBy('date').reverse().limit(limit).toArray();
}

export async function upsertDailyLog(log: Omit<DailyLog, 'id'>): Promise<void> {
  const existing = await db.dailyLogs.where('date').equals(log.date).first();
  if (existing) {
    await db.dailyLogs.update(existing.id!, log);
  } else {
    await db.dailyLogs.add(log);
  }
}

// ── Stats ──
export async function getTotalStats() {
  const [lessons, words, progress] = await Promise.all([
    db.lessons.count(),
    db.words.count(),
    db.wordProgress.toArray(),
  ]);
  const mastered = progress.filter(p => p.masteryLevel === 3).length;
  const reviewed = progress.filter(p => p.reviewCount > 0).length;
  return {
    totalLessons: lessons,
    totalWords: words,
    masteredWords: mastered,
    reviewedWords: reviewed,
  };
}

// ── Export / Import ──
export async function exportAllData() {
  const [lessons, words, wordProgress, dailyLogs] = await Promise.all([
    db.lessons.toArray(),
    db.words.toArray(),
    db.wordProgress.toArray(),
    db.dailyLogs.toArray(),
  ]);
  return JSON.stringify({ lessons, words, wordProgress, dailyLogs }, null, 2);
}

export async function bulkAddWords(words: Omit<Word, 'id' | 'createdAt'>[]): Promise<void> {
  if (words.length === 0) return;
  const now = new Date();
  await db.words.bulkAdd(
    words.map(w => ({ ...w, createdAt: now }))
  );
  const lessonIds = [...new Set(words.map(w => w.lessonId))];
  for (const lessonId of lessonIds) {
    const count = await db.words.where('lessonId').equals(lessonId).count();
    await db.lessons.update(lessonId, { wordCount: count });
  }
}

export async function mergeImportWords(words: Omit<Word, 'id' | 'createdAt'>[]): Promise<void> {
  for (const w of words) {
    const all = await db.words.where('lessonId').equals(w.lessonId).toArray();
    const existing = all.find(row => row.word.toLowerCase() === w.word.toLowerCase());
    if (existing) {
      await db.words.update(existing.id!, {
        phrase: w.phrase || existing.phrase,
        chinese: w.chinese || existing.chinese,
        imageUrl: w.imageUrl || existing.imageUrl,
        imageStatus: w.imageUrl ? 'ready' : existing.imageStatus,
      });
    } else {
      await db.words.add({ ...w, createdAt: new Date() });
    }
  }
  const lessonIds = [...new Set(words.map(w => w.lessonId))];
  for (const lessonId of lessonIds) {
    const count = await db.words.where('lessonId').equals(lessonId).count();
    await db.lessons.update(lessonId, { wordCount: count });
  }
}

export async function importAllData(json: string) {
  const data = JSON.parse(json);
  await db.transaction('rw', db.lessons, db.words, db.wordProgress, db.dailyLogs, async () => {
    await db.lessons.clear();
    await db.words.clear();
    await db.wordProgress.clear();
    await db.dailyLogs.clear();
    if (data.lessons) await db.lessons.bulkAdd(data.lessons);
    if (data.words) await db.words.bulkAdd(data.words);
    if (data.wordProgress) await db.wordProgress.bulkAdd(data.wordProgress);
    if (data.dailyLogs) await db.dailyLogs.bulkAdd(data.dailyLogs);
  });
}
