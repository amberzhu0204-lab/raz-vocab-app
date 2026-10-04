import type { CatalogBook, CatalogLevel, Lesson } from '../types';

/**
 * 预置书目：每个系列（级别）里第 1…N 本的书名。
 * 内容来自 public/raz-books.json，只读，不进 IndexedDB。
 */
let cache: CatalogLevel[] | null = null;
let pending: Promise<CatalogLevel[]> | null = null;

export async function loadCatalog(): Promise<CatalogLevel[]> {
  if (cache) return cache;
  if (!pending) {
    pending = fetch(import.meta.env.BASE_URL + 'raz-books.json')
      .then(res => (res.ok ? res.json() : { levels: [] }))
      .then((data: { levels?: CatalogLevel[] }) => {
        cache = data.levels || [];
        return cache;
      })
      .catch(() => {
        cache = [];
        return cache;
      });
  }
  return pending;
}

/** 已经读到内存里的书目（没加载完就是空数组） */
export function peekCatalog(): CatalogLevel[] {
  return cache || [];
}

export function findBook(level: string, bookNumber: number): CatalogBook | undefined {
  return peekCatalog()
    .find(l => l.level === level)
    ?.books.find(b => b.n === bookNumber);
}

/** 「RAZ G 第 30 本」这种展示名，存进 Lesson.name 方便各处直接显示 */
export function bookDisplayName(level: string, bookNumber: number, title: string): string {
  return `RAZ ${level} 第${bookNumber}本 · ${title}`;
}

export function formatLessonName(lesson: Pick<Lesson, 'level' | 'bookNumber' | 'title' | 'name'>): string {
  if (lesson.level && lesson.bookNumber) {
    return `RAZ ${lesson.level} 第${lesson.bookNumber}本`;
  }
  return lesson.name;
}

export function formatLessonTitle(lesson: Pick<Lesson, 'level' | 'bookNumber' | 'title' | 'name'>): string {
  if (lesson.level && lesson.bookNumber) {
    return lesson.title || '';
  }
  return lesson.name;
}

/** 一行以内的短标签，用在列表里 */
export function shortLessonLabel(lesson: Pick<Lesson, 'level' | 'bookNumber' | 'title' | 'name'>): string {
  if (lesson.level && lesson.bookNumber) {
    return lesson.title ? `${lesson.level}${lesson.bookNumber} ${lesson.title}` : `${lesson.level}${lesson.bookNumber}`;
  }
  return lesson.name;
}

/** 按级别分组，级别顺序按 RAZ 的 aa → Z；没有级别的排最后 */
const LEVEL_ORDER = ['aa', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

export function levelRank(level?: string): number {
  if (!level) return 999;
  const i = LEVEL_ORDER.findIndex(l => l.toLowerCase() === level.toLowerCase());
  return i === -1 ? 998 : i;
}

export function groupByLevel<T extends { level?: string; bookNumber?: number }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const key = it.level || '未分类';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  return [...map.entries()]
    .sort((a, b) => levelRank(a[0] === '未分类' ? undefined : a[0]) - levelRank(b[0] === '未分类' ? undefined : b[0]))
    .map(([k, v]) => [k, [...v].sort((a, b) => (a.bookNumber || 0) - (b.bookNumber || 0))]);
}
