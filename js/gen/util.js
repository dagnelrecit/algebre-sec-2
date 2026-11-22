/**
 * util.js — Outils de hasard et de mise en forme partagés par les générateurs.
 */
import { Frac } from '../math/frac.js';
import { tex, Poly } from '../math/expr.js';

export const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;
export function randNZ(a, b, exclude = []) {
  let x;
  do { x = randInt(a, b); } while (x === 0 || exclude.includes(x));
  return x;
}
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function sample(arr, k) { return shuffle(arr).slice(0, k); }
export const sgn = () => (Math.random() < 0.5 ? -1 : 1);

/** Lettres utilisées comme variables (comme sur les feuilles MathsLibres : pas seulement x). */
export const LETTRES = ['x', 'a', 'n', 'y', 'b', 'c', 'm', 't', 'u', 'z', 'p', 'k'];
export const LETTRES_SIMPLES = ['x', 'a', 'n', 'y', 'b', 'm'];
export function letter(pool = LETTRES) { return choice(pool); }
export function twoLetters() {
  const pairs = [['x', 'y'], ['a', 'b'], ['m', 'n'], ['p', 'q'], ['s', 't'], ['x', 'z']];
  return choice(pairs);
}

/** Texte « joli » à partir d'une expression en syntaxe texte (pour les étiquettes SVG). */
export function pretty(src) {
  return String(src)
    .replace(/\^2/g, '²').replace(/\^3/g, '³')
    .replace(/\*/g, ' × ')
    .replace(/(?!^)-/g, ' − ').replace(/^-/, '−')
    .replace(/\+/g, ' + ')
    .replace(/\./g, ',');
}

/** Rang en français : 1er, 2e, 3e… */
export const rang = (k) => (k === 1 ? '1<sup>er</sup>' : `${k}<sup>e</sup>`);

/** Encapsule du LaTeX pour l'affichage inline dans une consigne. */
export const T = (latex) => `\\(${latex}\\)`;

/** Construit un objet question complet avec des valeurs par défaut. */
export function makeQ(base) {
  return {
    answerType: 'expr',
    requireReduced: true,
    keys: [],
    steps: [],
    ...base,
  };
}

/** Variables présentes dans une expression texte (pour le clavier contextuel). */
export function lettersIn(...srcs) {
  const set = new Set();
  srcs.forEach(s => String(s).replace(/[^a-z]/g, '').split('').forEach(c => set.add(c)));
  return [...set].sort();
}

export { Frac, tex, Poly };
