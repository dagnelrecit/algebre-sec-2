// Vérifie chaque énoncé de data/enonces.js (50 tirages par énoncé) : node tests/enonces.test.mjs
import { TRADUCTION, PROBLEMES } from '../data/enonces.js';
import { THEMES } from '../js/gen/m4-modelisation.js';
import { checkAnswer } from '../js/math/check.js';
let fail = 0;
const all = [...TRADUCTION.map(e => ['traduction', e]), ...PROBLEMES.map(e => ['problemes', e])];
for (const [theme, e] of all) {
  if (!e.texte || !e.reponse || ![1, 2, 3].includes(e.niveau || 1)) { fail++; console.log('MAL FORMÉ', e); }
}
// Génère beaucoup de questions par thème et niveau, vérifie qu'elles se corrigent et qu'aucun {x} ne reste
for (const t of ['traduction', 'problemes']) for (const d of [1, 2, 3]) for (let i = 0; i < 600; i++) {
  const q = THEMES[t].gen(d);
  const input = q.answer.toString().replace(/−/g, '-').replace(/²/g, '^2').replace(/³/g, '^3');
  const r = checkAnswer(q, input);
  if (r.status !== 'correct' || /\{[a-z]\}/.test(q.prompt) || /\{[a-z]\}/.test(q.source)) { fail++; if (fail < 15) console.log('ÉCHEC', q.prompt, q.source, r); }
}
const c = (a, n) => a.filter(e => (e.niveau || 1) === n).length;
console.log(`TRADUCTION : ${TRADUCTION.length} (niv. 1 : ${c(TRADUCTION, 1)}, niv. 2 : ${c(TRADUCTION, 2)}, niv. 3 : ${c(TRADUCTION, 3)})`);
console.log(`PROBLEMES  : ${PROBLEMES.length} (niv. 1 : ${c(PROBLEMES, 1)}, niv. 2 : ${c(PROBLEMES, 2)}, niv. 3 : ${c(PROBLEMES, 3)})`);
console.log(`TOTAL      : ${TRADUCTION.length + PROBLEMES.length}`);
console.log(fail ? `${fail} échec(s)` : 'Banque d\'énoncés : tout est valide ✔');
process.exit(fail ? 1 : 0);
