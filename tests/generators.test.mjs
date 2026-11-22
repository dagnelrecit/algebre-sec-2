// Génère des centaines de questions par thème et vérifie que la réponse attendue est acceptée.
// node tests/generators.test.mjs
import { MODULES, generate } from '../js/gen/index.js';
import { checkAnswer } from '../js/math/check.js';
import { Poly } from '../js/math/expr.js';
let fail = 0, total = 0;
const N = Number(process.argv[2] || 150);
for (const m of MODULES) for (const t of Object.keys(m.themes)) for (const d of [1, 2, 3]) {
  for (let i = 0; i < N; i++) {
    total++;
    let q;
    try { q = generate(m.id, t, d); } catch (e) { fail++; console.log('GEN', m.id, t, d, e.message); continue; }
    let input;
    if (q.answerType === 'expr') input = q.answer.toString().replace(/−/g, '-').replace(/²/g, '^2').replace(/³/g, '^3');
    else if (q.answerType === 'number') input = q.answer.toString();
    else if (q.answerType === 'int') input = String(q.answer);
    else if (q.answerType === 'vars') input = q.answer;
    else input = q.answer;
    const r = checkAnswer(q, input);
    const bad = r.status !== 'correct' || !q.steps.length || q.steps.some(s => !s.tex && s.tex !== '') ||
      (q.answerType === 'number' && q.answer && q.answer.isInt && Math.abs(q.answer.toNumber()) > 2000);
    if (bad) { fail++; if (fail < 25) console.log('ÉCHEC', m.id, t, d, q.tex || q.source, '| attendu', input, '|', JSON.stringify(r)); }
  }
}
console.log(`${total - fail}/${total} questions valides`);
process.exit(fail ? 1 : 0);
