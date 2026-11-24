/**
 * ============================================================
 *  Algèbre² — Base de données Google Sheets
 *  (même fonctionnement que l'application « IrregularVerbs », mais dans SA PROPRE feuille)
 *  À coller dans : Extensions > Apps Script (depuis une NOUVELLE feuille Google)
 * ============================================================
 *  Première installation :
 *  1. Colle ce code, enregistre (💾).
 *  2. Recharge la feuille : un menu « Algèbre² » apparaît.
 *  3. Menu > « 1. Préparer la feuille », puis « 2. Définir ou changer le NIP administrateur ».
 *  4. Déployer > Nouveau déploiement > Application Web
 *       Exécuter en tant que : Moi      Qui a accès : Tout le monde
 *  5. Copie l'URL (…/exec) dans js/config.js du site.
 *  6. (Facultatif) Menu > « 3. Courriel pour les demandes de comptes » : adresse avisée quand un
 *     enseignant demande un compte (par défaut : le propriétaire de la feuille).
 * ============================================================
 *  Rôles
 *  - Administrateur (identifiant « admin ») : voit et gère tout (écoles, enseignants, groupes).
 *  - Enseignant (compte créé par l'administrateur) : crée ses groupes,
 *    voit et supprime uniquement les données de ses groupes.
 *  - Élève : école + groupe + initiales + NIP personnel (4 chiffres).
 *    Sa progression est sauvegardée ici et le suit sur tous ses appareils.
 *  Le tri des données se fait ICI, côté serveur : un enseignant ne reçoit
 *  jamais les résultats des groupes des autres.
 * ============================================================
 */

const F_RES = 'Tentatives';
const F_ENS = 'Enseignants';
const F_GRP = 'Groupes';
const F_ECOLES = 'Écoles';
const F_ELEVES = 'Élèves';
const E_RES = ['Date', 'Code', 'Groupe', 'Module', 'Thème', 'Niveau', 'Question', 'Réponse de l\'élève', 'Réponse attendue', 'Résultat (1 = 1er essai, 2 = 2e essai, 0 = échec)', 'Essais', 'Temps (s)', 'Série', 'Mode', 'ID', 'Erreur diagnostiquée'];
const E_ENS = ['Identifiant', 'Nom', 'Empreinte du NIP (ne pas modifier)', 'Sel (ne pas modifier)', 'Actif', 'Créé le', 'Demande (en attente = à approuver)', 'École indiquée', 'Courriel (facultatif)'];
const E_GRP = ['Groupe (ÉCOLE-numéro)', 'Enseignant (identifiant)', 'Créé le'];
const E_ECOLES = ['ID (ne pas modifier)', 'Nom', 'Active', 'Créée le'];
const E_ELEVES = ['Code', 'Empreinte du NIP (ne pas modifier)', 'Sel (ne pas modifier)', 'Jetons (ne pas modifier)', 'Progression (ne pas modifier)', 'Mise à jour', 'Créé le'];
const NB_RES = E_RES.length;
const COL_ID = 15; // colonne O : identifiant unique de la tentative (ne jamais déplacer)
const MODULES = ['m1', 'm2', 'm3', 'm4', 'm5'];
const RX_ECOLE = /^[A-Z0-9]{2,6}$/;
const RX_GROUPE = /^[A-Z0-9]{2,6}-\d{1,4}$/;
const RX_CODE = /^([A-Z0-9]{2,6}-\d{1,4})-[A-Z]{2,4}\d?$/;
const DUREE_JETON_ELEVE = 180 * 86400000; // 180 jours
const DUREE_SESSION = 21600;              // 6 heures (maximum permis par le cache)
const ADMIN = 'admin';

/* ================= Menu dans la feuille ================= */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Algèbre²')
    .addItem('1. Préparer la feuille', 'preparerFeuille')
    .addItem('2. Définir ou changer le NIP administrateur', 'definirNip')
    .addItem('3. Courriel pour les demandes de comptes', 'definirCourriel')
    .addItem('4. Tester l\'envoi d\'un courriel', 'testerCourriel')
    .addToUi();
}

function preparerFeuille() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuilles = [feuille_(F_RES, E_RES), feuille_(F_ECOLES, E_ECOLES), feuille_(F_GRP, E_GRP), feuille_(F_ENS, E_ENS), feuille_(F_ELEVES, E_ELEVES)];
  feuilles[0].getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  completerEntetes_(feuilles[3], E_ENS); // colonnes ajoutées pour les demandes de comptes
  completerEntetes_(feuilles[0], E_RES); // colonne P : erreur diagnostiquée
  feuilles.forEach(function (f) {
    f.setFrozenRows(1);
    f.getRange(1, 1, 1, f.getLastColumn()).setFontWeight('bold').setBackground('#eef0ff');
  });
  const defaut = ss.getSheetByName('Feuille 1') || ss.getSheetByName('Sheet1');
  if (defaut && defaut.getLastRow() === 0 && ss.getSheets().length > 5) ss.deleteSheet(defaut);
  SpreadsheetApp.getUi().alert('✅ Feuille prête — script version 4 (Tentatives, Écoles, Groupes, Enseignants avec les colonnes des demandes de comptes, Élèves).\n\n' +
    'Si ce n\'est pas déjà fait : menu « Algèbre² » > « 2. Définir ou changer le NIP administrateur ».\n\n' +
    'Ensuite, dans l\'espace enseignant du site (identifiant : admin) : crée les écoles, puis les comptes enseignants.');
}

function definirNip() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('NIP administrateur', 'Choisis un NIP de 4 à 8 chiffres (identifiant de connexion : admin) :', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const nip = r.getResponseText().trim();
  if (!/^\d{4,8}$/.test(nip)) { ui.alert('Le NIP doit contenir de 4 à 8 chiffres. Recommence.'); return; }
  enregistrerNipAdmin_(nip);
  ui.alert('🔑 NIP administrateur enregistré (chiffré dans les propriétés du script).\nConnexion sur le site : identifiant « admin » + ce NIP.');
}

function definirCourriel() {
  const ui = SpreadsheetApp.getUi();
  const actuel = courrielAdmin_();
  const r = ui.prompt('Courriel pour les demandes de comptes', 'Adresse qui reçoit un courriel quand un enseignant demande un compte' + (actuel ? ' (actuelle : ' + actuel + ')' : '') + ' :', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const c = r.getResponseText().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)) { ui.alert('Adresse invalide. Recommence.'); return; }
  PropertiesService.getScriptProperties().setProperty('COURRIEL_ADMIN', c);
  ui.alert('📧 Les demandes de comptes seront envoyées à ' + c + '.');
}
/** Menu 4 : affiche l'adresse utilisée et envoie un courriel d'essai. */
function testerCourriel() {
  const ui = SpreadsheetApp.getUi();
  const dest = courrielAdmin_();
  const source = PropertiesService.getScriptProperties().getProperty('COURRIEL_ADMIN') ? 'définie avec le menu 3' : 'par défaut : propriétaire de la feuille';
  if (!dest) { ui.alert('Aucune adresse trouvée. Utilise le menu « 3. Courriel pour les demandes de comptes ».'); return; }
  try {
    MailApp.sendEmail({ to: dest, subject: 'Algèbre² — courriel d\'essai', body: 'Si tu lis ce message, les avis de demandes de comptes enseignants fonctionnent.', name: 'Algèbre²' });
    ui.alert('📧 Courriel d\'essai envoyé à : ' + dest + '\n(adresse ' + source + ')\n\nCourriels encore permis aujourd\'hui : ' + MailApp.getRemainingDailyQuota() +
      '\n\nS\'il n\'arrive pas d\'ici quelques minutes, regarde dans les courriels indésirables (ou la quarantaine de ton centre de services).');
  } catch (err) {
    ui.alert('❌ Envoi impossible vers ' + dest + '\n\nRaison : ' + err.message + '\n\nSi le message parle d\'autorisation, relance ce menu et accepte l\'accès « Envoyer des courriels en votre nom ».');
  }
}
function courrielAdmin_() {
  const p = PropertiesService.getScriptProperties().getProperty('COURRIEL_ADMIN');
  if (p) return p;
  try { return Session.getEffectiveUser().getEmail(); } catch (e) { return ''; }
}
function completerEntetes_(f, entetes) {
  const actuels = f.getRange(1, 1, 1, entetes.length).getValues()[0];
  entetes.forEach(function (h, i) { if (!actuels[i]) f.getRange(1, i + 1).setValue(h); });
}

/* ================= Points d'entrée Web ================= */
function doGet(e) { return repondre_(traiter_((e && e.parameter) || {})); }

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (err) { return repondre_({ ok: false, error: 'Requête invalide.' }); }
  return repondre_(traiter_(req));
}

function repondre_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function traiter_(req) {
  try {
    // ---- Actions publiques (élèves)
    switch (req.action) {
      case 'ping':            return { ok: true, message: 'Le script fonctionne.', app: 'algebre2', version: 4, demandesDeComptes: true, erreursDiagnostiquees: true };
      case 'getSchools':      return { ok: true, ecoles: lireEcoles_().filter(function (e) { return e.actif; }).map(function (e) { return { id: e.id, nom: e.nom }; }) };
      case 'studentCheck':    return verifierEleve_(req.code);
      case 'studentRegister': return inscrireEleve_(req.code, req.pin);
      case 'studentLogin':    return connecterEleve_(req.code, req.pin);
      case 'submit':          jetonEleve_(req.code, req.token); return enregistrerTentatives_(req.tentatives || [], req.code);
      case 'saveProgress':    return sauverProgression_(jetonEleve_(req.code, req.token), req.progression);
      case 'login':           return connexion_(req.identifiant, req.pin);
      case 'teacherSignup':   return demanderCompte_(req);
    }
    // ---- Actions qui exigent une session enseignant
    const s = session_(req.token);
    switch (req.action) {
      case 'logout':          CacheService.getScriptCache().remove('s_' + req.token); return { ok: true };
      case 'whoami':          return { ok: true, session: s };
      case 'getResults':      return { ok: true, lignes: lireResultats_(s) };
      case 'listGroups':      return groupesPour_(s);
      case 'createGroup':     return creerGroupe_(s, req.ecole, req.numero, req.proprietaire);
      case 'deleteGroup':     return supprimerGroupe_(s, req.groupe, !!req.resultatsSeulement);
      case 'changePin':       return changerMonNip_(s, req.nouveau);
      case 'studentInfo':     return infoEleve_(s, req.code);
      case 'resetStudentPin': return reinitialiserNipEleve_(s, req.code);
    }
    // ---- Actions réservées à l'administrateur
    if (s.role !== 'admin') throw new Error('Action réservée à l\'administrateur.');
    switch (req.action) {
      case 'reassignGroup':   return reattribuerGroupe_(req.groupe, req.proprietaire);
      case 'listTeachers':    return { ok: true, enseignants: listeEnseignants_() };
      case 'saveTeacher':     return sauverEnseignant_(req);
      case 'deleteTeacher':   return supprimerEnseignant_(req.identifiant);
      case 'saveSchool':      return sauverEcole_(req);
      case 'deleteSchool':    return supprimerEcole_(req.id);
    }
    return { ok: false, error: 'Action inconnue.' };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

/* ================= Sécurité : NIP et sessions ================= */
function hacher_(texte) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texte, Utilities.Charset.UTF_8));
}
function nipValide_(nip) { return /^\d{4,8}$/.test(String(nip || '')); }

function enregistrerNipAdmin_(nip) {
  const p = PropertiesService.getScriptProperties();
  const sel = Utilities.getUuid();
  p.setProperty('NIP_SEL', sel);
  p.setProperty('NIP_HASH', hacher_(sel + nip));
}

function connexion_(identifiant, nip) {
  const id = String(identifiant || '').trim().toLowerCase();
  if (!id) throw new Error('Entre ton identifiant.');
  const cache = CacheService.getScriptCache();
  const cleEchecs = 'echecs_' + id;
  const echecs = Number(cache.get(cleEchecs) || 0);
  if (echecs >= 5) throw new Error('Trop d\'essais pour cet identifiant. Réessaie dans 5 minutes.');

  let session = null;
  if (id === ADMIN) {
    const p = PropertiesService.getScriptProperties();
    const hash = p.getProperty('NIP_HASH');
    if (!hash) throw new Error('Aucun NIP administrateur : dans la feuille, utilise le menu « Algèbre² > Définir ou changer le NIP administrateur ».');
    if (hacher_((p.getProperty('NIP_SEL') || '') + String(nip || '')) === hash) session = { id: ADMIN, role: 'admin', nom: 'Administrateur' };
  } else {
    const e = trouverEnseignant_(id);
    if (e && hacher_(e.sel + String(nip || '')) === e.hash) {
      if (e.enAttente) throw new Error('Ta demande de compte est en attente d\'approbation par l\'administrateur. Tu pourras te connecter dès qu\'elle sera acceptée.');
      if (e.actif) session = { id: e.identifiant, role: 'enseignant', nom: e.nom };
    }
  }
  if (!session) {
    cache.put(cleEchecs, String(echecs + 1), 300);
    throw new Error('Identifiant ou NIP incorrect.');
  }
  cache.remove(cleEchecs);
  const jeton = Utilities.getUuid() + Utilities.getUuid().slice(0, 8);
  cache.put('s_' + jeton, JSON.stringify(session), DUREE_SESSION);
  return { ok: true, token: jeton, session: session };
}

function session_(jeton) {
  if (!jeton) throw new Error('Session expirée : reconnecte-toi.');
  const cache = CacheService.getScriptCache();
  const brut = cache.get('s_' + jeton);
  if (!brut) throw new Error('Session expirée : reconnecte-toi.');
  const s = JSON.parse(brut);
  if (s.role === 'enseignant') {
    const e = trouverEnseignant_(s.id);
    if (!e || !e.actif) { cache.remove('s_' + jeton); throw new Error('Session expirée : compte désactivé.'); }
  }
  cache.put('s_' + jeton, brut, DUREE_SESSION); // prolonge la session tant qu'elle sert
  return s;
}

function changerMonNip_(s, nouveau) {
  if (!nipValide_(nouveau)) throw new Error('Le NIP doit contenir de 4 à 8 chiffres.');
  if (s.role === 'admin') { enregistrerNipAdmin_(String(nouveau)); return { ok: true }; }
  definirNipEnseignant_(s.id, String(nouveau));
  return { ok: true };
}

/* ================= Feuilles ================= */
function feuille_(nom, entetes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let f = ss.getSheetByName(nom);
  if (!f) f = ss.insertSheet(nom);
  if (f.getLastRow() === 0) f.appendRow(entetes);
  return f;
}
function valeurs_(f, nbCol) {
  const n = f.getLastRow();
  return n < 2 ? [] : f.getRange(2, 1, n - 1, nbCol).getValues();
}
function verrou_(fn) {
  const v = LockService.getScriptLock();
  v.waitLock(20000);
  try { return fn(); } finally { v.releaseLock(); }
}
/** Texte sûr : empêche l'interprétation comme formule (=, +, -, @) */
function txt_(v, max) {
  const s = String(v === undefined || v === null ? '' : v).slice(0, max || 300);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/* ================= Enseignants ================= */
function lireEnseignants_() {
  const f = feuille_(F_ENS, E_ENS);
  if (!lireEnseignants_.verifie) { completerEntetes_(f, E_ENS); lireEnseignants_.verifie = true; } // ajoute G, H, I si absentes
  return valeurs_(f, 9).filter(function (r) { return r[0]; }).map(function (r, i) {
    return { ligne: i + 2, identifiant: String(r[0]).trim().toLowerCase(), nom: String(r[1]), hash: String(r[2]), sel: String(r[3]),
             actif: r[4] === true || String(r[4]).toUpperCase() === 'TRUE' || String(r[4]).toLowerCase() === 'oui',
             creeLe: r[5] instanceof Date ? r[5].toISOString() : String(r[5] || ''),
             enAttente: String(r[6] || '').toLowerCase() === 'en attente', ecole: String(r[7] || ''), courriel: String(r[8] || '') };
  });
}
function trouverEnseignant_(id) {
  id = String(id || '').toLowerCase();
  return lireEnseignants_().filter(function (e) { return e.identifiant === id; })[0] || null;
}
function listeEnseignants_() {
  const groupes = listeGroupes_();
  return lireEnseignants_().map(function (e) {
    return { identifiant: e.identifiant, nom: e.nom, actif: e.actif, enAttente: e.enAttente, ecole: e.ecole, courriel: e.courriel, creeLe: e.creeLe,
             groupes: groupes.filter(function (g) { return g.enseignant === e.identifiant; }).map(function (g) { return g.groupe; }) };
  });
}
function definirNipEnseignant_(id, nip) {
  const e = trouverEnseignant_(id);
  if (!e) throw new Error('Enseignant introuvable.');
  const sel = Utilities.getUuid();
  feuille_(F_ENS, E_ENS).getRange(e.ligne, 3, 1, 2).setValues([[hacher_(sel + nip), sel]]);
}
function sauverEnseignant_(req) {
  const id = String(req.identifiant || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,20}$/.test(id)) throw new Error('Identifiant : 2 à 20 caractères (lettres minuscules, chiffres, point, tiret).');
  if (id === ADMIN) throw new Error('L\'identifiant « admin » est réservé.');
  const nom = String(req.nom || '').trim().slice(0, 60);
  return verrou_(function () {
    const f = feuille_(F_ENS, E_ENS);
    const e = trouverEnseignant_(id);
    if (req.nouveau) {
      if (e) throw new Error('Cet identifiant existe déjà.');
      if (!nom) throw new Error('Entre le nom de l\'enseignant.');
      if (!nipValide_(req.pin)) throw new Error('Le NIP doit contenir de 4 à 8 chiffres.');
      const sel = Utilities.getUuid();
      f.appendRow([id, txt_(nom), hacher_(sel + String(req.pin)), sel, true, new Date()]);
      return { ok: true };
    }
    if (!e) throw new Error('Enseignant introuvable.');
    if (nom) f.getRange(e.ligne, 2).setValue(txt_(nom));
    if (typeof req.actif === 'boolean') f.getRange(e.ligne, 5).setValue(req.actif);
    if (req.actif === true && e.enAttente) { // approbation d'une demande
      f.getRange(e.ligne, 7).setValue('approuvée le ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
      if (e.courriel) envoyerCourriel_(e.courriel, 'Algèbre² — ton compte enseignant est activé',
        'Bonjour ' + e.nom + ',\n\nTon compte enseignant Algèbre² a été approuvé.\nIdentifiant : ' + e.identifiant + '\nNIP : celui que tu as choisi lors de ta demande.\n\n' +
        'Tu peux maintenant te connecter à l\'espace enseignant et créer tes groupes (onglet « Mes groupes »).');
    }
    if (req.pin) { if (!nipValide_(req.pin)) throw new Error('Le NIP doit contenir de 4 à 8 chiffres.'); definirNipEnseignant_(id, String(req.pin)); }
    return { ok: true };
  });
}
function supprimerEnseignant_(id) {
  id = String(id || '').toLowerCase();
  return verrou_(function () {
    const e = trouverEnseignant_(id);
    if (!e) throw new Error('Enseignant introuvable.');
    if (listeGroupes_().some(function (g) { return g.enseignant === id; })) throw new Error('Cet enseignant a encore des groupes : réattribue-les ou supprime-les d\'abord.');
    feuille_(F_ENS, E_ENS).deleteRow(e.ligne);
    return { ok: true };
  });
}

/* ================= Demandes de comptes (inscription par l'enseignant, approbation par l'admin) ================= */
function demanderCompte_(req) {
  const id = String(req.identifiant || '').trim().toLowerCase();
  const nom = String(req.nom || '').trim().slice(0, 60);
  const ecole = String(req.ecole || '').trim().toUpperCase();
  const courriel = String(req.courriel || '').trim().slice(0, 120);
  if (!nom) throw new Error('Entre ton nom.');
  if (!/^[a-z0-9._-]{2,20}$/.test(id)) throw new Error('Identifiant : 2 à 20 caractères (lettres minuscules, chiffres, point, tiret).');
  if (id === ADMIN) throw new Error('L\'identifiant « admin » est réservé.');
  if (!nipValide_(req.pin)) throw new Error('Le NIP doit contenir de 4 à 8 chiffres.');
  if (courriel && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(courriel)) throw new Error('Adresse courriel invalide.');
  const e = lireEcoles_().filter(function (x) { return x.id === ecole && x.actif; })[0];
  if (!e) throw new Error('Choisis ton école.');
  // Anti-pourriel : au plus 10 demandes par heure pour toute l'application
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('demandes_heure') || 0);
  if (n >= 10) throw new Error('Trop de demandes en peu de temps. Réessaie dans une heure.');
  verrou_(function () {
    if (trouverEnseignant_(id)) throw new Error('Cet identifiant est déjà utilisé : choisis-en un autre.');
    const sel = Utilities.getUuid();
    feuille_(F_ENS, E_ENS).appendRow([id, txt_(nom), hacher_(sel + String(req.pin)), sel, false, new Date(), 'en attente', txt_(e.nom), txt_(courriel)]);
  });
  cache.put('demandes_heure', String(n + 1), 3600);
  const dest = courrielAdmin_();
  const lien = /^https:\/\/[^\s]+$/.test(String(req.lien || '')) ? String(req.lien).slice(0, 300) : '';
  if (dest) envoyerCourriel_(dest, 'Algèbre² — nouvelle demande de compte enseignant : ' + nom,
    'Une nouvelle demande de compte enseignant attend ton approbation.\n\n' +
    'Nom : ' + nom + '\nIdentifiant : ' + id + '\nÉcole : ' + e.nom + (courriel ? '\nCourriel : ' + courriel : '') +
    '\nDate : ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') + '\n\n' +
    'Pour l\'approuver ou la refuser : espace enseignant (identifiant admin) › onglet « Enseignants » › Demandes en attente.' +
    (lien ? '\n' + lien : ''));
  return { ok: true };
}
function envoyerCourriel_(dest, sujet, corps) {
  try { MailApp.sendEmail({ to: dest, subject: sujet, body: corps, name: 'Algèbre²' }); return true; }
  catch (err) { console.warn('Courriel non envoyé : ' + err); return false; } // la demande est quand même enregistrée
}

/* ================= Groupes ================= */
function listeGroupes_() {
  return valeurs_(feuille_(F_GRP, E_GRP), 3).filter(function (r) { return r[0] !== ''; }).map(function (r, i) {
    return { ligne: i + 2, groupe: String(r[0]).trim(), enseignant: String(r[1]).trim().toLowerCase() };
  });
}
function groupeValide_(g) { g = String(g || '').trim().toUpperCase(); if (!RX_GROUPE.test(g)) throw new Error('Groupe invalide.'); return g; }

function groupesPour_(s) {
  const groupes = listeGroupes_();
  const compte = {};
  valeurs_(feuille_(F_RES, E_RES), 3).forEach(function (r) { const g = String(r[2]).trim(); compte[g] = (compte[g] || 0) + 1; });
  const noms = { admin: 'Administrateur' };
  lireEnseignants_().forEach(function (e) { noms[e.identifiant] = e.nom; });
  const visibles = groupes.filter(function (g) { return s.role === 'admin' || g.enseignant === s.id; }).map(function (g) {
    return { groupe: g.groupe, enseignant: g.enseignant, nomEnseignant: noms[g.enseignant] || g.enseignant, resultats: compte[g.groupe] || 0 };
  });
  const ecoles = lireEcoles_();
  const rep = { ok: true, groupes: visibles,
    ecoles: ecoles.filter(function (e) { return s.role === 'admin' || e.actif; }).map(function (e) {
      return { id: e.id, nom: e.nom, actif: e.actif, groupes: groupes.filter(function (g) { return g.groupe.indexOf(e.id + '-') === 0; }).length };
    }) };
  if (s.role === 'admin') {
    const connus = {};
    groupes.forEach(function (g) { connus[g.groupe] = true; });
    rep.orphelins = Object.keys(compte).filter(function (g) { return !connus[g]; }).map(function (g) { return { groupe: g, resultats: compte[g] }; });
    rep.enseignants = lireEnseignants_().map(function (e) { return { identifiant: e.identifiant, nom: e.nom, actif: e.actif }; });
  }
  return rep;
}

function creerGroupe_(s, ecole, numero, proprietaire) {
  ecole = String(ecole || '').trim().toUpperCase();
  numero = String(numero || '').trim();
  const e = lireEcoles_().filter(function (x) { return x.id === ecole; })[0];
  if (!e || !e.actif) throw new Error('Choisis une école.');
  if (!/^\d{1,4}$/.test(numero)) throw new Error('Numéro de groupe invalide (1 à 4 chiffres).');
  const g = ecole + '-' + numero;
  let proprio = s.id;
  if (s.role === 'admin' && proprietaire) {
    proprio = String(proprietaire).toLowerCase();
    if (proprio !== ADMIN && !trouverEnseignant_(proprio)) throw new Error('Enseignant introuvable.');
  }
  return verrou_(function () {
    const existant = listeGroupes_().filter(function (x) { return x.groupe === g; })[0];
    if (existant) {
      if (s.role === 'admin') throw new Error('Le groupe ' + g + ' existe déjà (propriétaire : ' + existant.enseignant + ').');
      throw new Error(existant.enseignant === s.id ? 'Tu as déjà créé le groupe ' + numero + ' (' + e.nom + ').' : 'Le groupe ' + numero + ' de ' + e.nom + ' est déjà utilisé par un autre enseignant. Choisis un autre numéro ou contacte l\'administrateur.');
    }
    feuille_(F_GRP, E_GRP).appendRow(["'" + g, proprio, new Date()]);
    return { ok: true };
  });
}

function reattribuerGroupe_(groupe, proprietaire) {
  const g = groupeValide_(groupe);
  const proprio = String(proprietaire || '').toLowerCase();
  if (proprio !== ADMIN && !trouverEnseignant_(proprio)) throw new Error('Enseignant introuvable.');
  return verrou_(function () {
    const existant = listeGroupes_().filter(function (x) { return x.groupe === g; })[0];
    const f = feuille_(F_GRP, E_GRP);
    if (existant) f.getRange(existant.ligne, 2).setValue(proprio);
    else f.appendRow(["'" + g, proprio, new Date()]); // groupe orphelin : on l'enregistre
    return { ok: true };
  });
}

function supprimerGroupe_(s, groupe, resultatsSeulement) {
  const g = groupeValide_(groupe);
  return verrou_(function () {
    const existant = listeGroupes_().filter(function (x) { return x.groupe === g; })[0];
    if (s.role !== 'admin' && (!existant || existant.enseignant !== s.id)) throw new Error('Ce groupe ne t\'appartient pas.');
    // 1) Tentatives du groupe
    const f = feuille_(F_RES, E_RES);
    const n = f.getLastRow();
    let supprimees = 0;
    if (n >= 2) {
      const donnees = f.getRange(2, 1, n - 1, NB_RES).getValues();
      const garder = donnees.filter(function (r) { return String(r[2]).trim() !== g; });
      supprimees = donnees.length - garder.length;
      if (supprimees) {
        f.getRange(2, 1, n - 1, NB_RES).clearContent();
        if (garder.length) f.getRange(2, 1, garder.length, NB_RES).setValues(garder);
        if (n - 1 > garder.length) f.deleteRows(2 + garder.length, n - 1 - garder.length);
      }
    }
    // 2) Le groupe lui-même et les comptes élèves (NIP, progression)
    if (!resultatsSeulement) {
      if (existant) feuille_(F_GRP, E_GRP).deleteRow(existant.ligne);
      const fe = feuille_(F_ELEVES, E_ELEVES);
      const eleves = valeurs_(fe, 1);
      for (let i = eleves.length - 1; i >= 0; i--) if (String(eleves[i][0]).indexOf(g + '-') === 0) fe.deleteRow(i + 2);
    }
    return { ok: true, supprimees: supprimees };
  });
}

/* ================= Tentatives (une ligne par question) ================= */
function enregistrerTentatives_(liste, codeSession) {
  const code = String(codeSession || '').toUpperCase().trim();
  const m = RX_CODE.exec(code);
  if (!m) throw new Error('Code élève invalide.');
  const groupe = m[1];
  if (!Array.isArray(liste) || !liste.length) return { ok: true, recus: [] };
  const nombre = function (x, max) { const v = Number(x); return isFinite(v) ? Math.max(0, Math.min(max, v)) : 0; };
  return verrou_(function () {
    const f = feuille_(F_RES, E_RES);
    if (!enregistrerTentatives_.entetes) { completerEntetes_(f, E_RES); enregistrerTentatives_.entetes = true; }
    const der = f.getLastRow();
    const deja = {};
    if (der > 1) { // évite les doublons d'un envoi hors-ligne réessayé
      const debut = Math.max(2, der - 3000);
      f.getRange(debut, COL_ID, der - debut + 1, 1).getValues().forEach(function (r) { deja[r[0]] = true; });
    }
    const lignes = [], recus = [];
    liste.slice(0, 100).forEach(function (a) {
      const id = String(a.id || '').slice(0, 40);
      if (!id) return;
      recus.push(id);
      if (deja[id]) return;
      deja[id] = true;
      const date = new Date(a.date);
      lignes.push([isNaN(date) ? new Date() : date, code, "'" + groupe, MODULES.indexOf(a.module) >= 0 ? a.module : '', txt_(a.theme, 20), txt_(a.niveau, 10),
        txt_(a.question, 400), txt_(a.reponse, 200), txt_(a.attendu, 200), nombre(a.resultat, 2), nombre(a.essais, 9), nombre(a.temps, 36000),
        txt_(a.serie, 40), txt_(a.mode, 12), id, /^[a-zA-Z]{0,30}$/.test(String(a.erreur || '')) ? String(a.erreur || '') : '']);
    });
    if (lignes.length) f.getRange(der + 1, 1, lignes.length, NB_RES).setValues(lignes);
    return { ok: true, recus: recus };
  });
}

function lireResultats_(s) {
  let permis = null; // null = tout (admin)
  if (s.role !== 'admin') {
    permis = {};
    listeGroupes_().forEach(function (g) { if (g.enseignant === s.id) permis[g.groupe] = true; });
  }
  return valeurs_(feuille_(F_RES, E_RES), NB_RES)
    .filter(function (r) { return r[1] && (!permis || permis[String(r[2]).trim()]); })
    .map(function (r) {
      return {
        date: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), code: String(r[1]), groupe: String(r[2]).trim(),
        module: String(r[3]), theme: String(r[4]), niveau: String(r[5]), question: String(r[6]), reponse: String(r[7]), attendu: String(r[8]),
        resultat: Number(r[9]) || 0, essais: Number(r[10]) || 0, temps: Number(r[11]) || 0, mode: String(r[13]), erreur: String(r[15] || '')
      };
    });
}

/* ================= Écoles (administrateur) ================= */
function lireEcoles_() {
  return valeurs_(feuille_(F_ECOLES, E_ECOLES), 3).filter(function (r) { return r[0]; }).map(function (r, i) {
    return { ligne: i + 2, id: String(r[0]).trim().toUpperCase(), nom: String(r[1]).trim(),
             actif: !(r[2] === false || String(r[2]).toUpperCase() === 'FALSE' || String(r[2]).toLowerCase() === 'non') };
  });
}
function sauverEcole_(req) {
  const id = String(req.id || '').trim().toUpperCase();
  if (!RX_ECOLE.test(id)) throw new Error('Code de l\'école : 2 à 6 lettres ou chiffres (ex. SJ, ESM, PDR).');
  const nom = String(req.nom || '').trim().slice(0, 80);
  return verrou_(function () {
    const f = feuille_(F_ECOLES, E_ECOLES);
    const e = lireEcoles_().filter(function (x) { return x.id === id; })[0];
    if (req.nouveau) {
      if (e) throw new Error('Ce code d\'école existe déjà.');
      if (!nom) throw new Error('Entre le nom de l\'école.');
      f.appendRow([id, txt_(nom), true, new Date()]);
      return { ok: true };
    }
    if (!e) throw new Error('École introuvable.');
    if (nom) f.getRange(e.ligne, 2).setValue(txt_(nom));
    if (typeof req.actif === 'boolean') f.getRange(e.ligne, 3).setValue(req.actif);
    return { ok: true };
  });
}
function supprimerEcole_(id) {
  id = String(id || '').trim().toUpperCase();
  return verrou_(function () {
    const e = lireEcoles_().filter(function (x) { return x.id === id; })[0];
    if (!e) throw new Error('École introuvable.');
    if (listeGroupes_().some(function (g) { return g.groupe.indexOf(id + '-') === 0; })) throw new Error('Cette école a encore des groupes : supprime-les d\'abord.');
    feuille_(F_ECOLES, E_ECOLES).deleteRow(e.ligne);
    return { ok: true };
  });
}

/* ================= Comptes élèves (NIP + progression) ================= */
function codeEleveValide_(code) {
  code = String(code || '').trim().toUpperCase();
  const m = RX_CODE.exec(code);
  if (!m) throw new Error('Code élève invalide.');
  return { code: code, groupe: m[1] };
}
function trouverEleve_(code) {
  const lignes = valeurs_(feuille_(F_ELEVES, E_ELEVES), 7);
  for (let i = 0; i < lignes.length; i++) {
    const r = lignes[i];
    if (String(r[0]).trim().toUpperCase() === code) {
      let jetons = [];
      try { jetons = JSON.parse(r[3] || '[]'); } catch (e) {}
      return { ligne: i + 2, code: code, hash: String(r[1] || ''), sel: String(r[2] || ''), jetons: jetons, progression: String(r[4] || ''), maj: r[5] };
    }
  }
  return null;
}
function groupeOuvert_(groupe) {
  const ecole = groupe.split('-')[0];
  const e = lireEcoles_().filter(function (x) { return x.id === ecole; })[0];
  return !!(e && e.actif && listeGroupes_().some(function (g) { return g.groupe === groupe; }));
}
function verifierEleve_(code) {
  const c = codeEleveValide_(code);
  const el = trouverEleve_(c.code);
  return { ok: true, groupeExiste: groupeOuvert_(c.groupe), nipDefini: !!(el && el.hash) };
}
function nouveauJeton_(el) {
  const jeton = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().slice(0, 8);
  const maintenant = Date.now();
  const jetons = (el.jetons || []).filter(function (j) { return j.e > maintenant; });
  jetons.push({ h: hacher_(jeton), e: maintenant + DUREE_JETON_ELEVE });
  feuille_(F_ELEVES, E_ELEVES).getRange(el.ligne, 4).setValue(JSON.stringify(jetons.slice(-3))); // 3 appareils au maximum
  return jeton;
}
function progressionLue_(texte) { try { return texte ? JSON.parse(texte) : null; } catch (e) { return null; } }

function inscrireEleve_(code, nip) {
  const c = codeEleveValide_(code);
  if (!/^\d{4}$/.test(String(nip || ''))) throw new Error('Ton NIP doit contenir exactement 4 chiffres.');
  if (!groupeOuvert_(c.groupe)) throw new Error('Ce groupe n\'existe pas. Vérifie avec ton enseignant·e.');
  return verrou_(function () {
    const f = feuille_(F_ELEVES, E_ELEVES);
    let el = trouverEleve_(c.code);
    if (el && el.hash) throw new Error('Ce code a déjà un NIP. Si ce n\'est pas toi, ajoute un chiffre à tes initiales (ex. AB2).');
    const sel = Utilities.getUuid();
    if (el) f.getRange(el.ligne, 2, 1, 3).setValues([[hacher_(sel + nip), sel, '[]']]);
    else { f.appendRow([c.code, hacher_(sel + nip), sel, '[]', '', '', new Date()]); }
    el = trouverEleve_(c.code);
    return { ok: true, token: nouveauJeton_(el), progression: progressionLue_(el.progression) };
  });
}
function connecterEleve_(code, nip) {
  const c = codeEleveValide_(code);
  const cache = CacheService.getScriptCache();
  const cle = 'echecs_el_' + c.code;
  const echecs = Number(cache.get(cle) || 0);
  if (echecs >= 5) throw new Error('Trop d\'essais. Réessaie dans 5 minutes ou demande à ton enseignant·e de réinitialiser ton NIP.');
  const el = trouverEleve_(c.code);
  if (!el || !el.hash) throw new Error('Aucun NIP pour ce code : c\'est ta première connexion ?');
  if (hacher_(el.sel + String(nip || '')) !== el.hash) {
    cache.put(cle, String(echecs + 1), 300);
    throw new Error('NIP incorrect.');
  }
  cache.remove(cle);
  if (!groupeOuvert_(c.groupe)) throw new Error('Ce groupe n\'existe plus. Vérifie avec ton enseignant·e.');
  return verrou_(function () { return { ok: true, token: nouveauJeton_(trouverEleve_(c.code)), progression: progressionLue_(el.progression) }; });
}
function jetonEleve_(code, jeton) {
  const c = codeEleveValide_(code);
  const el = trouverEleve_(c.code);
  const h = hacher_(String(jeton || ''));
  const maintenant = Date.now();
  if (!el || !el.hash || !(el.jetons || []).some(function (j) { return j.h === h && j.e > maintenant; })) throw new Error('Session élève expirée : reconnecte-toi.');
  return el;
}
function sauverProgression_(el, progression) {
  const texte = typeof progression === 'string' ? progression : JSON.stringify(progression || {});
  if (texte.length > 45000) throw new Error('Progression trop volumineuse.');
  progressionLue_(texte) || (function () { throw new Error('Progression invalide.'); })();
  feuille_(F_ELEVES, E_ELEVES).getRange(el.ligne, 5, 1, 2).setValues([[texte, new Date()]]);
  return { ok: true };
}
function permisSurEleve_(s, code) {
  const c = codeEleveValide_(code);
  if (s.role === 'admin') return c;
  const g = listeGroupes_().filter(function (x) { return x.groupe === c.groupe; })[0];
  if (!g || g.enseignant !== s.id) throw new Error('Cet élève n\'est pas dans un de tes groupes.');
  return c;
}
function infoEleve_(s, code) {
  const c = permisSurEleve_(s, code);
  const el = trouverEleve_(c.code);
  return { ok: true, existe: !!el, nipDefini: !!(el && el.hash), progression: el ? progressionLue_(el.progression) : null,
           maj: el && el.maj instanceof Date ? el.maj.toISOString() : null };
}
function reinitialiserNipEleve_(s, code) {
  const c = permisSurEleve_(s, code);
  return verrou_(function () {
    const el = trouverEleve_(c.code);
    if (!el) throw new Error('Cet élève n\'a pas encore de compte.');
    feuille_(F_ELEVES, E_ELEVES).getRange(el.ligne, 2, 1, 3).setValues([['', '', '[]']]); // la progression est conservée
    CacheService.getScriptCache().remove('echecs_el_' + c.code);
    return { ok: true };
  });
}
