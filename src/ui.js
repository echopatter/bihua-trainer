// src/ui.js: DOM + SVG glyph rendering helpers (no framework).
import { GLYPH_TRANSFORM } from '../data/generated/glyphs.js';

const SVGNS = 'http://www.w3.org/2000/svg';

export function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

function s(tag, attrs = {}) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let uid = 0;

// 米字格 guide lines in a 0..200 box
function grid() {
  const g = s('g', { class: 'mizige', 'aria-hidden': 'true' });
  const line = (x1, y1, x2, y2) => g.append(s('line', { x1, y1, x2, y2 }));
  g.append(s('rect', { x: 1, y: 1, width: 198, height: 198, fill: 'none' }));
  line(0, 100, 200, 100);
  line(100, 0, 100, 200);
  line(0, 0, 200, 200);
  line(200, 0, 0, 200);
  return g;
}

// Render one stroke glyph. Returns the <svg>.
// opts: size (css px), grid (bool), ghost (bool: faint outline only),
//       label (aria-label)
export function glyphSVG(glyph, opts = {}) {
  const { size = 120, grid: showGrid = true, ghost = false, label = null } = opts;
  const svg = s('svg', {
    viewBox: '0 0 200 200', width: size, height: size, class: 'glyph',
    role: 'img', 'aria-label': label ?? `笔画 ${glyph?.name ?? ''}`,
  });
  if (showGrid) svg.append(grid());
  if (!glyph) {
    const t = s('text', { x: 100, y: 108, 'text-anchor': 'middle', class: 'glyph-missing' });
    t.textContent = '?';
    svg.append(t);
    return svg;
  }
  const clipId = `gclip${++uid}`;
  const defs = s('defs');
  const clip = s('clipPath', { id: clipId });
  clip.append(s('path', { d: glyph.path, transform: GLYPH_TRANSFORM }));
  defs.append(clip);
  svg.append(defs);
  const outline = s('path', {
    d: glyph.path, transform: GLYPH_TRANSFORM,
    class: ghost ? 'glyph-ink ghost' : 'glyph-ink',
  });
  svg.append(outline);
  svg._glyph = glyph;
  svg._clipId = clipId;
  svg._outline = outline;
  return svg;
}

const segPoints = (glyph, seg) =>
  glyph.median.slice(seg.start, seg.end + 1).map(p => p.join(',')).join(' ');

// Highlight segment(s) by index; pass null/[] to clear.
export function setGlyphHighlight(svg, segIndices) {
  svg.querySelectorAll('.glyph-hl').forEach(n => n.remove());
  const glyph = svg._glyph;
  if (!glyph || segIndices === null) return;
  const idxs = Array.isArray(segIndices) ? segIndices : [segIndices];
  for (const i of idxs) {
    const seg = glyph.segments[i];
    if (!seg) continue;
    svg.append(s('polyline', {
      points: segPoints(glyph, seg),
      class: 'glyph-hl',
      'clip-path': `url(#${svg._clipId})`,
    }));
  }
}

// Animate the stroke segment by segment (median drawn through the outline
// clip). Resolves when finished. Respects prefers-reduced-motion.
export function animateGlyph(svg, { onSegment = null, segmentPause = 260 } = {}) {
  const glyph = svg._glyph;
  if (!glyph) return Promise.resolve();
  svg.querySelectorAll('.glyph-anim').forEach(n => n.remove());
  if (reducedMotion()) {
    svg._outline.classList.remove('ghost');
    glyph.segments.forEach((_, i) => onSegment && onSegment(i));
    return Promise.resolve();
  }
  svg._outline.classList.add('ghost');
  let chain = Promise.resolve();
  glyph.segments.forEach((seg, i) => {
    chain = chain.then(() => new Promise(done => {
      onSegment && onSegment(i);
      const pl = s('polyline', {
        points: segPoints(glyph, seg),
        class: 'glyph-anim',
        'clip-path': `url(#${svg._clipId})`,
      });
      svg.append(pl);
      const L = pl.getTotalLength();
      pl.style.strokeDasharray = L;
      pl.style.strokeDashoffset = L;
      pl.getBoundingClientRect(); // reflow
      const dur = Math.max(180, L * 5);
      pl.style.transition = `stroke-dashoffset ${dur}ms ease-out`;
      pl.style.strokeDashoffset = '0';
      setTimeout(done, dur + segmentPause);
    }));
  });
  return chain.then(() => {
    svg._outline.classList.remove('ghost');
    svg.querySelectorAll('.glyph-anim').forEach(n => n.remove());
  });
}
