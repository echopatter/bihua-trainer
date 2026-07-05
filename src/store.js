// src/store.js: all persistent state in localStorage (no cookies, no
// trackers). One JSON blob, exportable/importable from the settings screen.

const KEY = 'bihua-trainer-v1';

const DEFAULTS = {
  settings: {
    pinyin: true,
    mnemonics: false,      // optional aid, off by default (spec)
    didYouKnow: true,      // curated fact box on the home screen
    extendedTier: false,
    extendedExamples: false,
  },
  srs: {},        // strokeId -> {ease, ivl (days), due (ts), reps}
  stats: {},      // strokeId -> {seen, correct, wrong}
  confusion: {},  // "correctId|chosenId" -> count (decays on correct answers)
  lessons: {},    // lessonN -> {passed: true, best: n}
  streak: { last: null, days: 0 },
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULTS),
      ...parsed,
      settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
}

export const getState = () => state;
export const settings = () => state.settings;
export function setSetting(k, v) { state.settings[k] = v; save(); }

// --- streak (plain day count, no badges) -----------------------------------
const today = () => new Date().toISOString().slice(0, 10);
export function streakTick() {
  const t = today();
  const s = state.streak;
  if (s.last === t) return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  s.days = s.last === y ? s.days + 1 : 1;
  s.last = t;
  save();
}
export const streakDays = () => (state.streak.last === today() ||
  state.streak.last === new Date(Date.now() - 864e5).toISOString().slice(0, 10))
  ? state.streak.days : 0;

// --- SM-2-lite spaced repetition (flashcards) -------------------------------
function card(id) {
  return state.srs[id] ??= { ease: 2.5, ivl: 0, due: 0, reps: 0 };
}
export function srsGrade(id, grade) { // 'again' | 'hard' | 'good' | 'easy'
  const c = card(id);
  const now = Date.now();
  if (grade === 'again') {
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.ivl = 0;
    c.reps = 0;
    c.due = now + 10 * 60 * 1000; // 10 min
  } else {
    if (grade === 'hard') { c.ease = Math.max(1.3, c.ease - 0.15); c.ivl = Math.max(0.5, c.ivl * 1.2); }
    if (grade === 'good') { c.ivl = c.ivl < 1 ? 1 : c.ivl * c.ease; }
    if (grade === 'easy') { c.ease += 0.1; c.ivl = c.ivl < 1 ? 2 : c.ivl * c.ease * 1.3; }
    c.reps += 1;
    c.due = now + c.ivl * 864e5;
  }
  streakTick();
  save();
}
export const srsCard = id => state.srs[id] ?? null;
export const dueIds = ids => ids.filter(id => (state.srs[id]?.due ?? 0) <= Date.now());

// --- answer stats + confusion matrix ---------------------------------------
export function recordAnswer(correctId, chosenId) {
  const ok = correctId === chosenId;
  const st = state.stats[correctId] ??= { seen: 0, correct: 0, wrong: 0 };
  st.seen++;
  if (ok) {
    st.correct++;
    // decay confusion counts involving this stroke
    for (const k of Object.keys(state.confusion)) {
      if (k.split('|').includes(correctId)) {
        state.confusion[k] *= 0.9;
        if (state.confusion[k] < 0.2) delete state.confusion[k];
      }
    }
  } else {
    st.wrong++;
    if (chosenId) {
      const k = `${correctId}|${chosenId}`;
      state.confusion[k] = (state.confusion[k] ?? 0) + 1;
    }
  }
  streakTick();
  save();
  return ok;
}

export const confusionCount = (a, b) =>
  (state.confusion[`${a}|${b}`] ?? 0) + (state.confusion[`${b}|${a}`] ?? 0);

export function topConfusionPairs(limit = 8) {
  const pairs = new Map();
  for (const [k, v] of Object.entries(state.confusion)) {
    const [a, b] = k.split('|');
    const key = [a, b].sort().join('|');
    pairs.set(key, (pairs.get(key) ?? 0) + v);
  }
  return [...pairs.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, limit)
    .map(([k, count]) => ({ ids: k.split('|'), count }));
}

// --- derived mastery (documented heuristic, not a claim of science) ---------
// 50% long-run accuracy, 50% how far the SRS interval has grown toward 21 days.
export function mastery(id) {
  const st = state.stats[id];
  const c = state.srs[id];
  if (!st || !st.seen) return 0;
  const acc = st.correct / st.seen;
  const ivlPart = Math.min(1, (c?.ivl ?? 0) / 21);
  return Math.round(100 * (0.5 * acc + 0.5 * ivlPart));
}

// --- lessons -----------------------------------------------------------------
export const lessonPassed = n => !!state.lessons[n]?.passed;
export function setLessonResult(n, score, total) {
  const rec = state.lessons[n] ??= {};
  rec.best = Math.max(rec.best ?? 0, score);
  if (score / total >= 0.8) rec.passed = true;
  save();
}

// --- export / import ---------------------------------------------------------
export const exportJSON = () => JSON.stringify(state, null, 2);

// Only known keys with the expected shape are imported; anything else in the
// file is dropped. Rendering everywhere uses text nodes, so imported strings
// cannot inject markup either way.
const isObj = v => typeof v === 'object' && v !== null && !Array.isArray(v);
export function importJSON(text) {
  const parsed = JSON.parse(text); // throws on bad JSON
  if (!isObj(parsed)) throw new Error('not an object');
  const next = structuredClone(DEFAULTS);
  for (const k of Object.keys(DEFAULTS.settings)) {
    if (typeof parsed.settings?.[k] === 'boolean') next.settings[k] = parsed.settings[k];
  }
  for (const k of ['srs', 'stats', 'confusion', 'lessons']) {
    if (isObj(parsed[k])) next[k] = structuredClone(parsed[k]);
  }
  if (isObj(parsed.streak)) {
    if (typeof parsed.streak.last === 'string') next.streak.last = parsed.streak.last;
    if (typeof parsed.streak.days === 'number') next.streak.days = parsed.streak.days;
  }
  state = next;
  save();
}
export function resetAll() {
  state = structuredClone(DEFAULTS);
  save();
}
