// src/main.js: hash router + app shell.
import { h } from './ui.js';
import { applyTheme } from './store.js';
import { flashcards, mcq, nameBuilder, confusions, drill } from './modes.js';
import { characterMode } from './character.js';
import { home, rules, family, progress, settingsScreen, testOut } from './screens.js';

const app = document.getElementById('app');
let cleanup = () => {};

applyTheme();

const ROUTES = {
  '': [home, null],
  '#/flash': [flashcards, 'Flashcards'],
  '#/mcq': [mcq, 'Multiple choice'],
  '#/builder': [nameBuilder, 'Name builder'],
  '#/char': [characterMode, 'In-character'],
  '#/drill': [drill, 'Custom drill'],
  '#/confusions': [confusions, 'Common confusions'],
  '#/rules': [rules, 'The rules'],
  '#/family': [family, 'Family tree'],
  '#/progress': [progress, 'Progress'],
  '#/settings': [settingsScreen, 'Settings'],
};

function route() {
  cleanup();
  cleanup = () => {};
  app.replaceChildren();
  const hash = location.hash;
  const test = hash.match(/^#\/test\/(\d)$/);
  const [fn, title] = test
    ? [c => testOut(c, test[1]), `L${test[1]} test-out`]
    : (ROUTES[hash] ?? ROUTES['']);
  document.title = title ? `${title} | 笔画 Trainer` : '笔画 Trainer';
  cleanup = fn(app) ?? (() => {});
  document.querySelectorAll('header.app nav a').forEach(a => {
    if (a.getAttribute('href') === (hash || '#')) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
