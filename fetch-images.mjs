import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('public/raz-import-data.json', 'utf8'));
const words = data.words;

function extractUrl(html) {
  // Prefer regular photos (images.unsplash.com) over premium (plus.unsplash.com) — they load faster
  const regular = html.match(/[+/](photo-[A-Za-z0-9_-]{10,})/);
  if (regular && !regular[1].startsWith('premium_')) {
    return `https://images.unsplash.com/${regular[1]}?w=400&h=400&fit=crop`;
  }
  const premium = html.match(/[+/](premium_photo-[A-Za-z0-9_-]{10,})/);
  if (premium) {
    return `https://plus.unsplash.com/${premium[1]}?w=400&h=400&fit=crop`;
  }
  return '';
}

function searchUnsplash(word) {
  const query = word.replace(/\s+/g, '-').toLowerCase();
  const cmd = `curl -s --max-time 8 --connect-timeout 5 -r 0-65536 --compressed "https://unsplash.com/s/photos/${query}" 2>/dev/null`;
  try {
    const html = execSync(cmd, { timeout: 12000, encoding: 'utf8', maxBuffer: 512 * 1024 });
    return extractUrl(html);
  } catch (e) {
    if (e.stdout) return extractUrl(e.stdout);
  }
  return '';
}

let found = 0;
const start = Date.now();
console.log(`Searching Unsplash for ${words.length} words...\n`);

for (let i = 0; i < words.length; i++) {
  const w = words[i];
  const url = searchUnsplash(w.word);
  if (url) {
    w.imageUrl = url;
    w.imageStatus = 'ready';
    found++;
    console.log(`✓ ${i + 1}/${words.length} ${w.word}`);
  } else {
    console.log(`✗ ${i + 1}/${words.length} ${w.word}`);
  }
  // Small delay between requests
  if (i % 3 === 2) await new Promise(r => setTimeout(r, 500));
}

writeFileSync('public/raz-import-data.json', JSON.stringify(data, null, 2));
const elapsed = ((Date.now() - start) / 1000).toFixed(0);
console.log(`\nDone! ${found}/${words.length} images found in ${elapsed}s.`);
