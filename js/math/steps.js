/**
 * steps.js — Génération automatique de la DÉMARCHE affichée en rétroaction.
 *  - reductionSteps : réduire une expression (parenthèses, distributivité, termes semblables)
 *  - solveSteps     : résoudre une équation du 1er degré + validation de la solution
 *  - valueSteps     : valeur numérique (substitution, puissances, multiplications, somme)
 * Chaque étape : { label: 'texte', tex: 'LaTeX', note?: 'explication' }
 */
import { Frac, lcm } from './frac.js';
import { parse, toLatex, expand, Poly, termKey, termsLatex, monoLatex, reducedInfo, evaluate } from './expr.js';

export const COLORS = ['#2563eb', '#d97706', '#059669', '#db2777', '#7c3aed', '#0891b2'];
export const CONST_COLOR = '#64748b';
export const OP_COLOR = '#dc2626';

/* ---------- Détection de structures pour les explications ---------- */
function walk(node, fn, parent = null) {
  fn(node, parent);
  for (const k of ['node', 'num', 'den', 'base']) if (node[k]) walk(node[k], fn, node);
  if (node.factors) node.factors.forEach(f => walk(f, fn, node));
  if (node.terms) node.terms.forEach(t => walk(t.node, fn, node));
}
function varsIn(node, out = []) {
  if (node.t === 'var') out.push(node.name);
  for (const k of ['node', 'num', 'den', 'base']) if (node[k]) varsIn(node[k], out);
  if (node.factors) node.factors.forEach(f => varsIn(f, out));
  if (node.terms) node.terms.forEach(t => varsIn(t.node, out));
  return out;
}
function features(ast) {
  const f = { minusParen: false, distrib: false, divSum: false, monoMul: false, monoDiv: false, plusParen: false };
  walk(ast, (n) => {
    if (n.t === 'add') n.terms.forEach(t => {
      if (t.node.t === 'paren') { if (t.sign < 0) f.minusParen = true; else f.plusParen = true; }
    });
    if (n.t === 'neg' && n.node.t === 'paren') f.minusParen = true;
    if (n.t === 'mul') {
      const unwrap = (x) => (x.t === 'paren' ? unwrap(x.node) : x);
      const isSum = (x) => { const u = unwrap(x); return u.t === 'add' && u.terms.length > 1; };
      if (n.factors.some(x => x.t === 'paren' && isSum(x))) f.distrib = true;
      const nums = n.factors.filter(x => x.t === 'num').length;
      const vars = n.factors.flatMap(x => [...varsIn(unwrap(x))]);
      const repeated = new Set(vars).size < vars.length;
      if (nums >= 2 || repeated || n.factors.some(x => x.t === 'paren' && !isSum(x))) f.monoMul = true;
    }
    if (n.t === 'div') {
      const num = n.num.t === 'paren' ? n.num.node : n.num;
      if (num.t === 'add' && num.terms.length > 1) f.divSum = true; else f.monoDiv = true;
    }
  });
  return f;
}

/** Couleurs par clé de terme semblable (gris pour les constantes). */
function colorize(terms) {
  const keyColor = new Map();
  let ci = 0;
  const counts = new Map();
  terms.forEach(t => { const k = termKey(t.vars); counts.set(k, (counts.get(k) || 0) + 1); });
  return terms.map(t => {
    const k = termKey(t.vars);
    if (k === '') return CONST_COLOR;
    if (!keyColor.has(k)) keyColor.set(k, COLORS[ci++ % COLORS.length]);
    return keyColor.get(k);
  });
}

/* ------------------------------------------------------------------ */
export function reductionSteps(src, { startLabel = 'Expression de départ' } = {}) {
  const ast = typeof src === 'string' ? parse(src) : src;
  const steps = [{ label: startLabel, tex: toLatex(ast) }];
  const raw = expand(ast);
  const info = reducedInfo(ast);
  const f = features(ast);
  const poly = Poly.fromTerms(raw);

  if (!info.reduced && info.reason !== 'semblables' || f.monoMul || f.monoDiv) {
    const notes = [];
    if (f.minusParen) notes.push('Un signe « − » devant une parenthèse change le signe de chaque terme qu\'elle contient.');
    if (f.plusParen && !f.minusParen) notes.push('Un signe « + » devant une parenthèse : on enlève simplement la parenthèse.');
    if (f.distrib) notes.push('Distributivité : on multiplie le facteur par chaque terme de la parenthèse (attention aux signes).');
    if (f.divSum) notes.push('On divise chaque terme du numérateur par le dénominateur.');
    if (f.monoMul) notes.push('On multiplie les coefficients ensemble, puis les variables ensemble (x × x = x²).');
    if (f.monoDiv) notes.push('On divise les coefficients, puis les variables (x² ÷ x = x).');
    const label = f.distrib || f.minusParen || f.plusParen || f.divSum ? 'Élimine les parenthèses' : 'Effectue la multiplication ou la division';
    steps.push({ label, tex: termsLatex(raw), note: notes.join(' ') });
  }

  const keys = raw.map(t => termKey(t.vars));
  const hasLike = new Set(keys).size < keys.length || raw.some(t => t.coef.isZero());
  if (hasLike) {
    const colors = colorize(raw);
    steps.push({ label: 'Repère les termes semblables', tex: termsLatex(raw, colors), note: 'Les termes de même couleur ont exactement les mêmes variables avec les mêmes exposants.' });
    // Regroupement visible : (3x + 5x) + (−2 + 4)
    const groups = new Map();
    raw.forEach((t, i) => { const k = keys[i]; if (!groups.has(k)) groups.set(k, []); groups.get(k).push({ t, c: colors[i] }); });
    const parts = [...groups.values()].map(g => {
      const inner = g.map((x, j) => monoLatex(x.t, j === 0, x.c)).join('');
      return g.length > 1 ? `\\left(${inner}\\right)` : inner;
    });
    steps.push({ label: 'Regroupe les termes semblables', tex: parts.join(' + ').replace(/\+ -/g, '- ') });
  }
  steps.push({ label: 'Expression réduite', tex: poly.toLatex(), final: true });
  return { steps, poly };
}

/* ------------------------------------------------------------------ */
/* Résolution d'équations                                              */
/* ------------------------------------------------------------------ */
function sideLatex(p) { return p.toLatex(); }
function opLatex(kind, val, v) {
  // kind: 'add' (on ajoute val), terme en v si v donné
  const t = { coef: val, vars: v ? { [v]: 1 } : {} };
  return `\\textcolor{${OP_COLOR}}{${monoLatex(t, false)}}`;
}

/**
 * Résout L = R (texte ou arbres) pour la variable v.
 * Renvoie { steps, solution: Frac }
 */
export function solveSteps(lhsSrc, rhsSrc, v) {
  const lhs = typeof lhsSrc === 'string' ? parse(lhsSrc) : lhsSrc;
  const rhs = typeof rhsSrc === 'string' ? parse(rhsSrc) : rhsSrc;
  const original = `${toLatex(lhs)} = ${toLatex(rhs)}`;
  const steps = [{ label: 'Équation de départ', tex: original }];
  let L = Poly.fromAst(lhs), R = Poly.fromAst(rhs);

  const li = reducedInfo(lhs), ri = reducedInfo(rhs);
  if (!li.reduced || !ri.reduced) {
    const f1 = features(lhs), f2 = features(rhs);
    const notes = [];
    if (f1.distrib || f2.distrib) notes.push('distributivité');
    if (f1.minusParen || f2.minusParen) notes.push('signe − devant la parenthèse');
    if (f1.divSum || f2.divSum) notes.push('division de chaque terme');
    notes.push('regroupement des termes semblables');
    steps.push({ label: 'Réduis chaque membre', tex: `${sideLatex(L)} = ${sideLatex(R)}`, note: 'On simplifie d\'abord chaque côté : ' + notes.join(', ') + '.' });
  }

  // Inconnue seulement à droite (ex. 45 = 1 + 4x) : on inverse les membres
  if (L.coef(v).isZero() && !R.coef(v).isZero()) {
    [L, R] = [R, L];
    steps.push({ label: 'Inverse les deux membres', note: 'Une égalité se lit dans les deux sens : on place l\'inconnue à gauche.', tex: `${sideLatex(L)} = ${sideLatex(R)}` });
  }

  // Fractions : si une constante ou les deux côtés contiennent des fractions, on multiplie par le PPCM
  const varFracOnly = (() => {
    const constFrac = !L.coef('').isInt() || !R.coef('').isInt();
    const bothVar = !L.coef(v).isZero() && !R.coef(v).isZero();
    const anyVarFrac = !L.coef(v).isInt() || !R.coef(v).isInt();
    return { constFrac, bothVar, anyVarFrac };
  })();
  if (varFracOnly.constFrac || (varFracOnly.anyVarFrac && varFracOnly.bothVar)) {
    const m = lcm(L.denominatorsLcm(), R.denominatorsLcm());
    if (m > 1) {
      L = L.scale(m); R = R.scale(m);
      steps.push({ label: `Multiplie chaque membre par ${m}`, note: `${m} est un multiple commun des dénominateurs : les fractions disparaissent.`, tex: `${sideLatex(L)} = ${sideLatex(R)}` });
    }
  }

  // Termes en v du côté gauche
  const a2 = R.coef(v);
  if (!a2.isZero()) {
    const delta = Poly.fromTerms([{ coef: a2.neg(), vars: { [v]: 1 } }]);
    const opT = opLatex('add', a2.neg(), v);
    steps.push({ label: `${a2.isNeg() ? 'Additionne' : 'Soustrais'} ${monoLatex({ coef: a2.abs(), vars: { [v]: 1 } }, true)} des deux côtés`, note: 'On regroupe les termes contenant l\'inconnue du même côté.', tex: `${sideLatex(L)}${opT} = ${sideLatex(R)}${opT}` });
    L = L.add(delta); R = R.add(delta);
    steps.push({ label: 'Simplifie', tex: `${sideLatex(L)} = ${sideLatex(R)}` });
  }
  // Si l'inconnue est seulement à droite (rare après l'étape précédente) : impossible ici.
  const b = L.coef('');
  if (!b.isZero()) {
    const delta = Poly.constant(b.neg());
    const opT = opLatex('add', b.neg(), null);
    steps.push({ label: `${b.isNeg() ? 'Additionne' : 'Soustrais'} ${b.abs().toLatex()} des deux côtés`, note: 'Opération inverse : on isole le terme contenant l\'inconnue.', tex: `${sideLatex(L)}${opT} = ${sideLatex(R)}${opT}` });
    L = L.add(delta); R = R.add(delta);
    steps.push({ label: 'Simplifie', tex: `${sideLatex(L)} = ${sideLatex(R)}` });
  }
  let a = L.coef(v);
  let c = R.coef('');
  if (a.isZero()) {
    return { steps, solution: null, noUnique: true };
  }
  if (!a.isInt()) {
    // a = p/q : on multiplie par q, puis on divise par p
    const q = a.d;
    L = L.scale(q); R = R.scale(q);
    steps.push({ label: `Multiplie chaque membre par ${q}`, note: 'Opération inverse de la division.', tex: `${q} \\times ${monoLatex({ coef: a, vars: { [v]: 1 } }, true)} = ${q} \\times ${c.toLatex()} \\;\\Rightarrow\\; ${sideLatex(L)} = ${sideLatex(R)}` });
    a = L.coef(v); c = R.coef('');
  }
  const sol = c.div(a);
  if (!a.isOne()) {
    steps.push({ label: `Divise chaque membre par ${a.toLatex()}`, note: a.isNeg() ? 'Attention : on divise aussi par un nombre négatif, ce qui change le signe.' : 'Opération inverse de la multiplication.', tex: `\\frac{${sideLatex(L)}}{\\textcolor{${OP_COLOR}}{${a.toLatex()}}} = \\frac{${c.toLatex()}}{\\textcolor{${OP_COLOR}}{${a.toLatex()}}}` });
  }
  const solTex = sol.isInt() || sol.isDecimal() ? sol.toLatex() : `${sol.toLatex('frac')} \\approx ${String(Math.round(sol.toNumber() * 100) / 100).replace('.', '{,}')}`;
  steps.push({ label: 'Solution', tex: `${v} = ${solTex}`, final: true });

  // Validation (comme dans le cahier : on remplace dans l'équation de départ)
  try {
    const env = { [v]: sol };
    const lv = evaluate(lhs, env), rv = evaluate(rhs, env);
    steps.push({
      label: 'Validation',
      note: 'On remplace l\'inconnue par la solution dans l\'équation de départ : les deux membres doivent être égaux.',
      tex: `${toLatex(lhs, { subst: env })} = ${lv.toLatex()} \\quad\\text{et}\\quad ${toLatex(rhs, { subst: env })} = ${rv.toLatex()} \\;${lv.eq(rv) ? '\\checkmark' : '\\times'}`,
    });
  } catch (e) { /* validation facultative */ }
  return { steps, solution: sol };
}

/* ------------------------------------------------------------------ */
/* Valeur numérique                                                    */
/* ------------------------------------------------------------------ */
function fmtNum(f, wrapNeg) {
  const s = Frac.of(f).toLatex();
  return wrapNeg && Frac.of(f).isNeg() ? `\\left(${s}\\right)` : s;
}

export function valueSteps(src, env) {
  const ast = typeof src === 'string' ? parse(src) : src;
  const envF = Object.fromEntries(Object.entries(env).map(([k, x]) => [k, Frac.of(x)]));
  const steps = [{ label: 'Expression', tex: toLatex(ast) }];
  steps.push({ label: 'Remplace chaque variable par sa valeur', note: 'Mets toujours la valeur entre parenthèses, surtout si elle est négative.', tex: toLatex(ast, { subst: envF }) });
  const value = evaluate(ast, envF);
  const info = reducedInfo(ast);
  if (info.reduced) {
    // Expression = somme de monômes : on détaille puissances puis multiplications
    const terms = expand(ast);
    const hasPow = terms.some(t => Object.values(t.vars).some(e => e > 1));
    const negEven = terms.some(t => Object.entries(t.vars).some(([k, e]) => e % 2 === 0 && envF[k].isNeg()));
    const termVals = terms.map(t => {
      const factors = Object.entries(t.vars).map(([k, e]) => envF[k].pow(e));
      return { coef: t.coef, factors, value: factors.reduce((p, x) => p.mul(x), t.coef) };
    });
    const join = (arr) => arr.map((s, i) => i === 0 ? s : (s.startsWith('-') ? ` - ${s.slice(1)}` : ` + ${s}`)).join('');
    if (hasPow) {
      const parts = termVals.map(tv => {
        if (!tv.factors.length) return tv.coef.toLatex();
        const c = tv.coef.isOne() ? '' : tv.coef.eq(-1) ? '-' : `${tv.coef.toLatex()} \\times `;
        return c + tv.factors.map(x => fmtNum(x, true)).join(' \\times ');
      });
      steps.push({ label: 'Calcule les puissances', tex: join(parts), note: negEven ? 'Attention : un nombre négatif élevé à une puissance paire donne un résultat positif, ex. (−2)² = (−2) × (−2) = 4.' : 'Les exposants se calculent avant les multiplications.' });
    }
    steps.push({ label: 'Effectue les multiplications', tex: join(termVals.map(tv => tv.value.toLatex())) });
  } else {
    steps.push({ label: 'Effectue les opérations', note: 'Respecte la priorité des opérations : parenthèses, exposants, multiplications et divisions, puis additions et soustractions.', tex: `= ${value.toLatex()}` });
  }
  steps.push({ label: 'Valeur numérique', tex: value.toLatex(), final: true });
  return { steps, value };
}
