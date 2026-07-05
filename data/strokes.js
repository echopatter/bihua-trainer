// data/strokes.js
// SOURCE: 28-stroke 汉字笔画名称表 (PRC primary education), consistent with
// GF 2001-2001 《GB13000.1字符集汉字折笔规范》. Transcribed verbatim from the
// project specification (bihua-trainer-final-prompt.md); no rows invented.
// Extended-tier strokes and example-character policy come from the same spec.
//
// Fields:
//   num       position in the 28-stroke table (null for extended tier)
//   id        ascii identifier
//   name      Chinese stroke name
//   pinyin    pinyin with tone marks
//   english   short English gloss
//   examples  high-frequency example characters (default tier)
//   rareExamples  rare characters shown only with the "extended examples"
//                 setting, except where flagged onlyExample (essentially the
//                 only example; always shown, with a note in the UI)
//   tier      'core' | 'extended'
//   category  official five-shape family assignment (横竖撇点折) per
//             印刷通用汉字字形表 1965 / GB13000.1 折笔规范:
//             提→横, 竖钩→竖, 捺→点, all compound strokes → 折
//   tree      family-tree grouping by first written component
//   lesson    curriculum lesson (1–6)
//   kaiSongCaveat  true where Song/serif fonts render the stroke misleadingly
//   variantOf id of the base stroke for 撇/捺 variants (extended tier)

export const STROKES = [
  { num: 1,  id: 'dian', name: '点', pinyin: 'diǎn', english: 'dot',
    examples: ['立', '小'], tier: 'core', category: '点', tree: '点', lesson: 1 },
  { num: 2,  id: 'heng', name: '横', pinyin: 'héng', english: 'horizontal',
    examples: ['二', '天'], tier: 'core', category: '横', tree: '横', lesson: 1 },
  { num: 3,  id: 'shu', name: '竖', pinyin: 'shù', english: 'vertical',
    examples: ['干', '下'], tier: 'core', category: '竖', tree: '竖', lesson: 1 },
  { num: 4,  id: 'pie', name: '撇', pinyin: 'piě', english: 'left-falling',
    examples: ['八', '反'], tier: 'core', category: '撇', tree: '撇', lesson: 1 },
  { num: 5,  id: 'na', name: '捺', pinyin: 'nà', english: 'right-falling',
    examples: ['人', '入'], tier: 'core', category: '点', tree: '点', lesson: 1 },
  { num: 6,  id: 'ti', name: '提', pinyin: 'tí', english: 'rising',
    examples: ['习', '把', '河'], tier: 'core', category: '横', tree: '横', lesson: 2 },
  { num: 7,  id: 'shugou', name: '竖钩', pinyin: 'shù gōu', english: 'vertical hook',
    examples: ['小', '了'], tier: 'core', category: '竖', tree: '竖', lesson: 2 },
  { num: 8,  id: 'wangou', name: '弯钩', pinyin: 'wān gōu', english: 'bend hook',
    examples: ['狗', '家', '象'], tier: 'core', category: '折', tree: '折', lesson: 2,
    kaiSongCaveat: true },
  { num: 9,  id: 'xiegou', name: '斜钩', pinyin: 'xié gōu', english: 'slant hook',
    examples: ['我', '成', '戏'], tier: 'core', category: '折', tree: '折', lesson: 2 },
  { num: 10, id: 'wogou', name: '卧钩', pinyin: 'wò gōu', english: 'reclining hook',
    examples: ['心', '必', '您'], tier: 'core', category: '折', tree: '折', lesson: 2,
    kaiSongCaveat: true },
  { num: 11, id: 'shuwan', name: '竖弯', pinyin: 'shù wān', english: 'vertical bend',
    examples: ['四', '西'], tier: 'core', category: '折', tree: '竖', lesson: 3 },
  { num: 12, id: 'shuwangou', name: '竖弯钩', pinyin: 'shù wān gōu', english: 'vertical bend hook',
    examples: ['儿', '电', '巴', '元'], tier: 'core', category: '折', tree: '竖', lesson: 4 },
  { num: 13, id: 'shuti', name: '竖提', pinyin: 'shù tí', english: 'vertical rise',
    examples: ['以', '长', '收', '良'], tier: 'core', category: '折', tree: '竖', lesson: 3 },
  { num: 14, id: 'henggou', name: '横钩', pinyin: 'héng gōu', english: 'horizontal hook',
    examples: ['了', '买', '宝', '你'], tier: 'core', category: '折', tree: '横', lesson: 2 },
  { num: 15, id: 'hengzhe', name: '横折', pinyin: 'héng zhé', english: 'horizontal turn',
    examples: ['口', '五', '骨'], tier: 'core', category: '折', tree: '横', lesson: 3 },
  { num: 16, id: 'hengzhegou', name: '横折钩', pinyin: 'héng zhé gōu', english: 'horizontal turn hook',
    examples: ['月', '习', '也'], tier: 'core', category: '折', tree: '横', lesson: 4 },
  { num: 17, id: 'hengpie', name: '横撇', pinyin: 'héng piě', english: 'horizontal + left-falling',
    examples: ['又', '水', '多'], tier: 'core', category: '折', tree: '横', lesson: 3 },
  { num: 18, id: 'piezhe', name: '撇折', pinyin: 'piě zhé', english: 'left-falling turn',
    examples: ['去', '红', '公'], tier: 'core', category: '折', tree: '撇', lesson: 3 },
  { num: 19, id: 'piedian', name: '撇点', pinyin: 'piě diǎn', english: 'left-falling + dot',
    examples: ['女', '巡'], tier: 'core', category: '折', tree: '撇', lesson: 3 },
  { num: 20, id: 'hengzhewangou', name: '横折弯钩', pinyin: 'héng zhé wān gōu', english: 'horiz. turn bend hook',
    examples: ['九', '乙', '吃'], tier: 'core', category: '折', tree: '横', lesson: 5,
    kaiSongCaveat: true },
  { num: 21, id: 'shuzhe', name: '竖折', pinyin: 'shù zhé', english: 'vertical turn',
    examples: ['山', '发', '牙', '医'], tier: 'core', category: '折', tree: '竖', lesson: 3 },
  { num: 22, id: 'shuzhezhegou', name: '竖折折钩', pinyin: 'shù zhé zhé gōu', english: 'vert. turn turn hook',
    examples: ['马', '写', '号', '与', '弓'], tier: 'core', category: '折', tree: '竖', lesson: 6 },
  { num: 23, id: 'hengzheti', name: '横折提', pinyin: 'héng zhé tí', english: 'horiz. turn rise',
    examples: ['认', '说', '计'], tier: 'core', category: '折', tree: '横', lesson: 4 },
  { num: 24, id: 'hengzhezhepie', name: '横折折撇', pinyin: 'héng zhé zhé piě', english: 'horiz. turn turn left-falling',
    examples: ['及', '建', '边'], tier: 'core', category: '折', tree: '横', lesson: 5 },
  { num: 25, id: 'hengpiewangou', name: '横撇弯钩', pinyin: 'héng piě wān gōu', english: 'horiz. left-falling bend hook',
    examples: ['阳', '那'], tier: 'core', category: '折', tree: '横', lesson: 5 },
  { num: 26, id: 'hengzhezhezhegou', name: '横折折折钩', pinyin: 'héng zhé zhé zhé gōu', english: 'horiz. turn³ hook',
    examples: ['奶', '乃'], tier: 'core', category: '折', tree: '横', lesson: 6 },
  { num: 27, id: 'hengzhewan', name: '横折弯', pinyin: 'héng zhé wān', english: 'horiz. turn bend',
    examples: ['朵', '没', '设', '船'], tier: 'core', category: '折', tree: '横', lesson: 4 },
  { num: 28, id: 'shuzhepie', name: '竖折撇', pinyin: 'shù zhé piě', english: 'vert. turn left-falling',
    examples: ['专'], tier: 'core', category: '折', tree: '竖', lesson: 5 },

  // ---- Extended tier (opt-in setting), from the same spec ----
  { num: null, id: 'hengzhezhe', name: '横折折', pinyin: 'héng zhé zhé', english: 'horiz. turn turn',
    examples: ['凹'], tier: 'extended', category: '折', tree: '横', lesson: 6 },
  { num: null, id: 'shuzhezhe', name: '竖折折', pinyin: 'shù zhé zhé', english: 'vert. turn turn',
    examples: [], rareExamples: ['鼎'], onlyExample: '鼎',
    tier: 'extended', category: '折', tree: '竖', lesson: 6 },
  { num: null, id: 'hengzhezhezhe', name: '横折折折', pinyin: 'héng zhé zhé zhé', english: 'horiz. turn turn turn',
    examples: ['凸'], tier: 'extended', category: '折', tree: '横', lesson: 6 },
  { num: null, id: 'hengxiegou', name: '横斜钩', pinyin: 'héng xié gōu', english: 'horiz. slant hook',
    examples: ['飞', '气', '风'], tier: 'extended', category: '折', tree: '横', lesson: 6 },
  { num: null, id: 'shupie', name: '竖撇', pinyin: 'shù piě', english: 'vertical left-falling (撇 variant)',
    examples: ['川', '月'], tier: 'extended', category: '撇', tree: '撇', lesson: 6,
    variantOf: 'pie' },
  { num: null, id: 'pingna', name: '平捺', pinyin: 'píng nà', english: 'level right-falling (捺 variant)',
    examples: ['之', '远'], tier: 'extended', category: '点', tree: '点', lesson: 6,
    variantOf: 'na' },
];

// Seed confusable pairs (from spec §Common confusions), by stroke id.
export const CONFUSION_SEEDS = [
  ['shuwan', 'shuzhe'],
  ['hengzhegou', 'hengzhewangou'],
  ['piedian', 'piezhe'],
  ['wangou', 'wogou'],
  ['hengpie', 'hengzhe'],
  ['shuwangou', 'shuzhezhegou'],
  ['hengzhewan', 'hengzhewangou'],
];

export const byId = Object.fromEntries(STROKES.map(s => [s.id, s]));
export const byName = Object.fromEntries(STROKES.map(s => [s.name, s]));
export const CORE = STROKES.filter(s => s.tier === 'core');

// Curriculum lessons (spec §Curriculum & progression)
export const LESSONS = [
  { n: 1, title: '基础 (jīchǔ) Basics', ids: ['heng', 'shu', 'pie', 'dian', 'na'] },
  { n: 2, title: '提 (tí) and the single hooks', ids: ['ti', 'shugou', 'henggou', 'xiegou', 'wangou', 'wogou'] },
  { n: 3, title: 'One turn or bend', ids: ['hengzhe', 'shuzhe', 'piezhe', 'piedian', 'hengpie', 'shuti', 'shuwan'] },
  { n: 4, title: 'Turn plus hook or rise', ids: ['hengzhegou', 'shuwangou', 'hengzheti', 'hengzhewan'] },
  { n: 5, title: 'Two joints (转折 zhuǎnzhé)', ids: ['hengzhewangou', 'shuzhepie', 'hengzhezhepie', 'hengpiewangou'] },
  { n: 6, title: 'Three or more joints', ids: ['shuzhezhegou', 'hengzhezhezhegou'] },
];
