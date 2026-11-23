/**
 * keyboard.js — Clavier mathématique virtuel contextuel, disposé comme une calculatrice
 * (pavé numérique en grille : lisible et identique sur ordinateur, Chromebook, iPad et cellulaire).
 * Les touches insèrent du texte à la position du curseur dans le champ de réponse.
 */
import { h, escapeHtml } from './render.js';

/**
 * @param {HTMLInputElement} input
 * @param {object} opts { vars: ['x','y'], mode: 'expr'|'number'|'int'|'vars' }
 */
export function buildKeyboard(input, { vars = [], mode = 'expr' } = {}) {
  const kb = h('div', { class: `mathkb mathkb-${mode}`, role: 'group', 'aria-label': 'Clavier mathématique' });

  const insert = (txt) => {
    const s = input.selectionStart ?? input.value.length;
    const e = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, s) + txt + input.value.slice(e);
    const pos = s + txt.length;
    input.focus({ preventScroll: true });
    input.setSelectionRange(pos, pos);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const deplacer = (d) => { const p = Math.max(0, Math.min(input.value.length, (input.selectionStart ?? 0) + d)); input.focus({ preventScroll: true }); input.setSelectionRange(p, p); };
  const effacer = () => {
    const s = input.selectionStart ?? input.value.length, e = input.selectionEnd ?? s;
    if (s === e && s > 0) { input.value = input.value.slice(0, s - 1) + input.value.slice(e); input.setSelectionRange(s - 1, s - 1); }
    else { input.value = input.value.slice(0, s) + input.value.slice(e); input.setSelectionRange(s, s); }
    input.focus({ preventScroll: true }); input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const key = (label, action, cls = '', title = '', span = 1) => {
    const b = h('button', { type: 'button', class: `k ${cls}`, title: title || label, 'aria-label': title || label }, label);
    if (span > 1) b.style.gridColumn = `span ${span}`;
    if (cls.includes('k-vide')) { b.style.visibility = 'hidden'; b.tabIndex = -1; }
    b.style.minHeight = '46px';
    b.addEventListener('pointerdown', (ev) => ev.preventDefault()); // garde le focus dans le champ
    b.addEventListener('click', action);
    return b;
  };
  const num = (d) => key(d, () => insert(d), 'k-num');
  const op = (l, t, title) => key(l, () => insert(t), 'k-op', title);
  const DEL = () => key('⌫', effacer, 'k-del', 'effacer');
  const GAUCHE = () => key('←', () => deplacer(-1), 'k-nav', 'curseur à gauche');
  const DROITE = () => key('→', () => deplacer(1), 'k-nav', 'curseur à droite');

  // Ligne des variables (et des symboles algébriques)
  if (mode === 'expr' || mode === 'vars') {
    const row = h('div', { class: 'krow' });
    (vars.length ? vars : ['x']).forEach((v) => row.appendChild(key(v, () => insert(v), 'k-var')));
    if (mode === 'expr') {
      row.appendChild(op('▢²', '²', 'au carré'));
      row.appendChild(op('▢³', '³', 'au cube'));
      row.appendChild(op('(', '('));
      row.appendChild(op(')', ')'));
    }
    kb.appendChild(row);
  }
  if (mode === 'vars') return kb;

  // Pavé en grille, comme une calculatrice
  const grid = h('div', { class: 'kgrid' });
  // Disposition en grille écrite directement ici : le clavier reste correct même si le navigateur
  // garde temporairement une ancienne version de style.css en cache.
  const cols = mode === 'expr' ? 5 : 4;
  Object.assign(grid.style, { display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '.35rem' });
  if (cols === 4) grid.style.maxWidth = '420px';
  const add = (...ks) => ks.forEach((k) => grid.appendChild(k));
  if (mode === 'expr') {          // 5 colonnes
    add(num('7'), num('8'), num('9'), op('+', '+'), DEL());
    add(num('4'), num('5'), num('6'), op('−', '-', 'moins'), GAUCHE());
    add(num('1'), num('2'), num('3'), op('×', '×', 'multiplié par'), DROITE());
    add(key('0', () => insert('0'), 'k-num', '0', 2), op(',', ',', 'virgule décimale'), op('a/b', '/', 'fraction (division)'), op('^', '^', 'exposant'));
  } else {                         // nombre ou entier : 4 colonnes
    add(num('7'), num('8'), num('9'), DEL());
    add(num('4'), num('5'), num('6'), op('−', '-', 'moins'));
    add(num('1'), num('2'), num('3'), mode === 'number' ? op('a/b', '/', 'fraction') : GAUCHE());
    if (mode === 'number') add(num('0'), op(',', ',', 'virgule décimale'), GAUCHE(), DROITE());
    else add(key('0', () => insert('0'), 'k-num', '0', 2), DROITE(), key('', () => {}, 'k-vide', ' '));
  }
  kb.appendChild(grid);
  return kb;
}

/** Vrai sur tablette ou cellulaire tactile. */
export const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
export { escapeHtml };
