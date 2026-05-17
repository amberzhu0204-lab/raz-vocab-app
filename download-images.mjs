import { createWriteStream, readFileSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import { get } from 'https';
import { join } from 'path';

const IMG_DIR = 'public/images';
const DATA_FILE = 'public/raz-import-data.json';

await mkdir(IMG_DIR, { recursive: true });

const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));

function wordToSlug(word) {
  return word.replace(/\s+/g, '-').toLowerCase();
}

function download(url, filepath) {
  return new Promise((resolve) => {
    const file = createWriteStream(filepath);
    get(url, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        download(res.headers.location, filepath).then(resolve);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        console.log(`  HTTP ${res.statusCode}`);
        resolve(false);
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', () => {
      file.close();
      resolve(false);
    });
  });
}

let ok = 0, fail = 0;
const total = data.words.length;
console.log(`Downloading images to ${IMG_DIR}/...\n`);

for (let i = 0; i < data.words.length; i++) {
  const w = data.words[i];
  const slug = wordToSlug(w.word);
  const ext = w.imageUrl?.includes('.png') ? 'png' : 'jpg';
  const filepath = join(IMG_DIR, `${slug}.${ext}`);

  if (!w.imageUrl || w.imageUrl.startsWith('images/')) {
    console.log(`⊘ ${i + 1}/${total} ${w.word} (no URL, skip)`);
    fail++;
    continue;
  }

  const success = await download(w.imageUrl, filepath);
  if (success) {
    // Update to local path
    w.imageUrl = `images/${slug}.${ext}`;
    w.imageStatus = 'ready';
    ok++;
    console.log(`✓ ${i + 1}/${total} ${w.word}`);
  } else {
    fail++;
    console.log(`✗ ${i + 1}/${total} ${w.word}`);
  }

  // Small delay to be nice
  if (i % 3 === 2) await new Promise(r => setTimeout(r, 300));
}

// Save updated data with local paths
writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log(`\nDone! Downloaded ${ok}, failed ${fail}/${total}.`);
