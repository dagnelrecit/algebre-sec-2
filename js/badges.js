/**
 * badges.js — Récompenses (même esprit que l'application des verbes irréguliers) :
 *  - XP gagnés à chaque bonne réponse, niveaux, série de jours de pratique 🔥;
 *  - badges débloqués selon des défis précis (affichés sur l'accueil, avec confettis);
 *  - aucun classement entre élèves : on valorise le progrès personnel.
 */
import { MODULES } from './gen/index.js';

export const BADGES = [
  { id: 'premier',    icone: '👣', nom: 'Premier pas',      desc: 'Terminer une première série au complet' },
  { id: 'serie10',    icone: '🔥', nom: '10 de suite',      desc: '10 bonnes réponses consécutives' },
  { id: 'serie25',    icone: '⚡', nom: 'Inarrêtable',      desc: '25 bonnes réponses consécutives' },
  { id: 'parfait',    icone: '💎', nom: 'Sans faute',       desc: 'Une série d\'au moins 10 questions, toutes réussies du premier coup' },
  { id: 'constance',  icone: '📅', nom: 'Constance',        desc: 'Pratiquer 3 jours de suite' },
  { id: 'assidu',     icone: '🗓️', nom: 'Assiduité',        desc: 'Pratiquer pendant 7 jours différents' },
  { id: 'explorateur', icone: '🧭', nom: 'Explorateur',     desc: 'Réussir au moins une question dans chacun des 5 modules' },
  { id: 'centurion',  icone: '💯', nom: 'Centurion',        desc: '100 questions réussies au total' },
  { id: 'geometre',   icone: '📐', nom: 'Géomètre',         desc: '10 questions de périmètre, d\'aire ou de géométrie réussies' },
  { id: 'revanche',   icone: '🔁', nom: 'Revanche',         desc: 'Au moins 80 % dans une série « M\'exercer sur mes erreurs »' },
  { id: 'defi',       icone: '🌟', nom: 'Défi relevé',      desc: 'Au moins 80 % dans un défi mixte de 15 questions ou plus' },
  { id: 'sommet',     icone: '🧗', nom: 'Sommet',           desc: '5 équations de niveau 5 réussies du premier coup' },
  { id: 'maitre_m1',  icone: '🔬', nom: 'Anatomiste',       desc: 'Maîtriser le module 1 (chaque thème : 8 essais et 80 % de réussite)' },
  { id: 'maitre_m2',  icone: '🧹', nom: 'Réducteur·trice',  desc: 'Maîtriser le module 2 (chaque thème : 8 essais et 80 % de réussite)' },
  { id: 'maitre_m3',  icone: '🔢', nom: 'Calculateur·trice', desc: 'Maîtriser le module 3 (chaque thème : 8 essais et 80 % de réussite)' },
  { id: 'maitre_m4',  icone: '🗣️', nom: 'Traducteur·trice', desc: 'Maîtriser le module 4 (chaque thème : 8 essais et 80 % de réussite)' },
  { id: 'maitre_m5',  icone: '⚖️', nom: 'Équilibriste',     desc: 'Maîtriser le module 5 (chaque niveau : 8 essais et 80 % de réussite)' },
];
const PAR_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));

/* ---------- XP et niveaux ---------- */
/** XP d'une réponse : 10 au 1er essai, 5 au 2e, +2 si difficile (niveau 3, ou niveaux 4-5 et géométrie des équations). */
export function xpReponse(q, resultat) {
  if (!resultat) return 0;
  const difficile = q.module === 'm5' ? ['n4', 'n5', 'geo'].includes(q.theme) : q.difficulty === 3;
  return (resultat === 1 ? 10 : 5) + (difficile ? 2 : 0);
}
/** Bonus de fin de série : 20 XP, +20 si tout est réussi du premier coup. */
export const xpFinSerie = (n, premiersCoups) => (n ? 20 + (premiersCoups === n && n >= 5 ? 20 : 0) : 0);

export const niveau = (xp) => Math.floor(Math.sqrt((xp || 0) / 40)) + 1;
export const xpPourNiveau = (n) => (n - 1) ** 2 * 40;
export function progresNiveau(xp) {
  const n = niveau(xp), bas = xpPourNiveau(n), haut = xpPourNiveau(n + 1);
  return { n, xp: xp || 0, bas, haut, pct: Math.round((((xp || 0) - bas) / (haut - bas)) * 100) };
}

/* ---------- Série de jours ---------- */
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const aujourdhui = () => fmt(new Date());
export function serieJours(jours) {
  const ens = new Set(jours || []);
  const d = new Date();
  if (!ens.has(fmt(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (ens.has(fmt(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/**
 * Vérifie les badges après une réponse ou une série.
 * @param profil   progression (badges[], jours[])
 * @param stats    statsProfil(profil)
 * @param ctx      { serieMax, fin: {mode, n, premiers, score} | null, compteurs }
 * @returns liste des nouveaux badges
 */
export function verifierBadges(profil, stats, ctx = {}) {
  profil.badges = profil.badges || [];
  const nouveaux = [];
  const gagner = (id) => { if (!profil.badges.includes(id)) { profil.badges.push(id); nouveaux.push(PAR_ID[id]); } };
  const bt = stats.byTheme || {};
  const reussis = (filtre) => Object.entries(bt).filter(([k]) => filtre(k)).reduce((s, [, t]) => s + t.ok, 0);

  if ((ctx.serieMax || 0) >= 10 || stats.best >= 10) gagner('serie10');
  if ((ctx.serieMax || 0) >= 25 || stats.best >= 25) gagner('serie25');
  if (serieJours(profil.jours) >= 3) gagner('constance');
  if ((profil.jours || []).length >= 7) gagner('assidu');
  if (MODULES.every((m) => (stats.byModule[m.id] || { ok: 0 }).ok > 0)) gagner('explorateur');
  if (stats.ok >= 100) gagner('centurion');
  if (reussis((k) => ['m4/perimetre', 'm4/aire', 'm5/geo'].includes(k)) >= 10) gagner('geometre');
  if ((bt['m5/n5'] || { first: 0 }).first >= 5) gagner('sommet');
  MODULES.forEach((m) => {
    const ok = Object.keys(m.themes).every((t) => { const s = bt[`${m.id}/${t}`]; return s && s.n >= 8 && s.ok / s.n >= 0.8; });
    if (ok) gagner('maitre_' + m.id);
  });
  if (ctx.fin) {
    const { mode, n, premiers, score } = ctx.fin;
    gagner('premier');
    if (n >= 10 && premiers === n) gagner('parfait');
    if (mode === 'erreurs' && score >= 80) gagner('revanche');
    if (mode === 'mixte' && n >= 15 && score >= 80) gagner('defi');
  }
  return nouveaux;
}

/* ---------- Confettis (sobres, désactivés si l'appareil réduit les animations) ---------- */
export function confettis() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'confettis';
  const couleurs = ['#4338ca', '#f97316', '#059669', '#db2777', '#eab308', '#0891b2'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('i');
    const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 260;
    c.style.setProperty('--x', `${Math.cos(a) * r}px`);
    c.style.setProperty('--y', `${Math.sin(a) * r - 80}px`);
    c.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    c.style.background = couleurs[i % couleurs.length];
    c.style.animationDelay = `${Math.random() * 0.15}s`;
    box.appendChild(c);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1800);
}
