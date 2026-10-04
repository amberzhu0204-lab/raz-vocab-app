import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load API key from .env.local
function loadApiKey() {
  const envPath = resolve(__dirname, '.env.local');
  if (!existsSync(envPath)) {
    console.error('Missing .env.local file');
    process.exit(1);
  }
  const env = readFileSync(envPath, 'utf-8');
  const match = env.match(/SILICONFLOW_API_KEY=(.+)/);
  if (!match) {
    console.error('SILICONFLOW_API_KEY not found in .env.local');
    process.exit(1);
  }
  return match[1].trim();
}

const API_KEY = loadApiKey();
const API_URL = 'https://api.siliconflow.cn/v1/images/generations';
const MODEL = 'Kwai-Kolors/Kolors';
const IMAGE_SIZE = '512x512';
const IMAGE_EXT = 'png';
const IMAGES_DIR = resolve(__dirname, 'public', 'images');
const DATA_FILE = resolve(__dirname, 'public', 'raz-import-data.json');

// ── Word type detection ──
const VERB_SUFFIXES = ['ing', 'ize', 'ate', 'ify', 'ise'];
const KNOWN_VERBS = new Set([
  'find out', 'come', 'do tricks', 'park cars', 'work', 'pick out', 'stir', 'spill',
  'carve', 'cut out', 'scoop out', 'bake', 'draw', 'celebrate', 'light candles',
  'share', 'make crafts', 'eat a feast', 'build', 'start', 'lean', 'dig', 'stop',
  'remove', 'get in the way', 'take away', 'clean', 'notice', 'look at', 'shake head',
  'tend gardens', 'reuse', 'recycle', 'save water', 'sit', 'stand',
  'make friends', 'find a photo', 'snore', 'wake up', 'squeeze nose', 'keep', 'tickle',
  'spin chair', 'style sb\'s hair', 'stay up late', 'grow up', 'go to movies', 'go out',
  'swing', 'cry', 'climb', 'think', 'count', 'rest', 'pass out', 'collect',
  'turn off lights', 'smash', 'toss', 'drop', 'knock', 'lose', 'hug', 'need',
  'move away', 'have a good day', 'go outside', 'ask for help', 'call', 'stay put',
]);
const KNOWN_ADJECTIVES = new Set([
  'thirsty', 'skinny', 'safe', 'in different ways', 'behind', 'right away', 'inside',
  'muddy', 'soft', 'busy', 'tough', 'warm', 'tired', 'alone', 'wet', 'torn',
  'bad', 'terrible', 'rotten', 'miserable', 'horrible', 'stamped', 'right',
  'at night', 'i am lost',
]);

function detectWordType(word, chinese) {
  const lower = word.toLowerCase().trim();
  if (KNOWN_VERBS.has(lower)) return 'verb';
  if (KNOWN_ADJECTIVES.has(lower)) return 'adjective';
  if (lower.endsWith('ing')) return 'verb';
  if (chinese && chinese.endsWith('的')) return 'adjective';
  return 'noun';
}

function buildPrompt(word, wordType) {
  const base = `Super Wings animation style, 3D, bright colors, clean edges, soft global illumination, kid-friendly, no text, no watermark, wide shot, clear spatial relationships, educational scene for learning prepositions`;
  const templates = {
    noun: `A cute 3D ${word}, ${base}`,
    verb: `A cute 3D Super Wings character ${word}ing, ${base}`,
    adjective: `A cute 3D Super Wings character looking ${word}, ${base}`,
  };
  return templates[wordType] || templates.noun;
}

function toSlug(word) {
  return word.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function generateImage(prompt) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      image_size: IMAGE_SIZE,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.images?.[0]?.url;
}

async function downloadImage(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });
  writeFileSync(filepath, buffer);
  console.log(`  Saved: ${filepath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

function updateDataFile(word, slug, wordType) {
  const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  const imageUrl = `images/${slug}.${IMAGE_EXT}`;

  let found = false;
  for (const w of data.words) {
    if (w.word.toLowerCase() === word.toLowerCase()) {
      w.imageUrl = imageUrl;
      w.imageStatus = 'ready';
      found = true;
      console.log(`  Updated: "${w.word}" → ${imageUrl}`);
    }
  }

  if (found) {
    data.dataVersion = (data.dataVersion || 0) + 1;
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n');
    console.log(`  dataVersion bumped to ${data.dataVersion}`);
  } else {
    console.log(`  ⚠ Word "${word}" not found in data file. Image generated but data NOT updated.`);
    console.log(`  Image saved at: ${imageUrl}`);
  }
}

// ── Main ──
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node generate-image.mjs <word> [--type noun|verb|adjective]');
    console.log('       node generate-image.mjs "adult"');
    console.log('       node generate-image.mjs "carve" --type verb');
    process.exit(1);
  }

  const word = args[0];
  const typeArgIndex = args.indexOf('--type');
  const wordType = typeArgIndex !== -1 ? args[typeArgIndex + 1] : detectWordType(word, '');

  const slug = toSlug(word);
  const prompt = buildPrompt(word, wordType);

  console.log(`Word: ${word}`);
  console.log(`Type: ${wordType} (auto-detected)`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Generating...`);

  try {
    const imageUrl = await generateImage(prompt);
    if (!imageUrl) {
      console.error('No image URL in response');
      process.exit(1);
    }
    console.log(`  Generated: ${imageUrl}`);

    const filepath = resolve(IMAGES_DIR, `${slug}.${IMAGE_EXT}`);
    await downloadImage(imageUrl, filepath);

    updateDataFile(word, slug, wordType);

    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
