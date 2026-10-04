#!/usr/bin/env python3
"""
生成 public/word-hints.json —— 录生词时「只打英文，中文和例句自动补上」的速查表。

中文释义来自 ECDICT（https://github.com/skywind3000/ECDICT，本地 csv，不打包进 App）。
例句不是词典例句，而是从孩子读过的课文正文里抽的 —— 优先选包含该词、长度适中、
小写形态出现（不是人名）的那一句，这样孩子看到的是自己读过的那句话。

用法：
    python3 scripts/build-word-hints.py --ecdict /tmp/ecdict.csv

重录 H 级时：把 ECDICT 换掉不用动，只要 public/raz-books.json 里有 H 级，
脚本会自动把所有级别的课文都吃进来。
"""
import argparse
import collections
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ── 中文释义裁剪 ────────────────────────────────────────────────
# ECDICT 的 translation 是成人词典口味（「n. 外壳, 坚硬外皮, 面包皮 / vt. 盖以硬皮」），
# 而且常带 [计] [医] [化] 这种领域标签。裁到最常用的两个词性、每个词性最多三个义项。
MAX_POS = 2
MAX_SENSES = 3
MAX_ZH_LEN = 34


def clean_zh(translation: str) -> str:
    segs = [s.strip() for s in (translation or '').split('\\n') if s.strip()]
    segs = [s for s in segs if not s.startswith('[')]  # 丢领域标签
    out = []
    for seg in segs[:MAX_POS]:
        m = re.match(r'^([a-z]+\.)\s*(.*)$', seg)
        pos, body = (m.group(1), m.group(2)) if m else ('', seg)
        senses = [x.strip() for x in re.split(r'[,，;；]', body) if x.strip()]
        out.append(f"{pos} {', '.join(senses[:MAX_SENSES])}".strip())
    zh = '；'.join(out)
    if len(zh) > MAX_ZH_LEN:
        zh = zh[:MAX_ZH_LEN].rstrip(' ,，、;；') + '…'
    return zh


INFLECTION_KINDS = ('s', 'p', 'i', 'd', '3', 't', 'r')


def load_ecdict(path: Path) -> tuple[dict, dict, dict]:
    """返回 (词条表, 变形→原形, 原形→全部变形)。"""
    entries: dict[str, dict] = {}
    form_to_lemma: dict[str, str] = {}
    lemma_to_forms: dict[str, set] = {}
    with open(path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            w = (row.get('word') or '').strip().lower()
            if not w or w in entries:
                continue
            entries[w] = row
            # exchange 形如 "s:buttons/p:buttoned/i:buttoning/d:buttoned/3:buttons"
            for part in (row.get('exchange') or '').split('/'):
                if ':' not in part:
                    continue
                kind, form = part.split(':', 1)
                form = form.strip().lower()
                if form and kind in INFLECTION_KINDS:
                    form_to_lemma.setdefault(form, w)
                    lemma_to_forms.setdefault(w, set()).add(form)
    return entries, form_to_lemma, lemma_to_forms


# 能开启一个新句子的词（限定词 / 代词 / 祈使动词）。标题的最后一个词如果落在
# 这个集合里，说明那个词属于后一句，不是标题的一部分。
STARTERS = {
    'a', 'an', 'the', 'this', 'these', 'that', 'those', 'you', 'it', 'they', 'we', 'he', 'she',
    'who', 'what', 'how', 'why', 'where', 'when', 'come', 'look', 'let', 'use', 'fill', 'pick',
    'dig', 'move', 'practice', 'crawl', 'never', 'always', 'do', 'does', 'did', 'can', 'will',
    'would',
}
CAP_RUN = re.compile(r"^(?:[A-Z][a-zA-Z'\-]*(?:\s+|$))+")


def strip_heading(s: str) -> str:
    """这些 RAZ 书里的小标题（Houses / Cabins / Sound One…）和正文挤在同一行，
    切句时会粘在句子前面，例如「Cabins A cabin is another kind of home.」。
    这里把小标题摘掉。判据：句首一长串连续的大写词是标题，真正的句子从
    其中一个「能起头新句子的词」开始。摘不准时宁可不摘 —— 用宽松规则会把
    「Harriet Tubman was a hero.」切成「Tubman was a hero.」。"""
    m = CAP_RUN.match(s)
    if not m:
        return s
    run = m.group(0).split()
    rest = s[m.end():].strip()
    if not rest:
        return s
    first = re.sub(r'[^a-zA-Z]', '', rest.split()[0]).lower()
    if rest[0].isupper() and len(run) >= 2 and first in STARTERS:
        keep = 0                      # 连续大写词整段都是标题
    elif len(run) >= 2 and run[-1].lower() in STARTERS:
        keep = 1                      # 只有最后一个词属于后一句
    else:
        return s
    toks = s.split(' ')
    new = ' '.join(toks[len(run) - keep:]).strip()
    return new if len(new) >= 12 else s


def build_sentences(books: list[dict]) -> list[tuple[str, str, str]]:
    """切句：(原文, 小写, 书名)。先按行切（正文基本一行一句），去掉书名行。"""
    out = []
    for b in books:
        title = (b.get('title') or '').strip().lower()
        for line in (b.get('text') or '').split('\n'):
            line = line.strip()
            if not line or line.lower() == title:
                continue
            for s in re.split(r'(?<=[.!?])\s+', line):
                s = strip_heading(s.strip())
                if 10 <= len(s) <= 120:
                    out.append((s, s.lower(), b.get('title') or ''))
    return out


def word_re(w: str) -> re.Pattern:
    return re.compile(rf"(?<![A-Za-z]){re.escape(w)}(?![A-Za-z])")


def pick_sentence(key: str, forms: list[str], index: dict) -> str:
    """给 key 挑一句最像样的例句。forms 里第一个是原形，优先用原形本身的句子。"""
    seen = set()
    scored = []
    for rank, form in enumerate(forms):
        exact = 0 if form == key else 1
        for sent, low, book in index.get(form, []):
            if sent in seen:
                continue
            seen.add(sent)
            n = len(sent.split())
            if not (5 <= n <= 14):
                continue
            if sent.count('"') % 2:      # 引号不成对 = 从对话里截出来的半截话
                continue
            hit = word_re(form).search(sent)
            if not hit:
                continue
            # 打分优先级：
            # 1. 这句里出现的就是原形本身（"lose" 别抽到 "I am lost!"）
            # 2. 没有引号 —— 对话句常是半截话，旁白句更适合当例句
            # 3. 小写出现（说明不是人名）
            # 4. 不在句首
            # 5. 越短越好
            no_quote = 0 if '"' not in sent else 1
            lower_ok = 0 if hit.group(0).islower() else 1
            not_first = 0 if hit.start() > 0 else 1
            scored.append((exact, rank, no_quote, lower_ok, not_first, n, sent))
    if not scored:
        return ''
    scored.sort(key=lambda x: x[:6])
    return scored[0][6]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--ecdict', default='/tmp/ecdict.csv')
    ap.add_argument('--catalog', default=str(ROOT / 'public' / 'raz-books.json'))
    ap.add_argument('--out', default=str(ROOT / 'public' / 'word-hints.json'))
    args = ap.parse_args()

    ecdict_path = Path(args.ecdict)
    if not ecdict_path.exists():
        print(f'找不到词典 {ecdict_path}', file=sys.stderr)
        return 1

    entries, form_to_lemma, lemma_to_forms = load_ecdict(ecdict_path)
    catalog = json.loads(Path(args.catalog).read_text(encoding='utf-8'))

    books_all, books_by_level = [], {}
    for lv in catalog.get('levels', []):
        books_by_level[lv['level']] = lv.get('books', [])
        books_all.extend(lv.get('books', []))

    sentences = build_sentences(books_all)
    index: dict[str, list] = collections.defaultdict(list)
    for sent, low, book in sentences:
        for w in set(re.findall(r"[A-Za-z][A-Za-z'-]*", sent)):
            index[w.lower()].append((sent, low, book))

    # 课文里出现过的每个词形，按词典的变形表归到原形下
    surface_forms = {w for w in index if len(w) > 1 and re.fullmatch(r"[a-z][a-z'-]*", w)}
    by_lemma: dict[str, set[str]] = collections.defaultdict(set)
    for form in surface_forms:
        by_lemma[form_to_lemma.get(form, form)].add(form)

    def zh_of(lemma: str, forms: list[str]) -> str:
        """释义一律取原形的 —— 变形的独立词条经常是别的义项
        （wings 在 ECDICT 里是「舞台两侧」，wing 才是「翅膀」）。"""
        for cand in [lemma] + forms:
            if cand in entries:
                zh = clean_zh(entries[cand]['translation'])
                if zh:
                    return zh
        return ''

    words: dict[str, dict] = {}

    def put(key: str, zh: str, ex: str) -> None:
        if key in words or (not zh and not ex):
            return
        item = {}
        if zh:
            item['zh'] = zh
        if ex:
            item['ex'] = ex
        words[key] = item

    for lemma, group in by_lemma.items():
        forms = sorted(group)
        ordered = [lemma] + [f for f in forms if f != lemma]
        zh = zh_of(lemma, forms)
        ex_lemma = pick_sentence(lemma, ordered, index)

        put(lemma, zh, ex_lemma)
        for form in forms:
            if form == lemma:
                continue
            # 变形自己的句子优先；它要是对话句而原形那句是旁白，就用原形的
            # （课文里的对话经常 OCR 得七零八落，旁白句干净得多）
            own = pick_sentence(form, [form], index)
            ex = own or ex_lemma
            if own and '"' in own and ex_lemma and '"' not in ex_lemma:
                ex = ex_lemma
            put(form, zh, ex)
        # 词典知道是这个词的变形、课文里没出现的（losing / climbing 这种），
        # 也建一条，这样家长打原形或变形都能查到
        for form in sorted(lemma_to_forms.get(lemma, ())):
            if len(form) < 2 or form in by_lemma:
                continue          # 有自己的词条，交给它自己的组，别抢
            put(form, zh, ex_lemma)

    payload = {
        'version': 1,
        'note': '录生词时自动补中文/例句的速查表。由 scripts/build-word-hints.py 生成，勿手改。',
        'words': dict(sorted(words.items())),
    }
    out = Path(args.out)
    out.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    with_zh = sum(1 for v in words.values() if v.get('zh'))
    with_ex = sum(1 for v in words.values() if v.get('ex'))
    print(f'课文 {len(books_all)} 本 · 句子 {len(sentences)} 句 · 词形 {len(surface_forms)} 个')
    print(f'输出 {len(words)} 条（有中文 {with_zh}，有例句 {with_ex}）→ {out} ({out.stat().st_size / 1024:.0f} KB)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
