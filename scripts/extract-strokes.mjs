// scripts/extract-strokes.mjs
// Build-time glyph extraction. Run: node scripts/extract-strokes.mjs
//
// For each stroke type in data/strokes.js, takes a canonical source
// {char, strokeIndex} from hanzi-writer-data (Make Me a Hanzi project,
// Kai-style outlines from Arphic fonts; Arphic Public License, see
// ARPHICPL.txt) and extracts:
//   - the stroke outline path (used directly for display)
//   - the median polyline (normalized, resampled; used for animation and
//     segmentation)
//   - segment boundaries: the median split at high-curvature corner points,
//     mapped in order to name tokens (竖/折/横/钩 …)
// Every mapping is verified against cnchar + cnchar-order stroke names;
// disagreements are flagged in data/generated/extraction-report.md and the
// glyph is set to null rather than guessed (spec rule 1: never fabricate).
//
// Output: data/generated/glyphs.js (committed; runtime needs no extraction)
//         data/generated/extraction-report.md

import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { STROKES } from '../data/strokes.js';

const require = createRequire(import.meta.url);
const cnchar = require('cnchar');
cnchar.use(require('cnchar-order'));

// ---------------------------------------------------------------------------
// Canonical sources (spec §Stroke glyph architecture). index:null = locate
// the stroke by name via cnchar. acceptNames widens matching for variant
// strokes that cnchar names by their base stroke (竖撇→撇, 平捺→捺).
// ---------------------------------------------------------------------------
const SOURCES = {
  dian:             { char: '立', index: 0 },
  heng:             { char: '二', index: 0 },
  shu:              { char: '十', index: 1 },
  pie:              { char: '八', index: 0 },
  na:               { char: '八', index: 1 },
  ti:               { char: '打', index: 2 },
  shugou:           { char: '小', index: 0 },
  // 了#1 is the table's example, but cnchar names it 竖钩 (the Kai-vs-Song
  // naming issue the spec flags). 狗#1 is verified 弯钩 by cnchar; 狗 is also
  // a table example for this stroke.
  wangou:           { char: '狗', index: 1 },
  xiegou:           { char: '我', index: null },
  wogou:            { char: '心', index: 1 },
  shuwan:           { char: '四', index: null },
  shuwangou:        { char: '儿', index: 1 },
  shuti:            { char: '长', index: null },
  henggou:          { char: '买', index: null },
  hengzhe:          { char: '口', index: 1 },
  hengzhegou:       { char: '月', index: 1 },
  hengpie:          { char: '又', index: 0 },
  piezhe:           { char: '公', index: 2 },
  piedian:          { char: '女', index: 0 },
  // cnchar names 九#1 (and 乙, 吃#5) '横斜钩', a systematic naming-scheme
  // difference: the 28-stroke table names this stroke 横折弯钩 with examples
  // 九乙吃, reserving 横斜钩 for 飞气风. 九 is the table's own example, so the
  // shape is correct; flagged as NAME-VARIANT for review.
  hengzhewangou:    { char: '九', index: 1, nameVariants: ['横斜钩'] },
  // cnchar names 山#1 (and 医#6, 凶#2) '竖弯', same scheme difference: the
  // table names the sharp-cornered 山 stroke 竖折, reserving 竖弯 for the
  // rounded 四/西 stroke. 山 is the table's own example; flagged NAME-VARIANT.
  shuzhe:           { char: '山', index: 1, nameVariants: ['竖弯'] },
  shuzhezhegou:     { char: '与', index: 1 },
  hengzheti:        { char: '认', index: 1 },
  hengzhezhepie:    { char: '及', index: 1 },
  hengpiewangou:    { char: '那', index: null },
  hengzhezhezhegou: { char: '奶', index: null },
  hengzhewan:       { char: '朵', index: 1 },
  shuzhepie:        { char: '专', index: 2 },
  // extended tier
  hengzhezhe:       { char: '凹', index: null },
  shuzhezhe:        { char: '鼎', index: null },
  hengzhezhezhe:    { char: '凸', index: null },
  hengxiegou:       { char: '飞', index: 0 },
  shupie:           { char: '月', index: 0, acceptNames: ['竖撇', '撇'] },
  pingna:           { char: '之', index: 2, acceptNames: ['平捺', '捺'] },
};

// Manual segmentation overrides (fractions of arc length), filled in only if
// visual review of review.html shows the automatic corner detection is wrong
// for a stroke. Empty = fully automatic.
const SPLIT_OVERRIDES = {};

// hanzi-writer-data coordinate system: 1024x1024 em, y up, baseline offset 900.
// Normalize to a 0..200 box, y down (SVG).
const S = 200 / 1024;
const norm = ([x, y]) => [x * S, (900 - y) * S];
export const GLYPH_TRANSFORM = `scale(${S},${-S}) translate(0,-900)`;

// --- geometry helpers -------------------------------------------------------
function resample(points, n) {
  // even arc-length resampling of a polyline
  const d = [0];
  for (let i = 1; i < points.length; i++) {
    d.push(d[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const total = d[d.length - 1] || 1;
  const out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const t = (k / (n - 1)) * total;
    while (j < points.length - 2 && d[j + 1] < t) j++;
    const span = d[j + 1] - d[j] || 1;
    const f = (t - d[j]) / span;
    out.push([
      points[j][0] + f * (points[j + 1][0] - points[j][0]),
      points[j][1] + f * (points[j + 1][1] - points[j][1]),
    ]);
  }
  return out;
}

function unwrappedAngles(pts) {
  const ang = [];
  for (let i = 0; i < pts.length - 1; i++) {
    let a = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
    if (i > 0) {
      while (a - ang[i - 1] > Math.PI) a -= 2 * Math.PI;
      while (a - ang[i - 1] < -Math.PI) a += 2 * Math.PI;
    }
    ang.push(a);
  }
  return ang;
}

// Split the median into K segments by minimizing within-segment variance of
// the tangent angle (dynamic programming). Joints (sharp 折 corners, rounded
// 弯 bends, terminal 钩 flicks) are exactly where the tangent angle
// changes, so the optimal partition puts boundaries there. More robust than
// curvature peaks, which get fooled by the Kai entry-press wiggle.
function findSplits(pts, nSplits) {
  if (nSplits <= 0) return [];
  const a = unwrappedAngles(pts);
  const m = a.length;
  const K = nSplits + 1;
  const minLen = 5;
  const S1 = [0], S2 = [0];
  for (let i = 0; i < m; i++) { S1.push(S1[i] + a[i]); S2.push(S2[i] + a[i] * a[i]); }
  const cost = (i, j) => { // variance cost of a[i..j)
    const len = j - i;
    const sum = S1[j] - S1[i];
    return (S2[j] - S2[i]) - (sum * sum) / len;
  };
  const dp = Array.from({ length: K + 1 }, () => new Array(m + 1).fill(Infinity));
  const parent = Array.from({ length: K + 1 }, () => new Array(m + 1).fill(0));
  for (let j = minLen; j <= m; j++) dp[1][j] = cost(0, j);
  for (let k = 2; k <= K; k++) {
    for (let j = k * minLen; j <= m; j++) {
      for (let i = (k - 1) * minLen; i <= j - minLen; i++) {
        const v = dp[k - 1][i] + cost(i, j);
        if (v < dp[k][j]) { dp[k][j] = v; parent[k][j] = i; }
      }
    }
  }
  if (!Number.isFinite(dp[K][m])) return [];
  const splits = [];
  let j = m;
  for (let k = K; k > 1; k--) { j = parent[k][j]; splits.unshift(j); }
  return splits;
}

// Expand a stroke name into ordered segment tokens. Per the 折 naming rule,
// each 折/弯 in a name is a joint that produces its own segment; 钩 is the
// terminal hook segment. 平 is a modifier (平捺 = one 捺 segment); 斜/卧
// label the curved body of 斜钩/卧钩.
const SEG_CHARS = new Set(['横', '竖', '撇', '点', '捺', '提', '折', '弯', '钩', '斜', '卧']);
export const expandName = name => [...name].filter(c => SEG_CHARS.has(c));

// --- extraction -------------------------------------------------------------
const N = 128;
const glyphs = {};
const report = [];

for (const stroke of STROKES) {
  const src = SOURCES[stroke.id];
  const row = { id: stroke.id, name: stroke.name, char: src.char, index: src.index,
                located: false, cncharName: null, status: 'ok', notes: [] };
  report.push(row);

  let data;
  try {
    data = require(`hanzi-writer-data/${src.char}.json`);
  } catch {
    row.status = 'ERROR'; row.notes.push(`hanzi-writer-data has no entry for ${src.char}`);
    glyphs[stroke.id] = null;
    continue;
  }

  const namesRaw = cnchar.stroke(src.char, 'order', 'name');
  const names = Array.isArray(namesRaw[0]) ? namesRaw[0] : namesRaw;
  const accept = new Set([stroke.name, ...(src.acceptNames || []), ...(src.nameVariants || [])]);
  const matches = i => String(names[i]).split('|').some(v => accept.has(v));
  const exactMatch = i => String(names[i]).split('|').includes(stroke.name);

  let index = src.index;
  if (index === null || index === undefined) {
    index = names.findIndex((_, i) => matches(i));
    row.located = true;
    if (index === -1) {
      row.status = 'ERROR';
      row.notes.push(`cnchar names for ${src.char} = [${names.join(', ')}] contain no ${stroke.name}`);
      glyphs[stroke.id] = null;
      continue;
    }
    row.index = index;
  } else if (!matches(index)) {
    // fixed index disagrees with cnchar; try to locate by name instead
    const alt = names.findIndex((_, i) => matches(i));
    if (alt !== -1) {
      row.notes.push(`spec index ${index} is '${names[index]}' per cnchar; using located index ${alt}`);
      index = alt; row.index = alt; row.located = true;
      row.status = 'RELOCATED';
    } else {
      row.status = 'MISMATCH';
      row.notes.push(`cnchar calls ${src.char}#${index} '${names[index]}'; no ${stroke.name} found in [${names.join(', ')}]. Glyph set to null, needs review`);
      glyphs[stroke.id] = null;
      continue;
    }
  }
  row.cncharName = names[index];
  if (!exactMatch(index)) {
    if ((src.nameVariants || []).some(v => String(names[index]).split('|').includes(v))) {
      row.status = 'NAME-VARIANT';
      row.notes.push(`cnchar names ${src.char}#${index} '${names[index]}', while the 28-stroke table names it '${stroke.name}'. Known naming-scheme difference; glyph taken from the table's own example character`);
    } else if ((src.acceptNames || []).some(v => String(names[index]).split('|').includes(v))) {
      row.notes.push(`cnchar names it '${names[index]}' (base-stroke naming for this variant, as the spec anticipates)`);
    }
  }

  if (!data.strokes[index] || !data.medians[index]) {
    row.status = 'ERROR'; row.notes.push(`no stroke #${index} in hanzi-writer-data for ${src.char}`);
    glyphs[stroke.id] = null;
    continue;
  }

  const median = resample(data.medians[index].map(norm), N);
  const tokens = expandName(stroke.name);
  let splits;
  if (SPLIT_OVERRIDES[stroke.id]) {
    splits = SPLIT_OVERRIDES[stroke.id].map(f => Math.round(f * (N - 1)));
    row.notes.push('manual split override');
  } else {
    splits = findSplits(median, tokens.length - 1);
  }
  if (splits.length !== tokens.length - 1) {
    row.status = 'SEGMENT-WARN';
    row.notes.push(`needed ${tokens.length - 1} splits, found ${splits.length}`);
  }

  const bounds = [0, ...splits, N - 1];
  const segments = tokens.map((token, i) => ({
    token,
    start: bounds[i] ?? N - 1,
    end: bounds[i + 1] ?? N - 1,
  }));

  glyphs[stroke.id] = {
    id: stroke.id,
    name: stroke.name,
    source: { char: src.char, index, cncharName: row.cncharName, located: row.located },
    path: data.strokes[index],
    median: median.map(([x, y]) => [+x.toFixed(1), +y.toFixed(1)]),
    segments,
  };
}

// --- write outputs ----------------------------------------------------------
mkdirSync(new URL('../data/generated/', import.meta.url), { recursive: true });

const header = `// data/generated/glyphs.js
// AUTO-GENERATED by scripts/extract-strokes.mjs. Do not edit.
// SOURCE: hanzi-writer-data (Make Me a Hanzi project; Kai-style outlines
// derived from Arphic Technology fonts, Arphic Public License; see
// ARPHICPL.txt). Stroke names verified against cnchar + cnchar-order.
// Coordinates: median points are normalized to a 0..200 box (y down);
// outline paths are raw hanzi-writer-data coordinates; render inside
// <g transform={GLYPH_TRANSFORM}>.
`;
writeFileSync(new URL('../data/generated/glyphs.js', import.meta.url),
  header +
  `export const GLYPH_TRANSFORM = ${JSON.stringify(GLYPH_TRANSFORM)};\n` +
  `export const GLYPH_BOX = 200;\n` +
  `export const GLYPHS = ${JSON.stringify(glyphs, null, 1)};\n`);

const pad = n => String(n).padStart(2, '0');
const now = new Date();
const stamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
const lines = [
  '# Glyph extraction report', '',
  `Generated ${stamp} by scripts/extract-strokes.mjs`, '',
  '| stroke | name | source | cnchar says | status | notes |',
  '|--------|------|--------|-------------|--------|-------|',
  ...report.map(r =>
    `| ${r.id} | ${r.name} | ${r.char}#${r.index}${r.located ? ' (located)' : ''} | ${r.cncharName ?? '-'} | ${r.status} | ${r.notes.join('; ') || '-'} |`),
  '',
  '`located` = stroke index determined from cnchar name lookup as instructed by the spec.',
  'Any row with status ERROR/MISMATCH has glyph = null and must be resolved before that stroke appears in the app.',
];
writeFileSync(new URL('../data/generated/extraction-report.md', import.meta.url), lines.join('\n') + '\n');

const bad = report.filter(r => r.status === 'ERROR' || r.status === 'MISMATCH');
console.log(`Extracted ${Object.values(glyphs).filter(Boolean).length}/${STROKES.length} glyphs.`);
for (const r of report.filter(r => r.status !== 'ok')) {
  console.log(`  [${r.status}] ${r.id} (${r.name}) ${r.char}#${r.index}: ${r.notes.join('; ')}`);
}
process.exitCode = bad.length ? 1 : 0;
