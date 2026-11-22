/**
 * Module 5 — Résolution d'équations du 1er degré (niveaux 1 à 5) et application géométrique
 * On choisit d'abord la SOLUTION, puis on construit l'équation : les réponses sont « propres ».
 */
import { Frac } from '../math/frac.js';
import { parse, toLatex, evaluate, sum, Poly } from '../math/expr.js';
import { solveSteps } from '../math/steps.js';
import * as F from './figures.js';
import { randInt, randNZ, choice, chance, makeQ, letter, pretty, LETTRES } from './util.js';

const R = randNZ;
const sol = (lo = -9, hi = 12) => randNZ(lo, hi);

/** Valeur exacte d'un membre pour la solution s */
const at = (src, v, s) => evaluate(parse(src), { [v]: Frac.of(s) });

/* Décimales (comme dans le cahier : 3,5x − 7 = 16,1 ; 0,3x = 6 ; 5x + 2,5 = 10) */
const dec = (lo = -99, hi = 99) => { let x; do { x = randNZ(lo, hi); } while (x % 10 === 0); return new Frac(x, 10); };
const D = (f) => f.toString().replace(',', '.');           // Frac → texte pour l'analyseur
const plus = (f) => (f.isNeg() ? D(f) : '+' + D(f));        // « +2.5 » ou « -2.5 »
function niveauDecimal(niveau) {
  const v = letter(LETTRES);
  if (niveau === 2) {
    const kind = randInt(1, 3);
    if (kind === 1) { const a = randInt(2, 9), b = dec(-90, 90), x = chance(0.5) ? new Frac(sol()) : dec(-60, 90); return eqQ(`${a}${v}${plus(b)}`, D(x.mul(a).add(b)), v); }
    if (kind === 2) { const a = dec(1, 9), x = new Frac(randInt(2, 30)); return eqQ(`${D(a)}${v}`, D(a.mul(x)), v); }
    const a = randNZ(-9, 9, [1, -1]), b = randNZ(-20, 20), x = dec(-60, 60); return eqQ(`${a}${v}${b < 0 ? '' : '+'}${b}`, D(x.mul(a).add(b)), v);
  }
  if (niveau === 3) {
    let a, c; do { a = randNZ(-12, 20); c = randNZ(-12, 20); } while (a === c);
    const b = dec(-90, 90), x = dec(-60, 80), d = x.mul(a - c).add(b);
    return eqQ(`${sum([[a, v]])}${plus(b)}`, `${sum([[c, v]])}${plus(d)}`, v);
  }
  // niveau 5 : 3,5x − 7 + 2x = 16,1
  const p = dec(11, 59), k = randNZ(-12, 12), r = randInt(2, 5), x = new Frac(randInt(2, 12));
  const lhs = `${D(p)}${v}${k < 0 ? '' : '+'}${k}+${r}${v}`;
  return eqQ(lhs, D(at(lhs, v, x)), v);
}

function eqQ(lhs, rhs, v, extra = {}) {
  const { steps, solution } = solveSteps(lhs, rhs, v);
  return makeQ({
    prompt: extra.prompt || `Résous l'équation. <span class="muted">Donne la valeur de \\(${v}\\).</span>`,
    tex: `${toLatex(parse(lhs))} = ${toLatex(parse(rhs))}`,
    answerType: 'number', answer: solution, answerTex: `${v} = ${solution.toLatex()}`,
    keys: [v], steps, source: `${lhs}=${rhs}`, variable: v, ...extra,
  });
}

/* ---------- Niveau 1 : une étape ---------- */
function niveau1() {
  const v = letter(LETTRES);
  const s = sol(-9, 15);
  const kind = randInt(1, 5);
  if (kind === 1) { const a = R(-12, 12); return eqQ(sum([[1, v], [a, '']]), String(s + a), v); }
  if (kind === 2) { const a = R(-9, 9, [1]); return eqQ(sum([[a, v]]), String(a * s), v); }
  if (kind === 3) { const a = randInt(2, 9); return eqQ(`${v}/${a}`, String(s), v, { answer: new Frac(s * a) }); }
  if (kind === 4) { const a = R(-12, 12); return eqQ(String(s + a), sum([[1, v], [a, '']]), v); }
  // a / x = b (feuilles MathsLibres : 30/x = 6)
  const x = randInt(2, 9), b = randInt(2, 9), a = x * b;
  const steps = [
    { label: 'Équation de départ', tex: `\\frac{${a}}{${v}} = ${b}` },
    { label: `Multiplie chaque membre par ${v}`, note: 'L\'inconnue est au dénominateur : on la fait passer de l\'autre côté.', tex: `${a} = ${b}${v}` },
    { label: `Divise chaque membre par ${b}`, tex: `\\frac{${a}}{\\textcolor{#dc2626}{${b}}} = \\frac{${b}${v}}{\\textcolor{#dc2626}{${b}}}` },
    { label: 'Solution', tex: `${v} = ${x}`, final: true },
    { label: 'Validation', tex: `\\frac{${a}}{${x}} = ${b} \\;\\checkmark` },
  ];
  return makeQ({
    prompt: `Résous l'équation. <span class="muted">Donne la valeur de \\(${v}\\).</span>`,
    tex: `\\frac{${a}}{${v}} = ${b}`, answerType: 'number', answer: new Frac(x), answerTex: `${v} = ${x}`, keys: [v], steps, variable: v,
  });
}

/* ---------- Niveau 2 : deux étapes ---------- */
function niveau2() {
  if (chance(0.2)) return niveauDecimal(2);
  const v = letter(LETTRES);
  const s = sol();
  const kind = randInt(1, 6);
  if (kind <= 2) { const a = R(-9, 15, [1, -1]), b = R(-30, 50); return eqQ(sum([[a, v], [b, '']]), String(a * s + b), v); }
  if (kind === 3) { const a = randInt(2, 8), b = R(-20, 20), q = R(-9, 12); return eqQ(`${v}/${a}${b < 0 ? '' : '+'}${b}`, String(q + b), v); }
  if (kind === 4) { const a = randInt(2, 9), k = randInt(2, 5); const q = R(-6, 9); const b = R(-12, 12); // k v / a + b = c → v = a q / k
    const m = a * q; if (m % k !== 0 || gcd(k, a) !== 1) return niveau2();
    return eqQ(`${k}${v}/${a}${b < 0 ? '' : '+'}${b}`, String(q + b), v); }
  if (kind === 5) { const a = R(-9, 15, [1, -1]), b = R(-30, 50); return eqQ(String(a * s + b), sum([[b, ''], [a, v]]), v); }
  const a = randInt(2, 9), b = randInt(5, 60); return eqQ(`${b}-${a}${v}`, String(b - a * s), v);
}

/* ---------- Niveau 3 : variable des deux côtés ---------- */
function niveau3() {
  if (chance(0.15)) return niveauDecimal(3);
  const v = letter(LETTRES);
  const s = sol();
  let a, c;
  do { a = R(-12, 20); c = R(-12, 20); } while (a === c);
  const b = R(-30, 40);
  const d = (a - c) * s + b;
  if (chance(0.2)) return eqQ(sum([[a, v]]), sum([[c, v], [d, '']]), v);
  if (chance(0.25)) return eqQ(sum([[b, ''], [a, v]]), sum([[d, ''], [c, v]]), v);
  return eqQ(sum([[a, v], [b, '']]), sum([[c, v], [d, '']]), v);
}

/* ---------- Niveau 4 : parenthèses / distributivité ---------- */
function niveau4() {
  const v = letter(LETTRES);
  const s = sol(-8, 10);
  const kind = randInt(1, 4);
  if (kind === 1) { // a(bx + c) = e
    const a = R(-6, 9, [1, -1]), b = R(-5, 6), c = R(-9, 9);
    const lhs = `${a}(${sum([[b, v], [c, '']])})`; return eqQ(lhs, at(lhs, v, s).toString(), v);
  }
  if (kind === 2) { // a(bx + c) = dx + e
    let a, b, d; do { a = R(-6, 7, [1, -1]); b = R(-4, 5); d = R(-9, 9); } while (a * b === d);
    const c = R(-9, 9); const lhs = `${a}(${sum([[b, v], [c, '']])})`;
    const e = at(lhs, v, s).n - d * s; return eqQ(lhs, sum([[d, v], [e, '']]), v);
  }
  if (kind === 3) { // x + (x + a) + (2x − b) = c
    const a = R(-9, 9), k = randInt(2, 3), b = R(-12, 12);
    const lhs = `${v}+(${sum([[1, v], [a, '']])})+(${sum([[k, v], [b, '']])})`; return eqQ(lhs, at(lhs, v, s).toString(), v);
  }
  // a(bx + c) = d(ex + f)
  let a, b, d, e; do { a = R(-5, 6, [1, -1]); b = R(-4, 5); d = R(-5, 6, [1, -1]); e = R(-4, 5); } while (a * b === d * e);
  const c = R(-9, 9); const lhs = `${a}(${sum([[b, v], [c, '']])})`;
  const L = at(lhs, v, s).n; const rest = L - d * e * s;
  if (rest % d !== 0) return niveau4();
  return eqQ(lhs, `${d}(${sum([[e, v], [rest / d, '']])})`, v);
}

/* ---------- Niveau 5 : distributivité + regroupement + fractions ---------- */
function niveau5() {
  if (chance(0.15)) return niveauDecimal(5);
  const v = letter(['x', 'a', 'n', 'y', 'm']);
  const s = sol(-6, 12);
  const kind = randInt(1, 6);
  if (kind === 1) { // 3x + 15x − 3(x − 2) = 42
    const p = R(-9, 15), q = R(-9, 15), r = randInt(2, 6), t = R(-9, 9);
    if (p + q - r === 0) return niveau5();
    const lhs = `${sum([[p, v], [q, v]])}-${r}(${sum([[1, v], [t, '']])})`; return eqQ(lhs, at(lhs, v, s).toString(), v);
  }
  if (kind === 2) { // 2(x − 4) − (5x − 9) = −11
    const a = randInt(2, 6), b = R(-9, 9), c = R(1, 7, [a]), d = R(-12, 12);
    const lhs = `${a}(${sum([[1, v], [b, '']])})-(${sum([[c, v], [d, '']])})`; return eqQ(lhs, at(lhs, v, s).toString(), v);
  }
  if (kind === 3) { // x/3 − 4 + x/4 = 31
    const [a, b] = choice([[2, 3], [3, 4], [2, 5], [3, 6], [4, 6], [2, 4]]);
    const m = (a * b) / gcd(a, b); const x = m * randNZ(-4, 6); const c = R(-12, 12);
    const lhs = `${v}/${a}${c < 0 ? '' : '+'}${c}+${v}/${b}`; return eqQ(lhs, at(lhs, v, x).toString(), v);
  }
  if (kind === 4) { // a(x + b)/c = d
    const c = choice([2, 3, 4]), a = c * randInt(1, 3) * choice([1, -1]), b = R(-9, 9);
    const lhs = `${a}(${sum([[1, v], [b, '']])})/${c}`; return eqQ(lhs, at(lhs, v, s).toString(), v);
  }
  if (kind === 5) { // 3(x + 7) = −x + 2 + 5x
    let a, p, q; do { a = randInt(2, 6); p = R(-6, 6); q = R(-6, 9); } while (a === p + q);
    const b = R(-9, 9); const lhs = `${a}(${sum([[1, v], [b, '']])})`;
    const k = R(-9, 9); const L = at(lhs, v, s).n; const e = L - (p + q) * s - k;
    return eqQ(lhs, sum([[p, v], [k, ''], [q, v], [e, '']]), v);
  }
  // 2x/3 − 1 = x/2 + 4 (fractions des deux côtés)
  const [a, b] = choice([[3, 2], [4, 2], [5, 2], [3, 4], [6, 3]]);
  const k = randInt(1, 3); const m = (a * b) / gcd(a, b); const x = m * randNZ(-3, 5);
  const c = R(-9, 9); const lhs = `${k}${v}/${a}${c < 0 ? '' : '+'}${c}`;
  const rhsVal = at(lhs, v, x).sub(new Frac(x, b));
  if (!rhsVal.isInt() || k * b === a || gcd(k, a) !== 1) return niveau5();
  return eqQ(lhs, `${v}/${b}${rhsVal.isNeg() ? '' : '+'}${rhsVal.toString()}`, v);
}
function gcd(a, b) { return b ? gcd(b, a % b) : Math.abs(a); }

/* ---------- Niveau 5+ : équations avec fractions (expressions rationnelles) ----------
   Formes du cahier (no 22) :  (−x + 2)/3 = −x   ·   x/4 + 11/12 = x/6 − 3/4
                               2x/7 + 3 = (x + 2)/3 + 2   ·   2x/9 − 1/3 = (x − 1)/6            */
const lcmN = (a, b) => (a * b) / gcd(a, b);
/** Fraction → texte pour l'analyseur, avec signe : « +11/12 », « -3/4 », « +2 » ; rien si nulle */
function fracTxt(f, debut = false) {
  if (f.isZero()) return '';
  const corps = f.isInt() ? String(Math.abs(f.n)) : `${Math.abs(f.n)}/${f.d}`;
  return (f.isNeg() ? '-' : debut ? '' : '+') + corps;
}
/** Monôme fractionnaire kx/a écrit comme dans le cahier : « 2x/7 », « x/4 », « -x/3 » */
function monoFrac(k, v, a) { return `${k === 1 ? '' : k === -1 ? '-' : k}${v}/${a}`; }

function niveauFractions() {
  const v = letter(['x', 'x', 'a', 'n', 'y', 'm']);
  const kind = randInt(1, 4);
  if (kind === 1) { // (px + q)/c = rx + t
    for (let i = 0; i < 50; i++) {
      const c = randInt(2, 6), p = randNZ(-4, 5), r = randNZ(-4, 4), s = randNZ(-8, 9);
      if (p === c * r) continue;
      const k = randNZ(-4, 4), q = c * k - p * s;              // (p s + q) divisible par c
      if (q === 0 || Math.abs(q) > 30) continue;
      const t = (p * s + q) / c - r * s;
      return eqQ(`(${sum([[p, v], [q, '']])})/${c}`, sum([[r, v], [t, '']]), v);
    }
  }
  if (kind === 2) { // x/a + m/L = x/b + n/L  (constantes fractionnaires)
    const [a, b] = choice([[4, 6], [2, 3], [3, 4], [2, 5], [4, 3], [6, 4], [3, 2], [6, 9]]);
    const L = choice([lcmN(a, b), lcmN(a, b) * 2].filter((x) => x <= 24));
    const s = lcmN(a, b) * randNZ(-4, 4);
    const m = new Frac(randNZ(-L + 1, L - 1), L);
    const n = m.add(new Frac(s, a)).sub(new Frac(s, b));
    if (m.isInt() || n.isInt() || Math.abs(n.toNumber()) > 12) return niveauFractions();
    return eqQ(`${monoFrac(1, v, a)}${fracTxt(m)}`, `${monoFrac(1, v, b)}${fracTxt(n)}`, v);
  }
  if (kind === 3) { // kx/a + c = (x + d)/b + e
    for (let i = 0; i < 50; i++) {
      const [a, b] = choice([[7, 3], [3, 4], [5, 2], [4, 3], [2, 5], [6, 4], [5, 3]]);
      const k = randInt(1, 3); if (k % a === 0 || gcd(k, a) !== 1) continue;
      const s = lcmN(a, b) * randNZ(-2, 3);
      const d = randNZ(-9, 9); if ((s + d) % b !== 0) continue;
      const c = randNZ(-9, 9);
      const e = (k * s) / a + c - (s + d) / b;
      if (k * b === a) continue;
      return eqQ(`${monoFrac(k, v, a)}${c < 0 ? '' : '+'}${c}`, `(${sum([[1, v], [d, '']])})/${b}${e === 0 ? '' : (e < 0 ? '' : '+') + e}`, v);
    }
  }
  // kx/a − p/q = (x − d)/b
  for (let i = 0; i < 80; i++) {
    const [a, b] = choice([[9, 6], [3, 4], [5, 2], [4, 6], [3, 5], [9, 3]]);
    const k = randInt(1, 3); if (gcd(k, a) !== 1 || k * b === a) continue;
    const s = lcmN(a, b) * randNZ(-2, 3) / (randInt(0, 1) ? 1 : 1);
    const d = randNZ(-6, 6);
    const cst = new Frac(s - d, b).sub(new Frac(k * s, a)).neg(); // kx/a − cst = (x − d)/b
    if (cst.isZero() || cst.isInt() || cst.d > 18 || Math.abs(cst.toNumber()) > 6) continue;
    return eqQ(`${monoFrac(k, v, a)}${fracTxt(cst.neg())}`, `(${sum([[1, v], [-d, '']])})/${b}`, v);
  }
  return niveau5();
}


/* ---------- Application géométrique : trouver x à partir du périmètre ---------- */
function geo() {
  const v = 'x';
  for (let tries = 0; tries < 100; tries++) {
    const x = randInt(2, 12);
    const lin = (aMin = 1, aMax = 5) => sum([[randInt(aMin, aMax), v], [randNZ(-8, 9), '']]);
    const kind = choice(['rect', 'tri', 'iso', 'trap', 'poly']);
    let sides, svg, src, formula;
    if (kind === 'rect') { const L = lin(), l = lin(1, 3); sides = [L, l]; svg = F.rectangle(pretty(L), pretty(l)); src = `2(${L})+2(${l})`; formula = 'P = 2 × longueur + 2 × largeur'; }
    else if (kind === 'tri') { const a = lin(), b = lin(), c = lin(); sides = [a, b, c]; svg = F.triangle(pretty(a), pretty(b), pretty(c)); src = `(${a})+(${b})+(${c})`; formula = 'P = somme des côtés'; }
    else if (kind === 'iso') { const e = lin(), b = lin(); sides = [e, b]; svg = F.isoTriangle(pretty(e), pretty(b)); src = `2(${e})+(${b})`; formula = 'P = 2 × côté isométrique + base'; }
    else if (kind === 'trap') { const a = lin(), b = lin(), c = lin(), d = lin(); sides = [a, b, c, d]; svg = F.trapezoidPerim(pretty(a), pretty(b), pretty(c), pretty(d)); src = `(${a})+(${b})+(${c})+(${d})`; formula = 'P = somme des côtés'; }
    else { const n = choice([5, 6, 8]); const c = lin(); sides = [c]; svg = F.regularPolygon(n, pretty(c)); src = `${n}(${c})`; formula = `P = ${n} × côté`; }
    // Tous les côtés doivent être positifs
    if (sides.some(sd => at(sd, v, x).cmp(0) <= 0)) continue;
    const P = at(src, v, x);
    svg = F.withCaption(svg, `P = ${P.toString()} cm`);
    const q = eqQ(src, P.toString(), v, {
      prompt: 'Trouve la valeur de \\(x\\) à partir du <b>périmètre</b> de la figure. <span class="muted">(mesures en cm)</span>',
      svg,
    });
    q.tex = null;
    q.steps[0] = { ...q.steps[0], label: `Écris l'équation du périmètre : ${formula}`, note: 'On additionne les mesures des côtés et on égale le tout au périmètre donné.' };
    return q;
  }
  return niveau2();
}

export const THEMES = {
  n1: { label: 'Niveau 1 — Une étape', gen: niveau1 },
  n2: { label: 'Niveau 2 — Deux étapes', gen: niveau2 },
  n3: { label: 'Niveau 3 — Inconnue des deux côtés', gen: niveau3 },
  n4: { label: 'Niveau 4 — Parenthèses', gen: niveau4 },
  n5: { label: 'Niveau 5 — Équations complexes', gen: niveau5 },
  frac: { label: 'Niveau 5+ — Équations avec fractions', gen: niveauFractions },
  geo: { label: 'Géométrie — Trouver x avec le périmètre', gen: geo },
};
