import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = resolve(__dirname, 'public', 'raz-import-data.json');
const IMAGES_DIR = resolve(__dirname, 'public', 'images');
const IMAGE_EXT = 'png';

// ── SiliconFlow API ──
function loadApiKey() {
  const envPath = resolve(__dirname, '.env.local');
  const env = readFileSync(envPath, 'utf-8');
  const match = env.match(/SILICONFLOW_API_KEY=(.+)/);
  if (!match) throw new Error('API key not found');
  return match[1].trim();
}
const API_KEY = loadApiKey();
const API_URL = 'https://api.siliconflow.cn/v1/images/generations';
const MODEL = 'Kwai-Kolors/Kolors';

function toSlug(word) {
  return word.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── Prompt template (Super Wings style) ──
function buildPrompt(word, type) {
  const base = `Super Wings animation style, 3D, bright colors, clean edges, soft global illumination, kid-friendly, no text, no watermark, wide shot, clear spatial relationships, educational scene for learning prepositions`;
  if (type === 'verb') return `A cute 3D Super Wings character ${word}ing, ${base}`;
  if (type === 'adjective') return `A cute 3D Super Wings character looking ${word}, ${base}`;
  return `A cute 3D ${word}, ${base}`;
}

async function generateImage(prompt) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, prompt, image_size: '512x512' }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.images?.[0]?.url;
}

async function downloadImage(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(filepath, buffer);
  return buffer.length;
}

// ── New lessons and words ──
const NEW_DATA = [
  {
    lesson: { id: 13, name: 'RAZ 38: Hooray for the Farmer\'s Market' },
    words: [
      ['Farmer', 'noun'], ['Baker', 'noun'], ['Gardener', 'noun'],
      ['Artist', 'noun'], ['Band', 'noun'], ['Make friends', 'verb'],
    ],
  },
  {
    lesson: { id: 14, name: 'RAZ 39: Fantastic Phil' },
    words: [
      ['Family', 'noun'], ['Alphabet', 'noun'], ['Find a photo', 'verb'],
      ['Dolphin', 'noun'], ['Phantom', 'noun'], ['Triump', 'noun'],
      ['Busy', 'adjective'], ['Relief', 'noun'],
    ],
  },
  {
    lesson: { id: 15, name: 'RAZ 40: Shoes Men Wear' },
    words: [
      ['Flip flop', 'noun'], ['Sneaker', 'noun'], ['Cleat', 'noun'],
      ['Soccer', 'noun'], ['Hiking boots', 'noun'], ['Woods', 'noun'],
      ['Work boots', 'noun'], ['Winter boots', 'noun'], ['Wingips', 'noun'],
      ['Slippers', 'noun'], ['Tough', 'adjective'], ['Soft', 'adjective'],
      ['Warm', 'adjective'], ['Pumps', 'noun'],
    ],
  },
  {
    lesson: { id: 16, name: 'RAZ 42: Getting Ready for School' },
    words: [['Backpacker', 'noun']],
  },
  {
    lesson: { id: 17, name: 'RAZ 43: Stop Snoring' },
    words: [
      ['Snore', 'verb'], ['Wake up', 'verb'], ['Squeeze nose', 'verb'],
      ['Keep', 'verb'], ['Tickle', 'verb'], ['Spin chair', 'verb'],
      ['Style sb\'s hair', 'verb'], ['Tired', 'adjective'],
    ],
  },
  {
    lesson: { id: 18, name: 'RAZ 44: When I Grow Up' },
    words: [
      ['Stay up late', 'verb'], ['Grow up', 'verb'], ['Go to movies', 'verb'],
      ['Alone', 'adjective'], ['Go out', 'verb'], ['At night', 'adjective'],
    ],
  },
  {
    lesson: { id: 19, name: 'RAZ 45: Make a Tree Friend' },
    words: [
      ['Friend', 'noun'], ['Swing', 'verb'], ['Cry', 'verb'],
      ['Climb', 'verb'], ['Think', 'verb'], ['Count', 'verb'],
      ['Rest', 'verb'], ['Maple tree', 'noun'], ['Apple tree', 'noun'],
      ['Weeping willow', 'noun'], ['Oak tree', 'noun'], ['Birch tree', 'noun'],
      ['Elm tree', 'noun'],
    ],
  },
  {
    lesson: { id: 20, name: 'RAZ 47: Jobs We Do at School' },
    words: [
      ['Line leader', 'noun'], ['Paper collector', 'noun'], ['Paper passer', 'noun'],
      ['Pass out', 'verb'], ['Collect', 'verb'], ['Energy saver', 'noun'],
      ['Turn off lights', 'verb'],
    ],
  },
  {
    lesson: { id: 21, name: 'RAZ 48: What\'s in the Box' },
    words: [
      ['Stamped', 'adjective'], ['Smash', 'verb'], ['Wet', 'adjective'],
      ['Torn', 'adjective'], ['Toss', 'verb'], ['Drop', 'verb'],
      ['Knock', 'verb'], ['Van', 'noun'],
    ],
  },
  {
    lesson: { id: 22, name: 'RAZ 50: Hugs' },
    words: [
      ['Lose', 'verb'], ['Bad', 'adjective'], ['Terrible', 'adjective'],
      ['Rotten', 'adjective'], ['Miserable', 'adjective'], ['Horrible', 'adjective'],
      ['Hug', 'verb'], ['Need', 'verb'], ['Move away', 'verb'],
      ['Have a good day', 'verb'],
    ],
  },
  {
    lesson: { id: 23, name: 'RAZ 51: Lost and Found' },
    words: [
      ['I am lost', 'adjective'], ['Go outside', 'verb'], ['Ask for help', 'verb'],
      ['Stranger', 'noun'], ['Nametag', 'noun'], ['Busy', 'adjective'],
      ['Guard', 'noun'], ['Uniform', 'noun'], ['Call', 'verb'],
      ['Right', 'adjective'], ['Stay put', 'verb'],
    ],
  },
];

// ── Main ──
const MODE = process.argv[2] || 'both'; // 'data' | 'images' | 'both'

async function addData() {
  console.log('=== Adding lessons and words to data file ===\n');
  const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  const existingLessonIds = new Set(data.lessons.map(l => l.id));

  let totalWords = 0;

  for (const { lesson, words } of NEW_DATA) {
    if (!existingLessonIds.has(lesson.id)) {
      data.lessons.push({
        ...lesson,
        createdAt: new Date().toISOString(),
        wordCount: 0,
      });
      console.log(`  + Lesson: ${lesson.name}`);
    } else {
      console.log(`  = Lesson exists: ${lesson.name}`);
    }

    for (const [word, type] of words) {
      const existing = data.words.find(
        w => w.lessonId === lesson.id && w.word.toLowerCase() === word.toLowerCase()
      );
      if (!existing) {
        data.words.push({
          lessonId: lesson.id,
          word,
          chinese: '',
          phrase: '',
          imageUrl: '',
          imageStatus: 'pending',
          createdAt: new Date().toISOString(),
        });
        totalWords++;
      }
    }

    // Update wordCount
    const count = data.words.filter(w => w.lessonId === lesson.id).length;
    const lessonObj = data.lessons.find(l => l.id === lesson.id);
    if (lessonObj) lessonObj.wordCount = count;
  }

  data.dataVersion = (data.dataVersion || 0) + 1;
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n');
  console.log(`\nAdded ${totalWords} new words. dataVersion → ${data.dataVersion}`);
  return data;
}

async function generateImages() {
  console.log('\n=== Generating images ===\n');
  const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  const pending = data.words.filter(w => w.imageStatus === 'pending' || !w.imageUrl);

  console.log(`${pending.length} words need images\n`);

  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

  // Process in batches of 3 with 20s delay to respect IPM limit (~10/min)
  const BATCH = 3;
  const DELAY = 20000; // 20 seconds between batches
  let done = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (w) => {
        const prompt = buildPrompt(w.word, detectType(w));
        const url = await generateImage(prompt);
        const slug = toSlug(w.word);
        const filepath = resolve(IMAGES_DIR, `${slug}.${IMAGE_EXT}`);
        const size = await downloadImage(url, filepath);
        return { word: w.word, slug, size, url };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const { word, slug, size } = r.value;
        const w = data.words.find(
          x => x.word.toLowerCase() === word.toLowerCase() && (x.imageStatus === 'pending' || !x.imageUrl)
        );
        if (w) {
          w.imageUrl = `images/${slug}.${IMAGE_EXT}`;
          w.imageStatus = 'ready';
          done++;
          console.log(`  [${done}/${pending.length}] ${word} (${(size / 1024).toFixed(1)} KB)`);
        }
      } else {
        failed++;
        const msg = r.reason?.message || r.reason;
        console.log(`  [FAIL] ${msg}`);
        // If rate limited, wait extra
        if (msg.includes('429') || msg.includes('rate')) {
          console.log(`  Rate limited, waiting 60s...`);
          await new Promise(r => setTimeout(r, 60000));
        }
      }
    }

    // Save progress after each batch
    data.dataVersion = (data.dataVersion || 0) + 1;
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n');

    // Delay between batches
    if (i + BATCH < pending.length) {
      await new Promise(r => setTimeout(r, DELAY));
    }
  }

  console.log(`\nDone: ${done} generated, ${failed} failed`);
  return data;
}

function detectType(w) {
  // The word objects from NEW_DATA don't carry type, but we encode it in data
  // For regeneration, use simple heuristics
  const lower = w.word.toLowerCase();
  if (lower.endsWith('ing')) return 'verb';
  const adjectives = ['bad','terrible','rotten','miserable','horrible','busy','tough','soft','warm',
    'tired','alone','wet','torn','right','stamped'];
  if (adjectives.includes(lower)) return 'adjective';
  return 'noun';
}

async function main() {
  if (MODE === 'data' || MODE === 'both') {
    await addData();
  }
  if (MODE === 'images' || MODE === 'both') {
    await generateImages();
  }
  console.log('\nAll done!');
}

main().catch(e => { console.error(e); process.exit(1); });
