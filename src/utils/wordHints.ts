import type { WordHint } from '../types';

/**
 * 生词速查表：录生词时只打英文，中文和例句自动补上。
 *
 * 内容来自 public/word-hints.json（由 scripts/build-word-hints.py 生成，只读、不进 IndexedDB）。
 * 中文释义取自 ECDICT 离线词典；例句是从孩子读过的课文正文里抽的原句 ——
 * 所以孩子复习时看到的是自己读过的那句话，不是词典例句。
 */
let cache: Record<string, WordHint> | null = null;
let pending: Promise<Record<string, WordHint>> | null = null;

export async function loadWordHints(): Promise<Record<string, WordHint>> {
  if (cache) return cache;
  if (!pending) {
    pending = fetch(import.meta.env.BASE_URL + 'word-hints.json')
      .then(res => (res.ok ? res.json() : { words: {} }))
      .then((data: { words?: Record<string, WordHint> }) => {
        cache = data.words || {};
        return cache;
      })
      .catch(() => {
        cache = {};
        return cache;
      });
  }
  return pending;
}

/** 已经读到内存里的词表（没加载完就是 null） */
export function peekWordHints(): Record<string, WordHint> | null {
  return cache;
}

/** 查一个词的释义和例句。查不到返回 undefined —— 那就让家长自己填，别瞎猜。 */
export function lookupWordHint(word: string): WordHint | undefined {
  const key = word.trim().toLowerCase();
  if (!key || !cache) return undefined;
  return cache[key];
}

/**
 * 把一个词的中文/例句填进现有内容里。
 *
 * 默认只填「还空着」或「上次就是我们自动填的」字段 —— 家长手改过的一律不动，
 * 这样边改边重打英文也不会把家长的修改冲掉。force=true 时（手动点 ✨）才覆盖。
 */
export function applyHint(
  word: string,
  current: { chinese: string; example: string },
  lastAuto?: { chinese?: string; example?: string },
  force = false,
): { chinese: string; example: string; auto: { chinese?: string; example?: string } } | null {
  const hint = lookupWordHint(word);
  if (!hint) return null;

  const free = (cur: string, last?: string) =>
    force || !cur.trim() || (!!last && cur.trim() === last.trim());

  const next = {
    chinese: hint.zh && free(current.chinese, lastAuto?.chinese) ? hint.zh : current.chinese,
    example: hint.ex && free(current.example, lastAuto?.example) ? hint.ex : current.example,
  };
  if (next.chinese === current.chinese && next.example === current.example) return null;

  return { ...next, auto: { chinese: hint.zh, example: hint.ex } };
}
