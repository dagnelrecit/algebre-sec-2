/**
 * check.js — Correction des réponses avec tolérance intelligente.
 * Statuts renvoyés :
 *   'correct'    : bonne réponse
 *   'incorrect'  : mauvaise réponse (compte comme un essai)
 *   'nonreduit'  : équivalente mais pas réduite (compte comme un essai, message spécifique)
 *   'invalid'    : écriture illisible (NE compte PAS comme un essai : l'élève corrige sa frappe)
 * notes : rappels de conventions (« on écrit x plutôt que 1x »…) même si la réponse est acceptée.
 */
import { Frac } from './frac.js';
import { parse, Poly, reducedInfo, expand, NonPolyError } from './expr.js';

export const NOTE_TEXT = {
  un: 'Petit rappel : par convention, on écrit x plutôt que 1x (le coefficient 1 est invisible).',
  plusmoins: 'Petit rappel : on écrit « 3x − 2 » plutôt que « 3x + −2 ».',
  fois: 'Petit rappel : entre un nombre et une variable, le signe × est sous-entendu (on écrit 3x).',
  ordre: 'Petit rappel : le coefficient s\'écrit devant les variables (2xy plutôt que xy2).',
  fraction: 'Ta fraction est équivalente, mais pense à la simplifier.',
  approx: 'Réponse acceptée. Valeur exacte : ',
};

/** Expression algébrique : équivalence (+ forme réduite si demandée). */
export function checkExpr(input, expected, { requireReduced = true } = {}) {
  let ast;
  try { ast = parse(input); } catch (e) { return { status: 'invalid', message: e.message }; }
  let p;
  try { p = Poly.fromAst(ast); } catch (e) {
    return { status: 'invalid', message: e instanceof NonPolyError ? e.message : 'Expression non reconnue' };
  }
  const exp = expected instanceof Poly ? expected : Poly.parse(expected);
  const info = reducedInfo(ast);
  const notes = info.notes.filter(n => NOTE_TEXT[n]).map(n => NOTE_TEXT[n]);
  if (!p.equals(exp)) {
    // Diagnostic d'erreurs fréquentes
    let hint = null;
    if (p.scale(-1).equals(exp)) hint = 'Tous tes signes sont inversés. Vérifie le signe devant la parenthèse.';
    else if (sameKeys(p, exp)) hint = 'Tu as les bons termes, mais au moins un coefficient est incorrect. Vérifie les signes et la distributivité.';
    else if (p.size() < exp.size() && combinesUnlike(p, exp)) hint = 'Attention : on ne peut additionner que des termes semblables (mêmes variables, mêmes exposants).';
    return { status: 'incorrect', hint, notes: [] };
  }
  if (requireReduced && !info.reduced) {
    const msg = info.reason === 'semblables'
      ? 'Ton expression est équivalente, mais il reste des termes semblables à regrouper.'
      : 'Ton expression est équivalente, mais elle n\'est pas encore réduite (enlève les parenthèses et effectue les opérations).';
    return { status: 'nonreduit', hint: msg, notes };
  }
  return { status: 'correct', notes };
}
function sameKeys(a, b) {
  const ka = [...a.map.keys()].sort().join('|'), kb = [...b.map.keys()].sort().join('|');
  return ka === kb;
}
function combinesUnlike(p, exp) {
  // ex. 3x + 2 → 5x : l'élève a un seul terme dont le coefficient = somme des coefficients attendus
  const s = exp.terms().reduce((acc, t) => acc.add(t.coef), new Frac(0));
  return p.size() === 1 && p.terms()[0].coef.eq(s);
}

/** Nombre (entier, décimal avec virgule, fraction). Accepte « x = 4 ». */
export function checkNumber(input, expected, { allowApprox = true } = {}) {
  let s = String(input).trim().replace(/^\s*[a-zA-Z]\s*=\s*/, '').replace(/\s*(cm|m|mm|dm|\$|ans?|ml|mL|kg)\s*$/i, '');
  let ast;
  try { ast = parse(s); } catch (e) { return { status: 'invalid', message: e.message }; }
  const okShape = (n) => n.t === 'num' || (n.t === 'neg' && okShape(n.node)) || (n.t === 'add' && n.terms.length === 1 && okShape(n.terms[0].node))
    || (n.t === 'div' && n.op === '/' && okShape(n.num) && okShape(n.den)) || (n.t === 'paren' && okShape(n.node));
  let p;
  try { p = Poly.fromAst(ast); } catch (e) { return { status: 'invalid', message: 'Écris un seul nombre.' }; }
  if (!p.isConstant()) return { status: 'invalid', message: 'Ta réponse doit être un nombre (sans variable).' };
  if (!okShape(ast)) return { status: 'invalid', message: 'Écris un seul nombre (sans opération à effectuer).' };
  const v = p.constValue();
  const exp = Frac.of(expected);
  const notes = [];
  if (v.eq(exp)) {
    if (ast.t === 'div' || (ast.t === 'add' && ast.terms[0].node.t === 'div')) {
      const raw = s.replace(/[()\s-]/g, '');
      const [n, d] = raw.split('/');
      if (n && d && (Number(n) !== Math.abs(exp.n) || Number(d) !== exp.d) && exp.d !== 1) notes.push(NOTE_TEXT.fraction);
      if (exp.d === 1) notes.push(`On peut écrire simplement ${exp.n}.`);
    }
    return { status: 'correct', notes };
  }
  if (allowApprox && !exp.isDecimal()) {
    if (Math.abs(v.toNumber() - exp.toNumber()) <= 0.011 && !v.isInt()) {
      return { status: 'correct', notes: [NOTE_TEXT.approx + exp.toString()] };
    }
  }
  let hint = null;
  if (v.eq(exp.neg())) hint = 'Attention au signe!';
  return { status: 'incorrect', hint };
}

/** Entier simple (nombre de termes, degré…). */
export function checkInt(input, expected) {
  const s = String(input).trim();
  if (!/^-?\d+$/.test(s)) return { status: 'invalid', message: 'Écris un nombre entier.' };
  return Number(s) === Number(expected) ? { status: 'correct' } : { status: 'incorrect' };
}

/** Liste de variables : « xy », « x, y », « x et y » → ensemble {x,y}. */
export function checkVars(input, expected) {
  const s = String(input).toLowerCase().replace(/\bet\b/g, ' ').replace(/[^a-z]/g, '');
  if (!s) return { status: 'invalid', message: 'Écris la ou les variables (ex. : xy).' };
  const a = [...new Set(s)].sort().join('');
  const b = [...new Set(String(expected))].sort().join('');
  return a === b ? { status: 'correct' } : { status: 'incorrect' };
}

/** Choix multiple (index) ou sélection multiple (tableau d'index). */
export function checkChoice(selected, expected) {
  if (Array.isArray(expected)) {
    const a = [...(selected || [])].sort().join(','), b = [...expected].sort().join(',');
    if (!selected || !selected.length) return { status: 'invalid', message: 'Sélectionne au moins un élément.' };
    return a === b ? { status: 'correct' } : { status: 'incorrect' };
  }
  if (selected === null || selected === undefined) return { status: 'invalid', message: 'Choisis une réponse.' };
  return selected === expected ? { status: 'correct' } : { status: 'incorrect' };
}

/** Point d'entrée unique utilisé par l'interface. */
export function checkAnswer(q, input) {
  switch (q.answerType) {
    case 'expr': return checkExpr(input, q.answer, { requireReduced: q.requireReduced !== false });
    case 'number': return checkNumber(input, q.answer);
    case 'int': return checkInt(input, q.answer);
    case 'vars': return checkVars(input, q.answer);
    case 'choice': case 'multi': return checkChoice(input, q.answer);
    default: return { status: 'invalid', message: 'Type de question inconnu' };
  }
}
