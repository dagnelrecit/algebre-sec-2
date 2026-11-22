/**
 * Module 4 — Traduction et modélisation algébrique
 * Thèmes : traduction (banque), problemes (banque, réponse réduite), perimetre (SVG), aire (SVG)
 */
import { TRADUCTION, PROBLEMES } from '../../data/enonces.js';
import { parse, toLatex, Poly, sum } from '../math/expr.js';
import { reductionSteps } from '../math/steps.js';
import * as F from './figures.js';
import { randInt, randNZ, choice, chance, shuffle, makeQ, pretty, lettersIn } from './util.js';

const VARS = ['x', 'n', 'a', 'y', 'm', 'p', 't'];

/** Remplace {a} {b} {c} {d} {v} {w} dans un énoncé de la banque */
function fill(entry) {
  const nums = shuffle([2, 3, 4, 5, 6, 7, 8, 9]);
  const fixed = new Set((entry.texte + entry.reponse).replace(/\{[a-z]\}/g, '').match(/\b[a-z]\b/g) || []);
  const vs = shuffle(VARS.filter(v => !fixed.has(v)));
  const map = { a: nums[0], b: nums[1], c: nums[2], d: nums[3], v: vs[0], w: vs[1] };
  const sub = (s) => s.replace(/\{([abcdvw])\}/g, (_, k) => map[k]);
  return { texte: sub(entry.texte), reponse: sub(entry.reponse) };
}

function pickByLevel(bank, d) {
  const pool = bank.filter(e => (e.niveau || 1) <= d);
  const top = pool.filter(e => (e.niveau || 1) === d);
  return choice(top.length && chance(0.65) ? top : pool);
}

function genBank(bank, d, isProblem) {
  const entry = pickByLevel(bank, d);
  const { texte, reponse } = fill(entry);
  const ast = parse(reponse);
  const poly = Poly.fromAst(ast);
  const reduit = !!entry.reduit;
  const steps = isProblem
    ? reductionSteps(ast, { startLabel: 'Traduction de la situation' }).steps
    : [{ label: 'Traduction', tex: toLatex(ast), final: true, note: 'Mots-clés : somme (+), différence (−), produit (×), quotient (÷), double (2×), triple (3×), carré (²), de plus (+), de moins (−).' },
      ...(poly.toLatex() !== toLatex(ast) ? [{ label: 'Forme réduite équivalente (aussi acceptée)', tex: poly.toLatex() }] : [])];
  return makeQ({
    prompt: isProblem ? texte : `Traduis en expression algébrique : <span class="enonce">${texte}</span>`,
    answerType: 'expr', answer: poly, requireReduced: reduit,
    answerTex: reduit ? poly.toLatex() : toLatex(ast), keys: lettersIn(reponse), steps, source: reponse,
  });
}

/* ------------------------------------------------------------------ */
/* Figures : expressions de côtés                                     */
/* ------------------------------------------------------------------ */
const lin = (v, aMin = 1, aMax = 6) => sum([[randInt(aMin, aMax), v], [randNZ(-9, 9), '']]);

function genPerimetre(d) {
  const v = choice(['x', 'a', 'y', 'n']);
  const kinds = d === 1 ? ['rect', 'tri', 'carre'] : d === 2 ? ['rect', 'tri', 'iso', 'para', 'trap'] : ['poly', 'L', 'para', 'trap', 'iso'];
  const kind = choice(kinds);
  let svg, src, formula;
  if (kind === 'rect') {
    const L = lin(v), l = chance(0.5) ? lin(v, 1, 4) : String(randInt(3, 12));
    svg = F.rectangle(pretty(L), pretty(l)); src = `2(${L})+2(${l})`; formula = 'Formule : P = 2 × longueur + 2 × largeur';
  } else if (kind === 'carre') {
    const c = chance(0.5) ? `${randInt(2, 7)}${v}` : lin(v);
    svg = F.rectangle(pretty(c), '', { square: true }); src = `4(${c})`; formula = 'Formule : P = 4 × côté (les 4 côtés sont isométriques)';
  } else if (kind === 'tri') {
    const a = lin(v), b = lin(v), c = lin(v);
    svg = F.triangle(pretty(a), pretty(b), pretty(c)); src = `(${a})+(${b})+(${c})`; formula = 'Le périmètre est la somme des côtés';
  } else if (kind === 'iso') {
    const e = lin(v), b = lin(v);
    svg = F.isoTriangle(pretty(e), pretty(b)); src = `2(${e})+(${b})`; formula = 'Triangle isocèle : deux côtés isométriques. P = 2 × côté + base';
  } else if (kind === 'para') {
    const b = lin(v), s = lin(v, 1, 4);
    svg = F.parallelogram(pretty(b), pretty(s)); src = `2(${b})+2(${s})`; formula = 'Parallélogramme : côtés opposés isométriques. P = 2 × base + 2 × côté';
  } else if (kind === 'trap') {
    const t = lin(v), r = lin(v), b = lin(v), l = lin(v);
    svg = F.trapezoidPerim(pretty(t), pretty(r), pretty(b), pretty(l)); src = `(${t})+(${r})+(${b})+(${l})`; formula = 'Le périmètre est la somme des côtés';
  } else if (kind === 'poly') {
    const n = choice([5, 6, 8]); const c = lin(v);
    svg = F.regularPolygon(n, pretty(c)); src = `${n}(${c})`; formula = `Polygone régulier : ${n} côtés isométriques. P = ${n} × côté`;
  } else {
    // Figure en L : haut a, marche verticale b, palier c, bas = a + c, gauche = b + droite-bas
    const a = lin(v, 1, 4), b = String(randInt(2, 9)), c = lin(v, 1, 4), e = String(randInt(2, 9));
    const bottom = Poly.parse(`(${a})+(${c})`).toString().replace(/ /g, '').replace(/−/g, '-');
    const left = Poly.parse(`${b}+${e}`).toString();
    svg = F.lShape([pretty(a), pretty(b), pretty(c), pretty(e), pretty(bottom), pretty(left)]);
    src = `(${a})+${b}+(${c})+${e}+(${bottom})+${left}`; formula = 'Le périmètre est la somme de tous les côtés de la figure';
  }
  const ast = parse(src);
  const { steps, poly } = reductionSteps(ast, { startLabel: formula });
  return makeQ({
    prompt: 'Quelle expression algébrique <b>réduite</b> représente le <b>périmètre</b> de cette figure?',
    svg, answerType: 'expr', answer: poly, answerTex: poly.toLatex(), keys: lettersIn(src), steps, source: src,
  });
}

function genAire(d) {
  const v = choice(['x', 'a', 'y', 'n']);
  const kinds = d === 1 ? ['rect', 'carre'] : d === 2 ? ['rect', 'tri', 'para'] : ['tri', 'trap', 'carre', 'rect'];
  const kind = choice(kinds);
  let svg, src, formula;
  if (kind === 'rect') {
    const L = lin(v), k = randInt(2, 9);
    svg = F.rectangle(pretty(L), String(k)); src = `${k}(${L})`; formula = 'Formule : A = longueur × largeur (distributivité)';
  } else if (kind === 'carre') {
    const c = `${randInt(2, 6)}${v}`;
    svg = F.rectangle(pretty(c), '', { square: true }); src = `(${c})^2`; formula = 'Formule : A = côté × côté = côté²';
  } else if (kind === 'para') {
    const b = lin(v), h = randInt(2, 9);
    svg = F.parallelogram(pretty(b), '').replace('</svg>', `<line x1="110" y1="60" x2="110" y2="185" class="fig-dash"/><text x="118" y="125" class="fig-label" dominant-baseline="middle">${h}</text></svg>`);
    src = `${h}(${b})`; formula = 'Formule : A = base × hauteur';
  } else if (kind === 'tri') {
    const h = 2 * randInt(1, 6); const b = lin(v);
    svg = F.triangleArea(pretty(b), String(h)); src = `${h}(${b})/2`; formula = 'Formule : A = (base × hauteur) ÷ 2';
  } else {
    const h = 2 * randInt(1, 5); const B = lin(v, 2, 6), b = lin(v, 1, 3);
    svg = F.trapezoidArea(pretty(B), pretty(b), String(h)); src = `${h}((${B})+(${b}))/2`; formula = 'Formule : A = (grande base + petite base) × hauteur ÷ 2';
  }
  const ast = parse(src);
  const { steps, poly } = reductionSteps(ast, { startLabel: formula });
  return makeQ({
    prompt: 'Quelle expression algébrique <b>réduite</b> représente l\'<b>aire</b> de cette figure? <span class="muted">(les mesures sont en cm)</span>',
    svg, answerType: 'expr', answer: poly, answerTex: poly.toLatex(), keys: lettersIn(src), steps, source: src,
  });
}

export const THEMES = {
  traduction: { label: 'Traduire un énoncé en expression', gen: (d) => genBank(TRADUCTION, d, false) },
  problemes: { label: 'Problèmes en contexte (âges, argent…)', gen: (d) => genBank(PROBLEMES, d, true) },
  perimetre: { label: 'Périmètre d\'une figure', gen: genPerimetre },
  aire: { label: 'Aire d\'une figure', gen: genAire },
};
