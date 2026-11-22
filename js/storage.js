/**
 * storage.js — Communication avec Google Apps Script + stockage local.
 * Même fonctionnement que l'application des verbes irréguliers :
 *  - code élève : ÉCOLE-groupe-INITIALES (ex. ESL-201-DL), NIP personnel, jeton par appareil (180 jours);
 *  - progression sauvegardée dans la feuille et fusionnée entre appareils;
 *  - file d'attente hors ligne : rien n'est perdu si le Wi-Fi coupe.
 */
import { GOOGLE_SCRIPT_URL, CONFIG } from './config.js';
import { estPerime } from './maj.js';

/* ---------- Stockage local sécuritaire ---------- */
export const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* plein ou bloqué */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* bloqué */ } },
};
export const prefs = { get: (n, d) => store.get('alg:pref:' + n, d), set: (n, v) => store.set('alg:pref:' + n, v) };

/* ---------- API ---------- */
export const urlConfiguree = () => typeof GOOGLE_SCRIPT_URL === 'string' && /^https:\/\/script\.google(usercontent)?\.com\//.test(GOOGLE_SCRIPT_URL);
export const LOCAL = !urlConfiguree();
/** Pourquoi le mode local : 'absente' (URL pas encore collée) ou 'invalide' (URL mal copiée). */
export function raisonLocal() {
  if (!LOCAL) return null;
  const u = String(GOOGLE_SCRIPT_URL || '').trim();
  return !u || u === 'VOTRE_URL_ICI' ? 'absente' : 'invalide';
}

export async function api(action, donnees = {}, delaiMs = 15000) {
  if (LOCAL) throw new Error("L'URL du script Google n'est pas configurée (js/config.js).");
  const ctrl = new AbortController();
  const minuterie = setTimeout(() => ctrl.abort(), delaiMs);
  try {
    // POST en text/plain : évite la requête « preflight » CORS que Apps Script ne gère pas.
    const rep = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action }, donnees)), signal: ctrl.signal, redirect: 'follow',
    });
    const json = await rep.json();
    if (!json.ok) { const err = new Error(json.error || 'Erreur du serveur'); err.serveur = true; throw err; }
    return json;
  } finally { clearTimeout(minuterie); }
}

/* ---------- Codes élèves ---------- */
export const RX_CODE = /^([A-Z0-9]{2,6})-(\d{1,4})-([A-Z]{2,4}\d?)$/;
export function decouperCode(code) {
  const m = RX_CODE.exec(String(code || ''));
  return m ? { code, ecole: m[1], numero: m[2], initiales: m[3], groupe: m[1] + '-' + m[2] } : null;
}
export const initialesAffichees = (ini) => String(ini || '').replace(/([A-Z])(?=[A-Z]|\d|$)/g, '$1.');

const ECOLES_LOCALES = (CONFIG.ECOLES_LOCALES || []).filter((e) => e && /^[A-Z0-9]{2,6}$/.test(String(e.id || '').toUpperCase()) && e.nom)
  .map((e) => ({ id: String(e.id).toUpperCase(), nom: String(e.nom) }));
let ECOLES = LOCAL ? ECOLES_LOCALES : store.get('alg:ecoles', []);
/** Le champ « École » est affiché avec la feuille Google, ou en mode local si des écoles sont définies dans config.js. */
export const avecEcole = () => !LOCAL || ECOLES_LOCALES.length > 0;
export const ecoles = () => ECOLES;
export const nomEcole = (id) => (ECOLES.find((e) => e.id === id) || {}).nom || id;
export function codeAffiche(code) {
  const c = decouperCode(code);
  if (!c) return code;
  return (c.ecole === 'LOCAL' ? '' : nomEcole(c.ecole) + ' · ') + c.numero + '-' + c.initiales;
}
export async function chargerEcoles() {
  if (LOCAL) return ECOLES;
  try {
    const rep = await api('getSchools', {}, 8000);
    ECOLES = rep.ecoles || [];
    store.set('alg:ecoles', ECOLES);
  } catch (e) { /* hors ligne : liste en cache */ }
  return ECOLES;
}

/* ---------- Session (par onglet) et jetons (par appareil) ---------- */
export const jeton = (code) => store.get('alg:jeton:' + code, null);
export function sessionOnglet(code) {
  try { if (code === undefined) return sessionStorage.getItem('alg:session'); if (code) sessionStorage.setItem('alg:session', code); else sessionStorage.removeItem('alg:session'); } catch (e) { return null; }
  return code;
}
export const codesRecents = () => store.get('alg:codes', []).filter((c) => RX_CODE.test(c));
export function retirerCodeRecent(code) { store.set('alg:codes', codesRecents().filter((c) => c !== code)); }

export async function empreinte(texte) { // pour la connexion hors ligne
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); } catch (e) { return null; }
}

/** Étape 1 : vérifie le groupe et dit s'il faut créer un NIP ('register') ou l'entrer ('login'/'offline'). */
export async function verifierCode(code) {
  if (LOCAL) return { mode: 'local' };
  try {
    const rep = await api('studentCheck', { code }, 10000);
    if (!rep.groupeExiste) throw Object.assign(new Error('Ce groupe n\'existe pas dans cette école. Vérifie le numéro avec ton enseignant·e.'), { serveur: true });
    return { mode: rep.nipDefini ? 'login' : 'register' };
  } catch (e) {
    if (e.serveur) throw e;
    if (!store.get('alg:nip:' + code, null)) throw new Error('Pas de connexion Internet. Ta première connexion doit se faire en ligne.');
    return { mode: 'offline' };
  }
}

/** Étape 2 : NIP. Renvoie la progression du serveur (ou null). */
export async function entrerNip(code, nip, mode) {
  const emp = await empreinte(code + '|' + nip);
  if (mode === 'offline') {
    if (!emp || emp !== store.get('alg:nip:' + code, null)) throw new Error('NIP incorrect.');
    return null;
  }
  const rep = await api(mode === 'register' ? 'studentRegister' : 'studentLogin', { code, pin: nip }, 15000);
  if (emp) store.set('alg:nip:' + code, emp);
  if (rep.token) store.set('alg:jeton:' + code, rep.token);
  store.del('alg:relogin:' + code);
  return rep.progression || null;
}

export function memoriserConnexion(code) {
  sessionOnglet(code);
  const codes = codesRecents().filter((c) => c !== code);
  codes.unshift(code);
  store.set('alg:codes', codes.slice(0, 8));
}

/* ------------------------------------------------------------------ */
/* Progression (le « profil ») : historique compact + archive          */
/* Entrée d'historique : [id, minutesDepuis2020 (base 36), 'm2/addsous', résultat 0|1|2, temps] */
/* ------------------------------------------------------------------ */
const EPOQUE = Date.UTC(2020, 0, 1);
const MAX_HIST = 700;
export const profilVide = () => ({ v: 1, hist: [], arch: { n: 0, ok: 0, first: 0, time: 0, best: 0, byTheme: {} }, best: 0, jours: [], xp: 0, badges: [] });

export function fusionnerProfils(a, b) {
  if (!a) return b ? JSON.parse(JSON.stringify(b)) : null;
  if (!b) return a;
  const p = Object.assign(profilVide(), b, a); // garde aussi les champs ajoutés par une version plus récente
  p.hist = [];
  const vus = new Set();
  [...(a.hist || []), ...(b.hist || [])].forEach((h) => { if (!vus.has(h[0])) { vus.add(h[0]); p.hist.push(h); } });
  p.hist.sort((x, y) => parseInt(x[1], 36) - parseInt(y[1], 36));
  const A = a.arch || p.arch, B = b.arch || p.arch;
  p.arch = { n: Math.max(A.n, B.n), ok: Math.max(A.ok, B.ok), first: Math.max(A.first, B.first), time: Math.max(A.time, B.time), best: Math.max(A.best || 0, B.best || 0), byTheme: {} };
  new Set([...Object.keys(A.byTheme || {}), ...Object.keys(B.byTheme || {})]).forEach((k) => {
    const x = (A.byTheme || {})[k] || { n: 0, ok: 0, first: 0 }, y = (B.byTheme || {})[k] || { n: 0, ok: 0, first: 0 };
    p.arch.byTheme[k] = x.n >= y.n ? x : y;
  });
  p.best = Math.max(a.best || 0, b.best || 0);
  p.xp = Math.max(a.xp || 0, b.xp || 0);
  p.badges = [...new Set([...(a.badges || []), ...(b.badges || [])])];
  p.recompensesV1 = !!(a.recompensesV1 || b.recompensesV1);
  p.jours = [...new Set([...(a.jours || []), ...(b.jours || [])])].sort().slice(-120);
  return compacter(p);
}

function compacter(p) {
  while (p.hist.length > MAX_HIST) {
    const [, , key, r, s] = p.hist.shift();
    const t = p.arch.byTheme[key] = p.arch.byTheme[key] || { n: 0, ok: 0, first: 0 };
    t.n++; p.arch.n++; p.arch.time += s || 0;
    if (r > 0) { t.ok++; p.arch.ok++; }
    if (r === 1) { t.first++; p.arch.first++; }
  }
  return p;
}

export function ajouterAuProfil(p, att) {
  p.hist.push([att.id.replace(/-/g, '').slice(0, 8), Math.round((Date.parse(att.date) - EPOQUE) / 60000).toString(36), `${att.module}/${att.theme}`, att.resultat, att.temps]);
  const j = new Date().toISOString().slice(0, 10);
  if (!p.jours.includes(j)) p.jours.push(j);
  return compacter(p);
}

/** Statistiques (archive + historique) */
export function statsProfil(p) {
  const byTheme = JSON.parse(JSON.stringify(p.arch.byTheme || {}));
  const byModule = {};
  let { n, ok, first, time } = p.arch;
  let streak = 0, best = Math.max(p.best || 0, p.arch.best || 0);
  for (const [, , key, r, s] of p.hist) {
    const t = byTheme[key] = byTheme[key] || { n: 0, ok: 0, first: 0 };
    t.n++; n++; time += s || 0;
    if (r > 0) { t.ok++; ok++; streak++; best = Math.max(best, streak); } else streak = 0;
    if (r === 1) { t.first++; first++; }
  }
  for (const [k, t] of Object.entries(byTheme)) {
    const m = k.split('/')[0];
    const s = byModule[m] = byModule[m] || { n: 0, ok: 0, first: 0 };
    s.n += t.n; s.ok += t.ok; s.first += t.first;
  }
  return { n, ok, first, time, best, streak, byTheme, byModule };
}

export function lireProfil(code) { return Object.assign(profilVide(), store.get('alg:profil:' + code, null) || {}); }
export function sauverProfil(code, p) {
  store.set('alg:profil:' + code, p);
  if (!LOCAL) store.set('alg:sale:' + code, true);
}
export async function pousserProgression(code) {
  // Un onglet resté ouvert sur une ancienne version n'envoie plus la progression (elle pourrait écraser la nouvelle)
  if (LOCAL || estPerime() || !store.get('alg:sale:' + code, false) || !jeton(code)) return;
  try {
    await api('saveProgress', { code, token: jeton(code), progression: lireProfil(code) }, 15000);
    store.del('alg:sale:' + code);
  } catch (e) {
    if (e.serveur && /expir/i.test(e.message)) store.set('alg:relogin:' + code, true);
  }
  notifier();
}

/* ------------------------------------------------------------------ */
/* Tentatives : file d'envoi (mode Sheets) ou journal détaillé (mode local) */
/* ------------------------------------------------------------------ */
export function enregistrerTentative(code, att) {
  if (LOCAL) {
    const k = 'alg:local:' + code;
    const l = store.get(k, []); l.push(att); store.set(k, l.slice(-3000));
    return;
  }
  const f = store.get('alg:file', []);
  f.push({ ...att, code });
  store.set('alg:file', f);
  planifierEnvoi();
}

let minuterieEnvoi = null, envoiEnCours = false;
export function planifierEnvoi(delai = 1500) { clearTimeout(minuterieEnvoi); minuterieEnvoi = setTimeout(viderFile, delai); }
export const enAttente = () => store.get('alg:file', []).length;

export async function viderFile() {
  if (LOCAL || envoiEnCours) return;
  envoiEnCours = true; notifier(true);
  try {
    let file = store.get('alg:file', []);
    const codes = [...new Set(file.map((a) => a.code))];
    for (const code of codes) {
      const tok = jeton(code);
      if (!tok || store.get('alg:relogin:' + code, false)) continue;
      let lot = file.filter((a) => a.code === code).slice(0, 40);
      while (lot.length) {
        try {
          const rep = await api('submit', { code, token: tok, tentatives: lot.map(({ code: _c, ...a }) => a) }, 20000);
          const recus = new Set(rep.recus || lot.map((a) => a.id));
          file = store.get('alg:file', []).filter((a) => !(a.code === code && recus.has(a.id)));
          store.set('alg:file', file);
          lot = file.filter((a) => a.code === code).slice(0, 40);
        } catch (e) {
          if (e.serveur && /expir/i.test(e.message)) store.set('alg:relogin:' + code, true);
          throw e;
        }
      }
      await pousserProgression(code);
    }
  } catch (e) { /* hors ligne : on réessaiera */ } finally { envoiEnCours = false; notifier(); }
}
if (typeof window !== 'undefined') window.addEventListener('online', () => planifierEnvoi(300));

/* Indicateur de synchronisation (☁️ / ⏳ / 📴) */
const abonnes = new Set();
export function surSync(fn) { abonnes.add(fn); fn(etatSync()); }
function notifier(enCours = false) { const st = etatSync(enCours); abonnes.forEach((fn) => fn(st)); }
export function etatSync(enCours = false) {
  if (LOCAL) return { mode: 'local' };
  const code = sessionOnglet();
  return { mode: 'cloud', attente: enAttente(), enCours, relogin: code ? !!store.get('alg:relogin:' + code, false) : false, enLigne: navigator.onLine };
}

/* Mode local : toutes les tentatives de l'appareil (pour l'espace enseignant) */
export function tentativesLocales() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('alg:local:')) continue;
    const code = k.slice('alg:local:'.length);
    const c = decouperCode(code);
    store.get(k, []).forEach((a) => out.push({ ...a, code, groupe: c ? c.groupe : '' }));
  }
  return out;
}
export function effacerGroupeLocal(groupe) {
  const cles = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('alg:local:' + groupe + '-')) cles.push(k); }
  cles.forEach((k) => store.del(k));
  return cles.length;
}
export function uid() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12); }

/* ---------- Apparence : thème sombre et lecture facilitée (communs élève/enseignant) ---------- */
export function initApparence(btnTheme, btnLecture) {
  const html = document.documentElement;
  const appliquer = () => {
    const sombre = prefs.get('theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') === 'dark';
    html.dataset.theme = sombre ? 'dark' : 'light';
    html.dataset.lecture = prefs.get('lecture', false) ? 'on' : 'off';
    if (btnTheme) { btnTheme.textContent = sombre ? '☀️' : '🌙'; btnTheme.setAttribute('aria-label', sombre ? 'Mode clair' : 'Mode sombre'); }
    if (btnLecture) btnLecture.setAttribute('aria-pressed', String(prefs.get('lecture', false)));
  };
  if (btnTheme) btnTheme.onclick = () => { prefs.set('theme', html.dataset.theme === 'dark' ? 'light' : 'dark'); appliquer(); };
  if (btnLecture) btnLecture.onclick = () => { prefs.set('lecture', !prefs.get('lecture', false)); appliquer(); };
  appliquer();
}

/* ---------- Mode hors ligne (service worker) ---------- */
export function enregistrerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
