/**
 * expr.js — Cœur du moteur algébrique.
 *  1. normalize() : nettoie la saisie de l'élève (², −, ×, virgule décimale…)
 *  2. parse()     : transforme le texte en arbre (AST) en gardant la structure écrite
 *  3. toLatex()   : réaffiche l'arbre tel qu'écrit (aperçu, énoncés, substitution)
 *  4. expand()    : développe l'arbre en liste de termes (sans regrouper)
 *  5. Poly        : polynôme réduit (termes semblables regroupés), comparaison exacte
 *  6. reducedInfo(): l'expression écrite respecte-t-elle les règles d'écriture d'une expression réduite?
 */
import { Frac, ONE, lcm } from './frac.js';

/* ------------------------------------------------------------------ */
/* 1. Normalisation                                                    */
/* ------------------------------------------------------------------ */
const SUPERSCRIPTS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

export function normalize(s) {
  return String(s)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, m => '^' + [...m].map(c => SUPERSCRIPTS[c]).join(''))
    .replace(/[−–—‒]/g, '-')
    .replace(/[×·•∙✕]/g, '*')
    .replace(/[:]/g, '÷')
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/[\[{]/g, '(').replace(/[\]}]/g, ')')
    .toLowerCase();
}

/* ------------------------------------------------------------------ */
/* 2. Analyse syntaxique                                               */
/* ------------------------------------------------------------------ */
export class ParseError extends Error {}

function tokenize(src) {
  const s = normalize(src);
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const raw = s.slice(i, j);
      if ((raw.match(/\./g) || []).length > 1 || raw === '.') throw new ParseError(`Nombre mal écrit : « ${raw.replace(/\./g, ',')} »`);
      tokens.push({ type: 'num', raw, value: Frac.fromDecimalString(raw) });
      i = j;
    } else if (/[a-z]/.test(c)) {
      tokens.push({ type: 'var', name: c }); i++;
    } else if ('+-*/÷^()='.includes(c)) {
      tokens.push({ type: c }); i++;
    } else {
      throw new ParseError(`Caractère non reconnu : « ${c} »`);
    }
  }
  return tokens;
}

/**
 * Nœuds de l'arbre :
 *  {t:'num', v:Frac}            {t:'var', name}
 *  {t:'add', terms:[{sign:±1, node}]}
 *  {t:'mul', factors:[...], ops:['imp'|'*']}   (ops[i] = opérateur entre factors[i] et factors[i+1])
 *  {t:'div', num, den, op:'/'|'÷'}             {t:'pow', base, exp:int}
 *  {t:'neg', node}                             {t:'paren', node}
 */
export function parse(src) {
  const tokens = tokenize(src);
  if (!tokens.length) throw new ParseError('Réponse vide');
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (type) => {
    const t = tokens[pos];
    if (!t || (type && t.type !== type)) throw new ParseError(type === ')' ? 'Il manque une parenthèse fermante « ) »' : 'Expression incomplète');
    pos++; return t;
  };

  function parseExpr() {
    const terms = [];
    let sign = 1;
    if (peek() && (peek().type === '+' || peek().type === '-')) { sign = eat().type === '-' ? -1 : 1; }
    terms.push({ sign, node: parseTerm() });
    while (peek() && (peek().type === '+' || peek().type === '-')) {
      const s = eat().type === '-' ? -1 : 1;
      terms.push({ sign: s, node: parseTerm() });
    }
    if (terms.length === 1 && terms[0].sign === 1) return terms[0].node;
    return { t: 'add', terms };
  }

  function startsFactor(t) { return t && (t.type === 'num' || t.type === 'var' || t.type === '('); }

  function parseTerm() {
    let node = parseUnary();
    for (;;) {
      const t = peek();
      if (t && (t.type === '*' || startsFactor(t))) {
        const op = t.type === '*' ? (eat(), '*') : 'imp';
        const f = parseUnary();
        if (node.t === 'mul' && !node._closed) { node.factors.push(f); node.ops.push(op); }
        else node = { t: 'mul', factors: [node, f], ops: [op] };
      } else if (t && (t.type === '/' || t.type === '÷')) {
        eat();
        const f = parseUnary();
        if (node.t === 'mul') node._closed = true;
        node = { t: 'div', num: node, den: f, op: t.type };
      } else break;
    }
    if (node.t === 'mul') delete node._closed;
    return node;
  }

  function parseUnary() {
    const t = peek();
    if (t && t.type === '-') { eat(); return { t: 'neg', node: parseUnary() }; }
    if (t && t.type === '+') { eat(); return parseUnary(); }
    return parseFactor();
  }

  function parseFactor() {
    const base = parsePrimary();
    if (peek() && peek().type === '^') {
      eat();
      let e;
      if (peek() && peek().type === '(') { eat(); e = eat(); eat(')'); }
      else e = eat();
      if (e.type !== 'num' || !e.value.isInt()) throw new ParseError('Un exposant doit être un nombre entier positif');
      if (e.value.n > 9) throw new ParseError('Exposant trop grand');
      return { t: 'pow', base, exp: e.value.n };
    }
    return base;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new ParseError('Expression incomplète');
    if (t.type === 'num') { eat(); return { t: 'num', v: t.value, raw: t.raw }; }
    if (t.type === 'var') { eat(); return { t: 'var', name: t.name }; }
    if (t.type === '(') {
      eat();
      const inner = parseExpr();
      eat(')');
      return { t: 'paren', node: inner };
    }
    if (t.type === ')') throw new ParseError('Parenthèse fermante « ) » en trop');
    throw new ParseError(`Symbole « ${t.type} » mal placé`);
  }

  const ast = parseExpr();
  if (pos < tokens.length) {
    const t = tokens[pos];
    if (t.type === ')') throw new ParseError('Parenthèse fermante « ) » en trop');
    if (t.type === '=') throw new ParseError('Le signe « = » n\'est pas attendu ici');
    throw new ParseError('Expression mal formée');
  }
  return ast;
}

/** Essaie d'analyser; renvoie {ast} ou {error}. */
export function tryParse(src) {
  try { return { ast: parse(src) }; } catch (e) { return { error: e.message }; }
}

/* ------------------------------------------------------------------ */
/* 3. Affichage LaTeX de l'arbre (tel qu'écrit)                        */
/* ------------------------------------------------------------------ */
function numLatex(v) { return v.toLatex('auto'); }

/**
 * opts.subst : {x: Frac} remplace les variables par des valeurs (entre parenthèses)
 * opts.color : {x: '#hex'} colore certaines variables
 */
export function toLatex(node, opts = {}) {
  const L = (n) => toLatex(n, opts);
  switch (node.t) {
    case 'num': return numLatex(node.v);
    case 'var':
      if (opts.subst && opts.subst[node.name] !== undefined) {
        const v = Frac.of(opts.subst[node.name]);
        return `\\left(${numLatex(v)}\\right)`;
      }
      return node.name;
    case 'paren': return `\\left(${L(node.node)}\\right)`;
    case 'neg': {
      const inner = node.node.t === 'add' ? `\\left(${L(node.node)}\\right)` : L(node.node);
      return `-${inner}`;
    }
    case 'add': return node.terms.map((term, i) => {
      const body = L(term.node);
      if (i === 0) return term.sign < 0 ? `-${body}` : body;
      return (term.sign < 0 ? ' - ' : ' + ') + body;
    }).join('');
    case 'mul': {
      let out = '';
      node.factors.forEach((f, i) => {
        let s = L(f);
        if (f.t === 'add' || f.t === 'neg' && i > 0) s = `\\left(${s}\\right)`;
        if (i > 0) {
          const prev = node.factors[i - 1];
          const op = node.ops[i - 1];
          const substituted = opts.subst && (isSubstVar(f, opts) || isSubstVar(prev, opts));
          const needTimes = op === '*' || f.t === 'num' || (f.t === 'pow' && f.base.t === 'num') || substituted || f.t === 'div';
          out += needTimes ? ' \\times ' : '';
        }
        out += s;
      });
      return out;
    }
    case 'div': {
      if (node.op === '/') return `\\frac{${L(stripParen(node.num))}}{${L(stripParen(node.den))}}`;
      return `${L(node.num)} \\div ${L(node.den)}`;
    }
    case 'pow': {
      let b = L(node.base);
      if (node.base.t !== 'num' && node.base.t !== 'var' && node.base.t !== 'paren') b = `\\left(${b}\\right)`;
      if (node.base.t === 'num' && node.base.v.isNeg()) b = `\\left(${b}\\right)`;
      return `${b}^{${node.exp}}`;
    }
    default: return '?';
  }
}
function isSubstVar(n, opts) {
  if (!n) return false;
  if (n.t === 'var') return opts.subst[n.name] !== undefined;
  if (n.t === 'pow') return isSubstVar(n.base, opts);
  return false;
}
function stripParen(n) { return n.t === 'paren' ? n.node : n; }

/* ------------------------------------------------------------------ */
/* 4. Développement en termes (sans regroupement)                      */
/* ------------------------------------------------------------------ */
export class NonPolyError extends Error {}

/** Un terme : {coef: Frac, vars: {x:2, y:1}} */
export function termKey(vars) {
  return Object.keys(vars).filter(k => vars[k] > 0).sort().map(k => vars[k] === 1 ? k : `${k}^${vars[k]}`).join('');
}
function mulTerms(a, b) {
  const vars = { ...a.vars };
  for (const [k, e] of Object.entries(b.vars)) vars[k] = (vars[k] || 0) + e;
  return { coef: a.coef.mul(b.coef), vars };
}

export function expand(node) {
  switch (node.t) {
    case 'num': return [{ coef: node.v, vars: {} }];
    case 'var': return [{ coef: ONE, vars: { [node.name]: 1 } }];
    case 'paren': return expand(node.node);
    case 'neg': return expand(node.node).map(t => ({ ...t, coef: t.coef.neg() }));
    case 'add': return node.terms.flatMap(({ sign, node: n }) => expand(n).map(t => sign < 0 ? { ...t, coef: t.coef.neg() } : t));
    case 'mul': {
      let acc = [{ coef: ONE, vars: {} }];
      for (const f of node.factors) {
        const ft = expand(f);
        const next = [];
        for (const a of acc) for (const b of ft) next.push(mulTerms(a, b));
        acc = next;
      }
      return acc;
    }
    case 'div': {
      const den = Poly.fromTerms(expand(node.den));
      const dt = den.terms();
      if (dt.length !== 1) throw new NonPolyError('Division par une expression à plusieurs termes');
      const d = dt[0];
      if (d.coef.isZero()) throw new NonPolyError('Division par zéro');
      return expand(node.num).map(t => {
        const vars = { ...t.vars };
        for (const [k, e] of Object.entries(d.vars)) {
          vars[k] = (vars[k] || 0) - e;
          if (vars[k] < 0) throw new NonPolyError('Variable au dénominateur');
          if (vars[k] === 0) delete vars[k];
        }
        return { coef: t.coef.div(d.coef), vars };
      });
    }
    case 'pow': {
      let acc = [{ coef: ONE, vars: {} }];
      const bt = expand(node.base);
      for (let i = 0; i < node.exp; i++) {
        const next = [];
        for (const a of acc) for (const b of bt) next.push(mulTerms(a, b));
        acc = Poly.fromTerms(next).terms(); // regroupe au fur et à mesure
      }
      return acc;
    }
    default: throw new NonPolyError('Nœud inconnu');
  }
}

/** Évalue exactement l'arbre avec des valeurs (Frac). */
export function evaluate(node, env) {
  const E = (n) => evaluate(n, env);
  switch (node.t) {
    case 'num': return node.v;
    case 'var': {
      if (env[node.name] === undefined) throw new Error(`Valeur manquante pour ${node.name}`);
      return Frac.of(env[node.name]);
    }
    case 'paren': return E(node.node);
    case 'neg': return E(node.node).neg();
    case 'add': return node.terms.reduce((s, { sign, node: n }) => sign < 0 ? s.sub(E(n)) : s.add(E(n)), new Frac(0));
    case 'mul': return node.factors.reduce((p, f) => p.mul(E(f)), new Frac(1));
    case 'div': return E(node.num).div(E(node.den));
    case 'pow': return E(node.base).pow(node.exp);
    default: throw new Error('Nœud inconnu');
  }
}

export function varsOf(node, set = new Set()) {
  if (node.t === 'var') set.add(node.name);
  for (const k of ['node', 'num', 'den', 'base']) if (node[k]) varsOf(node[k], set);
  if (node.factors) node.factors.forEach(f => varsOf(f, set));
  if (node.terms) node.terms.forEach(t => varsOf(t.node, set));
  return set;
}

/* ------------------------------------------------------------------ */
/* 5. Polynôme réduit                                                  */
/* ------------------------------------------------------------------ */
function degreeOf(vars) { return Object.values(vars).reduce((s, e) => s + e, 0); }

/** Ordre d'affichage : degré décroissant, puis ordre alphabétique, constante à la fin. */
export function compareTerms(a, b) {
  const da = degreeOf(a.vars), db = degreeOf(b.vars);
  if (da !== db) return db - da;
  const ka = termKey(a.vars), kb = termKey(b.vars);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

export class Poly {
  constructor() { this.map = new Map(); }

  static fromTerms(terms) {
    const p = new Poly();
    for (const t of terms) p.addTerm(t);
    return p;
  }
  static parse(src) { return Poly.fromTerms(expand(parse(src))); }
  static fromAst(ast) { return Poly.fromTerms(expand(ast)); }
  static constant(c) { return Poly.fromTerms([{ coef: Frac.of(c), vars: {} }]); }

  addTerm(t) {
    const vars = {};
    for (const [k, e] of Object.entries(t.vars)) if (e > 0) vars[k] = e;
    const key = termKey(vars);
    const cur = this.map.get(key);
    const coef = cur ? cur.coef.add(t.coef) : Frac.of(t.coef);
    if (coef.isZero()) this.map.delete(key);
    else this.map.set(key, { coef, vars });
    return this;
  }
  terms() { return [...this.map.values()].sort(compareTerms); }
  add(o) { const p = Poly.fromTerms(this.terms()); o.terms().forEach(t => p.addTerm(t)); return p; }
  sub(o) { return this.add(o.scale(-1)); }
  scale(k) { k = Frac.of(k); return Poly.fromTerms(this.terms().map(t => ({ ...t, coef: t.coef.mul(k) }))); }
  coef(key = '') { const t = this.map.get(key); return t ? t.coef : new Frac(0); }
  isZero() { return this.map.size === 0; }
  isConstant() { return [...this.map.keys()].every(k => k === ''); }
  constValue() { return this.coef(''); }
  degree() { return this.isZero() ? 0 : Math.max(...this.terms().map(t => degreeOf(t.vars))); }
  size() { return this.map.size; }
  equals(o) {
    if (this.map.size !== o.map.size) return false;
    for (const [k, t] of this.map) { const u = o.map.get(k); if (!u || !u.coef.eq(t.coef)) return false; }
    return true;
  }
  denominatorsLcm() { return this.terms().reduce((m, t) => lcm(m, t.coef.d), 1); }
  toLatex() { return termsLatex(this.terms()); }
  toString() { return termsText(this.terms()); }
}

/** LaTeX d'un monôme. first: premier terme (pas de « + » devant). */
export function monoLatex(t, first = false, color = null) {
  const key = termKey(t.vars);
  const varPart = Object.keys(t.vars).filter(k => t.vars[k] > 0).sort()
    .map(k => t.vars[k] === 1 ? k : `${k}^{${t.vars[k]}}`).join('');
  const neg = t.coef.isNeg();
  const a = t.coef.abs();
  let coefPart = (key && a.isOne()) ? '' : a.toLatex('auto');
  let body = coefPart + varPart;
  if (color) body = `\\textcolor{${color}}{${body}}`;
  if (first) return (neg ? '-' : '') + body;
  return (neg ? ' - ' : ' + ') + body;
}
export function termsLatex(terms, colors = null) {
  if (!terms.length) return '0';
  return terms.map((t, i) => monoLatex(t, i === 0, colors ? colors[i] : null)).join('');
}
export function monoText(t, first = false) {
  const key = termKey(t.vars);
  const varPart = Object.keys(t.vars).filter(k => t.vars[k] > 0).sort()
    .map(k => t.vars[k] === 1 ? k : `${k}${t.vars[k] === 2 ? '²' : t.vars[k] === 3 ? '³' : '^' + t.vars[k]}`).join('');
  const neg = t.coef.isNeg();
  const a = t.coef.abs();
  const coefPart = (key && a.isOne()) ? '' : a.toString();
  if (first) return (neg ? '−' : '') + coefPart + varPart;
  return (neg ? ' − ' : ' + ') + coefPart + varPart;
}
export function termsText(terms) {
  if (!terms.length) return '0';
  return terms.map((t, i) => monoText(t, i === 0)).join('');
}

/* ------------------------------------------------------------------ */
/* 6. Règles d'écriture d'une expression réduite                        */
/* ------------------------------------------------------------------ */
/**
 * Analyse la forme ÉCRITE (pas la valeur).
 * Renvoie { reduced: bool, reason: string|null, notes: [conventions non respectées mais acceptées] }
 */
export function reducedInfo(ast) {
  const notes = new Set();
  const top = ast.t === 'add' ? ast.terms : [{ sign: 1, node: ast }];
  const keys = new Map();
  for (const { node } of top) {
    const m = monomialShape(node, notes);
    if (!m) return { reduced: false, reason: 'parentheses', notes: [...notes] };
    if (m.zero && top.length > 1) return { reduced: false, reason: 'zero', notes: [...notes] };
    if (keys.has(m.key)) return { reduced: false, reason: 'semblables', notes: [...notes] };
    keys.set(m.key, true);
  }
  return { reduced: true, reason: null, notes: [...notes] };
}

/** Si le nœud est un monôme bien écrit, renvoie {key}; sinon null. */
function monomialShape(node, notes) {
  if (node.t === 'neg') { notes.add('plusmoins'); return monomialShape(node.node, notes); }
  if (node.t === 'num') return { key: '', zero: node.v.isZero() };
  if (node.t === 'var') return { key: node.name };
  if (node.t === 'pow' && node.base.t === 'var') return { key: `${node.base.name}^${node.exp}` };
  if (node.t === 'div' && node.den.t === 'num') {
    // x/2, 3x/4 : coefficient fractionnaire accepté
    const inner = monomialShape(node.num, notes);
    return inner && !node.den.v.isZero() ? inner : null;
  }
  if (node.t === 'mul') {
    let nums = 0;
    const vars = {};
    for (let i = 0; i < node.factors.length; i++) {
      const f = node.factors[i];
      if (f.t === 'num' || (f.t === 'div' && f.num.t === 'num' && f.den.t === 'num')) {
        nums++;
        if (i > 0) notes.add('ordre');
        if (f.t === 'num' && f.v.isOne() && node.factors.length > 1) notes.add('un');
        if (f.t === 'num' && f.v.isZero()) return { key: '', zero: true };
      } else if (f.t === 'var') {
        if (vars[f.name]) return null; // x·x : pas réduit
        vars[f.name] = 1;
      } else if (f.t === 'pow' && f.base.t === 'var') {
        if (vars[f.base.name]) return null;
        vars[f.base.name] = f.exp;
      } else return null;
      if (i > 0 && node.ops[i - 1] === '*' ) notes.add('fois');
    }
    if (nums > 1) return null;
    return { key: termKey(vars) };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Aides pour les générateurs : écrire des expressions en syntaxe texte */
/* ------------------------------------------------------------------ */
/** mono(3,'x') → "3x"; mono(-1,'x') → "-x"; mono(5,'') → "5"; mono(2,'x^2') → "2x^2" */
export function mono(c, v = '') {
  if (!v) return String(c);
  if (c === 1) return v;
  if (c === -1) return '-' + v;
  return `${c}${v}`;
}
/** Somme de monômes en syntaxe texte : [[3,'x'],[-5,'']] → "3x-5" (les coefficients nuls sont ignorés) */
export function sum(parts) {
  const ps = parts.filter(([c]) => c !== 0);
  if (!ps.length) return '0';
  return ps.map(([c, v], i) => {
    const m = mono(c, v);
    return i === 0 ? m : (m.startsWith('-') ? m : '+' + m);
  }).join('');
}
/** "(...)" si négatif : utile pour écrire 7n - (-5n) */
export function par(s) { return `(${s})`; }

/** Raccourci : texte → LaTeX tel qu'écrit */
export function tex(src) { return toLatex(parse(src)); }
