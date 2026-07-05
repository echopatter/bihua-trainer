// src/screens.js: home, rules, family tree, progress, settings, test-out.

import { STROKES, LESSONS, byId } from '../data/strokes.js';
import { FACTS } from '../data/facts.js';
import { h, glyphSVG } from './ui.js';
import {
  settings, setSetting, applyTheme, streakDays, mastery, topConfusionPairs,
  lessonPassed, setLessonResult, exportJSON, importJSON, resetAll, getState,
} from './store.js';
import { pool, glyphOf, examplesOf, withPy } from './engine.js';
import { mcq } from './modes.js';

// ------------------------------------------------------------------ HOME ---
export function home(container) {
  const modes = [
    ['#/flash', 'Flashcards', 'shape ↔ name, spaced repetition'],
    ['#/mcq', 'Multiple choice', 'glyph on a 米字格 (mǐzìgé) grid, adaptive distractors'],
    ['#/builder', 'Name builder', 'assemble compound names from tokens'],
    ['#/char', 'In-character', 'name each stroke of a real character'],
    ['#/drill', 'Custom drill', 'pick exactly the strokes to practice'],
    ['#/confusions', 'Common confusions', 'drill confusable pairs'],
  ];
  const showPy = settings().pinyin;
  const lessonRows = LESSONS.map(l => {
    const passed = lessonPassed(l.n);
    const strokeNodes = [];
    l.ids.forEach((id, i) => {
      if (i) strokeNodes.push('  ');
      strokeNodes.push(h('span', { class: 'hanzi' }, byId[id].name));
      if (showPy) strokeNodes.push(h('span', { class: 'py' }, ` (${byId[id].pinyin})`));
    });
    return h('div', { class: 'lesson-row' },
      h('div', {},
        h('div', {}, h('strong', {}, `L${l.n} `), l.title, passed ? h('span', { class: 'muted small' }, '  ✓ passed') : ''),
        h('div', { class: 'strokes' }, ...strokeNodes)),
      h('a', { class: 'btn', href: `#/test/${l.n}` }, passed ? 'Retake' : 'Test out'));
  });

  const kbd = key => h('span', { class: 'kbd' }, key);
  const kids = [
    streakDays() > 0 ? h('p', { class: 'small muted' }, `${streakDays()} day streak`) : null,
    h('ul', { class: 'mode-list' },
      ...modes.map(([href, name, desc]) => h('li', {},
        h('a', { href }, name, h('span', { class: 'desc' }, desc))))),
    h('p', { class: 'small muted kbd-hint' }, 'Practicing on a computer? The keys work too. ',
      kbd('1'), ' to ', kbd('4'), ' pick an answer, ', kbd('space'),
      ' flips the card or moves on, ', kbd('enter'), ' checks a name you built.'),
    h('h2', {}, 'Lesson path'),
    ...lessonRows,
    h('p', { class: 'small' },
      h('a', { href: '#/family' }, 'Family tree'), '  |  ',
      h('a', { href: '#/rules' }, 'The rules'), '  |  ',
      h('a', { href: '#/progress' }, 'Progress'), '  |  ',
      h('a', { href: 'review.html' }, 'Glyph review')),
  ];

  if (settings().didYouKnow && FACTS.length) {
    let factIdx = Math.floor(Math.random() * FACTS.length);
    const factText = h('p', { class: 'fact-text hanzi' }, FACTS[factIdx].text);
    kids.unshift(h('div', { class: 'fact-box' },
      h('p', { class: 'fact-kicker' }, 'Did you know?'),
      factText,
      h('p', { class: 'fact-actions' },
        h('button', { class: 'linklike', onclick: () => {
          factIdx = (factIdx + 1) % FACTS.length;
          factText.replaceChildren(FACTS[factIdx].text);
        } }, 'Show me another'))));
  }
  container.replaceChildren(...kids.filter(Boolean));
  return () => {};
}

// --------------------------------------------------------------- TEST-OUT --
export function testOut(container, n) {
  const lesson = LESSONS.find(l => l.n === Number(n));
  if (!lesson) { location.hash = ''; return () => {}; }
  const strokes = lesson.ids.map(id => byId[id]).filter(s => glyphOf(s.id));
  return mcq(container, {
    pool: strokes,
    total: 10,
    title: `L${lesson.n} test-out`,
    onDone: (right, total) => {
      setLessonResult(lesson.n, right, total);
      container.replaceChildren(
        h('h1', {}, right / total >= 0.8 ? 'Passed' : 'Not yet'),
        h('p', {}, `${right} / ${total} correct. ${right / total >= 0.8 ? 'Next lesson unlocked.' : 'Need 8 to pass.'}`),
        h('a', { class: 'btn', href: '#' }, 'Home'));
    },
  });
}

// ------------------------------------------------------------------ RULES --
export function rules(container) {
  const demo = id => {
    const g = glyphOf(id);
    return g ? glyphSVG(g, { size: 84 }) : '';
  };
  container.replaceChildren(
    h('h1', {}, 'The rules'),
    h('h2', {}, 'Five shapes'),
    h('p', { class: 'hanzi' }, 'Every stroke classifies under five main shapes: 横 (héng), 竖 (shù), 撇 (piě), 点 (diǎn), 折 (zhé). Official family assignment: 提 (tí) belongs to the 横 family, 竖钩 (shù gōu) to the 竖 family, and 捺 (nà) to the 点 family. All compound strokes classify under 折 for dictionary sorting (per 印刷通用汉字字形表 1965 and the GB13000.1 折笔规范).'),
    h('h2', { class: 'hanzi' }, 'When is it 折 (zhé)?'),
    h('p', { class: 'hanzi' }, 'A turn of about 90° that produces a héng or shù segment is written 折 (zhé). A turn directly into a 撇 (piě) keeps 撇 in the name: 又 (yòu) starts with 横撇 (héng piě), not ✗横折撇.'),
    h('p', { class: 'hanzi' }, 'A compound name is its component strokes in writing order plus the joint types: 折 (zhé, sharp turn), 弯 (wān, rounded bend), 钩 (gōu, terminal hook flick).'),
    h('div', { class: 'family-preview' }, demo('shuzhezhegou'),
      h('p', { class: 'hanzi small' }, h('strong', {}, '竖折折钩 (shù zhé zhé gōu)'), ' = 竖 → [折→横] → [折→竖] → 钩. Each 折 is one sharp turn producing the next segment.')),
    h('div', { class: 'family-preview' }, demo('hengzhewangou'),
      h('p', { class: 'hanzi small' }, h('strong', {}, '横折弯钩 (héng zhé wān gōu)'), ', as in 九 (jiǔ): sharp turn, then a ', h('em', {}, 'rounded'), ' bend, then the hook. Contrast the all-sharp 竖折折钩.')),
    h('p', { class: 'hanzi' }, '折 (zhé), 钩 (gōu) and 弯 (wān) never occur alone. They exist only inside compound strokes.'),
    h('h2', {}, 'Kai vs Song'),
    h('p', { class: 'hanzi' }, '弯钩 (wān gōu), 卧钩 (wò gōu) and 横折弯钩 (héng zhé wān gōu) render misleadingly in Song and other serif fonts. The last stroke of 了 (le) and 手 (shǒu) is 弯钩 in handwritten Kai. All glyphs in this app come from Kai-style font data, never from text glyphs.'),
    h('p', { class: 'small muted hanzi' }, 'Data note: cnchar (used for verification) names the second stroke of 山 (shān) as 竖弯 and the second stroke of 九 (jiǔ) as 横斜钩. This app follows the 28-stroke table (竖折 and 横折弯钩) and documents the difference in the extraction report.'),
    h('p', {}, h('a', { href: '#/family' }, 'See the family tree →')));
  return () => {};
}

// ------------------------------------------------------------ FAMILY TREE --
export function family(container) {
  const FAM_PY = { 横: 'héng', 竖: 'shù', 撇: 'piě', 点: 'diǎn', 折: 'zhé' };
  const groups = new Map([['横', []], ['竖', []], ['撇', []], ['点', []], ['折', []]]);
  for (const s of pool({ ignoreLocks: true })) groups.get(s.tree)?.push(s);
  const sections = [];
  for (const [fam, list] of groups) {
    if (!list.length) continue;
    const preview = h('div', { class: 'family-preview' });
    const members = h('div', { class: 'family-members' },
      ...list.map(s => h('button', { class: 'hanzi', onclick: () => {
        preview.replaceChildren(
          glyphSVG(glyphOf(s.id), { size: 110 }),
          h('div', {},
            h('div', { class: 'hanzi' }, settings().pinyin ? `${s.name} (${s.pinyin})` : s.name),
            h('div', { class: 'small muted' }, s.english),
            h('div', { class: 'small muted hanzi' }, examplesOf(s).length ? 'Examples: ' + examplesOf(s).map(withPy).join(', ') : ''),
            s.variantOf ? h('div', { class: 'small muted hanzi' }, `variant of ${byId[s.variantOf].name} (${byId[s.variantOf].pinyin})`) : ''));
      } }, `${s.name} (${s.pinyin})`)));
    sections.push(h('section', { class: 'family-group' },
      h('div', { class: 'head hanzi' },
        fam === '折' ? '折 (zhé) curved hooks' : `${fam} (${FAM_PY[fam]})`),
      members, preview));
  }
  container.replaceChildren(
    h('h1', {}, 'Family tree'),
    h('p', { class: 'muted small hanzi' }, 'Everything comes from five shapes. Strokes are grouped by their first written component; tap one to preview it. The official dictionary classification differs (all compound strokes sort under 折 zhé), see ', h('a', { href: '#/rules' }, 'the rules'), '.'),
    ...sections);
  return () => {};
}

// -------------------------------------------------------------- PROGRESS ---
export function progress(container) {
  const core = STROKES.filter(s => s.tier === 'core');
  const cells = core.map(s => {
    const m = mastery(s.id);
    return h('div', {
      class: 'cell hanzi',
      title: `${s.name}: ${m}%`,
      style: `background: color-mix(in srgb, var(--accent) ${Math.round(m * 0.45)}%, var(--panel))`,
    }, s.name[s.name.length - 1] === '钩' && s.name.length > 2 ? s.name.slice(0, 2) : s.name.slice(0, 2));
  });
  const rows = [...STROKES]
    .filter(s => settings().extendedTier || s.tier === 'core')
    .map(s => h('div', { class: 'stroke-row' },
      h('span', { class: 'stroke-name' },
        h('span', { class: 'hanzi' }, s.name),
        settings().pinyin ? h('span', { class: 'py' }, ` (${s.pinyin})`) : ''),
      h('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': mastery(s.id), 'aria-label': `${s.name} mastery` },
        h('div', { style: `width:${mastery(s.id)}%` })),
      h('span', { class: 'small muted' }, `${mastery(s.id)}%`)));
  const pairs = topConfusionPairs(8).map(p =>
    h('li', { class: 'hanzi' }, `${byId[p.ids[0]]?.name} ↔ ${byId[p.ids[1]]?.name} `,
      h('span', { class: 'muted small' }, `(${Math.round(p.count)})`)));

  const file = h('input', { type: 'file', accept: 'application/json', style: 'display:none' });
  file.addEventListener('change', async () => {
    if (!file.files[0]) return;
    try {
      importJSON(await file.files[0].text());
      progress(container);
    } catch { alert('Import failed: not a valid progress file.'); }
  });

  container.replaceChildren(
    h('h1', {}, 'Progress'),
    h('p', { class: 'small muted' }, 'Every answer is saved to this browser the moment you give it, so leaving a drill partway through loses nothing.'),
    streakDays() ? h('p', {}, `Streak: ${streakDays()} day${streakDays() === 1 ? '' : 's'}`) : h('p', { class: 'muted' }, 'No streak yet.'),
    h('h2', {}, '28-stroke heatmap'),
    h('div', { class: 'heatmap' }, ...cells),
    h('h2', {}, 'Per-stroke mastery'),
    ...rows,
    h('h2', {}, 'Confusion pairs'),
    pairs.length ? h('ul', {}, ...pairs) : h('p', { class: 'muted small' }, 'Nothing recorded yet.'),
    h('hr'),
    h('div', { class: 'grade-row' },
      h('button', { onclick: () => {
        const blob = new Blob([exportJSON()], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: 'bihua-progress.json' });
        a.click();
        URL.revokeObjectURL(a.href);
      } }, 'Export JSON'),
      h('button', { onclick: () => file.click() }, 'Import JSON')),
    file);
  return () => {};
}

// -------------------------------------------------------------- SETTINGS ---
export function settingsScreen(container) {
  const toggles = [
    ['pinyin', 'Show pinyin', 'display pinyin next to stroke names'],
    ['mnemonics', 'Mnemonics', 'one literal-gloss line under the reveal (labeled)'],
    ['didYouKnow', '"Did you know?"', 'a curated fact box on the home screen'],
    ['extendedTier', 'Extended stroke tier',
      '横折折 (héng zhé zhé), 竖折折 (shù zhé zhé), 横折折折 (héng zhé zhé zhé), 横斜钩 (héng xié gōu), 竖撇 (shù piě), 平捺 (píng nà)'],
    ['extendedExamples', 'Extended examples', 'include rare example characters such as 鼎 (dǐng)'],
  ];
  const rows = toggles.map(([key, label, hint]) => {
    const box = h('input', { type: 'checkbox', id: `set-${key}` });
    box.checked = settings()[key];
    box.addEventListener('change', () => setSetting(key, box.checked));
    return h('div', { class: 'setting-row' },
      h('label', { for: `set-${key}` }, label, h('span', { class: 'hint' }, hint)), box);
  });

  const themeSel = h('select', { id: 'set-theme' },
    ...['auto', 'light', 'dark'].map(t => {
      const o = h('option', { value: t }, t);
      if (settings().theme === t) o.setAttribute('selected', '');
      return o;
    }));
  themeSel.addEventListener('change', () => { setSetting('theme', themeSel.value); applyTheme(); });
  const themeRow = h('div', { class: 'setting-row' },
    h('label', { for: 'set-theme' }, 'Theme', h('span', { class: 'hint' }, 'auto follows your system')), themeSel);

  container.replaceChildren(
    h('h1', {}, 'Settings'),
    ...rows,
    themeRow,
    h('hr'),
    h('p', { class: 'small muted' }, 'All progress is saved in this browser instantly after every answer (localStorage). It stays until you press Reset, import another file, or clear this site\'s browser data; private/incognito windows drop it when they close. Progress is per browser and per device, so use Export and Import on the Progress screen to move it.'),
    h('button', { onclick: () => {
      if (confirm('Reset all progress and settings?')) { resetAll(); settingsScreen(container); }
    } }, 'Reset everything'));
  return () => {};
}
