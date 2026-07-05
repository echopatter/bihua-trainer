// src/review.js: checkpoint page. Renders all extracted glyphs with
// per-segment hover highlight and the canonical-source mapping table.
import { STROKES } from '../data/strokes.js';
import { GLYPHS } from '../data/generated/glyphs.js';
import { h, glyphSVG, setGlyphHighlight } from './ui.js';

const grid = document.getElementById('grid');

for (const stroke of STROKES) {
  const glyph = GLYPHS[stroke.id];
  const svg = glyphSVG(glyph, { size: 128, label: `${stroke.name} glyph` });
  const tokens = h('div', { class: 'tokens' });
  if (glyph) {
    glyph.segments.forEach((seg, i) => {
      const tk = h('span', { class: 'tk', tabindex: '0' }, seg.token);
      const on = () => setGlyphHighlight(svg, i);
      const off = () => setGlyphHighlight(svg, null);
      tk.addEventListener('mouseenter', on);
      tk.addEventListener('mouseleave', off);
      tk.addEventListener('focus', on);
      tk.addEventListener('blur', off);
      tokens.append(tk);
    });
  }
  grid.append(h('div', { class: 'review-cell' },
    svg,
    h('div', { class: 'nm hanzi' }, `${stroke.name} `, h('span', { class: 'muted' }, `(${stroke.pinyin})`)),
    h('div', { class: 'src' },
      glyph
        ? `${glyph.source.char} #${glyph.source.index}` +
          (glyph.source.located ? ' (located)' : '') +
          (glyph.source.cncharName !== stroke.name ? `, cnchar: ${glyph.source.cncharName}` : '')
        : 'NOT EXTRACTED'),
    stroke.tier === 'extended' ? h('div', { class: 'flag' }, 'extended tier') : null,
    tokens,
  ));
}

const rows = STROKES.map(st => {
  const g = GLYPHS[st.id];
  return h('tr', {},
    h('td', { class: 'hanzi' }, st.name),
    h('td', {}, st.id),
    h('td', { class: 'hanzi' }, g ? `${g.source.char} #${g.source.index}${g.source.located ? ' (located)' : ''}` : '-'),
    h('td', { class: 'hanzi' }, g ? g.source.cncharName : '-'),
    h('td', {}, g ? g.segments.map(x => x.token).join(' ') : 'missing'),
  );
});
document.getElementById('table').append(
  h('table', { class: 'plain' },
    h('thead', {}, h('tr', {},
      h('th', {}, 'stroke'), h('th', {}, 'id'), h('th', {}, 'source'),
      h('th', {}, 'cnchar name'), h('th', {}, 'segments'))),
    h('tbody', {}, ...rows)),
);
