// src/engine.js: stroke pools, adaptive distractors, rule-based
// explanations, literal mnemonics. All explanation text is generated from
// the teaching rules encoded here (spec, Teaching rules). No free-form text.

import { STROKES, LESSONS, CONFUSION_SEEDS, byId } from '../data/strokes.js';
import { GLYPHS } from '../data/generated/glyphs.js';
import { CHAR_PINYIN } from '../data/generated/char-pinyin.js';
import { settings, confusionCount, mastery, lessonPassed } from './store.js';

// "字 (zì)" for any character with build-time pinyin data.
export const withPy = c => CHAR_PINYIN[c] ? `${c} (${CHAR_PINYIN[c]})` : c;

const seedPair = (a, b) =>
  CONFUSION_SEEDS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

// Nothing is hard blocked. Every lesson is open from the start.
export function unlockedLessons() {
  return LESSONS.map(l => l.n);
}

// Strokes available for general modes (custom drill bypasses this).
export function pool({ ignoreLocks = false } = {}) {
  const tiers = settings().extendedTier ? ['core', 'extended'] : ['core'];
  return STROKES.filter(s => tiers.includes(s.tier) && GLYPHS[s.id]);
}

export const glyphOf = id => GLYPHS[id] ?? null;

// Example characters respecting the example-character policy.
export function examplesOf(stroke) {
  const ex = [...(stroke.examples ?? [])];
  if (settings().extendedExamples && stroke.rareExamples) ex.push(...stroke.rareExamples);
  if (!ex.length && stroke.onlyExample) ex.push(stroke.onlyExample);
  return ex;
}
export const onlyExampleNote = stroke =>
  stroke.onlyExample && !settings().extendedExamples
    ? `${withPy(stroke.onlyExample)} is a rare character, but it is essentially the only example of ${stroke.name} (${stroke.pinyin}).`
    : null;

// --- weighted pick of the next question stroke ------------------------------
export function nextStroke(candidates, lastId = null) {
  const opts = candidates.filter(s => s.id !== lastId);
  const list = opts.length ? opts : candidates;
  const weights = list.map(s => 1 + (100 - mastery(s.id)) / 50);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

// --- adaptive distractors -----------------------------------------------------
// Personal confusion counts dominate; then same-family / similar-name strokes.
const nameChars = s => new Set([...s.name]);
function similarity(a, b) {
  let score = 0;
  if (confusionCount(a.id, b.id)) score += 3 * confusionCount(a.id, b.id);
  if (seedPair(a.id, b.id)) score += 2;
  if (a.tree === b.tree) score += 2;
  if (a.category === b.category) score += 1;
  const shared = [...nameChars(a)].filter(c => nameChars(b).has(c)).length;
  score += 2 * shared / Math.max(nameChars(a).size, nameChars(b).size);
  return score;
}
export function distractors(correct, k = 3, from = null) {
  const cand = (from ?? STROKES.filter(s =>
    GLYPHS[s.id] && (settings().extendedTier || s.tier === 'core')))
    .filter(s => s.id !== correct.id && s.name !== correct.name);
  const weighted = cand.map(s => ({ s, w: similarity(correct, s) + 0.5 }));
  const out = [];
  while (out.length < k && weighted.length) {
    let r = Math.random() * weighted.reduce((a, x) => a + x.w, 0);
    let i = 0;
    for (; i < weighted.length - 1; i++) { r -= weighted[i].w; if (r <= 0) break; }
    out.push(weighted.splice(i, 1)[0].s);
  }
  return out;
}

export const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// --- rule-based "Why?" explanations ------------------------------------------
// Encoded rules (spec §Teaching rules):
//  R1 a ~90° turn producing a héng or shù segment is written 折
//  R2 a turn directly into a 撇 keeps 撇 in the name (横撇, NOT ✗横折撇)
//  R3 折 = sharp turn, 弯 = rounded bend, 钩 = terminal hook flick
//  R4 折/弯/钩 never occur alone
//  R5 compound names = component strokes in writing order + joint types
const JOINTS = new Set(['折', '弯']);
const jointCount = name => [...name].filter(c => JOINTS.has(c)).length;
const hasHook = name => name.endsWith('钩');

// Pinyin for single name characters (standard readings, used for the
// "term (pinyin)" brackets in generated text).
const CHAR_PY = {
  横: 'héng', 竖: 'shù', 撇: 'piě', 点: 'diǎn', 捺: 'nà', 提: 'tí',
  折: 'zhé', 弯: 'wān', 钩: 'gōu', 斜: 'xié', 卧: 'wò', 平: 'píng',
};
const py = ch => CHAR_PY[ch] ? `${ch} (${CHAR_PY[ch]})` : ch;
const np = s => `${s.name} (${s.pinyin})`;

const STROKE_NOTES = {
  hengpie: '横撇 (héng piě), not ✗横折撇: the turn goes directly into 撇 (piě), and only a turn producing héng or shù is written 折 (zhé).',
  shuzhezhegou: '竖折折钩 (shù zhé zhé gōu) = 竖 → [折→横] → [折→竖] → 钩: each 折 (zhé) is a sharp turn that produces the next segment.',
  hengzhewangou: '横折弯钩 (héng zhé wān gōu), as in 九 (jiǔ): a sharp 折 (zhé) turn, then a rounded 弯 (wān) bend, then the terminal 钩 (gōu) flick.',
  shuwan: '竖弯 (shù wān) turns with a rounded bend. Contrast 竖折 (shù zhé), whose corner is sharp.',
  shuzhe: '竖折 (shù zhé) turns with a sharp corner of about 90°. Contrast 竖弯 (shù wān), whose bend is rounded.',
  wogou: '卧钩 (wò gōu) lies almost flat (卧 wò means "to lie down"), then hooks up.',
  wangou: '弯钩 (wān gōu) curves gently down its whole length before the hook.',
};

const KAI_SONG_NOTE = 'Shapes here come from Kai-style font data. Song and other serif fonts render this stroke misleadingly.';

export function explain(correct, chosen) {
  const parts = [];
  if (chosen && chosen.id !== correct.id) {
    const c = correct.name, w = chosen.name;
    const cn = np(correct), wn = np(chosen);
    // R2: inserted/omitted 折 before 撇
    if (w.replace('折撇', '撇') === c || c.replace('撇', '折撇') === w) {
      parts.push(`${cn}, not ✗${w}: the turn goes directly into 撇 (piě), and only a turn producing héng or shù is written 折 (zhé).`);
    } else if (c.replace('折撇', '撇') === w) {
      parts.push(`${cn}: here the 折 (zhé) produces a segment before the 撇 (piě). Compare ${wn}, where the turn goes directly into 撇.`);
    }
    // R3: 折 vs 弯 swap
    if (!parts.length && (w.replaceAll('弯', '折') === c.replaceAll('弯', '折')) && w !== c) {
      parts.push(`折 (zhé) is a sharp turn of about 90°; 弯 (wān) is a rounded bend. Look at the corner: this glyph shows ${cn}.`);
    }
    // hook presence
    if (!parts.length && hasHook(c) !== hasHook(w)) {
      parts.push(hasHook(c)
        ? `${cn} ends with a small 钩 (gōu) flick at the tip, but ${wn} has none.`
        : `${cn} has no hook, while ${wn} would end with a 钩 (gōu) flick.`);
    }
    // joint count
    if (!parts.length && jointCount(c) !== jointCount(w)) {
      parts.push(`Count the turns: ${cn} has ${jointCount(c)} joint${jointCount(c) === 1 ? '' : 's'} and ${wn} has ${jointCount(w)}. Each 折 (zhé) or 弯 (wān) is one.`);
    }
    // first component
    if (!parts.length && c[0] !== w[0]) {
      parts.push(`${cn} starts with ${py(c[0])}; ${wn} starts with ${py(w[0])}.`);
    }
  }
  const note = STROKE_NOTES[correct.id];
  if (note && !parts.includes(note)) parts.push(note);
  if (correct.kaiSongCaveat || (chosen && chosen.kaiSongCaveat)) parts.push(KAI_SONG_NOTE);
  if (!parts.length) parts.push(`This is ${np(correct)}, ${correct.english}.`);
  return parts.slice(0, 2).join(' ');
}

// Name-builder: explain a wrong token assembly against the correct name.
export function explainTokens(correct, attempt) {
  const c = correct.name;
  const cn = np(correct);
  if (attempt === c) return null;
  if (attempt.replace('折撇', '撇') === c) {
    return `${cn}, not ✗${attempt}: the turn goes directly into 撇 (piě), and only a turn producing héng or shù is written 折 (zhé).`;
  }
  if (attempt.replaceAll('折', '弯') === c || attempt.replaceAll('弯', '折') === c) {
    return `折 (zhé) is a sharp turn of about 90°; 弯 (wān) is a rounded bend. This stroke is ${cn}.`;
  }
  if (hasHook(c) && !hasHook(attempt)) return `Don't forget the terminal 钩 (gōu), the small flick at the very end. It is ${cn}.`;
  if (!hasHook(c) && hasHook(attempt)) return `No 钩 (gōu) here; the stroke ends without a flick. It is ${cn}.`;
  if (jointCount(attempt) !== jointCount(c)) {
    return `Count the joints: ${cn} has ${jointCount(c)}, and each 折 (zhé) or 弯 (wān) is one turn. ${STROKE_NOTES[correct.id] ?? ''}`.trim();
  }
  return `It is ${cn}. ${STROKE_NOTES[correct.id] ?? 'A compound name is its component strokes in writing order plus the joint types: 折 (zhé) sharp, 弯 (wān) rounded, 钩 (gōu) hook.'}`;
}

// --- literal mnemonics (factual: glosses of the name characters only) --------
const GLOSS = {
  横: 'horizontal', 竖: 'vertical', 撇: 'left-falling sweep', 点: 'dot',
  捺: 'right-falling press', 提: 'rising flick', 折: 'sharp turn',
  弯: 'rounded bend', 钩: 'hook', 斜: 'slanted', 卧: 'to lie down', 平: 'level',
};
export const literalMnemonic = stroke =>
  `${stroke.name} = ` + [...stroke.name]
    .map(ch => `${ch} ${CHAR_PY[ch] ?? ''} (${GLOSS[ch] ?? '?'})`.replace('  ', ' '))
    .join(' + ');

// Name-builder eligibility: compound strokes whose names use only the 8 chips.
const CHIP_SET = new Set(['横', '竖', '撇', '点', '提', '折', '弯', '钩']);
export const CHIPS = ['横', '竖', '撇', '点', '提', '折', '弯', '钩'];
export const builderPool = strokes =>
  strokes.filter(s => s.name.length > 1 && [...s.name].every(c => CHIP_SET.has(c))
    && !(s.variantOf)); // variants like 竖撇 read as compounds but are single strokes
