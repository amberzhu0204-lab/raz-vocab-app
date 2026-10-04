import Dexie, { type Table } from 'dexie';
import type {
  Lesson, Word, WordProgress, DailyLog, ReadingLog, ReviewLog, ReviewOutcome,
} from '../types';
import { bookDisplayName } from '../utils/catalog';

export class RazVocabDB extends Dexie {
  lessons!: Table<Lesson, number>;
  words!: Table<Word, number>;
  wordProgress!: Table<WordProgress, number>;
  dailyLogs!: Table<DailyLog, number>;
  readingLogs!: Table<ReadingLog, number>;
  reviewLogs!: Table<ReviewLog, number>;

  constructor() {
    super('RazVocabDB');
    // v1 已发布，切勿改动这一块（改动索引会触发重建）
    this.version(1).stores({
      lessons: '++id, name, createdAt',
      words: '++id, lessonId, word, imageStatus',
      wordProgress: '++id, wordId, masteryLevel, lastReviewed, nextReviewDate',
      dailyLogs: '++id, date, lessonId',
    });
    // v2 只声明新增的表，老表数据自动继承
    this.version(2).stores({
      readingLogs: '++id, date, lessonId',
      reviewLogs: '++id, wordId, lessonId, date, result, reviewedAt',
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

/**
 * 从预置书目里挑一本书：已经有课就用它，没有就按书目建一条。
 * 家长每天只需要「选第几本」，不用再手打书名。
 */
export async function findOrCreateLessonByBook(params: {
  level: string;
  bookNumber: number;
  title: string;
  description?: string;
}): Promise<Lesson> {
  const existing = (await db.lessons.toArray()).find(
    l => l.level === params.level && l.bookNumber === params.bookNumber
  );
  if (existing) return existing;

  const id = await db.lessons.add({
    name: bookDisplayName(params.level, params.bookNumber, params.title),
    description: params.description || '',
    level: params.level,
    bookNumber: params.bookNumber,
    title: params.title,
    createdAt: new Date(),
    wordCount: 0,
  });
  return (await db.lessons.get(id))!;
}

/** 书目里没有的书：按书名找，找不到就建一条没有级别的新课 */
export async function findOrCreateLessonByName(name: string): Promise<Lesson> {
  const trimmed = name.trim();
  const existing = (await db.lessons.toArray()).find(l => l.name === trimmed);
  if (existing) return existing;
  const id = await db.lessons.add({
    name: trimmed,
    description: '',
    createdAt: new Date(),
    wordCount: 0,
  });
  return (await db.lessons.get(id))!;
}

/** 清空全部内容（课程 / 单词 / 进度 / 各种日志）。书目是预置的，不受影响。 */
export async function resetAllContent(): Promise<void> {
  await db.transaction(
    'rw',
    [db.lessons, db.words, db.wordProgress, db.dailyLogs, db.readingLogs, db.reviewLogs],
    async () => {
      await Promise.all([
        db.lessons.clear(),
        db.words.clear(),
        db.wordProgress.clear(),
        db.dailyLogs.clear(),
        db.readingLogs.clear(),
        db.reviewLogs.clear(),
      ]);
    }
  );
}

export async function deleteLesson(id: number): Promise<void> {
  // 先拿到单词 id，再删单词 —— 顺序反了的话第二次查询恒为空
  const words = await db.words.where('lessonId').equals(id).toArray();
  const wordIds = words.map(w => w.id!).filter(Boolean);

  await db.transaction(
    'rw',
    [db.lessons, db.words, db.wordProgress, db.reviewLogs, db.readingLogs],
    async () => {
      if (wordIds.length > 0) {
        await db.wordProgress.where('wordId').anyOf(wordIds).delete();
        await db.reviewLogs.where('wordId').anyOf(wordIds).delete();
      }
      await db.words.where('lessonId').equals(id).delete();
      await db.reviewLogs.where('lessonId').equals(id).delete();
      await db.readingLogs.where('lessonId').equals(id).delete();
      await db.lessons.delete(id);
    }
  );
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
    await db.reviewLogs.where('wordId').equals(id).delete();
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
  if (wordIds.length === 0) return [];
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

/** 新录的词建一条初始进度：未学，录入日次日首考 */
export async function seedInitialProgress(wordId: number, nextReviewDate: Date): Promise<void> {
  const existing = await db.wordProgress.where('wordId').equals(wordId).first();
  if (existing) return;
  await db.wordProgress.add({
    wordId,
    masteryLevel: 0,
    reviewCount: 0,
    correctCount: 0,
    wrongCount: 0,
    lastReviewed: null,
    nextReviewDate,
  });
}

/** 本课到期（含从未复习）的词 */
export async function getDueWords(lessonId: number): Promise<{ word: Word; progress: WordProgress | undefined }[]> {
  const words = await getWordsByLesson(lessonId);
  const now = new Date();
  const results: { word: Word; progress: WordProgress | undefined }[] = [];
  for (const word of words) {
    const progress = await getWordProgress(word.id!);
    if (isDue(progress, now)) results.push({ word, progress });
  }
  return sortByUrgency(results);
}

/**
 * 全部课程到期（含从未复习）的词。
 * 注意：不能用 where('nextReviewDate').belowOrEqual(now) —— 从未复习的词没有
 * progress 行、且 nextReviewDate: null 不是合法索引键，两种词都会被索引查询漏掉。
 */
export async function getAllDueWords(): Promise<{ word: Word; progress: WordProgress | undefined }[]> {
  const now = new Date();
  const [words, progress] = await Promise.all([
    db.words.toArray(),
    db.wordProgress.toArray(),
  ]);
  const byWord = new Map<number, WordProgress>();
  for (const p of progress) byWord.set(p.wordId, p);

  const results = words
    .map(word => ({ word, progress: byWord.get(word.id!) }))
    .filter(({ progress: p }) => isDue(p, now));

  return sortByUrgency(results);
}

function isDue(progress: WordProgress | undefined, now: Date): boolean {
  if (!progress || !progress.nextReviewDate) return true;
  return progress.nextReviewDate <= now;
}

/** 逾期最久的排前面，从没学过的新词排最后 */
function sortByUrgency(
  items: { word: Word; progress: WordProgress | undefined }[]
): { word: Word; progress: WordProgress | undefined }[] {
  return [...items].sort((a, b) => {
    const at = a.progress?.nextReviewDate ? new Date(a.progress.nextReviewDate).getTime() : Number.POSITIVE_INFINITY;
    const bt = b.progress?.nextReviewDate ? new Date(b.progress.nextReviewDate).getTime() : Number.POSITIVE_INFINITY;
    return at - bt;
  });
}

// ── Reading Logs（今天读了哪本书）──
export async function addReadingLog(log: Omit<ReadingLog, 'id' | 'createdAt'>): Promise<number | undefined> {
  const existing = await db.readingLogs
    .where('date').equals(log.date)
    .filter(r => r.lessonId === log.lessonId)
    .first();
  if (existing) return existing.id;
  return db.readingLogs.add({ ...log, createdAt: new Date() });
}

export async function getReadingLogs(limit = 60): Promise<ReadingLog[]> {
  return db.readingLogs.orderBy('date').reverse().limit(limit).toArray();
}

export async function getReadingLogsByDate(date: string): Promise<ReadingLog[]> {
  return db.readingLogs.where('date').equals(date).toArray();
}

// ── Review Logs（逐词复习明细）──
export async function addReviewLog(log: Omit<ReviewLog, 'id'>): Promise<number> {
  return db.reviewLogs.add(log);
}

export async function getReviewLogs(limit = 200): Promise<ReviewLog[]> {
  return db.reviewLogs.orderBy('reviewedAt').reverse().limit(limit).toArray();
}

export async function getReviewLogsByDate(date: string): Promise<ReviewLog[]> {
  return db.reviewLogs.where('date').equals(date).toArray();
}

export async function getReviewLogsByWord(wordId: number): Promise<ReviewLog[]> {
  return db.reviewLogs.where('wordId').equals(wordId).sortBy('reviewedAt');
}

/** 记一次复习：更新进度 + 写一条明细 */
export async function recordReview(params: {
  wordId: number;
  lessonId: number;
  date: string;
  result: ReviewOutcome;
  progress: Omit<WordProgress, 'id' | 'wordId'>;
}): Promise<void> {
  await upsertProgress({ wordId: params.wordId, ...params.progress });
  await addReviewLog({
    wordId: params.wordId,
    lessonId: params.lessonId,
    date: params.date,
    result: params.result,
    reviewedAt: new Date(),
  });
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
  const mastered = progress.filter(p => p.masteryLevel === 5).length;
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
  const [lessons, words, wordProgress, dailyLogs, readingLogs, reviewLogs] = await Promise.all([
    db.lessons.toArray(),
    db.words.toArray(),
    db.wordProgress.toArray(),
    db.dailyLogs.toArray(),
    db.readingLogs.toArray(),
    db.reviewLogs.toArray(),
  ]);
  return JSON.stringify(
    {
      // 标记出这是「完整备份」而不是单纯一份词表，导入时据此判断
      kind: 'raz-vocab-full-backup',
      exportedAt: new Date().toISOString(),
      lessons, words, wordProgress, dailyLogs, readingLogs, reviewLogs,
    },
    null,
    2
  );
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
        // 不覆盖用户自己录的例句
        example: existing.example || w.example,
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

/** JSON 里 Date 会变成字符串，读回来要还原，否则排序和日期计算会错 */
function reviveDates<T>(rows: T[] | undefined, fields: (keyof T)[]): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => {
    const out: any = { ...row };
    for (const f of fields) {
      if (typeof out[f] === 'string') out[f] = new Date(out[f]);
    }
    return out as T;
  });
}

/**
 * 从完整备份覆盖恢复（不是合并）—— 调用前必须让用户确认过。
 * 保留原 id，所以复习进度能重新挂回对应的词上。
 */
export async function importAllData(json: string) {
  const data = JSON.parse(json);
  await db.transaction(
    'rw',
    [db.lessons, db.words, db.wordProgress, db.dailyLogs, db.readingLogs, db.reviewLogs],
    async () => {
      await db.lessons.clear();
      await db.words.clear();
      await db.wordProgress.clear();
      await db.dailyLogs.clear();
      await db.readingLogs.clear();
      await db.reviewLogs.clear();
      await db.lessons.bulkAdd(reviveDates<any>(data.lessons, ['createdAt']));
      await db.words.bulkAdd(reviveDates<any>(data.words, ['createdAt']));
      // nextReviewDate 必须是真正的 Date：它是拿 `<= new Date()` 比较的，
      // 留成字符串会得到 NaN 比较 → 恢复出来的词永远不到期
      await db.wordProgress.bulkAdd(
        reviveDates<any>(data.wordProgress, ['lastReviewed', 'nextReviewDate'])
      );
      await db.dailyLogs.bulkAdd(reviveDates<any>(data.dailyLogs, []));
      await db.readingLogs.bulkAdd(reviveDates<any>(data.readingLogs, ['createdAt']));
      await db.reviewLogs.bulkAdd(reviveDates<any>(data.reviewLogs, ['reviewedAt']));
    }
  );
}
