import { writeFileSync } from 'fs';

// Pollinations image URL helper
function img(word, prompt) {
  const q = encodeURIComponent(prompt || `cartoon style ${word} for children education`);
  return `https://image.pollinations.ai/prompt/${q}?width=400&height=400&nofeed=true&safe=true`;
}

const LESSONS = [
  {
    id: 1,
    name: 'RAZ 22: Five Seconds to Blast Off',
    description: '太空探索',
    words: [
      ['Blastoff', '发射升空', 'The rocket is ready for blastoff', 'cartoon rocket launching into space, colorful illustration for kids'],
      ['Crowd', '人群', 'A big crowd watched the launch', 'happy crowd of people watching event, kids illustration'],
      ['Control room', '控制室', 'Scientists work in the control room', 'space mission control room with computers and screens'],
      ['Space exploration', '太空探索', 'Space exploration is exciting', 'astronaut floating in space with planets and stars'],
    ]
  },
  {
    id: 2,
    name: 'RAZ 23: Crazy Cakes (1)',
    description: '食物与食材',
    words: [
      ['Dairy', '奶制品', 'Milk and cheese are dairy foods', 'milk cheese yogurt dairy products, kids food illustration'],
      ['Fried rice', '炒饭', 'Mom made delicious fried rice', 'fried rice with vegetables in a bowl, food photography'],
      ['Ground beef', '牛肉碎', 'Ground beef is used to make burgers', 'raw ground beef in a bowl, cooking ingredient'],
      ['Black bean', '黑豆', 'Black beans are good for you', 'black beans in a wooden bowl, healthy food'],
      ['Tofu', '豆腐', 'Tofu is made from soybeans', 'white tofu cubes on a plate, Asian food'],
      ['Burger', '汉堡', 'I like burgers with cheese', 'cheeseburger with lettuce and tomato, kids meal'],
      ['Peanut butter', '花生酱', 'Peanut butter on toast is yummy', 'peanut butter spread on bread toast'],
      ['In different ways', '以不同的方式', 'We cook food in different ways', 'different cooking methods illustration for kids'],
      ['Food made from animals', '动物制成的食物', 'Milk, eggs, and meat are food made from animals', 'eggs milk and meat food products from farm animals'],
    ]
  },
  {
    id: 3,
    name: 'RAZ 24: Crazy Cakes (2)',
    description: '创意蛋糕',
    words: [
      ['A giant rooster', '一只巨型公鸡', 'The cake looked like a giant rooster', 'colorful rooster chicken, farm animal illustration'],
      ['A fancy crown', '一顶华丽王冠', 'She wore a fancy crown on her head', 'fancy golden crown with jewels, fairy tale'],
      ['Hook', '钩子', 'The pirate had a hook for a hand', 'metal hook, simple object illustration'],
      ['Beehive', '蜂巢', 'Bees live in a beehive', 'beehive hanging on a tree with honey bees'],
      ['Treasure chest', '宝箱', 'Pirates found a treasure chest', 'wooden treasure chest full of gold coins'],
      ['Magic', '魔法', 'The magician did a magic trick', 'magic wand with sparkles and stars, fantasy'],
      ['Unicorn', '独角兽', 'The unicorn has a beautiful horn', 'cute unicorn with rainbow horn, cartoon style for kids'],
    ]
  },
  {
    id: 4,
    name: 'RAZ 25: Skateboards',
    description: '滑板运动',
    words: [
      ['Board', '滑板', 'He stood on the skateboard', 'colorful skateboard on ramps, kids sport'],
      ['Wheels', '轮子', 'The board has four wheels', 'skateboard wheels close up, colorful'],
      ['Stand', '站立', 'Stand on the board carefully', 'child standing on a skateboard, learning'],
      ['Sit', '坐下', 'You can also sit on the board', 'child sitting on skateboard, park scene'],
      ['Stair', '楼梯', 'He skated down the stairs', 'outdoor stairs steps, urban architecture'],
      ['Contests', '比赛', 'She won many skateboard contests', 'skateboard competition contest with trophy'],
      ['Do tricks', '做技巧动作', 'He can do cool tricks on his board', 'skateboarder doing tricks ollie jump, action'],
    ]
  },
  {
    id: 5,
    name: 'RAZ 26: City Places',
    description: '城市建筑',
    words: [
      ['Find out', '发现', 'Let us find out about the city', 'child exploring and discovering new things'],
      ['Come', '来', 'Come and see the tall buildings', 'children walking together towards city buildings'],
      ['Skyscraper', '摩天大楼', 'The skyscraper is very tall', 'tall modern skyscraper building reaching the sky'],
      ['Stadium', '体育场', 'People watch games at the stadium', 'large sports stadium full of people, arena'],
      ['Parking garage', '停车场', 'Cars park in the parking garage', 'multi level parking garage building with cars'],
      ['Park cars', '停车', 'People park cars in the garage', 'cars parked neatly in a row in parking lot'],
      ['Work', '工作', 'Many people work in the city', 'people working in office buildings, city jobs'],
    ]
  },
  {
    id: 6,
    name: 'RAZ 27: Let\'s Make Lemonade',
    description: '制作柠檬水',
    words: [
      ['Thirsty', '口渴的', 'I am thirsty on a hot day', 'child drinking water feeling thirsty, hot summer day'],
      ['Spot', '发现', 'Spot the lemons on the tree', 'lemons growing on a tree, bright yellow citrus'],
      ['Lemon seeds', '柠檬籽', 'Take out the lemon seeds', 'lemon seeds inside a cut lemon, close up'],
      ['Pick out', '挑出', 'Pick out the seeds from the lemon', 'hands picking seeds out of a lemon slice'],
      ['Stir', '搅拌', 'Stir the lemonade with a spoon', 'stirring liquid in a glass with a spoon'],
      ['Spoon', '勺子', 'Use a spoon to mix it', 'shiny metal spoon, simple kitchen utensil'],
      ['Pitcher', '水壶', 'Pour the lemonade into a pitcher', 'glass pitcher full of yellow lemonade'],
      ['Sticker', '贴纸', 'Put a sticker on the cup', 'colorful fun stickers for kids, decoration'],
      ['Spill', '洒出', 'Be careful not to spill the drink', 'liquid spilling from a cup, accident'],
    ]
  },
  {
    id: 7,
    name: 'RAZ 29: Let\'s Carve a Pumpkin',
    description: '雕刻南瓜',
    words: [
      ['Adult', '成年人', 'Ask an adult to help you', 'parent and child together, family activity'],
      ['Carve', '雕刻', 'Let\'s carve a pumpkin', 'carving a pumpkin for Halloween, fun activity'],
      ['Cut out', '切出', 'Cut out the top of the pumpkin', 'cutting the top off a pumpkin with a knife'],
      ['Top', '顶部', 'Remove the top of the pumpkin', 'pumpkin top being removed, pumpkin carving'],
      ['Scoop out', '舀出', 'Scoop out the seeds inside', 'scooping pumpkin seeds and pulp out with hands'],
      ['Bake', '烘烤', 'Bake the pumpkin seeds for a snack', 'baking pumpkin seeds on a tray in oven'],
      ['Snack', '零食', 'The seeds make a tasty snack', 'healthy snack foods for kids, fruit and nuts'],
      ['Draw', '画', 'Draw a face on the pumpkin', 'drawing a funny face design on a pumpkin'],
      ['Inside', '里面', 'Look inside the pumpkin', 'looking inside a hollow carved pumpkin'],
    ]
  },
  {
    id: 8,
    name: 'RAZ 31: Kaden\'s Kwanzaa',
    description: '宽扎节庆祝',
    words: [
      ['Celebrate', '庆祝', 'We celebrate Kwanzaa with family', 'family celebrating holiday together, festive'],
      ['Light candles', '点蜡烛', 'We light candles each night', 'lighting colorful candles in a kinara holder'],
      ['Share', '分享', 'Share stories with your family', 'children sharing toys and stories together'],
      ['Gift', '礼物', 'Give a gift to someone you love', 'colorful wrapped gift box with ribbon and bow'],
      ['Make crafts', '做手工', 'Let\'s make crafts together', 'children making arts and crafts, paper art'],
      ['Eat a feast', '吃大餐', 'The family eats a feast together', 'family eating a big dinner feast at table'],
    ]
  },
  {
    id: 9,
    name: 'RAZ 32: The Leaning Tower',
    description: '比萨斜塔',
    words: [
      ['Build', '建造', 'They wanted to build a tall tower', 'construction workers building a tower'],
      ['Bell tower', '钟楼', 'It was meant to be a bell tower', 'tall bell tower with bells at the top'],
      ['Take many years', '花很多年', 'It took many years to build', 'calendar showing many years passing, time concept'],
      ['Right away', '立刻', 'It did not lean right away', 'clock showing right now, immediate time concept'],
      ['Start', '开始', 'The tower started to lean slowly', 'starting line race beginning concept'],
      ['Lean', '倾斜', 'The tower began to lean', 'the leaning tower of Pisa in Italy, tilt'],
      ['Soft ground', '松软地面', 'It was built on soft ground', 'soft muddy ground soil, nature texture'],
      ['Skinny', '细长的', 'The tower looks tall and skinny', 'tall thin pencil, skinny object comparison'],
      ['Dig', '挖掘', 'They tried to dig and fix it', 'digging in the ground with a shovel'],
      ['Stop', '停止', 'They wanted to stop the leaning', 'red stop sign, stopping action concept'],
      ['Rope', '绳子', 'They used ropes to help hold it', 'thick twisted rope, strong cord material'],
      ['Weight', '重量', 'They added weight to balance it', 'heavy weights dumbbells, balance concept'],
      ['Safe', '安全的', 'Now the tower is safe', 'safety shield checkmark, protected and secure'],
    ]
  },
  {
    id: 10,
    name: 'RAZ 33: Goodbye Snow',
    description: '清除积雪',
    words: [
      ['Remove', '移除', 'We need to remove the snow', 'removing snow from a sidewalk, winter work'],
      ['Get in the way', '挡住路', 'The snow gets in the way', 'snow blocking a path road, obstacle'],
      ['Shovel', '铲子', 'Use a shovel to move snow', 'snow shovel tool, winter equipment'],
      ['Brush', '刷子', 'Use a brush to clean the car', 'brush cleaning snow off a car windshield'],
      ['Snowblower', '吹雪机', 'A snowblower clears snow fast', 'snowblower machine clearing driveway snow'],
      ['Snowplow', '铲雪车', 'The snowplow clears the road', 'big snowplow truck clearing a snowy road'],
      ['Salt', '盐', 'Salt helps melt the ice', 'salt being sprinkled on icy sidewalk'],
      ['Snow melter', '融雪剂', 'A snow melter turns snow to water', 'snow melting into water, winter to spring'],
      ['Take away', '带走', 'Trucks take away the snow', 'dump truck carrying snow away, removal'],
      ['Snow dump', '堆雪场', 'They bring snow to a snow dump', 'big pile of plowed snow, snow mountain'],
    ]
  },
  {
    id: 11,
    name: 'RAZ 34: Muddy Boots',
    description: '泥泞的靴子',
    words: [
      ['Kitchen', '厨房', 'He walked into the kitchen', 'bright clean kitchen room in a house'],
      ['Snack', '零食', 'He wanted to get a snack', 'tasty snacks crackers fruit on a plate'],
      ['Muddy tracks', '泥脚印', 'His boots left muddy tracks', 'muddy footprints on a clean floor, dirt trail'],
      ['Clean', '打扫', 'Mom had to clean the floor', 'person cleaning floor with mop, housework'],
      ['Floor', '地板', 'The floor was covered in mud', 'wooden floor surface in a house'],
      ['Notice', '注意到', 'Mom noticed the muddy tracks', 'person pointing and noticing something'],
      ['Living room', '客厅', 'The tracks went to the living room', 'cozy living room with sofa and furniture'],
      ['Mop', '拖把', 'She used a mop to clean up', 'cleaning mop and bucket, household tool'],
      ['Hallway', '走廊', 'The mud was in the hallway too', 'long hallway corridor in a house'],
      ['Front door', '前门', 'He came in through the front door', 'front door entrance of a house'],
      ['Behind', '后面', 'Look behind the door', 'hiding behind a door, position concept for kids'],
      ['Mess', '混乱', 'What a big mess!', 'big messy room with toys and mud, chaos'],
      ['Look at', '看着', 'Look at your muddy boots!', 'child looking down at something, attention'],
      ['Boots', '靴子', 'Take off your boots please', 'muddy rain boots, rubber boots footwear'],
      ['Shake head', '摇头', 'Mom just shook her head', 'person shaking head saying no, gesture'],
    ]
  },
  {
    id: 12,
    name: 'RAZ 35: Caring for Earth',
    description: '保护地球',
    words: [
      ['Tend gardens', '照料花园', 'We tend gardens to grow plants', 'person tending a garden, watering plants flowers'],
      ['Reuse', '再利用', 'Reuse your water bottle', 'reusable water bottle being refilled, eco friendly'],
      ['Recycle', '回收', 'Recycle paper and plastic', 'recycling bins blue green with recycle symbol'],
      ['Save water', '节约用水', 'Turn off the tap to save water', 'turning off water faucet tap, water conservation'],
      ['Electricity', '电', 'Turn off lights to save electricity', 'light bulb glowing, save energy electricity'],
    ]
  },
];

// Generate the data
const lessons = LESSONS.map(l => ({
  id: l.id,
  name: l.name,
  description: l.description,
  createdAt: new Date().toISOString(),
  wordCount: l.words.length,
}));

const words = [];
for (const lesson of LESSONS) {
  for (const [word, chinese, phrase, imagePrompt] of lesson.words) {
    words.push({
      lessonId: lesson.id,
      word,
      chinese,
      phrase,
      imageUrl: img(word, imagePrompt),
      imageStatus: 'ready',
      createdAt: new Date().toISOString(),
    });
  }
}

// Add a special lesson for testing Unsplash if user has key
const exportData = { lessons, words, wordProgress: [], dailyLogs: [] };

writeFileSync('raz-import-data.json', JSON.stringify(exportData, null, 2));

console.log(`✅ Complete!`);
console.log(`   ${lessons.length} lessons`);
console.log(`   ${words.length} words with Chinese translations, phrases, and AI images`);
console.log(`   File: raz-import-data.json`);
