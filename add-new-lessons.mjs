import { readFileSync, writeFileSync } from 'fs';

const DATA_FILE = 'public/raz-import-data.json';
const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));

const now = new Date().toISOString();

const newLessons = [
  {
    id: 24,
    name: 'RAZ 58: A Day of Firsts',
    description: '上学第一天',
    createdAt: now,
    wordCount: 0
  },
  {
    id: 25,
    name: 'RAZ 59: All Kinds of Farms',
    description: '各种各样的农场',
    createdAt: now,
    wordCount: 0
  },
  {
    id: 26,
    name: 'RAZ 57: All Kinds of Factories',
    description: '各种各样的工厂',
    createdAt: now,
    wordCount: 0
  }
];

const newWords = [
  // ===== Book 58: A Day of Firsts (Lesson 24) =====
  { lessonId: 24, word: 'First', chinese: '第一次', phrase: 'It is a day of firsts' },
  { lessonId: 24, word: 'First grade', chinese: '一年级', phrase: "It's the first day of first grade" },
  { lessonId: 24, word: 'Pack', chinese: '打包', phrase: 'Students pack yummy lunches' },
  { lessonId: 24, word: 'Yummy', chinese: '好吃的', phrase: 'Students pack yummy lunches' },
  { lessonId: 24, word: 'Exciting', chinese: '令人兴奋的', phrase: 'Students read exciting books' },
  { lessonId: 24, word: 'Lunch', chinese: '午餐', phrase: 'Students pack yummy lunches' },
  { lessonId: 24, word: 'Bus', chinese: '校车', phrase: 'Students ride big buses' },
  { lessonId: 24, word: 'Ride', chinese: '乘坐', phrase: 'Students ride big buses' },
  { lessonId: 24, word: 'Meet', chinese: '见到', phrase: 'Students meet their new teacher' },
  { lessonId: 24, word: 'Teacher', chinese: '老师', phrase: 'Students meet their new teacher' },
  { lessonId: 24, word: 'Desk', chinese: '课桌', phrase: 'Students sit at large desks' },
  { lessonId: 24, word: 'Learn', chinese: '学习', phrase: 'Students learn new things' },
  { lessonId: 24, word: 'Fun', chinese: '好玩的', phrase: 'Students play fun games' },
  { lessonId: 24, word: 'Game', chinese: '游戏', phrase: 'Students play fun games' },
  { lessonId: 24, word: 'Old friend', chinese: '老朋友', phrase: 'Students see old friends too' },

  // ===== Book 59: All Kinds of Farms (Lesson 25) =====
  { lessonId: 25, word: 'Farm', chinese: '农场', phrase: 'Cows live on farms' },
  { lessonId: 25, word: 'Cow', chinese: '奶牛', phrase: 'Cows live on farms' },
  { lessonId: 25, word: 'Milk', chinese: '牛奶', phrase: 'Milk comes from cows' },
  { lessonId: 25, word: 'Cheese', chinese: '奶酪', phrase: 'People make cheese from milk' },
  { lessonId: 25, word: 'Butter', chinese: '黄油', phrase: 'People make butter from milk' },
  { lessonId: 25, word: 'Sheep', chinese: '绵羊', phrase: 'Sheep live on farms' },
  { lessonId: 25, word: 'Wool', chinese: '羊毛', phrase: 'Wool comes from sheep' },
  { lessonId: 25, word: 'Chicken', chinese: '鸡', phrase: 'Chickens live on farms' },
  { lessonId: 25, word: 'Egg', chinese: '鸡蛋', phrase: 'Eggs come from chickens' },
  { lessonId: 25, word: 'Breakfast', chinese: '早餐', phrase: 'People eat eggs for breakfast' },
  { lessonId: 25, word: 'Apple', chinese: '苹果', phrase: 'Apples grow on farms' },
  { lessonId: 25, word: 'Fruit', chinese: '水果', phrase: 'Other fruits grow on farms, too' },
  { lessonId: 25, word: 'Sugarcane', chinese: '甘蔗', phrase: 'Sugarcane grows on farms' },
  { lessonId: 25, word: 'Sugar', chinese: '糖', phrase: 'Sugar comes from sugarcane' },
  { lessonId: 25, word: 'Sweet', chinese: '甜的', phrase: 'Sugar makes foods sweet' },
  { lessonId: 25, word: 'Cotton', chinese: '棉花', phrase: 'Cotton grows on farms' },
  { lessonId: 25, word: 'Clothing', chinese: '衣服', phrase: 'People use cotton to make clothing' },
  { lessonId: 25, word: 'Shirt', chinese: '衬衫', phrase: 'Shirts are made from cotton' },
  { lessonId: 25, word: 'Pants', chinese: '裤子', phrase: 'Pants are made from cotton' },
  { lessonId: 25, word: 'Socks', chinese: '袜子', phrase: 'Socks are made from cotton' },

  // ===== Book 57: All Kinds of Factories (Lesson 26) =====
  { lessonId: 26, word: 'Factory', chinese: '工厂', phrase: 'Factories are big buildings where goods are made' },
  { lessonId: 26, word: 'Goods', chinese: '货物', phrase: 'Factories are big buildings where goods are made' },
  { lessonId: 26, word: 'Building', chinese: '大楼', phrase: 'Factories are big buildings' },
  { lessonId: 26, word: 'Machine', chinese: '机器', phrase: 'Some factories use huge machines' },
  { lessonId: 26, word: 'Huge', chinese: '巨大的', phrase: 'Some factories use huge machines' },
  { lessonId: 26, word: 'Small', chinese: '小的', phrase: 'Some factories use small machines' },
  { lessonId: 26, word: 'Robot', chinese: '机器人', phrase: 'Some factories have robots make goods' },
  { lessonId: 26, word: 'Wood', chinese: '木头', phrase: 'This factory turns wood into paper' },
  { lessonId: 26, word: 'Paper', chinese: '纸', phrase: 'This factory turns wood into paper' },
  { lessonId: 26, word: 'Cloth', chinese: '布', phrase: 'This factory turns cotton into cloth' },
  { lessonId: 26, word: 'Sand', chinese: '沙子', phrase: 'This factory turns sand into glass' },
  { lessonId: 26, word: 'Glass', chinese: '玻璃', phrase: 'This factory turns sand into glass' },
  { lessonId: 26, word: 'Window', chinese: '窗户', phrase: 'People use glass in windows' },
  { lessonId: 26, word: 'Part', chinese: '零件', phrase: 'This factory puts parts together' },
  { lessonId: 26, word: 'Together', chinese: '一起', phrase: 'Put parts together to make cars' },
  { lessonId: 26, word: 'Drive', chinese: '开车', phrase: 'People use cars to drive to different places' },
];

// Check for duplicates
const existingWords = new Set(data.words.map(w => w.word.toLowerCase()));
for (const w of newWords) {
  if (existingWords.has(w.word.toLowerCase())) {
    console.log(`⚠ DUPLICATE: "${w.word}" already exists — skipping`);
  }
}
const uniqueNewWords = newWords.filter(w => !existingWords.has(w.word.toLowerCase()));
console.log(`Adding ${uniqueNewWords.length} new words (${newWords.length - uniqueNewWords.length} duplicates skipped)`);

// Add lessons
for (const lesson of newLessons) {
  lesson.wordCount = uniqueNewWords.filter(w => w.lessonId === lesson.id).length;
  data.lessons.push(lesson);
}

// Add words
for (const w of uniqueNewWords) {
  data.words.push({
    lessonId: w.lessonId,
    word: w.word,
    chinese: w.chinese,
    phrase: w.phrase,
    imageUrl: '',
    imageStatus: 'pending',
    createdAt: now
  });
}

// Bump version
data.dataVersion = (data.dataVersion || 0) + 1;

writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log(`\nDone! dataVersion=${data.dataVersion}, total words=${data.words.length}, total lessons=${data.lessons.length}`);
console.log('\nNew lesson IDs:');
for (const l of newLessons) {
  console.log(`  Lesson ${l.id}: ${l.name} (${l.wordCount} words)`);
}
