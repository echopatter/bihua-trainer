// src/modes.js: flashcards, multiple choice, name builder, common
// confusions, custom drill. Each mode exports render(container) and returns
// a cleanup function (removes key listeners).

import { STROKES, byId, CONFUSION_SEEDS } from '../data/strokes.js';
import { h, glyphSVG, setGlyphHighlight, animateGlyph } from './ui.js';
import {
  settings, srsGrade, recordAnswer, dueIds, topConfusionPairs,
} from './store.js';
import {
  pool, glyphOf, nextStroke, distractors, shuffle, explain, explainTokens,
  examplesOf, onlyExampleNote, literalMnemonic, CHIPS, builderPool, withPy,
} from './engine.js';

// --- shared bits -------------------------------------------------------------
function keys(handler) {
  const fn = e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    handler(e);
  };
  document.addEventListener('keydown', fn);
  return () => document.removeEventListener('keydown', fn);
}

function revealInfo(stroke) {
  const rows = [
    h('p', { class: 'quiz-name hanzi', 'aria-live': 'polite' }, stroke.name),
    h('p', { class: 'quiz-sub' },
      settings().pinyin ? `${stroke.pinyin} (${stroke.english})` : stroke.english),
  ];
  const ex = examplesOf(stroke);
  if (ex.length) rows.push(h('p', { class: 'muted hanzi' }, 'Examples: ', ex.map(withPy).join(', ')));
  const note = onlyExampleNote(stroke);
  if (note) rows.push(h('p', { class: 'small muted' }, note));
  if (settings().mnemonics) {
    rows.push(h('p', { class: 'mnemonic' },
      h('span', { class: 'tag' }, '字面 literal'), literalMnemonic(stroke)));
  }
  return h('div', { style: 'text-align:center' }, ...rows);
}

const mark = ok => h('span', { class: 'mark' }, ok ? '✓ correct' : '✕ wrong');

// ============================================================ FLASHCARDS ====
export function flashcards(container, opts = {}) {
  const strokes = opts.pool ?? pool();
  if (!strokes.length) { container.append(h('p', {}, 'No strokes available. Check settings or lessons.')); return () => {}; }
  let dir = 'shape2name';
  let last = null;
  let cleanupKeys = () => {};

  function pick() {
    const due = dueIds(strokes.map(s => s.id)).map(id => byId[id]).filter(s => s.id !== last);
    return due.length ? due[Math.floor(Math.random() * due.length)] : nextStroke(strokes, last);
  }

  function gradeRow(stroke, next) {
    const grades = [['again', 'Again'], ['hard', 'Hard'], ['good', 'Good'], ['easy', 'Easy']];
    const row = h('div', { class: 'grade-row' },
      ...grades.map(([g, label], i) =>
        h('button', { onclick: () => { srsGrade(stroke.id, g); next(); } },
          label)));
    cleanupKeys();
    cleanupKeys = keys(e => {
      const i = ['1', '2', '3', '4'].indexOf(e.key);
      if (i >= 0) { srsGrade(stroke.id, grades[i][0]); next(); }
    });
    return row;
  }

  function card() {
    const stroke = pick();
    last = stroke.id;
    const stage = h('div', { class: 'quiz-stage' });
    container.replaceChildren(
      h('div', { class: 'topbar' }, h('h1', {}, 'Flashcards'),
        h('span', { class: 'count' }, dir === 'shape2name' ? 'shape → name' : 'name → shape')),
      stage);

    if (dir === 'shape2name') {
      stage.append(glyphSVG(glyphOf(stroke.id), { size: 220, label: 'stroke to identify' }));
      const revealBtn = h('button', { class: 'primary', onclick: reveal }, 'Reveal (space)');
      stage.append(revealBtn);
      cleanupKeys();
      cleanupKeys = keys(e => { if (e.key === ' ') { e.preventDefault(); reveal(); } });
      function reveal() {
        revealBtn.remove();
        stage.append(revealInfo(stroke), gradeRow(stroke, () => { dir = 'name2shape'; card(); }));
      }
    } else {
      stage.append(
        h('p', { class: 'quiz-name hanzi' }, stroke.name),
        h('p', { class: 'quiz-sub' }, settings().pinyin ? stroke.pinyin : ''));
      const options = shuffle([stroke, ...distractors(stroke, 3, opts.pool ?? null)]);
      const grid = h('div', { class: 'glyph-options' });
      const verdict = h('div', { class: 'verdict' });
      options.forEach((s, i) => {
        const b = h('button', {
          'aria-label': `option ${i + 1}`,
          onclick: () => answer(s, b),
        }, glyphSVG(glyphOf(s.id), { size: 110, grid: true, label: `glyph option ${i + 1}` }));
        grid.append(b);
      });
      stage.append(grid, verdict);
      cleanupKeys();
      cleanupKeys = keys(e => {
        const i = ['1', '2', '3', '4'].indexOf(e.key);
        if (i >= 0) grid.children[i]?.click();
      });
      function answer(s, btn) {
        const ok = recordAnswer(stroke.id, s.id);
        [...grid.children].forEach(b => b.disabled = true);
        btn.classList.add(ok ? 'right' : 'picked-wrong');
        verdict.append(mark(ok));
        if (!ok) {
          [...grid.children][options.indexOf(stroke)].classList.add('right');
          stage.append(h('div', { class: 'explain' }, explain(stroke, s)));
          srsGrade(stroke.id, 'again');
          const btnNext = h('button', { class: 'primary', onclick: () => { dir = 'shape2name'; card(); } }, 'Next (space)');
          stage.append(btnNext);
          cleanupKeys();
          cleanupKeys = keys(e => { if (e.key === ' ') { e.preventDefault(); dir = 'shape2name'; card(); } });
        } else {
          stage.append(gradeRow(stroke, () => { dir = 'shape2name'; card(); }));
        }
      }
    }
  }
  card();
  return () => cleanupKeys();
}

// ======================================================== MULTIPLE CHOICE ===
export function mcq(container, opts = {}) {
  const strokes = opts.pool ?? pool();
  if (!strokes.length) { container.append(h('p', {}, 'No strokes available. Check settings or lessons.')); return () => {}; }
  let last = null;
  let n = 0, right = 0;
  let cleanupKeys = () => {};
  const total = opts.total ?? null; // finite quiz (lesson test-out) or endless

  function question() {
    if (total && n >= total) return opts.onDone?.(right, total);
    const stroke = nextStroke(strokes, last);
    last = stroke.id;
    n++;
    const options = shuffle([stroke, ...distractors(stroke, 3)]);
    const stage = h('div', { class: 'quiz-stage' });
    const verdict = h('div', { class: 'verdict' });
    container.replaceChildren(
      h('div', { class: 'topbar' },
        h('h1', {}, opts.title ?? 'Multiple choice'),
        h('span', { class: 'count' }, total ? `${n} / ${total}` : `#${n}`)),
      stage);
    stage.append(
      glyphSVG(glyphOf(stroke.id), { size: 220, label: 'stroke to identify' }),
      h('div', { class: 'quiz-prompt' }, 'Which stroke is this?'));
    const grid = h('div', { class: 'options' });
    options.forEach((s, i) => {
      grid.append(h('button', { class: 'hanzi', onclick: e => answer(s, e.currentTarget) },
        s.name + (settings().pinyin ? ` (${s.pinyin})` : '')));
    });
    stage.append(grid, verdict);
    cleanupKeys();
    cleanupKeys = keys(e => {
      const i = ['1', '2', '3', '4'].indexOf(e.key);
      if (i >= 0) grid.children[i]?.click();
    });

    function answer(s, btn) {
      const ok = recordAnswer(stroke.id, s.id);
      if (ok) right++;
      [...grid.children].forEach(b => b.disabled = true);
      btn.classList.add(ok ? 'right' : 'picked-wrong');
      [...grid.children][options.indexOf(stroke)].classList.add('right');
      verdict.append(mark(ok));
      if (!ok) stage.append(h('div', { class: 'explain' }, explain(stroke, s)));
      stage.append(h('button', { class: 'primary', onclick: question }, 'Next (space)'));
      cleanupKeys();
      cleanupKeys = keys(e => { if (e.key === ' ') { e.preventDefault(); question(); } });
    }
  }
  question();
  return () => cleanupKeys();
}

// =========================================================== NAME BUILDER ===
export function nameBuilder(container, opts = {}) {
  // compounds only; lesson gating would leave this mode empty early on,
  // and the lesson path is explicitly soft, so ignore locks here
  const strokes = builderPool(opts.pool ?? pool({ ignoreLocks: true }));
  if (!strokes.length) { container.append(h('p', {}, 'No compound strokes in the current selection.')); return () => {}; }
  let last = null;
  let cleanupKeys = () => {};
  let browsing = false;

  function tokensRow(glyph, svg) {
    // after answering: tap any token to highlight its segment
    const row = h('div', { class: 'chips' });
    glyph.segments.forEach((seg, i) => {
      const chip = h('button', { class: 'chip hanzi', onclick: () => {
        row.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        setGlyphHighlight(svg, i);
      } }, seg.token);
      row.append(chip);
    });
    return row;
  }

  function drill() {
    const stroke = nextStroke(strokes, last);
    last = stroke.id;
    const glyph = glyphOf(stroke.id);
    const stage = h('div', { class: 'quiz-stage' });
    header(stage);
    const svg = glyphSVG(glyph, { size: 220, ghost: true, label: 'compound stroke' });
    const slots = h('div', { class: 'answer-slots', 'aria-label': 'your answer' });
    const bank = h('div', { class: 'chips' });
    const verdict = h('div', { class: 'verdict' });
    let attempt = [];

    const redraw = () => {
      slots.replaceChildren(...attempt.map((t, i) =>
        h('button', { class: 'chip hanzi', 'aria-label': `remove ${t}`, onclick: () => { attempt.splice(i, 1); redraw(); } }, t)),
        attempt.length ? '' : h('span', { class: 'muted small' }, 'assemble the name from chips'));
    };
    CHIPS.forEach(c => bank.append(
      h('button', { class: 'chip hanzi', onclick: () => { attempt.push(c); redraw(); } }, c)));
    redraw();

    const check = h('button', { class: 'primary', onclick: submit }, 'Check (enter)');
    stage.append(svg,
      h('div', { class: 'quiz-prompt' }, 'Watch the stroke draw, then build its name'),
      slots, bank, check, verdict);
    animateGlyph(svg);
    cleanupKeys();
    cleanupKeys = keys(e => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Backspace') { attempt.pop(); redraw(); }
    });

    function submit() {
      if (!attempt.length) return;
      const guess = attempt.join('');
      const guessed = Object.values(byId).find(s => s.name === guess);
      const ok = recordAnswer(stroke.id, guessed?.id ?? (guess === stroke.name ? stroke.id : null));
      check.remove();
      bank.remove();
      verdict.append(mark(ok), ' ',
        h('span', { class: 'hanzi' }, `${stroke.name}`),
        settings().pinyin ? h('span', { class: 'muted' }, ` (${stroke.pinyin})`) : '');
      if (!ok) {
        const why = explainTokens(stroke, guess);
        if (why) stage.append(h('div', { class: 'explain' }, why));
      }
      stage.append(
        h('p', { class: 'small muted' }, 'Tap a token to see its segment:'),
        tokensRow(glyph, svg),
        h('button', { class: 'linklike', onclick: () => animateGlyph(svg) }, 'Replay animation'),
        h('button', { class: 'primary', onclick: drill }, 'Next (space)'));
      cleanupKeys();
      cleanupKeys = keys(e => { if (e.key === ' ') { e.preventDefault(); drill(); } });
    }
  }

  function browse() {
    const stage = h('div', {});
    header(stage);
    const list = h('div', { class: 'chips', style: 'justify-content:flex-start' });
    const detail = h('div', { class: 'quiz-stage' });
    strokes.forEach(s => list.append(
      h('button', { class: 'chip hanzi', onclick: () => show(s) }, `${s.name} (${s.pinyin})`)));
    stage.append(h('p', { class: 'small muted' }, 'Pick a compound stroke; tap tokens to highlight segments.'), list, detail);
    function show(s) {
      const glyph = glyphOf(s.id);
      const svg = glyphSVG(glyph, { size: 220 });
      detail.replaceChildren(svg,
        h('p', { class: 'quiz-sub hanzi' }, `${s.name}${settings().pinyin ? ` (${s.pinyin})` : ''}, ${s.english}`),
        tokensRow(glyph, svg),
        h('button', { class: 'linklike', onclick: () => animateGlyph(svg) }, 'Play animation'));
    }
    show(strokes[0]);
  }

  function header(stage) {
    container.replaceChildren(
      h('div', { class: 'topbar' },
        h('h1', {}, 'Name builder'),
        h('button', { class: 'linklike', onclick: () => { browsing = !browsing; browsing ? browse() : drill(); } },
          browsing ? '→ drill' : '→ browse')),
      stage);
  }

  drill();
  return () => cleanupKeys();
}

// ====================================================== COMMON CONFUSIONS ===
export function confusions(container) {
  const avail = pool({ ignoreLocks: true });
  const availIds = new Set(avail.map(s => s.id));
  const seeds = CONFUSION_SEEDS.filter(([a, b]) => availIds.has(a) && availIds.has(b));
  const user = topConfusionPairs(6)
    .filter(p => availIds.has(p.ids[0]) && availIds.has(p.ids[1]))
    .filter(p => !seeds.some(([a, b]) => new Set([a, b, ...p.ids]).size === 2));
  let cleanup = () => {};

  function menu() {
    cleanup();
    const rows = [];
    const pairRow = (a, b, tag) => h('button', {
      class: 'hanzi', style: 'width:100%; text-align:left',
      onclick: () => drillPair(a, b),
    }, `${byId[a].name} (${byId[a].pinyin}) ↔ ${byId[b].name} (${byId[b].pinyin})`,
      tag ? h('span', { class: 'muted small' }, `  ${tag}`) : '');
    seeds.forEach(([a, b]) => rows.push(pairRow(a, b)));
    user.forEach(p => rows.push(pairRow(p.ids[0], p.ids[1], `from your mistakes (${Math.round(p.count)})`)));
    container.replaceChildren(
      h('h1', {}, 'Common confusions'),
      h('p', { class: 'muted small' }, 'Seeded confusable pairs, plus pairs from your own confusion matrix.'),
      h('div', { class: 'mode-list' }, ...rows));
  }

  function drillPair(aId, bId) {
    const pair = [byId[aId], byId[bId]];
    let n = 0, right = 0;
    const total = 8;
    ask();
    function ask() {
      cleanup();
      if (n >= total) return summary();
      n++;
      const target = pair[Math.floor(Math.random() * 2)];
      const options = shuffle(pair);
      const stage = h('div', { class: 'quiz-stage' });
      const verdict = h('div', { class: 'verdict' });
      container.replaceChildren(
        h('div', { class: 'topbar' },
          h('h1', { class: 'hanzi' }, `${pair[0].name} (${pair[0].pinyin}) ↔ ${pair[1].name} (${pair[1].pinyin})`),
          h('span', { class: 'count' }, `${n} / ${total}`)),
        stage);
      const grid = h('div', { class: 'options' });
      options.forEach((s, i) => grid.append(
        h('button', { class: 'hanzi', onclick: e => answer(s, e.currentTarget) },
          s.name)));
      stage.append(glyphSVG(glyphOf(target.id), { size: 220 }), grid, verdict);
      cleanup = keys(e => {
        const i = ['1', '2'].indexOf(e.key);
        if (i >= 0) grid.children[i]?.click();
      });
      function answer(s, btn) {
        const ok = recordAnswer(target.id, s.id);
        if (ok) right++;
        [...grid.children].forEach(b => b.disabled = true);
        btn.classList.add(ok ? 'right' : 'picked-wrong');
        verdict.append(mark(ok));
        if (!ok) stage.append(h('div', { class: 'explain' }, explain(target, s)));
        // side-by-side comparison after each answer
        const cmp = h('div', { class: 'glyph-options' });
        pair.forEach(p => cmp.append(h('div', { style: 'text-align:center' },
          glyphSVG(glyphOf(p.id), { size: 110 }),
          h('div', { class: 'small hanzi' }, `${p.name} (${p.pinyin})${p.id === target.id ? ' ←' : ''}`))));
        stage.append(cmp, h('button', { class: 'primary', onclick: ask }, 'Next (space)'));
        cleanup();
        cleanup = keys(e => { if (e.key === ' ') { e.preventDefault(); ask(); } });
      }
    }
    function summary() {
      container.replaceChildren(
        h('h1', {}, 'Done'),
        h('p', {}, `${right} / ${total} correct on `,
          h('span', { class: 'hanzi' }, `${pair[0].name} ↔ ${pair[1].name}`), '.'),
        h('button', { class: 'primary', onclick: () => drillPair(aId, bId) }, 'Again'),
        ' ',
        h('button', { onclick: menu }, 'All pairs'));
    }
  }

  menu();
  return () => cleanup();
}

// =========================================================== CUSTOM DRILL ===
export function drill(container) {
  const avail = pool({ ignoreLocks: true });
  const selected = new Set();
  let innerCleanup = () => {};

  function setup() {
    innerCleanup();
    const groups = new Map();
    for (const s of avail) {
      if (!groups.has(s.tree)) groups.set(s.tree, []);
      groups.get(s.tree).push(s);
    }
    const FAM_PY = { 横: 'héng', 竖: 'shù', 撇: 'piě', 点: 'diǎn', 折: 'zhé' };
    const boxes = [];
    for (const [fam, list] of groups) {
      boxes.push(h('h3', { class: 'hanzi' },
        fam === '折' ? '折 (zhé) curved hooks' : `${fam} (${FAM_PY[fam] ?? ''})`));
      boxes.push(h('div', { class: 'chips', style: 'justify-content:flex-start' },
        ...list.map(s => {
          const b = h('button', {
            class: 'chip hanzi' + (selected.has(s.id) ? ' active' : ''),
            'aria-pressed': selected.has(s.id),
            onclick: () => {
              selected.has(s.id) ? selected.delete(s.id) : selected.add(s.id);
              b.classList.toggle('active');
              b.setAttribute('aria-pressed', selected.has(s.id));
            },
          }, `${s.name} (${s.pinyin})`);
          return b;
        })));
    }
    const start = mode => {
      const chosen = avail.filter(s => selected.has(s.id));
      if (!chosen.length) return;
      const body = h('div', {});
      container.replaceChildren(
        h('button', { class: 'linklike', onclick: setup }, '← change selection'), body);
      innerCleanup = mode(body, { pool: chosen });
    };
    container.replaceChildren(
      h('h1', {}, 'Custom drill'),
      h('p', { class: 'muted small' }, 'Tick exactly the strokes you want to practice, then pick a mode.'),
      ...boxes,
      h('hr'),
      h('div', { class: 'grade-row' },
        h('button', { onclick: () => start(flashcards) }, 'Flashcards'),
        h('button', { onclick: () => start(mcq) }, 'Multiple choice'),
        h('button', { onclick: () => start(nameBuilder) }, 'Name builder')));
  }
  setup();
  return () => innerCleanup();
}
