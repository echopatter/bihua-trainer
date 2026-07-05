// src/character.js: in-character mode. Hanzi Writer renders/highlights the
// character; stroke names come from build-time validated data for curated
// characters, or from cnchar (CDN) for free input.
//
// CDN tradeoff (documented in README): libraries load from jsDelivr rather
// than being vendored: smaller repo and automatic patch releases, at the
// cost of needing the CDN reachable. Failure is handled with a clear message
// and a retry button; the rest of the app works fully offline.

import { byId, byName } from '../data/strokes.js';
import { VALIDATED_CHARS, VARIANT_EQUIV } from '../data/generated/char-validation.js';
import { CHAR_PINYIN } from '../data/generated/char-pinyin.js';
import { h } from './ui.js';
import { settings, recordAnswer } from './store.js';
import { distractors, shuffle, explain } from './engine.js';

// Exact pinned versions with subresource integrity hashes, so a compromised
// CDN cannot serve altered code.
const CDN = {
  hanziWriter: {
    url: 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.2/dist/hanzi-writer.min.js',
    integrity: 'sha384-4cRxvUqr4GOHwkg4ImHTfz/ui5g9iBzdXNLRmp+sFTsteWil2pQT2WZ7hQE66oYc',
  },
  cnchar: {
    url: 'https://cdn.jsdelivr.net/npm/cnchar@3.2.6/cnchar.min.js',
    integrity: 'sha384-6/YRyBrUCUBYHlIaB3KP/ruDKhxCGr42q3I39oSEMlm+2UWfoJ3v+hXyg6QWoZ79',
  },
  cncharOrder: {
    url: 'https://cdn.jsdelivr.net/npm/cnchar-order@3.2.6/cnchar.order.min.js',
    integrity: 'sha384-62eJAhp8VKPqMWr17LBnhSVCjN+0sqdh7cwNnnecefIrdW/swCunpFLpdenGETdJ',
  },
};

const loaded = {};
function loadScript({ url, integrity }) {
  loaded[url] ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.integrity = integrity;
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = () => { delete loaded[url]; reject(new Error(`failed to load ${url}`)); };
    document.head.append(s);
  });
  return loaded[url];
}

const stripDigits = x => x.replace(/[0-9]/g, '');
// Map a cnchar name (possibly 'a|b') to our stroke record, honoring the
// documented naming-scheme equivalences (prefer the 28-table name).
function mapName(raw) {
  const variants = String(raw).split('|').map(stripDigits);
  for (const [table, aliases] of Object.entries(VARIANT_EQUIV)) {
    if (variants.some(v => aliases.includes(v) || v === table)) return byName[table] ?? null;
  }
  for (const v of variants) if (byName[v]) return byName[v];
  return null;
}

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function characterMode(container) {
  let cleanup = () => {};
  const keydown = fn => {
    const g = e => { if (e.target.tagName !== 'INPUT') fn(e); };
    document.addEventListener('keydown', g);
    return () => document.removeEventListener('keydown', g);
  };

  function menu() {
    cleanup();
    const input = h('input', {
      type: 'text', maxlength: '2', placeholder: 'any character 任意汉字 (hànzì)',
      'aria-label': 'free character input',
    });
    input.addEventListener('keydown', e => {
      // [...str][0] keeps a full code point; str[0] would split rare
      // characters outside the BMP into a broken half
      if (e.key === 'Enter' && input.value.trim()) startFree([...input.value.trim()][0]);
    });
    container.replaceChildren(
      h('h1', {}, 'In-character mode'),
      h('p', { class: 'muted small' }, 'Name each stroke of a character in order. Curated characters are build-time validated against the stroke table.'),
      h('div', { class: 'chips', style: 'justify-content:flex-start' },
        ...VALIDATED_CHARS.map(c =>
          h('button', { class: 'chip hanzi', onclick: () => start(c.char, c.names, false) },
            c.char,
            CHAR_PINYIN[c.char] ? h('span', { class: 'muted small' }, ` ${CHAR_PINYIN[c.char]}`) : ''))),
      h('h3', {}, 'Free input'),
      h('div', {}, input),
      h('p', { class: 'small muted' }, 'Free-input characters use community data, so naming variants are possible.'));
  }

  async function startFree(char) {
    cleanup();
    container.replaceChildren(h('p', { class: 'muted' }, 'Loading stroke data…'));
    try {
      await loadScript(CDN.cnchar);
      await loadScript(CDN.cncharOrder);
      const raw = window.cnchar.stroke(char, 'order', 'name');
      const names = (Array.isArray(raw[0]) ? raw[0] : raw).map(n => String(n).split('|').map(stripDigits));
      if (!names.length || names.some(v => !v[0])) {
        return fail(`No stroke-name data for ${char}.`, menu);
      }
      const spelled = window.cnchar.spell(char, 'low', 'tone', 'poly');
      start(char, names, true,
        spelled && spelled !== char ? spelled.replace(/[()]/g, '').split('|').join('/') : null);
    } catch {
      fail("Couldn't load cnchar from jsDelivr, and free input needs it. Check your connection.", () => startFree(char));
    }
  }

  function fail(msg, retry) {
    container.replaceChildren(
      h('h1', {}, 'In-character mode'),
      h('div', { class: 'notice' }, h('span', {}, msg),
        h('button', { class: 'linklike', onclick: retry }, 'Retry')),
      h('button', { class: 'linklike', onclick: menu }, '← back'));
  }

  async function start(char, names, free, freePinyin = null) {
    cleanup();
    container.replaceChildren(h('p', { class: 'muted' }, 'Loading Hanzi Writer…'));
    let writer = null;
    const target = h('div', { id: 'hw-target' });
    try {
      await loadScript(CDN.hanziWriter);
    } catch {
      return fail("Couldn't load Hanzi Writer from jsDelivr, and this mode needs it. Check your connection.", () => start(char, names, free));
    }

    const stage = h('div', { class: 'quiz-stage' });
    const status = h('div', { class: 'quiz-prompt', 'aria-live': 'polite' });
    const area = h('div', { class: 'quiz-stage', style: 'margin-top:0; width:100%' });
    container.replaceChildren(
      h('div', { class: 'topbar' },
        h('h1', { class: 'hanzi' }, (CHAR_PINYIN[char] ?? freePinyin) ? `${char} (${CHAR_PINYIN[char] ?? freePinyin})` : char),
        h('button', { class: 'linklike', onclick: menu }, 'pick another')),
      free ? h('p', { class: 'small muted' }, 'Community data; naming variants possible.') : '',
      stage);
    stage.append(target, status, area);

    writer = window.HanziWriter.create(target, char, {
      width: 240, height: 240, padding: 8,
      showCharacter: true,
      strokeColor: cssVar('--ink') || '#111',
      highlightColor: cssVar('--accent') || '#2563EB',
      drawingColor: cssVar('--accent') || '#2563EB',
      onLoadCharDataError: () =>
        fail(`Couldn't load character data for ${char} (CDN problem or unknown character).`, menu),
    });

    let i = 0, right = 0;
    ask();

    function ask() {
      cleanup();
      area.replaceChildren();
      if (i >= names.length) {
        status.textContent = '';
        area.append(h('p', {}, `Done: ${right} / ${names.length} strokes named correctly.`),
          h('button', { class: 'primary', onclick: menu }, 'Another character'));
        return;
      }
      const stroke = mapName(names[i].join('|'));
      status.textContent = `What is stroke ${i + 1} of ${names.length}?`;
      if (!stroke) {
        area.append(
          h('p', { class: 'small muted hanzi' },
            `Stroke ${i + 1} is "${names[i].join(' / ')}", which is outside the 28-stroke table. Skipping it.`),
          h('button', { class: 'primary', onclick: () => { highlight(); i++; ask(); } }, 'Next'));
        return;
      }
      const options = shuffle([stroke, ...distractors(stroke, 3)]);
      const grid = h('div', { class: 'options' });
      const verdict = h('div', { class: 'verdict' });
      options.forEach((s, k) => grid.append(
        h('button', { class: 'hanzi', onclick: e => answer(s, e.currentTarget) },
          s.name + (settings().pinyin ? ` (${s.pinyin})` : ''))));
      area.append(grid, verdict);
      cleanup = keydown(e => {
        const k = ['1', '2', '3', '4'].indexOf(e.key);
        if (k >= 0) grid.children[k]?.click();
      });

      function answer(s, btn) {
        const ok = recordAnswer(stroke.id, s.id);
        if (ok) right++;
        [...grid.children].forEach(b => b.disabled = true);
        btn.classList.add(ok ? 'right' : 'picked-wrong');
        [...grid.children][options.indexOf(stroke)].classList.add('right');
        verdict.append(h('span', { class: 'mark' }, ok ? '✓ correct' : '✕ wrong'));
        if (!ok) area.append(h('div', { class: 'explain' }, explain(stroke, s)));
        highlight();
        area.append(h('button', { class: 'primary', onclick: () => { i++; ask(); } }, 'Next (space)'));
        cleanup();
        cleanup = keydown(e => { if (e.key === ' ') { e.preventDefault(); i++; ask(); } });
      }
    }

    function highlight() {
      try { writer.highlightStroke(i); } catch { /* index beyond writer data */ }
    }
  }

  menu();
  return () => cleanup();
}
