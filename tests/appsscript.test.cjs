// Test du script Apps Script avec des simulations (mocks) des services Google.
// node tests/appsscript.test.cjs
const fs = require('fs'), vm = require('vm'), crypto = require('crypto');
const src = fs.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8');
function mkSheet(name) {
  const rows = [];
  const sh = { name, rows,
    getLastRow: () => rows.length, getLastColumn: () => (rows[0] || []).length,
    appendRow: (r) => rows.push(r.map(v => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v))),
    setFrozenRows() {}, deleteRow: (i) => rows.splice(i - 1, 1), deleteRows: (i, n) => rows.splice(i - 1, n),
    getRange: (r, c, nr = 1, nc = 1) => {
      if (typeof r === 'string') return { setNumberFormat() {} };
      return {
        setFontWeight() { return this; }, setBackground() { return this; },
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (rows[r - 1 + i] || [])[c - 1 + j] ?? '')),
        setValue: (v) => { while (rows.length < r) rows.push([]); rows[r - 1][c - 1] = v; },
        setValues: (vals) => vals.forEach((vr, i) => { while (rows.length < r + i) rows.push([]); vr.forEach((v, j) => { rows[r - 1 + i][c - 1 + j] = typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v; }); }),
        clearContent: () => { for (let i = 0; i < nr; i++) if (rows[r - 1 + i]) for (let j = 0; j < nc; j++) rows[r - 1 + i][c - 1 + j] = ''; },
      };
    },
  };
  return sh;
}
const sheets = {}, cache = {}, props = {};
const ctx = {
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({ getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = mkSheet(n)), getSheets: () => Object.values(sheets), deleteSheet() {} }),
    getUi: () => ({ alert() {}, createMenu() { return { addItem() { return this; }, addToUi() {} }; } }),
  },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: { formatDate: (d) => d.toISOString().slice(0, 16).replace('T', ' '), getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 },
    computeDigest: (_, s) => [...crypto.createHash('sha256').update(s).digest()], base64Encode: (b) => Buffer.from(b).toString('base64') },
  ContentService: { MimeType: { JSON: 1 }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
  Logger: { log() {} }, console,
  MailApp: { sendEmail: (o) => { ctx._courriels.push(o); } }, _courriels: [],
  Session: { getEffectiveUser: () => ({ getEmail: () => 'proprietaire@css.qc.ca' }), getScriptTimeZone: () => 'America/Toronto' },
};
vm.createContext(ctx);
vm.runInContext(src, ctx);
const call = (action, payload = {}) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ action, ...payload }) } }).s);
module.exports = { ctx, call, sheets };
if (require.main !== module) return;

let fail = 0;
const ok = (name, cond, info) => { if (!cond) { fail++; console.log('ÉCHEC', name, info ? JSON.stringify(info) : ''); } };
ctx.preparerFeuille();
ctx.enregistrerNipAdmin_('2468');
ok('feuilles', ['Tentatives', 'Écoles', 'Groupes', 'Enseignants', 'Élèves'].every(n => sheets[n]));
let r = call('login', { identifiant: 'admin', pin: '9999' }); ok('mauvais NIP', !r.ok);
r = call('login', { identifiant: 'admin', pin: '2468' }); ok('admin', r.ok && r.session.role === 'admin', r); const tA = r.token;
ok('école', call('saveSchool', { token: tA, nouveau: true, id: 'ESL', nom: 'École du Lac' }).ok);
ok('école 2', call('saveSchool', { token: tA, nouveau: true, id: 'PDR', nom: 'Pierre-Dupuy' }).ok);
r = call('getSchools'); ok('liste écoles', r.ecoles.length === 2, r);
ok('enseignant', call('saveTeacher', { token: tA, nouveau: true, identifiant: 'mroy', nom: 'Mme Roy', pin: '4321' }).ok);
r = call('login', { identifiant: 'mroy', pin: '4321' }); const tR = r.token; ok('login ens', r.ok && r.session.role === 'enseignant');
ok('groupe', call('createGroup', { token: tR, ecole: 'ESL', numero: '201' }).ok);
ok('même numéro autre école', call('createGroup', { token: tA, ecole: 'PDR', numero: '201' }).ok);
ok('doublon groupe refusé', !call('createGroup', { token: tA, ecole: 'ESL', numero: '201' }).ok);
r = call('studentCheck', { code: 'ESL-202-DL' }); ok('groupe inexistant', r.ok && !r.groupeExiste);
r = call('studentCheck', { code: 'ESL-201-DL' }); ok('check', r.groupeExiste && !r.nipDefini);
r = call('studentRegister', { code: 'ESL-201-DL', pin: '1111' }); ok('inscription', r.ok && r.token, r); const tok = r.token;
ok('usurpation', !call('studentRegister', { code: 'ESL-201-DL', pin: '2222' }).ok);
ok('mauvais NIP élève', !call('studentLogin', { code: 'ESL-201-DL', pin: '2222' }).ok);
const att = (id, extra = {}) => ({ id, date: new Date().toISOString(), module: 'm2', theme: 'addsous', niveau: 1, question: 'Réduis', reponse: '-3x+2', attendu: '=1+1', resultat: 1, essais: 1, temps: 12, serie: 's', mode: 'module', ...extra });
r = call('submit', { code: 'ESL-201-DL', token: tok, tentatives: [att('a1'), att('a2', { resultat: 0 })] }); ok('submit', r.ok && r.recus.length === 2, r);
ok('colonne P ajoutée', sheets.Tentatives.rows[0][15] === 'Erreur diagnostiquée', sheets.Tentatives.rows[0]);
call('submit', { code: 'ESL-201-DL', token: tok, tentatives: [att('a9', { resultat: 0, erreur: 'moinsParen' }), att('a10', { erreur: '=HACK()' })] });
ok('erreur enregistrée', sheets.Tentatives.rows.some(r => r[14] === 'a9' && r[15] === 'moinsParen'));
ok('erreur invalide ignorée', sheets.Tentatives.rows.some(r => r[14] === 'a10' && r[15] === ''));
ok('doublon via colonne ID', (call('submit', { code: 'ESL-201-DL', token: tok, tentatives: [att('a9')] }), sheets.Tentatives.rows.filter(r => r[14] === 'a9').length === 1));
call('submit', { code: 'ESL-201-DL', token: tok, tentatives: [att('a1')] }); ok('doublon', sheets.Tentatives.rows.length === 5, sheets.Tentatives.rows.length);
ok('mauvais jeton', !call('submit', { code: 'ESL-201-DL', token: 'x', tentatives: [att('a3')] }).ok);
ok('progression', call('saveProgress', { code: 'ESL-201-DL', token: tok, progression: { n: 2 } }).ok);
r = call('studentLogin', { code: 'ESL-201-DL', pin: '1111' }); ok('reconnexion + progression', r.ok && r.progression.n === 2, r);
r = call('getResults', { token: tR }); ok('erreur relue', r.lignes.some(l => l.erreur === 'moinsParen')); ok('résultats ens', r.lignes.length === 4 && r.lignes[0].module === 'm2' && r.lignes[0].attendu === "'=1+1".slice(1), r.lignes[0]);
r = call('listGroups', { token: tR }); ok('groupes ens', r.groupes.length === 1 && !r.enseignants);
r = call('listGroups', { token: tA }); ok('groupes admin', r.groupes.length === 2 && r.enseignants.length === 1);
ok('info élève', call('studentInfo', { token: tR, code: 'ESL-201-DL' }).nipDefini);
ok('pas son élève', !call('studentInfo', { token: tR, code: 'PDR-201-AB' }).ok);
ok('réinit NIP', call('resetStudentPin', { token: tR, code: 'ESL-201-DL' }).ok);
ok('ancien jeton invalide', !call('submit', { code: 'ESL-201-DL', token: tok, tentatives: [att('a4')] }).ok);
ok('nouveau NIP', call('studentRegister', { code: 'ESL-201-DL', pin: '5555' }).ok);
ok('ens non admin', !call('listTeachers', { token: tR }).ok);
ok('changer NIP', call('changePin', { token: tR, nouveau: '7777' }).ok && call('login', { identifiant: 'mroy', pin: '7777' }).ok);
ok('suppr ens avec groupes refusée', !call('deleteTeacher', { token: tA, identifiant: 'mroy' }).ok);
r = call('deleteGroup', { token: tR, groupe: 'ESL-201', resultatsSeulement: true }); ok('effacer résultats', r.ok && r.supprimees === 4, r);
ok('groupe gardé', call('listGroups', { token: tR }).groupes.length === 1);
ok('supprimer groupe', call('deleteGroup', { token: tR, groupe: 'ESL-201' }).ok && sheets['Élèves'].rows.length === 1);
ok('désactiver', call('saveTeacher', { token: tA, identifiant: 'mroy', actif: false }).ok && !call('whoami', { token: tR }).ok);
// Demande de compte (option A : approbation par l'administrateur + courriel)
r = call('teacherSignup', { nom: 'M. Gagnon', identifiant: 'pgagnon', pin: '2580', ecole: 'ESL', courriel: 'pg@ecole.ca', lien: 'https://exemple.github.io/algebre-sec2/enseignant.html' });
ok('demande', r.ok, r);
ok('courriel admin', ctx._courriels.length === 1 && ctx._courriels[0].to === 'proprietaire@css.qc.ca' && /pgagnon/.test(ctx._courriels[0].body), ctx._courriels);
ok('identifiant pris', !call('teacherSignup', { nom: 'X', identifiant: 'pgagnon', pin: '1234', ecole: 'ESL' }).ok);
ok('école requise', !call('teacherSignup', { nom: 'X', identifiant: 'xx', pin: '1234', ecole: 'ZZZ' }).ok);
r = call('login', { identifiant: 'pgagnon', pin: '2580' }); ok('en attente', !r.ok && /attente/.test(r.error), r);
r = call('listTeachers', { token: tA }); ok('visible admin', r.enseignants.some(e => e.identifiant === 'pgagnon' && e.enAttente && e.ecole === 'École du Lac'), r);
ok('approbation', call('saveTeacher', { token: tA, identifiant: 'pgagnon', actif: true }).ok);
ok('courriel enseignant', ctx._courriels.length === 2 && ctx._courriels[1].to === 'pg@ecole.ca');
ok('connexion après approbation', call('login', { identifiant: 'pgagnon', pin: '2580' }).ok);
ok('plus en attente', !call('listTeachers', { token: tA }).enseignants.find(e => e.identifiant === 'pgagnon').enAttente);
call('teacherSignup', { nom: 'Faux', identifiant: 'faux', pin: '1111', ecole: 'ESL' });
ok('refus', call('deleteTeacher', { token: tA, identifiant: 'faux' }).ok && !call('login', { identifiant: 'faux', pin: '1111' }).ok);
ctx.PropertiesService.getScriptProperties().setProperty('COURRIEL_ADMIN', 'daniel@css.qc.ca');
call('teacherSignup', { nom: 'Y', identifiant: 'yy', pin: '1111', ecole: 'PDR' });
ok('courriel configuré', ctx._courriels[ctx._courriels.length - 1].to === 'daniel@css.qc.ca');
for (let i = 0; i < 5; i++) call('login', { identifiant: 'zz', pin: '0' });
ok('blocage', /Trop/.test(call('login', { identifiant: 'zz', pin: '0' }).error));
console.log(fail ? `${fail} échec(s)` : 'Apps Script : tous les tests passent ✔');
process.exit(fail ? 1 : 0);
