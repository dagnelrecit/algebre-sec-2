/**
 * Module 1 — Anatomie d'une expression algébrique
 * Thèmes : termes (nombre / nom), coef (coefficient, variables, exposant), constant, degre, semblables
 */
import { Frac } from '../math/frac.js';
import { termsLatex, termKey } from '../math/expr.js';
import { COLORS } from '../math/steps.js';
import { randInt, randNZ, choice, chance, shuffle, sample, makeQ, rang, T, twoLetters } from './util.js';

const HL = COLORS[0];
const degreeOf = (vars) => Object.values(vars).reduce((s, e) => s + e, 0);

/** Terme aléatoire : coef entier non nul, variables parmi letters, exposants 1 à maxExp */
function randomTerm(letters, maxExp = 3, allowConst = true) {
  if (allowConst && chance(0.2)) return { coef: new Frac(randNZ(-15, 15)), vars: {} };
  const vars = {};
  const k = chance(0.6) ? 1 : randInt(1, letters.length);
  sample(letters, k).forEach(l => { vars[l] = chance(0.55) ? 1 : randInt(2, maxExp); });
  const c = chance(0.15) ? choice([1, -1]) : randNZ(-12, 12);
  return { coef: new Frac(c), vars };
}

/** Polynôme réduit (clés distinctes) de n termes */
function randomPoly(n, letters, { withConst = null, maxExp = 3 } = {}) {
  const terms = [];
  const keys = new Set();
  let guard = 0;
  while (terms.length < n && guard++ < 200) {
    const t = randomTerm(letters, maxExp, withConst !== false);
    const k = termKey(t.vars);
    if (keys.has(k)) continue;
    if (k === '' && withConst === false) continue;
    keys.add(k); terms.push(t);
  }
  if (withConst === true && !keys.has('')) terms[terms.length - 1] = { coef: new Frac(randNZ(-20, 20)), vars: {} };
  return shuffle(terms);
}
const letterPool = () => choice([['x'], ['x', 'y'], ['a', 'b'], ['a', 'b', 'c'], ['x', 'y', 'z'], ['m', 'n']]);

function highlight(terms, idx) {
  return termsLatex(terms, terms.map((_, i) => (i === idx ? HL : null)));
}
const monoTex = (t) => termsLatex([t]);
const varsStr = (vars) => Object.keys(vars).sort().join('');

/* ------------------------------------------------------------------ */
function genTermes(d) {
  const n = randInt(1, d === 1 ? 4 : 5);
  const terms = randomPoly(n, letterPool());
  const exprTex = termsLatex(terms);
  if (chance(0.5)) {
    return makeQ({
      prompt: 'Combien de termes y a-t-il dans cette expression algébrique?',
      tex: exprTex, answerType: 'int', answer: terms.length, answerTex: String(terms.length),
      steps: [{ label: 'Les termes sont séparés par les signes + et − (hors parenthèses)', tex: termsLatex(terms, terms.map((_, i) => COLORS[i % COLORS.length])) },
        { label: 'Nombre de termes', tex: String(terms.length), final: true }],
    });
  }
  const names = ['Monôme', 'Binôme', 'Trinôme', 'Polynôme'];
  const idx = Math.min(terms.length, 4) - 1;
  return makeQ({
    prompt: 'Comment se nomme cette expression algébrique?',
    tex: exprTex, answerType: 'choice', answer: idx,
    choices: names.map(t => ({ html: t })), answerTex: `\\text{${names[idx]}}`,
    steps: [{ label: `Elle contient ${terms.length} terme${terms.length > 1 ? 's' : ''}`, tex: termsLatex(terms, terms.map((_, i) => COLORS[i % COLORS.length])) },
      { label: '1 terme : monôme · 2 termes : binôme · 3 termes : trinôme · 4 termes ou plus : polynôme', tex: `\\text{${names[idx]}}`, final: true }],
  });
}

function genCoef(d) {
  const terms = randomPoly(randInt(3, d === 1 ? 4 : 5), letterPool(), { withConst: chance(0.6) ? null : false });
  const candidates = terms.map((t, i) => i).filter(i => termKey(terms[i].vars) !== '');
  const i = choice(candidates);
  const t = terms[i];
  const kind = choice(d === 1 ? ['coef', 'coef', 'vars'] : ['coef', 'vars', 'exp']);
  const base = [{ label: `Le ${rang(i + 1).replace(/<\/?sup>/g, '')} terme est ${monoTex(t).startsWith('-') ? 'négatif' : 'positif'}`, tex: highlight(terms, i) }];
  if (kind === 'coef') {
    const invisible = t.coef.abs().isOne();
    return makeQ({
      prompt: `Quel est le <b>coefficient</b> du ${rang(i + 1)} terme?`,
      tex: termsLatex(terms), answerType: 'number', answer: t.coef, answerTex: t.coef.toLatex(),
      steps: [...base, { label: 'Le coefficient est le nombre qui multiplie les variables, avec son signe', tex: `${monoTex(t)} \\;\\rightarrow\\; ${t.coef.toLatex()}`, note: invisible ? `Coefficient invisible : ${t.coef.isNeg() ? '−x signifie −1x' : 'x signifie 1x'}.` : null, final: true }],
    });
  }
  if (kind === 'vars') {
    return makeQ({
      prompt: `Quelle(s) <b>variable(s)</b> contient le ${rang(i + 1)} terme? <span class="muted">(ex. : xy)</span>`,
      tex: termsLatex(terms), answerType: 'vars', answer: varsStr(t.vars), answerTex: varsStr(t.vars).split('').join(',\\,'),
      steps: [...base, { label: 'Les variables sont les lettres du terme', tex: `${monoTex(t)} \\;\\rightarrow\\; ${varsStr(t.vars).split('').join(',\\,')}`, final: true }],
    });
  }
  const v = choice(Object.keys(t.vars));
  return makeQ({
    prompt: `Dans le ${rang(i + 1)} terme, quel est l'<b>exposant</b> de la variable \\(${v}\\)?`,
    tex: termsLatex(terms), answerType: 'int', answer: t.vars[v], answerTex: String(t.vars[v]),
    steps: [...base, { label: 'L\'exposant est le petit nombre en haut à droite de la variable', tex: `${monoTex(t)} \\;\\rightarrow\\; ${v}^{${t.vars[v]}}`, note: t.vars[v] === 1 ? `Exposant invisible : ${v} signifie ${v}¹.` : null, final: true }],
  });
}

function genConstant(d) {
  const has = chance(0.8);
  const terms = randomPoly(randInt(2, d === 1 ? 4 : 5), letterPool(), { withConst: has ? true : false });
  const c = terms.find(t => termKey(t.vars) === '');
  const val = c ? c.coef : new Frac(0);
  return makeQ({
    prompt: 'Quel est le <b>terme constant</b> de cette expression? <span class="muted">(écris 0 s\'il n\'y en a pas)</span>',
    tex: termsLatex(terms), answerType: 'number', answer: val, answerTex: val.toLatex(),
    steps: [{ label: 'Le terme constant est le terme sans variable (avec son signe)', tex: c ? highlight(terms, terms.indexOf(c)) : termsLatex(terms) },
      { label: c ? 'Terme constant' : 'Aucun terme sans variable : le terme constant est 0', tex: val.toLatex(), final: true }],
  });
}

function genDegre(d) {
  if (chance(d === 1 ? 0.6 : 0.35)) {
    const [t] = randomPoly(1, letterPool(), { withConst: false, maxExp: 4 });
    const deg = degreeOf(t.vars);
    const detail = Object.entries(t.vars).sort().map(([, e]) => e).join(' + ');
    return makeQ({
      prompt: 'Quel est le <b>degré</b> de ce monôme?',
      tex: monoTex(t), answerType: 'int', answer: deg, answerTex: String(deg),
      steps: [{ label: 'Le degré d\'un monôme est la somme des exposants de ses variables', tex: `${monoTex(t)} \\;\\rightarrow\\; ${detail} = ${deg}`, note: 'Une variable sans exposant visible a l\'exposant 1.', final: true }],
    });
  }
  const terms = randomPoly(randInt(2, 4), letterPool(), { maxExp: 3 });
  const degs = terms.map(t => degreeOf(t.vars));
  const deg = Math.max(...degs);
  return makeQ({
    prompt: 'Quel est le <b>degré</b> de ce polynôme?',
    tex: termsLatex(terms), answerType: 'int', answer: deg, answerTex: String(deg),
    steps: [{ label: 'Degré de chaque terme', tex: terms.map((t, i) => `${monoTex(t)} : ${degs[i]}`).join(' \\quad ') },
      { label: 'Le degré d\'un polynôme est le plus grand degré de ses termes', tex: String(deg), final: true }],
  });
}

/* Termes semblables : écrit les variables dans un ordre donné (piège : ba² et a²b sont semblables) */
function writeTerm(coef, vars, order) {
  const v = order.map(k => (vars[k] === 1 ? k : `${k}^{${vars[k]}}`)).join('');
  const c = Math.abs(coef) === 1 ? (coef < 0 ? '-' : '') : String(coef);
  return c + v;
}
function genSemblables(d) {
  const [a, b] = twoLetters();
  const base = chance(0.5) ? { [a]: randInt(1, 3), [b]: randInt(1, 2) } : { [a]: randInt(1, 3) };
  const keys = Object.keys(base);
  const orderOf = () => (keys.length > 1 && chance(0.5) ? [...keys].reverse() : keys);
  const similar = () => writeTerm(randNZ(-12, 12), base, orderOf());
  // Distracteurs : exposants échangés, variable manquante, autre lettre
  const distractors = [];
  if (keys.length > 1 && base[a] !== base[b]) distractors.push(writeTerm(randNZ(-12, 12), { [a]: base[b], [b]: base[a] }, keys));
  distractors.push(writeTerm(randNZ(-12, 12), { [a]: base[a] === 1 ? 2 : 1, ...(keys.length > 1 ? { [b]: base[b] } : {}) }, keys));
  distractors.push(writeTerm(randNZ(-12, 12), { [keys.length > 1 ? b : (a === 'x' ? 'y' : 'x')]: base[keys[keys.length - 1]] }, [keys.length > 1 ? b : (a === 'x' ? 'y' : 'x')]));
  distractors.push(String(randNZ(-12, 12)));
  const extra = ['z', 'w', 'k', 'c'].find(l => !keys.includes(l) && l !== a && l !== b);
  distractors.push(writeTerm(randNZ(-12, 12), { ...base, [extra]: 1 }, [...keys, extra]));
  const baseTex = writeTerm(randNZ(2, 9), base, keys);

  if (chance(0.4)) {
    // Lequel n'est pas semblable aux autres? (révision Point de mire)
    const sims = [similar(), similar(), similar()];
    const odd = choice(distractors);
    const items = shuffle([...sims.map(s => ({ s, ok: false })), { s: odd, ok: true }]);
    const idx = items.findIndex(x => x.ok);
    return makeQ({
      prompt: 'Parmi les termes suivants, lequel <b>n\'est pas semblable</b> aux autres?',
      answerType: 'choice', answer: idx, choices: items.map(x => ({ tex: x.s })), answerTex: odd,
      steps: [{ label: 'Des termes semblables ont les mêmes variables affectées des mêmes exposants (l\'ordre des lettres et le coefficient ne comptent pas)', tex: items.map(x => (x.ok ? `\\textcolor{#dc2626}{${x.s}}` : x.s)).join(' \\quad ') },
        { label: 'Le terme différent', tex: odd, final: true }],
    });
  }
  const nSim = randInt(1, 3);
  const items = shuffle([...Array.from({ length: nSim }, () => ({ s: similar(), ok: true })), ...sample(distractors, d === 1 ? 3 : 4).map(s => ({ s, ok: false }))]);
  const answer = items.map((x, i) => (x.ok ? i : -1)).filter(i => i >= 0);
  return makeQ({
    prompt: `Sélectionne <b>tous</b> les termes semblables à \\(${baseTex}\\).`,
    answerType: 'multi', answer, choices: items.map(x => ({ tex: x.s })),
    answerTex: items.filter(x => x.ok).map(x => x.s).join(',\\; '),
    steps: [{ label: 'Mêmes variables, mêmes exposants (l\'ordre des lettres ne compte pas : ba² = a²b)', tex: items.map(x => (x.ok ? `\\textcolor{${HL}}{${x.s}}` : `\\textcolor{#94a3b8}{${x.s}}`)).join(' \\quad '), final: true }],
  });
}

export const THEMES = {
  termes: { label: 'Nombre de termes et nom', gen: genTermes },
  coef: { label: 'Coefficients, variables et exposants', gen: genCoef },
  constant: { label: 'Terme constant', gen: genConstant },
  degre: { label: 'Degré d\'un monôme ou d\'un polynôme', gen: genDegre },
  semblables: { label: 'Termes semblables', gen: genSemblables },
};
