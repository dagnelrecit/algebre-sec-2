// Fiabilité de la rétroaction : node tests/feedback.test.mjs
import { MODULES, generate } from '../js/gen/index.js';
import { diagnostiquer } from '../js/feedback.js';
import { parse, Poly } from '../js/math/expr.js';
import { Frac } from '../js/math/frac.js';
let fail = 0;
const ok = (n, c, info) => { if (!c) { fail++; console.log('ÉCHEC', n, info || ''); } };
const txt = (p) => p.toString().replace(/−/g, '-').replace(/²/g, '^2').replace(/³/g, '^3');

// 1) Erreurs connues (exemples du cahier)
const q = (o) => ({ answerType: 'expr', requireReduced: true, module: 'm2', theme: 'addsous', ...o, answer: Poly.parse(o.source) });
ok('moinsParen', diagnostiquer(q({ source: '3x-(2x-5)' }), 'x-5')?.code === 'moinsParen');
ok('distrib', diagnostiquer(q({ source: '-4(2a-3b)' }), '-8a-3b')?.code === 'distribPartielle');
ok('distrib +', diagnostiquer(q({ source: '2(x+3)' }), '2x+3')?.code === 'distribPartielle');
ok('div', diagnostiquer(q({ source: '(12x-8)/4' }), '3x-8')?.code === 'divPartielle');
ok('exposant', diagnostiquer(q({ source: '3x+2x' }), '5x^2')?.code === 'exposantAjoute');
ok('non semblables', diagnostiquer(q({ source: '3x+2' }), '5x')?.code === 'nonSemblables');
const qv = { answerType: 'number', module: 'm3', source: '2x^2-3y+4', env: { x: -2, y: 5 }, answer: new Frac(-3) };
ok('carreNeg', diagnostiquer(qv, '-19')?.code === 'carreNeg');
const qe = (src, v = 'x') => { const [l, r] = src.split('='); const L = Poly.parse(l), R = Poly.parse(r); return { answerType: 'number', module: 'm5', theme: 'n2', source: src, variable: v, answer: R.coef('').sub(L.coef('')).div(L.coef(v).sub(R.coef(v))) }; };
ok('constanteSigne', diagnostiquer(qe('3x+5=20'), '25/3')?.code === 'constanteSigne');
ok('constanteSigne droite', diagnostiquer(qe('45=1+4x'), '11,5')?.code === 'constanteSigne');
ok('fractionInverse', diagnostiquer(qe('x/3=4'), '4/3')?.code === 'fractionInverse');
ok('divisionNegative', diagnostiquer(qe('-5x+3=18'), '3')?.code === 'divisionNegative');
ok('aucun sur erreur quelconque', diagnostiquer(qe('3x+5=20'), '7') === null);

// 2) Statistiques sur des milliers de questions : erreurs simulées et réponses au hasard
let faux = 0, total = 0, detectes = 0, simules = 0;
for (const m of MODULES) for (const t of Object.keys(m.themes)) for (let i = 0; i < 150; i++) {
  const Q = generate(m.id, t, 1 + (i % 3));
  // a) jamais de diagnostic sur la bonne réponse
  if (Q.answerType === 'expr' || Q.answerType === 'number') {
    const bonne = Q.answerType === 'expr' ? txt(Q.answer) : Q.answer.toString();
    if (diagnostiquer(Q, bonne)) { fail++; if (fail < 5) console.log('DIAG SUR BONNE RÉPONSE', Q.source, bonne); }
  }
  // b) réponse fausse « au hasard » (bonne réponse + 1 ou ×2) : le diagnostic doit rester rare
  let hasard = null;
  if (Q.answerType === 'expr') hasard = txt(Q.answer.add(Poly.constant(1 + (i % 3))));
  else if (Q.answerType === 'number') hasard = Q.answer.add(1 + (i % 4)).toString();
  if (hasard) { total++; if (diagnostiquer(Q, hasard)) faux++; }
  // c) erreur simulée « signe − devant la parenthèse » sur les réductions
  if (m.id === 'm2' && Q.source && /-\(/.test(Q.source)) {
    const terms = Q.source; // on refait l'erreur à la main : on ne change que le 1er terme
    const ast = parse(Q.source);
    const d = diagnostiquer(Q, txt(bug(ast)));
    if (d !== null || true) { simules++; if (d && d.code === 'moinsParen') detectes++; else if (d && d.code !== 'moinsParen') { fail++; console.log('MAUVAIS CODE', Q.source, d.code); } }
  }
}
function bug(ast) { // −(a + b) → −a + b, via la même logique que l'élève
  const st = { applied: false };
  const walk = (n) => {
    if (n.t === 'add') return { t: 'add', terms: n.terms.flatMap(({ sign, node }) => (sign < 0 && node.t === 'paren' && node.node.t === 'add')
      ? node.node.terms.map((t, i) => ({ sign: i === 0 ? -t.sign : t.sign, node: t.node })) : [{ sign, node: walk(node) }]) };
    return n;
  };
  return Poly.fromAst(walk(ast));
}
console.log(`Faux diagnostics sur réponses au hasard : ${faux}/${total} (${(100 * faux / total).toFixed(1)} %)`);
console.log(`Erreur « signe − devant la parenthèse » reconnue : ${detectes}/${simules}`);
ok('taux de faux diagnostics < 3 %', faux / total < 0.03);
console.log(fail ? `${fail} échec(s)` : 'Rétroaction : tous les tests passent ✔');
process.exit(fail ? 1 : 0);
