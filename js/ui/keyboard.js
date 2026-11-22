/**
 * keyboard.js — Clavier mathématique virtuel contextuel.
 * Les touches insèrent du texte à la position du curseur dans le champ de réponse.
 */
import { h, escapeHtml } from './render.js';

/**
 * @param {HTMLInputElement} input
 * @param {object} opts { vars: ['x','y'], mode: 'expr'|'number'|'int'|'vars', onEnter }
 */
export function buildKeyboard(input, { vars = [], mode = 'expr', onEnter } = {}) {
  const kb = h('div', { class: 'mathkb', role: 'group', 'aria-label': 'Clavier mathématique' });

  const insert = (txt, back = 0) => {
    const s = input.selectionStart ?? input.value.length;
    const e = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, s) + txt + input.value.slice(e);
    const pos = s + txt.length - back;
    input.focus({ preventScroll: true });
    input.setSelectionRange(pos, pos);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const key = (label, action, cls = '', title = '') => {
    const b = h('button', { type: 'button', class: `k ${cls}`, title: title || label, 'aria-label': title || label }, label);
    b.addEventListener('pointerdown', (ev) => ev.preventDefault()); // garde le focus dans le champ
    b.addEventListener('click', action);
    return b;
  };

  const rows = [];
  if (mode === 'expr' || mode === 'vars') {
    const letters = vars.length ? vars : ['x'];
    const r1 = h('div', { class: 'krow' });
    letters.forEach(v => r1.appendChild(key(v, () => insert(v), 'k-var')));
    if (mode === 'expr') {
      r1.appendChild(key('x²'.replace('x', '▢'), () => insert('²'), 'k-op', 'au carré'));
      r1.appendChild(key('▢³', () => insert('³'), 'k-op', 'au cube'));
      r1.appendChild(key('(', () => insert('('), 'k-op'));
      r1.appendChild(key(')', () => insert(')'), 'k-op'));
      r1.appendChild(key('a/b', () => insert('/'), 'k-op', 'fraction (division)'));
    }
    rows.push(r1);
  }
  if (mode !== 'vars') {
    const r2 = h('div', { class: 'krow' });
    ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'].forEach(d => r2.appendChild(key(d, () => insert(d), 'k-num')));
    rows.push(r2);
    const r3 = h('div', { class: 'krow' });
    r3.appendChild(key('+', () => insert('+'), 'k-op'));
    r3.appendChild(key('−', () => insert('-'), 'k-op', 'moins'));
    if (mode === 'expr') r3.appendChild(key('×', () => insert('×'), 'k-op', 'multiplié par'));
    if (mode === 'number') r3.appendChild(key('a/b', () => insert('/'), 'k-op', 'fraction'));
    r3.appendChild(key(',', () => insert(','), 'k-op', 'virgule décimale'));
    r3.appendChild(key('←', () => { const p = Math.max(0, (input.selectionStart ?? 0) - 1); input.focus(); input.setSelectionRange(p, p); }, 'k-nav', 'curseur à gauche'));
    r3.appendChild(key('→', () => { const p = Math.min(input.value.length, (input.selectionStart ?? 0) + 1); input.focus(); input.setSelectionRange(p, p); }, 'k-nav', 'curseur à droite'));
    r3.appendChild(key('⌫', () => {
      const s = input.selectionStart ?? input.value.length, e = input.selectionEnd ?? s;
      if (s === e && s > 0) { input.value = input.value.slice(0, s - 1) + input.value.slice(e); input.setSelectionRange(s - 1, s - 1); }
      else { input.value = input.value.slice(0, s) + input.value.slice(e); input.setSelectionRange(s, s); }
      input.focus(); input.dispatchEvent(new Event('input', { bubbles: true }));
    }, 'k-del', 'effacer'));
    rows.push(r3);
  }
  rows.forEach(r => kb.appendChild(r));
  return kb;
}

/** Vrai sur tablette tactile : on évite alors d'ouvrir le clavier natif par défaut. */
export const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
export { escapeHtml };
