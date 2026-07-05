// data/characters.js
// Curated characters for in-character mode.
// SOURCE: every character below appears as an example character in the
// 28-stroke 汉字笔画名称表 rows transcribed in data/strokes.js (or the
// extended-tier list). No characters added from other sources.
//
// hsk is null until levels come from a named open HSK dataset. Per spec it
// is never guessed (planned Phase 2).
//
// expected: full expected stroke-name sequence, ONLY where the spec states
// it (build-time validation anchors). includes: stroke names the character
// must contain per the 28-stroke table row it exemplifies.
// Characters failing build-time cnchar validation are excluded at build time
// (see data/generated/char-validation.js) and reported.

export const CHARACTERS = [
  // validation anchors stated in the spec
  { char: '女', hsk: null, expected: ['撇点', '撇', '横'] },
  { char: '口', hsk: null, expected: ['竖', '横折', '横'] },
  { char: '马', hsk: null, includes: ['竖折折钩'] },

  // remaining curated characters (example chars from the table)
  { char: '立', hsk: null, includes: ['点'] },
  { char: '小', hsk: null, includes: ['竖钩', '点'] },
  { char: '二', hsk: null, includes: ['横'] },
  { char: '天', hsk: null, includes: ['横'] },
  { char: '干', hsk: null, includes: ['竖'] },
  { char: '下', hsk: null, includes: ['竖'] },
  { char: '八', hsk: null, includes: ['撇', '捺'] },
  { char: '人', hsk: null, includes: ['撇', '捺'] },
  { char: '入', hsk: null, includes: ['捺'] },
  { char: '习', hsk: null, includes: ['提'] },
  { char: '河', hsk: null, includes: ['提'] },
  { char: '了', hsk: null, includes: ['横钩', '弯钩'] },
  { char: '我', hsk: null, includes: ['斜钩'] },
  { char: '成', hsk: null, includes: ['斜钩'] },
  { char: '心', hsk: null, includes: ['卧钩'] },
  { char: '必', hsk: null, includes: ['卧钩'] },
  { char: '四', hsk: null, includes: ['竖弯'] },
  { char: '西', hsk: null, includes: ['竖弯'] },
  { char: '儿', hsk: null, includes: ['竖弯钩'] },
  { char: '电', hsk: null, includes: ['竖弯钩'] },
  { char: '元', hsk: null, includes: ['竖弯钩'] },
  { char: '以', hsk: null, includes: ['竖提'] },
  { char: '长', hsk: null, includes: ['竖提'] },
  { char: '买', hsk: null, includes: ['横钩'] },
  { char: '你', hsk: null, includes: ['横钩'] },
  { char: '五', hsk: null, includes: ['横折'] },
  { char: '月', hsk: null, includes: ['横折钩'] },
  { char: '也', hsk: null, includes: ['横折钩'] },
  { char: '又', hsk: null, includes: ['横撇'] },
  { char: '水', hsk: null, includes: ['横撇'] },
  { char: '多', hsk: null, includes: ['横撇'] },
  { char: '去', hsk: null, includes: ['撇折'] },
  { char: '公', hsk: null, includes: ['撇折'] },
  { char: '红', hsk: null, includes: ['撇折'] },
  { char: '九', hsk: null, includes: ['横折弯钩'] },
  { char: '乙', hsk: null, includes: ['横折弯钩'] },
  { char: '吃', hsk: null, includes: ['横折弯钩'] },
  { char: '山', hsk: null, includes: ['竖折'] },
  { char: '医', hsk: null, includes: ['竖折'] },
  { char: '写', hsk: null, includes: ['竖折折钩'] },
  { char: '与', hsk: null, includes: ['竖折折钩'] },
  { char: '弓', hsk: null, includes: ['竖折折钩'] },
  { char: '认', hsk: null, includes: ['横折提'] },
  { char: '说', hsk: null, includes: ['横折提'] },
  { char: '计', hsk: null, includes: ['横折提'] },
  { char: '及', hsk: null, includes: ['横折折撇'] },
  { char: '建', hsk: null, includes: ['横折折撇'] },
  { char: '边', hsk: null, includes: ['横折折撇'] },
  { char: '阳', hsk: null, includes: ['横撇弯钩'] },
  { char: '那', hsk: null, includes: ['横撇弯钩'] },
  { char: '奶', hsk: null, includes: ['横折折折钩'] },
  { char: '乃', hsk: null, includes: ['横折折折钩'] },
  { char: '朵', hsk: null, includes: ['横折弯'] },
  { char: '没', hsk: null, includes: ['横折弯'] },
  { char: '船', hsk: null, includes: ['横折弯'] },
  { char: '专', hsk: null, includes: ['竖折撇'] },
];
