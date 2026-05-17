import { readdirSync, readFileSync, writeFileSync } from 'fs';

const IMG_DIR = 'public/images';
const DATA_FILE = 'public/raz-import-data.json';

// Get available image files
let files;
try {
  files = readdirSync(IMG_DIR).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
} catch {
  console.log('No images/ directory yet. Create it and add images named like:');
  console.log('  blastoff.jpg, control-room.jpg, space-exploration.jpg\n');
  console.log('Naming: word in lowercase, spaces → hyphens');
  process.exit(0);
}

if (files.length === 0) {
  console.log('No images found in public/images/');
  console.log('Add images named like: blastoff.jpg, crowd.jpg, control-room.jpg');
  process.exit(0);
}

console.log(`Found ${files.length} images in ${IMG_DIR}/`);

const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));

function wordToSlug(word) {
  return word.replace(/\s+/g, '-').toLowerCase();
}

// Build a lookup: slug → filename (without ext)
const imageMap = new Map();
for (const f of files) {
  const name = f.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
  imageMap.set(name.toLowerCase(), f);
}

let local = 0;
for (const w of data.words) {
  const slug = wordToSlug(w.word);
  const filename = imageMap.get(slug);
  if (filename) {
    w.imageUrl = `images/${filename}`;
    w.imageStatus = 'ready';
    local++;
  }
}

writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

console.log(`Mapped ${local}/${data.words.length} words to local images.`);
if (local < data.words.length) {
  console.log('\nMissing images for:');
  for (const w of data.words) {
    if (!w.imageUrl.startsWith('images/')) {
      console.log(`  ${wordToSlug(w.word)}.jpg  ← "${w.word}"`);
    }
  }
}
