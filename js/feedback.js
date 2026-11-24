/**
 * feedback.js — Rétroaction constructive (modèle de Hattie et Timperley), version CONSERVATRICE.
 *
 *  Où vais-je?          → INTENTIONS : « Je suis capable de… » affiché pendant la série.
 *  Où en suis-je?       → diagnostiquer() : nomme l'erreur SEULEMENT si la réponse de l'élève correspond
 *                          exactement et sans ambiguïté à une erreur fréquente connue. Sinon : indice de
 *                          processus général (INDICES), en une phrase.
 *  Quelle est la suite? → prochaineEtape() : UNE seule piste dans le bilan, avec une série ciblée.
 *
 * Principe : mieux vaut un indice général juste qu'un diagnostic précis mais faux.
 * Les textes sont modifiables ici sans toucher au reste de l'application.
 */
import { Frac } from './math/frac.js';
import { parse, Poly } from './math/expr.js';

/* ================================================================== */
/* Textes                                                              */
/* ================================================================== */

/** Intentions d'apprentissage (une par thème). */
export const INTENTIONS = {
  'm1/termes': 'Je suis capable de compter les termes et de nommer une expression algébrique.',
  'm1/coef': 'Je suis capable d\'identifier le coefficient, les variables et les exposants d\'un terme.',
  'm1/constant': 'Je suis capable de repérer le terme constant d\'une expression.',
  'm1/degre': 'Je suis capable de déterminer le degré d\'un monôme et d\'un polynôme.',
  'm1/semblables': 'Je suis capable de reconnaître des termes semblables.',
  'm2/addsous': 'Je suis capable d\'additionner et de soustraire des termes semblables, même avec des parenthèses.',
  'm2/multdiv': 'Je suis capable de multiplier, de diviser et d\'utiliser la distributivité.',
  'm2/chaines': 'Je suis capable de réduire une expression qui combine plusieurs opérations.',
  'm3/une': 'Je suis capable de calculer la valeur numérique d\'une expression à une variable.',
  'm3/deux': 'Je suis capable de calculer la valeur numérique d\'une expression à deux variables.',
  'm3/defi': 'Je suis capable de calculer une valeur numérique en respectant la priorité des opérations.',
  'm4/traduction': 'Je suis capable de traduire un énoncé en expression algébrique.',
  'm4/problemes': 'Je suis capable de modéliser une situation par une expression réduite.',
  'm4/perimetre': 'Je suis capable d\'exprimer le périmètre d\'une figure par une expression réduite.',
  'm4/aire': 'Je suis capable d\'exprimer l\'aire d\'une figure par une expression réduite.',
  'm5/n1': 'Je suis capable de résoudre une équation en une étape.',
  'm5/n2': 'Je suis capable de résoudre une équation en deux étapes.',
  'm5/n3': 'Je suis capable de résoudre une équation dont l\'inconnue est des deux côtés.',
  'm5/n4': 'Je suis capable de résoudre une équation avec des parenthèses.',
  'm5/n5': 'Je suis capable de résoudre une équation qui demande de réduire chaque membre.',
  'm5/frac': 'Je suis capable de résoudre une équation qui contient des fractions.',
  'm5/geo': 'Je suis capable de trouver une mesure inconnue à partir du périmètre.',
};

/** Indice de processus (une phrase) quand aucune erreur précise n'est reconnue. */
const INDICES = {
  m1: 'Relis la définition : les termes sont séparés par + et −, le coefficient garde son signe, le degré se calcule avec les exposants.',
  'm1/semblables': 'Des termes semblables ont exactement les mêmes variables, avec les mêmes exposants.',
  m2: 'Élimine d\'abord les parenthèses (attention au signe devant), puis regroupe seulement les termes semblables.',
  m3: 'Remplace chaque variable par sa valeur entre parenthèses, puis calcule les puissances avant les multiplications.',
  m4: 'Repère les mots-clés (de plus, de moins, double, triple…) et écris chaque partie avant de réduire.',
  'm4/traduction': 'Repère les mots-clés (somme, différence, produit, double, carré…) et respecte l\'ordre de l\'énoncé.',
  m5: 'Fais la même opération des deux côtés pour isoler l\'inconnue, puis valide en remplaçant ta réponse dans l\'équation.',
  'm5/frac': 'Multiplie chaque membre par un dénominateur commun pour faire disparaître les fractions.',
  'm5/geo': 'Additionne les mesures de tous les côtés, égale le tout au périmètre, puis résous l\'équation.',
};
export function indiceProcessus(q) {
  return INDICES[`${q.module}/${q.theme}`] || INDICES[q.module] || null;
}

/** Erreurs fréquentes : message (une phrase) et série ciblée pour s'exercer. */
export const ERREURS = {
  moinsParen:        { msg: 'Le signe − devant une parenthèse change le signe de TOUS les termes de la parenthèse, pas seulement du premier.', pratique: { m: 'm2', t: 'addsous', d: 2 }, nom: 'le signe − devant une parenthèse' },
  distribPartielle:  { msg: 'Le facteur devant la parenthèse multiplie CHAQUE terme de la parenthèse.', pratique: { m: 'm2', t: 'multdiv', d: 2 }, nom: 'la distributivité' },
  divPartielle:      { msg: 'On divise CHAQUE terme du numérateur par le dénominateur.', pratique: { m: 'm2', t: 'multdiv', d: 1 }, nom: 'la division d\'une expression' },
  exposantAjoute:    { msg: 'Quand on additionne des termes semblables, on additionne les coefficients : l\'exposant ne change pas (3x + 2x = 5x).', pratique: { m: 'm2', t: 'addsous', d: 1 }, nom: 'l\'addition de termes semblables' },
  nonSemblables:     { msg: 'On ne peut additionner que des termes semblables (mêmes variables, mêmes exposants).', pratique: { m: 'm1', t: 'semblables', d: 1 }, nom: 'les termes semblables' },
  ordreSoustraction: { msg: 'Attention à l\'ordre : « 5 de moins que n » s\'écrit n − 5 (on enlève 5 à n).', pratique: { m: 'm4', t: 'traduction', d: 1 }, nom: 'l\'ordre dans une soustraction' },
  carreNeg:          { msg: 'Un nombre négatif élevé à une puissance paire donne un résultat positif : (−2)² = (−2) × (−2) = 4.', pratique: { m: 'm3', t: 'une', d: 2 }, nom: 'les puissances de nombres négatifs' },
  moinsCarre:        { msg: 'Dans −x², l\'exposant s\'applique seulement à x : −x² = −(x²). Si x = −3, −x² = −9.', pratique: { m: 'm3', t: 'defi', d: 3 }, nom: 'l\'expression −x²' },
  constanteSigne:    { msg: 'Pour déplacer un terme, fais l\'opération inverse des deux côtés : un + devient une soustraction.', pratique: { m: 'm5', t: 'n2', d: 2 }, nom: 'les opérations inverses' },
  variableSigne:     { msg: 'Pour regrouper les termes en x, soustrais (ou additionne) le même terme des deux côtés : son signe change en changeant de côté.', pratique: { m: 'm5', t: 'n3', d: 2 }, nom: 'l\'inconnue des deux côtés' },
  divisionNegative:  { msg: 'Tu divises par un nombre négatif : n\'oublie pas que le signe du résultat change.', pratique: { m: 'm5', t: 'n2', d: 2 }, nom: 'la division par un nombre négatif' },
  fractionInverse:   { msg: 'Pour annuler une division (x divisé par a), on multiplie les deux côtés par a.', pratique: { m: 'm5', t: 'n1', d: 1 }, nom: 'l\'opération inverse de la division' },
  coefSigne:         { msg: 'Le signe fait partie du coefficient : dans −5x, le coefficient est −5.', pratique: { m: 'm1', t: 'coef', d: 1 }, nom: 'le signe du coefficient' },
  coefInvisible:     { msg: 'Une variable seule a un coefficient « invisible » : x = 1x et −x = −1x.', pratique: { m: 'm1', t: 'coef', d: 1 }, nom: 'le coefficient invisible' },
  exposantInvisible: { msg: 'Une variable sans exposant visible a l\'exposant 1 : x = x¹.', pratique: { m: 'm1', t: 'coef', d: 2 }, nom: 'l\'exposant invisible' },
  degreMonome:       { msg: 'Le degré d\'un monôme est la SOMME des exposants de toutes ses variables.', pratique: { m: 'm1', t: 'degre', d: 1 }, nom: 'le degré d\'un monôme' },
  degrePoly:         { msg: 'Le degré d\'un polynôme est le PLUS GRAND degré parmi ses termes (on n\'additionne pas).', pratique: { m: 'm1', t: 'degre', d: 2 }, nom: 'le degré d\'un polynôme' },
  constSigne:        { msg: 'Le terme constant garde son signe : dans 3x − 7, le terme constant est −7.', pratique: { m: 'm1', t: 'constant', d: 1 }, nom: 'le signe du terme constant' },
};

/** Félicitation brève centrée sur la stratégie (plutôt que sur la personne). */
const PROCESSUS = {
  m1: 'Bonne lecture de l\'expression.',
  'm2/addsous': 'Bonne gestion des signes.',
  'm2/multdiv': 'Distributivité bien appliquée.',
  'm2/chaines': 'Bonne démarche, étape par étape.',
  m3: 'Substitution et priorité des opérations respectées.',
  m4: 'Bonne traduction de la situation.',
  m5: 'Inconnue bien isolée.',
};
export function felicitation(q) { return PROCESSUS[`${q.module}/${q.theme}`] || PROCESSUS[q.module] || null; }

/* ================================================================== */
/* Transformations « fautives » de l'arbre (erreurs typiques)          */
/* ================================================================== */
const unwrap = (n) => (n.t === 'paren' ? unwrap(n.node) : n);
const estSomme = (n) => { const u = unwrap(n); return u.t === 'add' && u.terms.length > 1; };

function fautif(node, bug, st) {
  const R = (n) => fautif(n, bug, st);
  switch (node.t) {
    case 'add': {
      const terms = [];
      for (const { sign, node: n } of node.terms) {
        // −(a + b) → −a + b
        if (bug === 'moinsParen' && sign < 0 && n.t === 'paren' && estSomme(n)) {
          st.applied = true;
          unwrap(n).terms.forEach((t, i) => terms.push({ sign: i === 0 ? -t.sign : t.sign, node: R(t.node) }));
          continue;
        }
        // k(a + b) → ka + b  (le signe devant k reste sur le premier terme seulement)
        if (bug === 'distribPartielle' && n.t === 'mul' && n.factors.length === 2) {
          const i = n.factors.findIndex((f) => f.t === 'paren' && estSomme(f));
          if (i >= 0) {
            st.applied = true;
            const autre = n.factors[1 - i];
            unwrap(n.factors[i]).terms.forEach((t, j) => terms.push(j === 0
              ? { sign: sign * t.sign, node: { t: 'mul', factors: [R(autre), R(t.node)], ops: ['*'] } }
              : { sign: t.sign, node: R(t.node) }));
            continue;
          }
        }
        terms.push({ sign, node: R(n) });
      }
      return { t: 'add', terms };
    }
    case 'mul': {
      if (bug === 'distribPartielle' && node.factors.length === 2) {
        const i = node.factors.findIndex((f) => f.t === 'paren' && estSomme(f));
        if (i >= 0) {
          st.applied = true;
          const autre = node.factors[1 - i];
          return { t: 'add', terms: unwrap(node.factors[i]).terms.map((t, j) => (j === 0
            ? { sign: t.sign, node: { t: 'mul', factors: [R(autre), R(t.node)], ops: ['*'] } }
            : { sign: t.sign, node: R(t.node) })) };
        }
      }
      return { ...node, factors: node.factors.map(R) };
    }
    case 'div': {
      // (a + b)/k → a/k + b
      if (bug === 'divPartielle' && estSomme(node.num) && node.den.t === 'num') {
        st.applied = true;
        return { t: 'add', terms: unwrap(node.num).terms.map((t, j) => (j === 0
          ? { sign: t.sign, node: { t: 'div', num: R(t.node), den: node.den, op: '/' } }
          : { sign: t.sign, node: R(t.node) })) };
      }
      return { ...node, num: R(node.num), den: R(node.den) };
    }
    case 'paren': return { t: 'paren', node: R(node.node) };
    case 'neg': return { t: 'neg', node: R(node.node) };
    case 'pow': return { ...node, base: R(node.base) };
    default: return node;
  }
}
const BUGS_AST = ['moinsParen', 'distribPartielle', 'divPartielle'];

/* ================================================================== */
/* Diagnostics par type de question                                   */
/* ================================================================== */
function polyEleve(input) {
  try { return Poly.fromAst(parse(String(input).replace(/^\s*[a-z]\s*=\s*/i, ''))); } catch (e) { return null; }
}
function valeurEleve(input) {
  const p = polyEleve(input);
  return p && p.isConstant() ? p.constValue() : null;
}

/** Expression attendue (modules 2 et 4) */
function diagExpression(q, p) {
  const hits = new Set();
  const correct = q.answer;
  if (q.source) {
    let ast; try { ast = parse(q.source); } catch (e) { ast = null; }
    if (ast) for (const bug of BUGS_AST) {
      const st = { applied: false };
      const b = fautif(ast, bug, st);
      if (!st.applied) continue;
      let pb; try { pb = Poly.fromAst(b); } catch (e) { continue; }
      if (!pb.equals(correct) && pb.equals(p)) hits.add(bug);
    }
  }
  // 3x + 2x → 5x² : mêmes termes, mais un exposant augmenté de 1
  if (p.size() === correct.size() && !p.equals(correct)) {
    const attendus = correct.terms();
    let monte = 0, ok = true;
    for (const t of p.terms()) {
      if (attendus.some((c) => c.coef.eq(t.coef) && sameVars(c.vars, t.vars))) continue;
      const c = attendus.find((c) => c.coef.eq(t.coef) && exposantPlusUn(c.vars, t.vars));
      if (c) monte++; else { ok = false; break; }
    }
    if (ok && monte > 0) hits.add('exposantAjoute');
  }
  // 3x + 2 → 5x : un seul terme dont le coefficient = somme des coefficients
  if (p.size() === 1 && correct.size() > 1) {
    const s = correct.terms().reduce((acc, t) => acc.add(t.coef), new Frac(0));
    if (p.terms()[0].coef.eq(s)) hits.add('nonSemblables');
  }
  if (q.module === 'm4' && q.theme === 'traduction' && !p.isZero() && p.equals(correct.scale(-1))) hits.add('ordreSoustraction');
  return hits;
}
const sameVars = (a, b) => { const ka = Object.keys(a).filter((k) => a[k]), kb = Object.keys(b).filter((k) => b[k]); return ka.length === kb.length && ka.every((k) => a[k] === b[k]); };
function exposantPlusUn(attendu, eleve) {
  const ks = new Set([...Object.keys(attendu), ...Object.keys(eleve)]);
  let diff = 0;
  for (const k of ks) { const d = (eleve[k] || 0) - (attendu[k] || 0); if (d === 1 && attendu[k]) diff++; else if (d !== 0) return false; }
  return diff === 1;
}

/** Valeur numérique (module 3) : (−2)² négatif, −x² calculé comme (−x)² */
function evalFautif(node, env, bug, st) {
  const E = (n) => evalFautif(n, env, bug, st);
  switch (node.t) {
    case 'num': return node.v;
    case 'var': return Frac.of(env[node.name]);
    case 'paren': return E(node.node);
    case 'neg': return E(node.node).neg();
    case 'add': return node.terms.reduce((s, { sign, node: n }) => {
      let v = E(n);
      if (bug === 'moinsCarre' && sign < 0 && n.t === 'pow' && n.base.t === 'var' && n.exp % 2 === 0 && Frac.of(env[n.base.name]).isNeg()) { st.applied = true; return s.add(v); }
      return sign < 0 ? s.sub(v) : s.add(v);
    }, new Frac(0));
    case 'mul': return node.factors.reduce((p, f) => p.mul(E(f)), new Frac(1));
    case 'div': return E(node.num).div(E(node.den));
    case 'pow': {
      const b = E(node.base), v = b.pow(node.exp);
      if (bug === 'carreNeg' && node.base.t === 'var' && b.isNeg() && node.exp % 2 === 0) { st.applied = true; return v.neg(); }
      return v;
    }
    default: return new Frac(0);
  }
}
function diagValeur(q, val) {
  const hits = new Set();
  if (!q.source || !q.env) return hits;
  let ast; try { ast = parse(q.source); } catch (e) { return hits; }
  for (const bug of ['carreNeg', 'moinsCarre']) {
    const st = { applied: false };
    let v; try { v = evalFautif(ast, q.env, bug, st); } catch (e) { continue; }
    if (st.applied && !v.eq(q.answer) && v.eq(val)) hits.add(bug);
  }
  return hits;
}

/** Équations (module 5) : erreurs d'opérations inverses */
function diagEquation(q, val) {
  const hits = new Set();
  if (!q.source || !q.source.includes('=') || !q.variable) return hits;
  const v = q.variable;
  const [ls, rs] = q.source.split('=');
  let la, ra; try { la = parse(ls); ra = parse(rs); } catch (e) { return hits; }
  const resoudre = (A, B) => {
    const L = Poly.fromAst(A), R = Poly.fromAst(B);
    const a = L.coef(v).sub(R.coef(v));
    if (a.isZero()) return null;
    return { sol: R.coef('').sub(L.coef('')).div(a), L, R, a };
  };
  let base; try { base = resoudre(la, ra); } catch (e) { return hits; }
  if (!base) return hits;
  const { sol, L, R, a } = base;
  const essai = (code, x) => { if (x && !x.eq(sol) && x.eq(val)) hits.add(code); };
  const Lv = L.coef(v), Rv = R.coef(v), L0 = L.coef(''), R0 = R.coef('');
  // Constante déplacée sans changer de signe
  if (!L0.isZero() && !Lv.isZero()) essai('constanteSigne', R0.add(L0).div(a));            // 3x + 5 = 20 → (20 + 5) ÷ 3
  if (!R0.isZero() && !Rv.isZero() && Lv.isZero()) essai('constanteSigne', L0.add(R0).div(Rv)); // 45 = 1 + 4x → (45 + 1) ÷ 4
  // Terme en x déplacé sans changer de signe
  if (!Rv.isZero() && !Lv.isZero() && !Lv.add(Rv).isZero()) essai('variableSigne', R0.sub(L0).div(Lv.add(Rv)));
  // Division par un négatif : signe oublié
  if (a.isNeg() && !Lv.isZero()) essai('divisionNegative', sol.neg());
  // x/a = b : divisé au lieu de multiplié
  if (!a.isInt() && ['n1', 'n2'].includes(q.theme)) essai('fractionInverse', R0.sub(L0).mul(a));
  // Erreurs de parenthèses dans un membre
  for (const bug of ['moinsParen', 'distribPartielle']) {
    const st = { applied: false };
    try {
      const r = resoudre(fautif(la, bug, st), fautif(ra, bug, st));
      if (st.applied && r) essai(bug, r.sol);
    } catch (e) { /* ignore */ }
  }
  return hits;
}

/** Module 1 : informations jointes aux questions (q.diag) */
function diagAnatomie(q, val) {
  const hits = new Set();
  const d = q.diag;
  if (!d || val === null) return hits;
  const n = Frac.of(val);
  if (d.type === 'coef') {
    if (d.coef.isNeg() && n.eq(d.coef.neg())) hits.add('coefSigne');
    if (d.coef.abs().isOne() && n.isZero()) hits.add('coefInvisible');
  } else if (d.type === 'exposant') {
    if (d.exp === 1 && n.isZero()) hits.add('exposantInvisible');
  } else if (d.type === 'degreMonome') {
    if (n.eq(d.max) && !n.eq(q.answer)) hits.add('degreMonome');
  } else if (d.type === 'degrePoly') {
    if (n.eq(d.somme) && !n.eq(q.answer)) hits.add('degrePoly');
  } else if (d.type === 'constant') {
    if (d.val.isNeg() && n.eq(d.val.neg())) hits.add('constSigne');
  }
  return hits;
}

/* ================================================================== */
/* Point d'entrée                                                      */
/* ================================================================== */
/**
 * Diagnostique une réponse incorrecte. Renvoie { code, msg } ou null.
 * Conservateur : un seul diagnostic possible, sinon rien.
 */
export function diagnostiquer(q, input) {
  try {
    let hits = new Set();
    if (q.answerType === 'expr') {
      const p = polyEleve(input);
      if (p) hits = diagExpression(q, p);
    } else if (q.answerType === 'number' || q.answerType === 'int') {
      const val = valeurEleve(input);
      if (val === null) return null;
      if (q.diag) hits = diagAnatomie(q, val);
      else if (q.module === 'm3') hits = diagValeur(q, val);
      else if (q.module === 'm5') hits = diagEquation(q, val);
    }
    if (hits.size !== 1) return null; // ambigu ou inconnu : on n'affirme rien
    const code = [...hits][0];
    return { code, msg: ERREURS[code].msg };
  } catch (e) {
    return null;
  }
}

/** Première étape utile de la démarche (indice gradué), ou null si elle donnerait la réponse. */
export function premiereEtape(q) {
  const s = q.steps || [];
  if (s.length < 4) return null;
  const e = s[1];
  return e && !e.final ? e : null;
}

/**
 * Bilan : UNE seule prochaine étape.
 * results : [{ q, success, diag }]
 */
export function prochaineEtape(results) {
  const compte = {};
  results.forEach((r) => { if (r.diag) compte[r.diag] = (compte[r.diag] || 0) + 1; });
  const top = Object.entries(compte).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const e = ERREURS[top[0]];
    return { type: 'erreur', texte: `Ce qui t'a le plus fait trébucher : ${e.nom}${top[1] > 1 ? ` (${top[1]} fois)` : ''}.`, rappel: e.msg, pratique: e.pratique };
  }
  const echecs = {};
  results.filter((r) => !r.success).forEach((r) => { const k = `${r.q.module}/${r.q.theme}`; echecs[k] = (echecs[k] || { n: 0, q: r.q }); echecs[k].n++; });
  const pire = Object.values(echecs).sort((a, b) => b.n - a.n)[0];
  if (pire && pire.n >= 2) {
    return { type: 'theme', texte: `Le thème à revoir : ${pire.q.themeLabel.toLowerCase()}.`, rappel: indiceProcessus(pire.q), pratique: { m: pire.q.module, t: pire.q.theme, d: pire.q.difficulty } };
  }
  const n = results.length, ok = results.filter((r) => r.success).length;
  if (n && ok / n >= 0.8) {
    const q = results[results.length - 1].q;
    const intention = INTENTIONS[`${q.module}/${q.theme}`];
    return { type: 'reussite', texte: intention ? `Bravo : ${intention.charAt(0).toLowerCase()}${intention.slice(1)}` : 'Très bonne série!', rappel: 'Prochain défi : essaie la difficulté suivante ou le défi mixte.' };
  }
  return null;
}
