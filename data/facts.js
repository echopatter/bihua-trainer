// data/facts.js
// "Did you know?" facts: shown max once per session, dismissible, settings-gated.
// SOURCE: all facts below were supplied as verified seeds in the project
// specification (bihua-trainer-final-prompt.md §Optional aids). Facts are
// NEVER generated at runtime; add new ones only with a source comment.
// Pinyin readings in brackets are standard dictionary readings.

export const FACTS = [
  { id: 'nv-ti',
    text: 'A standalone 女 (nǚ) ends in 横 (héng), but as the radical 女字旁 (nǚ zì páng) that final stroke becomes 提 (tí).' },
  { id: 'le-kai-song',
    text: 'The last stroke of 了 (le) is 弯钩 (wān gōu) in handwritten Kai style, but it looks like 竖钩 (shù gōu) in Song (serif) fonts.' },
  { id: 'never-alone',
    text: '折 (zhé), 钩 (gōu) and 弯 (wān) never occur alone; they exist only inside compound strokes.' },
  { id: 'gb-sort',
    text: 'The GB standard sorts compound strokes by their number of joints (折笔 zhébǐ).' },
  { id: 'chuo-radical',
    text: '辶 (chuò, the walking radical) is written 点 (diǎn), then 横折折撇 (héng zhé zhé piě), then 捺 (nà).' },
  { id: 'ding-rare',
    text: '鼎 (dǐng) is the standard example for 竖折折 (shù zhé zhé) even though it is a rare character; it is essentially the only common example.' },
  { id: 'five-families',
    text: 'The five shape categories 横竖撇点折 (héng shù piě diǎn zhé) assign 提 (tí) to the 横 family, 竖钩 (shù gōu) to the 竖 family, and 捺 (nà) to the 点 family.' },
];
