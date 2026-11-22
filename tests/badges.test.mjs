// node tests/badges.test.mjs
import * as B from '../js/badges.js';
import * as S from '../js/storage.js';
let fail = 0; const ok = (n, c) => { if (!c) { fail++; console.log('ÉCHEC', n); } };
const p = S.profilVide();
for (let i = 0; i < 12; i++) S.ajouterAuProfil(p, { id: 'id' + i, date: new Date().toISOString(), module: 'm5', theme: 'n5', resultat: 1, temps: 5 });
let nv = B.verifierBadges(p, S.statsProfil(p), { serieMax: 12, fin: { mode: 'module', n: 12, premiers: 12, score: 100 } });
const ids = nv.map(b => b.id);
ok('premier', ids.includes('premier')); ok('serie10', ids.includes('serie10')); ok('parfait', ids.includes('parfait')); ok('sommet', ids.includes('sommet'));
ok('pas de doublon', B.verifierBadges(p, S.statsProfil(p), { serieMax: 12 }).length === 0);
ok('niveaux', B.niveau(0) === 1 && B.niveau(40) === 2 && B.niveau(160) === 3);
ok('xp', B.xpReponse({ module: 'm2', difficulty: 3 }, 1) === 12 && B.xpReponse({ module: 'm5', theme: 'n1' }, 2) === 5 && B.xpReponse({}, 0) === 0);
const f = S.fusionnerProfils({ ...S.profilVide(), xp: 50, badges: ['a'] }, { ...S.profilVide(), xp: 80, badges: ['b'] });
ok('fusion', f.xp === 80 && f.badges.length === 2);
console.log(fail ? `${fail} échec(s)` : 'Badges : tous les tests passent ✔'); process.exit(fail ? 1 : 0);
