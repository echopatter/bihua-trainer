# 笔画 (Bǐhuà) Trainer

A static, client-side web game that teaches recognition of Chinese stroke
types, 笔画 (bǐhuà): their shapes, Chinese names, and pinyin. Plain HTML +
CSS + vanilla JS ES modules; no runtime framework, no build step needed to
serve.

**Practise here: https://echopatter.github.io/bihua-trainer/**

## Modes

- **Flashcards**: shape to name and name to pick-the-glyph, graded with
  SM-2-lite spaced repetition (localStorage).
- **Multiple choice**: glyph on a faint 米字格 (mǐzìgé) grid with adaptive
  distractors driven by your personal confusion matrix.
- **Name builder**: a compound stroke draws segment by segment; assemble its
  name from token chips (横竖撇点提折弯钩). After answering, tap any token to
  highlight its segment. Includes a browse mode.
- **In-character**: name each stroke of a real character in order (Hanzi
  Writer rendering plus cnchar stroke names).
- **Custom drill**: tick exactly the strokes to practice, in any mode.
- **Common confusions**: focused drills on confusable pairs (竖弯/竖折,
  弯钩/卧钩, and so on) plus your own top confusions.

Wrong answers always get a one-or-two-sentence rule-based explanation, for
example: *横撇 (héng piě), not 横折撇: the turn goes directly into 撇, and
only a turn producing héng or shù is written 折.* These are generated from
the encoded teaching rules, never free-form.

Progress (mastery, 28-stroke heatmap, confusion pairs, streak) lives entirely
in localStorage. Every answer is saved the moment it is given, so closing a
drill partway through loses nothing. Data persists until you reset it, import
another file, or clear the site's browser data; use the JSON export/import on
the Progress screen to move between devices. No trackers, no analytics, no
cookies.

## Data ground truth

- Stroke inventory: the **28-stroke 汉字笔画名称表** (PRC primary education),
  consistent with GF 2001-2001 《GB13000.1字符集汉字折笔规范》, transcribed
  verbatim in [data/strokes.js](data/strokes.js), plus an opt-in extended tier.
- Curated characters ([data/characters.js](data/characters.js)) are the table's
  own example characters. `hsk` is `null` everywhere until levels are sourced
  from a named open HSK dataset (planned Phase 2; never guessed).
- "Did you know?" facts ([data/facts.js](data/facts.js)) are curated and
  source-commented; nothing is generated at runtime.

## Stroke glyph architecture

No stroke coordinates are hand-authored. `scripts/extract-strokes.mjs`
derives every glyph from **hanzi-writer-data** (Make Me a Hanzi project,
Kai-style outlines from Arphic fonts): for each stroke type a canonical
`{character, strokeIndex}` source is verified against **cnchar + cnchar-order**
stroke names, the outline path is used for display, and the median polyline is
normalized and split into name-token segments by minimum-variance segmentation
over tangent angles. Output is committed in
[data/generated/glyphs.js](data/generated/glyphs.js), so the runtime needs no
extraction step.

Verification artifacts:

- [review.html](review.html): all 34 glyphs with per-segment hover highlight
  and the canonical-source mapping table.
- [data/generated/extraction-report.md](data/generated/extraction-report.md):
  per-stroke status. Two documented cnchar naming-scheme differences
  (九#1 横斜钩 vs table 横折弯钩; 山#1 竖弯 vs table 竖折) are flagged
  `NAME-VARIANT`, with glyphs taken from the table's own example characters.
- [data/generated/char-validation.md](data/generated/char-validation.md):
  build-time validation of every curated character's cnchar stroke names
  against the table (59 validated, 0 excluded).

## Runtime libraries (CDN vs vendoring)

Hanzi Writer and cnchar/cnchar-order load from jsDelivr **only in
in-character mode**, with graceful failure messaging and retry. Tradeoff:
the CDN keeps the repo small and picks up patch releases, at the cost of
needing the CDN reachable for that one mode; every other mode is fully
offline. If you prefer vendoring, drop the two minified files in `vendor/`
and change the URLs in [src/character.js](src/character.js).

## Development

```
npm install          # build-time deps only (hanzi-writer-data, cnchar)
npm run build-data   # re-run glyph extraction + character validation
node scripts/serve.mjs   # local server at http://localhost:8173
```

The served output is fully static and uses relative paths only, so it works
on GitHub Pages under a `/repo-name/` subpath.

## Credits & licenses

- App code: MIT ([LICENSE](LICENSE)).
- Stroke glyph data: derived from
  [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) /
  [Make Me a Hanzi](https://github.com/skishore/makemeahanzi), whose outlines
  come from fonts by **Arphic Technology**, used under the
  **Arphic Public License** ([ARPHICPL.txt](ARPHICPL.txt)).
- [Hanzi Writer](https://hanziwriter.org/) (MIT): character rendering in
  in-character mode.
- [cnchar](https://github.com/theajack/cnchar) + cnchar-order (MIT):
  per-stroke Chinese stroke names (build-time verification and free input).
- Stroke inventory and naming rules: 28-stroke 汉字笔画名称表 and
  GF 2001-2001 《GB13000.1字符集汉字折笔规范》;
  five-category assignment per 印刷通用汉字字形表 (1965).
